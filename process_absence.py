"""
process_absence.py
------------------
Loads absence Excel from ABSENCE_EXCEL_FILE when set, otherwise downloads
ABSENCE_EXCEL_URL, then regenerates docs/absence-data.json.
"""

import hashlib
import json
import os
import re
import sys
from datetime import datetime
from io import BytesIO
from pathlib import Path

import pandas as pd

from roster_app.cache_io import download_excel_with_meta

try:
    from pyxlsb import open_workbook
except ImportError:
    open_workbook = None


ABSENCE_URL = os.environ.get("ABSENCE_EXCEL_URL", "").strip()
ABSENCE_FILE = os.environ.get("ABSENCE_EXCEL_FILE", "").strip()
OUTPUT_PATH = "docs/absence-data.json"
ARCHIVE_PATH = Path("absence-archive") / "absence-report.xlsb"
HASH_FILE = Path("last_absence_hash.txt")
COL_EMP_NO = 1
COL_NAME = 2
COL_SECTION = 3
COL_DATE = 4


def _is_excel_signature(data: bytes) -> bool:
    head8 = data[:8] or b""
    return data.startswith(b"PK") or head8.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")


def download_xlsb(url: str) -> tuple[bytes, str, str]:
    if not url:
        raise ValueError("ABSENCE_EXCEL_URL is empty")
    data, meta = download_excel_with_meta(url)
    return data, (meta.get("content_type") or ""), url


def load_absence_from_file(file_path: str) -> tuple[bytes, str, str]:
    p = Path(file_path)
    if not p.is_file():
        raise ValueError(f"ABSENCE_EXCEL_FILE does not exist: {p}")
    data = p.read_bytes()
    if not data:
        raise ValueError(f"ABSENCE_EXCEL_FILE is empty: {p}")
    if (data[:8] or b"").startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError(f"{p} is a PNG preview, not an Excel file.")
    if b"<html" in data[:4096].lower():
        raise ValueError(f"{p} looks like an HTML page, not an Excel file.")
    if not _is_excel_signature(data):
        raise ValueError(f"{p} is not a valid Excel file signature.")
    suffix = p.suffix.lower()
    if suffix == ".xlsx":
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif suffix == ".xlsb":
        content_type = "application/vnd.ms-excel.sheet.binary.spreadsheetml.sheet"
    else:
        content_type = "application/octet-stream"
    print(f"Loaded local file: {p.resolve()} ({len(data):,} bytes)")
    return data, content_type, str(p.resolve())


def archive_absence_file(data: bytes) -> None:
    ARCHIVE_PATH.parent.mkdir(parents=True, exist_ok=True)
    ARCHIVE_PATH.write_bytes(data)
    digest = hashlib.sha256(data).hexdigest()
    HASH_FILE.write_text(digest + "\n", encoding="utf-8")
    print(f"Archived {len(data):,} bytes -> {ARCHIVE_PATH} | hash={digest[:12]}")


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
        if ABSENCE_FILE:
            data, content_type, source = load_absence_from_file(ABSENCE_FILE)
            print(f"Using local file: {source}")
        else:
            data, content_type, source = download_xlsb(ABSENCE_URL)
            print(f"Download succeeded from: {source}")
        archive_absence_file(data)
    except Exception as e:
        print(f"Failed to load absence file: {e}")
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
