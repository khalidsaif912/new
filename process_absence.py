"""
process_absence.py
------------------
Loads absence Excel from ABSENCE_EXCEL_FILE when set, otherwise downloads from
stable OneDrive paths (same pattern as ROSTER_UPLOADS/latest.xlsx), then
regenerates docs/absence-data.json.

Root source order (see roster_app/absence_source.py):
  1. Stable paths derived from EXPORT_EXCEL_URL
  2. client_payload.absence_url (one-shot new share)
  3. ABSENCE_EXCEL_URL secret (:x: guest link — secondary only)

The SharePoint report is usually for previous months, not the current roster
month. Parsing never filters by today's roster window.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path

import pandas as pd

from roster_app.absence_source import resolve_absence_source_urls
from roster_app.cache_io import download_excel_with_meta

try:
    from pyxlsb import open_workbook
except ImportError:
    open_workbook = None


OUTPUT_PATH = "docs/absence-data.json"
ARCHIVE_PATH = Path("absence-archive") / "absence-report.xlsb"
HASH_FILE = Path("last_absence_hash.txt")


def _env(name: str) -> str:
    return (os.environ.get(name) or "").strip()


def _absence_file() -> str:
    return _env("ABSENCE_EXCEL_FILE")


def _absence_url() -> str:
    return _env("ABSENCE_EXCEL_URL")


def _absence_payload_url() -> str:
    return _env("ABSENCE_PAYLOAD_URL")


def _absence_session_url() -> str:
    return (
        _env("ABSENCE_SESSION_URL")
        or _env("EXPORT_EXCEL_URL")
        or _env("EXCEL_URL")
    )


# Back-compat aliases for tests / importers that read module attributes.
ABSENCE_URL = _absence_url()
ABSENCE_FILE = _absence_file()
ABSENCE_PAYLOAD_URL = _absence_payload_url()
ABSENCE_SESSION_URL = _absence_session_url()

# Legacy column indexes when no header row is found (col 0 is often empty).
FALLBACK_COL_EMP_NO = 1
FALLBACK_COL_NAME = 2
FALLBACK_COL_SECTION = 3
FALLBACK_COL_DATE = 4

HEADER_EMP = {
    "employee no",
    "emp no",
    "empno",
    "employee number",
    "emp. no",
    "رقم الموظف",
}
HEADER_NAME = {
    "name",
    "employee name",
    "الاسم",
    "اسم الموظف",
}
HEADER_SECTION = {
    "section",
    "department",
    "dept",
    "unit",
    "القسم",
    "الإدارة",
    "security",
}
HEADER_DATE = {
    "request date",
    "date",
    "absence date",
    "leave date",
    "التاريخ",
    "تاريخ الطلب",
}
HEADER_SKIP_EMP = {"employee no", "emp no", "empno", "employee number", "رقم الموظف"}


def _is_excel_signature(data: bytes) -> bool:
    head8 = data[:8] or b""
    return data.startswith(b"PK") or head8.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")


def _absence_download_urls(primary: str | None = None) -> list[str]:
    return resolve_absence_source_urls(
        absence_url=(primary if primary is not None else _absence_url()),
        export_url=_absence_session_url(),
        payload_url=_absence_payload_url(),
    )


def download_xlsb(url: str | None = None) -> tuple[bytes, str, str]:
    """Download absence Excel using stable OneDrive paths first, then shares."""
    seed = _absence_session_url()
    primary = url if url is not None else _absence_url()
    payload = _absence_payload_url()
    urls = _absence_download_urls(primary)
    if not urls and not seed:
        raise ValueError(
            "No absence source: set EXPORT_EXCEL_URL (stable ROSTER_UPLOADS paths) "
            "and/or ABSENCE_EXCEL_URL, and overwrite absence-report.xlsb in place."
        )
    print("Absence source candidates (stable paths first):")
    for i, candidate in enumerate(urls, 1):
        print(f"  {i}. {candidate[:140]}")
    # One download pass: preferred stable/payload URLs + :x: secret variants.
    share_url = payload or primary or (urls[0] if urls else "")
    try:
        data, meta = download_excel_with_meta(
            share_url,
            session_seed_url=seed or None,
            allow_sibling_absence_files=True,
            preferred_urls=urls,
        )
        return data, (meta.get("content_type") or ""), meta.get("final_url") or share_url
    except Exception as exc:
        raise ValueError(
            f"{exc} | Root fix: overwrite "
            "/Documents/ROSTER_UPLOADS/absence-report.xlsb or "
            "/Documents/AbsenceReports/absence-report.xlsb (same name every month), "
            "keep ABSENCE_EXCEL_URL on a working guest share, then POST "
            "absence-report-updated."
        ) from exc


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


def _norm_header(value) -> str:
    s = str(value or "").replace("\xa0", " ").strip().lower()
    s = re.sub(r"\s+", " ", s)
    s = s.replace(".", "")
    return s


def find_header_columns(row: list) -> dict[str, int] | None:
    """Return emp/name/section/date indexes when this row looks like a header."""
    labels = [_norm_header(v) for v in row]
    found: dict[str, int] = {}
    for idx, label in enumerate(labels):
        if not label:
            continue
        if label in HEADER_EMP and "emp" not in found:
            found["emp"] = idx
        elif label in HEADER_NAME and "name" not in found:
            found["name"] = idx
        elif label in HEADER_SECTION and "section" not in found:
            found["section"] = idx
        elif label in HEADER_DATE and "date" not in found:
            found["date"] = idx
    if "emp" in found and "name" in found and "date" in found:
        found.setdefault("section", found["emp"])
        return found
    return None


def clean_date(raw):
    if raw is None or raw == "":
        return None
    if isinstance(raw, datetime):
        return raw.strftime("%Y-%m-%d")
    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        # Excel serial date (1900 date system).
        try:
            serial = float(raw)
            if 20000 <= serial <= 80000:
                return (datetime(1899, 12, 30) + timedelta(days=serial)).strftime("%Y-%m-%d")
        except (OverflowError, ValueError, OSError):
            pass
    s = str(raw).replace("\xa0", " ").strip()
    s = re.sub(r"\s+", " ", s)
    if not s:
        return None
    for fmt in ("%d-%b-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d %b %Y", "%d-%b-%y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


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


def _extract_rows_with_pandas(data, engine, sheet_name=0):
    df = pd.read_excel(BytesIO(data), sheet_name=sheet_name, header=None, engine=engine)
    return [[_normalize_cell(v) for v in row] for row in df.itertuples(index=False, name=None)]


def extract_sheet_rows(data: bytes, content_type: str) -> list[tuple[str, list[list]]]:
    """Return [(sheet_name, rows), ...] for every readable sheet."""
    errors: list[str] = []

    if open_workbook is not None:
        try:
            sheets: list[tuple[str, list[list]]] = []
            with open_workbook(BytesIO(data)) as wb:
                for sheet_name in wb.sheets:
                    with wb.get_sheet(sheet_name) as ws:
                        rows = [[c.v for c in row] for row in ws.rows()]
                    if rows:
                        sheets.append((str(sheet_name), rows))
            if sheets:
                return sheets
        except Exception as e:
            errors.append(f"pyxlsb: {e}")
    else:
        errors.append("pyxlsb: not installed")

    for engine in ("openpyxl", "pyxlsb"):
        try:
            xls = pd.ExcelFile(BytesIO(data), engine=engine)
            sheets = []
            for sheet_name in xls.sheet_names:
                rows = _extract_rows_with_pandas(data, engine=engine, sheet_name=sheet_name)
                if rows:
                    sheets.append((str(sheet_name), rows))
            if sheets:
                return sheets
        except Exception as e:
            errors.append(f"pandas[{engine}]: {e}")

    signature = data[:24].hex()
    raise ValueError(
        f"unable to parse downloaded file; content-type={content_type or 'unknown'}; "
        f"signature={signature}; attempts={'; '.join(errors)}"
    )


def parse_absence_sheets(sheets: list[tuple[str, list[list]]]) -> tuple[int, list[dict]]:
    records_by_date: dict[str, dict[str, list[str]]] = {}
    processed = 0

    for sheet_name, rows in sheets:
        cols = None
        start_idx = 0
        for i, vals in enumerate(rows):
            header = find_header_columns(vals)
            if header:
                cols = header
                start_idx = i + 1
                break
        if cols is None:
            cols = {
                "emp": FALLBACK_COL_EMP_NO,
                "name": FALLBACK_COL_NAME,
                "section": FALLBACK_COL_SECTION,
                "date": FALLBACK_COL_DATE,
            }
            start_idx = 2

        for vals in rows[start_idx:]:
            if len(vals) <= max(cols.values()):
                continue
            raw_emp_no = vals[cols["emp"]]
            if raw_emp_no is None:
                continue
            if _norm_header(raw_emp_no) in HEADER_SKIP_EMP:
                continue
            try:
                emp_no = str(int(raw_emp_no)) if raw_emp_no else None
            except Exception:
                emp_text = str(raw_emp_no).strip()
                emp_no = emp_text if emp_text.isdigit() else None
            if not emp_no:
                continue

            date = clean_date(vals[cols["date"]])
            name = clean_name(vals[cols["name"]])
            section = str(vals[cols["section"]] or "").strip() if cols["section"] < len(vals) else ""
            if not date or not name:
                continue

            bucket = records_by_date.setdefault(date, {"names": [], "empNos": [], "sections": []})
            if emp_no not in bucket["empNos"]:
                bucket["names"].append(name)
                bucket["empNos"].append(emp_no)
                bucket["sections"].append(section)
                processed += 1
        print(f"Sheet {sheet_name!r}: using columns {cols}")

    records = [
        {"date": date, "names": d["names"], "empNos": d["empNos"], "sections": d["sections"]}
        for date in sorted(records_by_date.keys())
        for d in [records_by_date[date]]
    ]
    return processed, records


def is_security_section(section: str) -> bool:
    raw = str(section or "")
    low = raw.strip().lower()
    if "security" in low:
        return True
    return "الأمن" in raw or "امن" in low.replace("أ", "ا").replace("إ", "ا")


def absence_group_id(section: str) -> str:
    return "security" if is_security_section(section) else "absences"


def build_absence_groups(records: list[dict]) -> list[dict]:
    """People grouped by Absences vs Security. Dates stay as in the file (past months OK)."""
    buckets: dict[str, dict[str, dict]] = {"absences": {}, "security": {}}
    for rec in records or []:
        date = str(rec.get("date") or "").strip()
        names = rec.get("names") or []
        emp_nos = rec.get("empNos") or []
        sections = rec.get("sections") or []
        for i, emp_no in enumerate(emp_nos):
            emp_id = str(emp_no or "").strip()
            if not emp_id:
                continue
            section = str(sections[i] if i < len(sections) else "")
            gid = absence_group_id(section)
            person = buckets[gid].setdefault(
                emp_id,
                {
                    "empNo": emp_id,
                    "name": str(names[i] if i < len(names) else "").strip(),
                    "section": section.strip(),
                    "dates": [],
                },
            )
            if date and date not in person["dates"]:
                person["dates"].append(date)
            if not person["name"] and i < len(names):
                person["name"] = str(names[i] or "").strip()

    titles = (
        ("absences", "Absences", "الغيابات"),
        ("security", "Security", "الأمن"),
    )
    groups: list[dict] = []
    for gid, title_en, title_ar in titles:
        people = sorted(
            buckets[gid].values(),
            key=lambda p: ((p.get("name") or "").lower(), p.get("empNo") or ""),
        )
        for person in people:
            person["dates"] = sorted(person.get("dates") or [])
        if people:
            groups.append(
                {
                    "id": gid,
                    "title_en": title_en,
                    "title_ar": title_ar,
                    "employees": people,
                }
            )
    return groups


def date_range_from_records(records: list[dict]) -> dict[str, str]:
    dates = [str(r.get("date") or "") for r in (records or []) if r.get("date")]
    if not dates:
        return {"from": "", "to": ""}
    return {"from": min(dates), "to": max(dates)}


def existing_records_match(path: str, processed: int, records: list[dict]) -> bool:
    p = Path(path)
    if not p.is_file():
        return False
    try:
        current = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    if current.get("total_records") != processed or current.get("records") != records:
        return False
    # Force a rewrite when older JSON is missing the independent list payload.
    return bool(current.get("groups")) and isinstance(current.get("date_range"), dict)


def write_absence_json(processed: int, records: list[dict], path: str = OUTPUT_PATH) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "generated_at": datetime.now().isoformat(),
                "total_records": processed,
                "date_range": date_range_from_records(records),
                "groups": build_absence_groups(records),
                "records": records,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )


def main():
    print("Loading absence report...")
    try:
        local_file = _absence_file()
        if local_file:
            data, content_type, source = load_absence_from_file(local_file)
            print(f"Using local file: {source}")
        else:
            if not _absence_download_urls() and not _absence_session_url():
                raise ValueError(
                    "No absence source URL. Set EXPORT_EXCEL_URL and/or ABSENCE_EXCEL_URL."
                )
            data, content_type, source = download_xlsb()
            print(f"Download succeeded from: {source}")
        archive_absence_file(data)
    except Exception as e:
        print(f"Failed to load absence file: {e}")
        sys.exit(1)

    try:
        sheets = extract_sheet_rows(data, content_type)
        processed, records = parse_absence_sheets(sheets)
    except Exception as e:
        print(f"Failed to parse xlsb: {e}")
        sys.exit(1)

    if processed == 0:
        print("Failed to parse absence file: 0 records (header/date format not recognized)")
        sys.exit(1)

    print(f"{processed} records | {len(records)} unique dates")
    if records:
        print(f"Range: {records[0]['date']} -> {records[-1]['date']}")

    if existing_records_match(OUTPUT_PATH, processed, records):
        print(f"Absence records unchanged; not rewriting {OUTPUT_PATH}")
        return

    write_absence_json(processed, records)
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
