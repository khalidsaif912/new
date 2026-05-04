"""
process_absence.py
──────────────────────────────────────────────────────────────────────────────
يحمّل ملف absence-report.xlsb من OneDrive/SharePoint
ويولّد docs/absence-data.json

المتغيرات المطلوبة في GitHub Secrets:
  ABSENCE_EXCEL_URL  ← رابط تنزيل مباشر لملف الـ xlsb (مثلاً من رابط مشاركة SharePoint/OneDrive مع download=1)

رابط نسخة العمل على SharePoint (للمرجع البشري؛ التشغيل الآلي يستخدم ABSENCE_EXCEL_URL):
  https://omanair-my.sharepoint.com/:x:/p/8715_hq/IQD1R5qA4TnVS7Knr8-YdfzcAYpj0wCOuDb_HSa82slp23Y?e=nfZEPG
──────────────────────────────────────────────────────────────────────────────
"""

import os, re, json, sys, hashlib
from datetime import datetime
from io import BytesIO
from pathlib import Path
import requests
import pandas as pd
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

try:
    from pyxlsb import open_workbook
except ImportError:
    open_workbook = None

ABSENCE_URL = os.environ.get("ABSENCE_EXCEL_URL", "").strip()
OUTPUT_PATH = "docs/absence-data.json"
HASH_FILE   = "last_absence_hash.txt"
DEBUG_RESPONSE_PATH = "debug_sharepoint_response.png"
COL_EMP_NO  = 1
COL_NAME    = 2
COL_SECTION = 3
COL_DATE    = 4

def _add_or_replace_query_param(url, key, value):
    u = urlparse(url)
    qs = dict(parse_qsl(u.query, keep_blank_values=True))
    qs[key] = value
    return urlunparse(u._replace(query=urlencode(qs, doseq=True)))

def normalize_sharepoint_download_url(url):
    if not url:
        return url
    u = urlparse(url)
    host = (u.netloc or "").lower()
    if "sharepoint.com" not in host and "onedrive.live.com" not in host and "1drv.ms" not in host:
        return url

    normalized = url
    normalized = _add_or_replace_query_param(normalized, "download", "1")
    normalized = _add_or_replace_query_param(normalized, "web", "0")

    # روابط العرض في SharePoint يمكن تحويلها إلى Endpoint التنزيل المباشر.
    if "/:x:/" in normalized:
        direct = normalized.replace("/:x:/", "/:x:/r/")
        normalized = _add_or_replace_query_param(direct, "download", "1")
        normalized = _add_or_replace_query_param(normalized, "web", "0")

    return normalized

def remove_sharepoint_r_segment(url):
    if "/:x:/r/" in url:
        return url.replace("/:x:/r/", "/:x:/")
    return url

def get_file_signature(data):
    head = data[:16]
    return head.hex(), head

def detect_file_kind(data):
    lower_head = data[:512].lower()
    hex16, head = get_file_signature(data)
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png", hex16
    if head.startswith(b"PK\x03\x04"):
        return "zip_excel", hex16
    if head.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        return "ole_compound", hex16
    if b"<html" in lower_head or b"<!doctype html" in lower_head:
        return "html", hex16
    return "unknown", hex16

def download_xlsb(url):
    if not url:
        raise ValueError("ABSENCE_EXCEL_URL is empty")
    session = requests.Session()
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,application/xml;q=0.9,"
            "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*;q=0.8"
        ),
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
    }

    # طلب تمهيدي لجلب الكوكيز من رابط المشاركة الأصلي.
    warmup = session.get(url, headers=headers, allow_redirects=True, timeout=30)
    warmup.raise_for_status()

    # طلب التحميل الفعلي بعد تطبيع الرابط.
    download_url = normalize_sharepoint_download_url(url)
    r = session.get(download_url, headers=headers, allow_redirects=True, timeout=60)
    r.raise_for_status()

    redirect_urls = [resp.url for resp in r.history] + [r.url]
    final_host = (urlparse(r.url).netloc or "").lower()

    # إذا انتهى المسار إلى صفحة تسجيل الدخول، جرّب نسخة أخرى بدون /r/.
    if "login.microsoftonline.com" in final_host:
        alternate_url = remove_sharepoint_r_segment(download_url)
        if alternate_url != download_url:
            r_alt = session.get(alternate_url, headers=headers, allow_redirects=True, timeout=60)
            r_alt.raise_for_status()
            redirect_urls = [resp.url for resp in r_alt.history] + [r_alt.url]
            r = r_alt

    return (
        r.content,
        (r.headers.get("Content-Type") or "").lower(),
        r.url,
        download_url,
        redirect_urls,
    )

def clean_date(raw):
    if not raw:
        return None
    s = str(raw).strip().replace("\xa0", "").strip()
    for fmt in ("%d-%b-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return s

def clean_name(raw):
    if not raw:
        return None
    return re.sub(r"^(Mr\.|Ms\.|Mrs\.|Dr\.|Eng\.)\s*", "", str(raw).strip(), flags=re.IGNORECASE).strip()

def _normalize_cell(value):
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    return value

def _extract_rows_with_pandas(data, engine):
    df = pd.read_excel(BytesIO(data), sheet_name=0, header=None, engine=engine)
    return [[_normalize_cell(v) for v in row] for row in df.itertuples(index=False, name=None)]

def _extract_rows(data, content_type):
    rows = []
    errors = []

    if open_workbook is not None:
        try:
            with open_workbook(BytesIO(data)) as wb:
                sheet_name = wb.sheets[0]
                with wb.get_sheet(sheet_name) as ws:
                    for row in ws.rows():
                        rows.append([c.v for c in row])
            if rows:
                return rows
        except Exception as e:
            errors.append(f"pyxlsb: {e}")
    else:
        errors.append("pyxlsb: not installed")

    for engine in ("openpyxl", "pyxlsb"):
        try:
            rows = _extract_rows_with_pandas(data, engine=engine)
            if rows:
                return rows
        except Exception as e:
            errors.append(f"pandas[{engine}]: {e}")

    looks_like_html = (
        "text/html" in content_type
        or "application/xhtml+xml" in content_type
        or b"<html" in data[:4096].lower()
        or b"<!doctype html" in data[:4096].lower()
    )
    if looks_like_html:
        try:
            tables = pd.read_html(BytesIO(data))
            if tables:
                df = tables[0]
                rows = [[_normalize_cell(v) for v in row] for row in df.itertuples(index=False, name=None)]
                if rows:
                    return rows
        except Exception as e:
            errors.append(f"read_html: {e}")

    try:
        df = pd.read_csv(BytesIO(data), sep=None, engine="python", header=None)
        rows = [[_normalize_cell(v) for v in row] for row in df.itertuples(index=False, name=None)]
        if rows:
            return rows
    except Exception as e:
        errors.append(f"read_csv: {e}")

    signature = data[:24].hex()
    preview = data[:160].decode("utf-8", errors="replace").replace("\n", " ").replace("\r", " ")
    raise ValueError(
        f"unable to parse downloaded file; content-type={content_type or 'unknown'}; "
        f"signature={signature}; preview={preview!r}; attempts={'; '.join(errors)}"
    )

def main():
    if not ABSENCE_URL:
        print("ABSENCE_EXCEL_URL not set — skipping")
        return

    print(f"Downloading absence report...")
    try:
        data, content_type, final_url, requested_url, redirect_urls = download_xlsb(ABSENCE_URL)
        print(f"  Downloaded: {len(data):,} bytes")
        file_kind, first16_hex = detect_file_kind(data)
        print(f"  Requested URL: {requested_url}")
        print(f"  Final URL: {final_url}")
        print("  Redirect chain:")
        for idx, u in enumerate(redirect_urls, start=1):
            print(f"    {idx}. {u}")
        print(f"  Content-Type: {content_type or 'unknown'}")
        print(f"  First 16 bytes hex: {first16_hex}")
        print(f"  File size: {len(data):,} bytes")
        final_host = (urlparse(final_url).netloc or "").lower()
        if "login.microsoftonline.com" in final_host:
            raise ValueError("Reached login.microsoftonline.com. Check sharing link and direct download URL.")
        if file_kind == "png":
            with open(DEBUG_RESPONSE_PATH, "wb") as f:
                f.write(data)
            raise ValueError("SharePoint returned a preview image, not the Excel file. Use a direct download link.")
        if file_kind not in ("zip_excel", "ole_compound"):
            raise ValueError(f"Downloaded file is not recognized as Excel payload (kind={file_kind}).")
    except Exception as e:
        print(f"  Failed to download: {e}")
        sys.exit(1)

    # ✅ تحقق من التغيير عبر hash
    current_hash = hashlib.md5(data).hexdigest()
    print(f"  Current hash: {current_hash}")

    if Path(HASH_FILE).exists():
        with open(HASH_FILE, "r") as f:
            old_hash = f.read().strip()
        if old_hash == current_hash:
            print("  No changes detected in absence file — skipping")
            return
        else:
            print(f"  Change detected! Old: {old_hash} → New: {current_hash}")
    else:
        print("  First run — generating...")

    records_by_date = {}
    processed = 0

    try:
        rows = _extract_rows(data, content_type)

        for i, vals in enumerate(rows):
            if i < 2:
                continue
            if len(vals) < 5 or vals[COL_EMP_NO] is None:
                continue
            if str(vals[COL_EMP_NO]).strip().lower() in ("employee no", "emp no", "empno"):
                continue
            date = clean_date(vals[COL_DATE])
            name = clean_name(vals[COL_NAME])
            emp_no = str(int(vals[COL_EMP_NO])) if vals[COL_EMP_NO] else None
            section = str(vals[COL_SECTION] or "").strip()
            if not date or not name:
                continue
            if date not in records_by_date:
                records_by_date[date] = {"names": [], "empNos": [], "sections": []}
            if emp_no not in records_by_date[date]["empNos"]:
                records_by_date[date]["names"].append(name)
                records_by_date[date]["empNos"].append(emp_no)
                records_by_date[date]["sections"].append(section)
                processed += 1
    except Exception as e:
        print(f"  Failed to parse xlsb: {e}")
        sys.exit(1)

    records = [
        {"date": date, "names": d["names"], "empNos": d["empNos"], "sections": d["sections"]}
        for date in sorted(records_by_date.keys())
        for d in [records_by_date[date]]
    ]

    os.makedirs("docs", exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"generated_at": datetime.now().isoformat(), "total_records": processed, "records": records}, f, ensure_ascii=False, indent=2)

    # احفظ الـ hash الجديد فقط بعد نجاح المعالجة
    with open(HASH_FILE, "w") as f:
        f.write(current_hash)

    print(f"  {processed} records | {len(records)} unique dates -> {OUTPUT_PATH}")
    if records:
        print(f"  Range: {records[0]['date']} -> {records[-1]['date']}")

if __name__ == "__main__":
    main()
