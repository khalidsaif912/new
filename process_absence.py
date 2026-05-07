"""
process_absence.py
------------------
Directly downloads absence Excel from ABSENCE_EXCEL_URL, validates payload signature,
parses rows, and regenerates docs/absence-data.json.
"""

import json
import os
import re
import sys
from datetime import datetime
from io import BytesIO
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import pandas as pd
import requests

try:
    from pyxlsb import open_workbook
except ImportError:
    open_workbook = None


ABSENCE_URL = os.environ.get("ABSENCE_EXCEL_URL", "").strip()
OUTPUT_PATH = "docs/absence-data.json"
COL_EMP_NO = 1
COL_NAME = 2
COL_SECTION = 3
COL_DATE = 4


def _add_download_param_if_needed(url: str) -> str:
    parsed = urlparse(url)
    host = (parsed.netloc or "").lower()
    if (
        "sharepoint.com" not in host
        and "onedrive.live.com" not in host
        and "1drv.ms" not in host
    ):
        return url
    params = dict(parse_qsl(parsed.query, keep_blank_values=True))
    if "download" not in params:
        params["download"] = "1"
    return urlunparse(parsed._replace(query=urlencode(params, doseq=True)))


def _is_excel_signature(data: bytes) -> bool:
    head8 = data[:8] or b""
    return data.startswith(b"PK") or head8.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")


def download_xlsb(url: str) -> tuple[bytes, str, str]:
    if not url:
        raise ValueError("ABSENCE_EXCEL_URL is empty")

    final_request_url = _add_download_param_if_needed(url)
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "application/octet-stream,*/*",
    }

    r = requests.get(
        final_request_url,
        headers=headers,
        allow_redirects=True,
        timeout=60,
    )
    r.raise_for_status()

    data = r.content or b""
    content_type = (r.headers.get("Content-Type") or "").lower()
    first16 = data[:16].hex()

    print(f"Requested URL: {final_request_url}")
    print(f"Final URL: {r.url}")
    print(f"Content-Type: {content_type or 'unknown'}")
    print(f"First 16 bytes: {first16}")
    print(f"File size: {len(data):,} bytes")

    if (data[:8] or b"").startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("SharePoint returned a preview PNG, not the Excel file.")
    if "text/html" in content_type or b"<html" in data[:4096].lower():
        raise ValueError("SharePoint returned an HTML page, not the Excel file.")
    if not _is_excel_signature(data):
        raise ValueError("Downloaded payload is not a valid Excel file signature.")

    return data, content_type, r.url


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
    return re.sub(
        r"^(Mr\.|Ms\.|Mrs\.|Dr\.|Eng\.)\s*",
        "",
        str(raw).strip(),
        flags=re.IGNORECASE,
    ).strip()


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

    signature = data[:24].hex()
    raise ValueError(
        f"unable to parse downloaded file; content-type={content_type or 'unknown'}; "
        f"signature={signature}; attempts={'; '.join(errors)}"
    )


def main():
    print("Loading absence report...")
    try:
        data, content_type, final_url = download_xlsb(ABSENCE_URL)
        print(f"Download succeeded from: {final_url}")
    except Exception as e:
        print(f"Failed to download: {e}")
        sys.exit(1)

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

            raw_emp_no = vals[COL_EMP_NO]
            try:
                emp_no = str(int(raw_emp_no)) if raw_emp_no else None
            except Exception:
                continue

            date = clean_date(vals[COL_DATE])
            name = clean_name(vals[COL_NAME])
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
        print(f"Failed to parse xlsb: {e}")
        sys.exit(1)

    records = [
        {"date": date, "names": d["names"], "empNos": d["empNos"], "sections": d["sections"]}
        for date in sorted(records_by_date.keys())
        for d in [records_by_date[date]]
    ]

    os.makedirs("docs", exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(
            {
                "generated_at": datetime.now().isoformat(),
                "total_records": processed,
                "records": records,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    print(f"{processed} records | {len(records)} unique dates -> {OUTPUT_PATH}")
    if records:
        print(f"Range: {records[0]['date']} -> {records[-1]['date']}")


if __name__ == "__main__":
    main()
