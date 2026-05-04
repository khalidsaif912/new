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

try:
    from pyxlsb import open_workbook
except ImportError:
    open_workbook = None

ABSENCE_URL = os.environ.get("ABSENCE_EXCEL_URL", "").strip()
OUTPUT_PATH = "docs/absence-data.json"
HASH_FILE   = "last_absence_hash.txt"
COL_EMP_NO  = 1
COL_NAME    = 2
COL_SECTION = 3
COL_DATE    = 4

def download_xlsb(url):
    if not url:
        raise ValueError("ABSENCE_EXCEL_URL is empty")
    try:
        from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
        u = urlparse(url)
        host = (u.netloc or "").lower()
        if "onedrive.live.com" in host or "1drv.ms" in host or "sharepoint.com" in host:
            qs = dict(parse_qsl(u.query, keep_blank_values=True))
            if "download" not in qs:
                qs["download"] = "1"
                u = u._replace(query=urlencode(qs, doseq=True))
                url = urlunparse(u)
    except Exception:
        pass
    headers = {"User-Agent": "Mozilla/5.0 (GitHub Actions) roster-site", "Accept": "application/octet-stream,*/*"}
    r = requests.get(url, headers=headers, timeout=60, allow_redirects=True)
    r.raise_for_status()
    return r.content, (r.headers.get("Content-Type") or "").lower(), r.url

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
        data, content_type, final_url = download_xlsb(ABSENCE_URL)
        print(f"  Downloaded: {len(data):,} bytes")
        if content_type:
            print(f"  Content-Type: {content_type}")
        print(f"  Final URL host: {final_url.split('/')[2] if '://' in final_url else final_url}")
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
