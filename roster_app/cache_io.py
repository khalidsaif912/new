import base64
import hashlib
import json
import os
import re
import time
from io import BytesIO
from urllib.parse import parse_qsl, quote, urlencode, urlparse, urlunparse

import requests
from openpyxl import load_workbook

from roster_app.settings import ROSTERS_DIR, SOURCE_NAME_FALLBACK, SOURCE_NAME_URL

DEBUG_SHAREPOINT_RESPONSE_PATH = "debug_sharepoint_response.png"
DEBUG_SHAREPOINT_HTML_PATH = "debug_sharepoint_response.html"

_EXCEL_URL_RE = re.compile(
    r"https?://[^\"'\s<>]+?\.(?:xlsx|xlsb|xls)(?:\?[^\"'\s<>]*)?",
    re.IGNORECASE,
)
_JSON_DOWNLOAD_URL_RE = re.compile(
    r'"(?:downloadUrl|DownloadUrl|@content\.downloadUrl)"\s*:\s*"([^"]+)"',
    re.IGNORECASE,
)
_RELATIVE_FILE_RE = re.compile(
    r'(?:href|src)=["\']([^"\']+\.(?:xlsx|xlsb|xls)(?:\?[^"\']*)?)["\']',
    re.IGNORECASE,
)
_SHARE_LINK_RE = re.compile(
    r"(https://[^/]+\.sharepoint\.com)/:(?P<kind>[a-z]):/(?:p|(?:g/personal))/(?P<user>[^/]+)/(?P<item>[^/?#]+)",
    re.IGNORECASE,
)
_PERSONAL_FILE_RE = re.compile(
    r"(https://[^/]+\.sharepoint\.com)/personal/([^/]+)/(.+)",
    re.IGNORECASE,
)

ABSENCE_FILE_NAMES = (
    "absence-report.xlsb",
    "absence-report.xlsx",
    "latest.xlsb",
    "Unauthorize Leave Report.xlsb",
    "Unauthorize Leave Report.xlsx",
    "Unauthorized Leave Report.xlsb",
    "Unauthorized Leave Report.xlsx",
)
ABSENCE_FOLDER_NAMES = (
    "AbsenceReports",
    "ABSENCE_UPLOADS",
    "Absence_UPLOADS",
    "Absences",
)
_ABSENCE_NAME_MARKERS = (
    "absence",
    "unauthor",
    "leave report",
    "غيابات",
    "august",
    "aug-",
    "aug_",
    "أغسطس",
)
_ROSTER_NAME_MARKERS = ("roster", "export", "import")


def _add_or_replace_query_param(url: str, key: str, value: str) -> str:
    u = urlparse(url)
    qs = dict(parse_qsl(u.query, keep_blank_values=True))
    qs[key] = value
    return urlunparse(u._replace(query=urlencode(qs, doseq=True)))


def _normalize_sharepoint_download_url(url: str, *, cache_bust: bool = True) -> str:
    if not url:
        return url
    u = urlparse(url)
    host = (u.netloc or "").lower()
    if ("sharepoint.com" not in host) and ("onedrive.live.com" not in host) and ("1drv.ms" not in host):
        out = url
    else:
        out = _add_or_replace_query_param(url, "download", "1")
        out = _add_or_replace_query_param(out, "web", "0")
    # Bust CDN/proxy caches when the sharing link is reused for an overwritten file.
    if cache_bust:
        out = _add_or_replace_query_param(out, "_cb", str(int(time.time() * 1000)))
    return out


def _unescape_extracted_url(raw: str) -> str:
    s = (raw or "").strip()
    if not s:
        return ""
    s = s.replace("\\/", "/").replace("\\u002f", "/").replace("\\u002F", "/")
    return s


def _sharepoint_origin(url: str) -> str:
    u = urlparse(url)
    if not u.netloc:
        return ""
    return f"{u.scheme or 'https'}://{u.netloc}"


def _personal_site_from_share(url: str) -> str:
    """Map :x:/p/8715_hq/... to https://tenant-my.sharepoint.com/personal/8715_hq_tenant_com."""
    m = _SHARE_LINK_RE.match(url or "")
    if not m:
        m2 = _PERSONAL_FILE_RE.match(url or "")
        if not m2:
            return ""
        return f"{m2.group(1)}/personal/{m2.group(2)}"
    origin = m.group(1)
    user = m.group("user")
    if "/personal/" in (url or "").lower() or user.lower().endswith("_com"):
        return f"{origin}/personal/{user}"
    host = urlparse(origin).netloc or ""
    tenant = host.split("-my.")[0].split(".")[0]
    return f"{origin}/personal/{user}_{tenant}_com"


def encode_sharing_url(url: str) -> str:
    raw = base64.urlsafe_b64encode((url or "").encode("utf-8")).decode("ascii").rstrip("=")
    return "u!" + raw


def sharepoint_download_aspx_candidates(url: str) -> list[str]:
    """download.aspx / :u: variants for Excel Online (:x:) guest links."""
    if not url:
        return []
    m = _SHARE_LINK_RE.match(url)
    personal = _personal_site_from_share(url)
    out: list[str] = []
    if m and personal:
        item = m.group("item")
        enc_full = quote(url, safe="")
        out.append(f"{personal}/_layouts/15/download.aspx?share={item}")
        out.append(f"{personal}/_layouts/15/download.aspx?share={enc_full}")
        out.append(f"{personal}/_layouts/15/guestaccess.aspx?share={item}&ga=1")
        kind = (m.group("kind") or "x").lower()
        user = m.group("user")
        origin = m.group(1)
        if kind == "x":
            e = dict(parse_qsl(urlparse(url).query)).get("e", "")
            as_file = f"{origin}/:u:/p/{user}/{item}"
            if e:
                as_file = f"{as_file}?e={e}"
            out.append(as_file)
    if personal:
        enc_full = quote(url, safe="")
        out.append(f"{personal}/_layouts/15/download.aspx?share={enc_full}")
    return [u for u in out if u]


def looks_like_absence_filename(name: str) -> bool:
    n = (name or "").strip().lower()
    if not n.endswith((".xlsx", ".xlsb", ".xls")):
        return False
    if any(marker in n for marker in _ROSTER_NAME_MARKERS):
        return False
    if n in {x.lower() for x in ABSENCE_FILE_NAMES}:
        return True
    if n.endswith(".xlsb"):
        return True
    return any(marker in n for marker in _ABSENCE_NAME_MARKERS)


def absence_sibling_urls(file_url: str) -> list[str]:
    """Guess absence report paths next to a working roster guest file URL."""
    if not file_url:
        return []
    u = urlparse(file_url)
    path = u.path or ""
    if not path:
        return []
    parent = path.rsplit("/", 1)[0]
    docs_idx = path.lower().find("/documents/")
    documents = path[: docs_idx + len("/Documents")] if docs_idx >= 0 else ""
    origin = _sharepoint_origin(file_url)
    if not origin:
        return []

    out: list[str] = []
    seen: set[str] = set()

    def add(server_path: str) -> None:
        candidate = _add_or_replace_query_param(origin + server_path, "ga", "1")
        if candidate not in seen:
            seen.add(candidate)
            out.append(candidate)

    for name in ABSENCE_FILE_NAMES:
        add(f"{parent}/{quote(name)}")
    if documents:
        for folder in ABSENCE_FOLDER_NAMES:
            for name in ABSENCE_FILE_NAMES[:4]:
                add(f"{documents}/{folder}/{quote(name)}")
    return out


def sharepoint_download_candidates(url: str, *, now_ms: int | None = None) -> list[str]:
    """URL variants for the same SharePoint/OneDrive sharing link.

    Guest links often redirect to the real ``.xlsb?ga=1`` file only when the
    original sharing URL is requested *without* ``download=1``. Forcing
    ``download=1`` on an Excel Online ``:x:`` link can return error.aspx
    ("you cannot access this document") instead of Excel.
    """
    if not url:
        return []
    ts = str(now_ms if now_ms is not None else int(time.time() * 1000))
    out: list[str] = []

    def add(candidate: str) -> None:
        if candidate and candidate not in out:
            out.append(candidate)

    add(url)
    add(_add_or_replace_query_param(url, "ga", "1"))
    for aspx in sharepoint_download_aspx_candidates(url):
        add(aspx)
    # download=1 last: it currently turns the team :x: workbook link into error.aspx.
    download_one = _add_or_replace_query_param(url, "download", "1")
    download_web = _add_or_replace_query_param(download_one, "web", "0")
    add(download_one)
    add(download_web)
    for base in (url, _add_or_replace_query_param(url, "ga", "1"), download_one, download_web):
        add(_add_or_replace_query_param(base, "_cb", ts))
    return out


def extract_sharepoint_file_urls(html: str, base_url: str = "") -> list[str]:
    """Pull Excel file URLs out of a SharePoint HTML interstitial / preview page."""
    if not html:
        return []
    found: list[str] = []

    def add(raw: str) -> None:
        candidate = _unescape_extracted_url(raw)
        if not candidate:
            return
        if candidate.startswith("//"):
            candidate = "https:" + candidate
        elif candidate.startswith("/") and base_url:
            origin = urlparse(base_url)
            candidate = urlunparse((origin.scheme or "https", origin.netloc, candidate, "", "", ""))
        if not candidate.lower().startswith("http"):
            return
        path = (urlparse(candidate).path or "").lower()
        if not path.endswith((".xlsx", ".xlsb", ".xls")) and "download.aspx" not in path.lower() and "guestaccess.aspx" not in path.lower():
            if ".xls" not in candidate.lower() and "download.aspx" not in candidate.lower():
                return
        if candidate not in found:
            found.append(candidate)

    for match in _JSON_DOWNLOAD_URL_RE.finditer(html):
        add(match.group(1))
    for match in _EXCEL_URL_RE.finditer(html):
        add(match.group(0).rstrip(").,;"))
    for match in _RELATIVE_FILE_RE.finditer(html):
        add(match.group(1))
    return found


def workbook_content_fingerprint(data: bytes) -> str:
    """
    Logical fingerprint of sheet cell values (ignores ZIP/xlsx metadata noise).
    Used to detect same-filename overwrites even when CDN/metadata quirks occur.
    """
    wb = load_workbook(BytesIO(data), read_only=True, data_only=True)
    h = hashlib.sha256()
    try:
        for sheet_name in wb.sheetnames:
            h.update(sheet_name.encode("utf-8", errors="replace"))
            h.update(b"\0")
            ws = wb[sheet_name]
            for row in ws.iter_rows(values_only=True):
                for cell in row:
                    if cell is None:
                        h.update(b"|")
                    else:
                        h.update(str(cell).encode("utf-8", errors="replace"))
                        h.update(b"|")
                h.update(b"\n")
    finally:
        wb.close()
    return h.hexdigest()


def _file_signature_hex16(data: bytes) -> str:
    return (data[:16] or b"").hex()


def _is_excel_signature(data: bytes) -> bool:
    head = data[:8] or b""
    # xlsx/zip
    if data.startswith(b"PK\x03\x04"):
        return True
    # xls (OLE compound)
    if head.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        return True
    return False


def _is_png_signature(data: bytes) -> bool:
    return (data[:8] or b"").startswith(b"\x89PNG\r\n\x1a\n")


def download_excel(url: str) -> bytes:
    """Download Excel bytes from SharePoint with browser-like session flow."""
    data, _meta = download_excel_with_meta(url)
    return data


def _response_meta(response: requests.Response, data: bytes) -> dict[str, str]:
    ctype = (response.headers.get("Content-Type") or "").lower()
    return {
        "etag": (response.headers.get("ETag") or response.headers.get("Etag") or "").strip(),
        "last_modified": (response.headers.get("Last-Modified") or "").strip(),
        "content_length": str(len(data)),
        "content_type": ctype,
        "final_url": response.url,
    }


def _log_download_attempt(response: requests.Response, data: bytes) -> None:
    redirect_urls = [resp.url for resp in response.history] + [response.url]
    meta = _response_meta(response, data)
    print(f"  Final URL: {response.url}")
    print("  Redirect chain:")
    for idx, u in enumerate(redirect_urls, start=1):
        print(f"    {idx}. {u}")
    print(f"  Content-Type: {meta['content_type'] or 'unknown'}")
    print(f"  Last-Modified: {meta['last_modified'] or 'n/a'}")
    print(f"  ETag: {meta['etag'] or 'n/a'}")
    print(f"  First 16 bytes hex: {_file_signature_hex16(data)}")
    print(f"  File size: {len(data):,} bytes")


def _save_non_excel_debug(data: bytes) -> None:
    if _is_png_signature(data):
        with open(DEBUG_SHAREPOINT_RESPONSE_PATH, "wb") as f:
            f.write(data)
        return
    if data:
        with open(DEBUG_SHAREPOINT_HTML_PATH, "wb") as f:
            f.write(data)


def _html_access_denied(html: str) -> bool:
    low = (html or "").lower()
    return (
        "لا يمكنك الوصول" in (html or "")
        or "you cannot access this document" in low
        or "sorry, you cannot access" in low
        or 'id="ms-error-body"' in low
        or "error.aspx" in low
    )


def _list_sharepoint_folder_files(session: requests.Session, folder_url: str, headers: dict[str, str]) -> list[str]:
    """List Excel files in a SharePoint folder using the current guest session."""
    u = urlparse(folder_url)
    path = (u.path or "").rstrip("/")
    if not path:
        return []
    if path.lower().endswith((".xlsx", ".xlsb", ".xls")):
        path = path.rsplit("/", 1)[0]
    personal = _personal_site_from_share(folder_url)
    if not personal:
        origin = _sharepoint_origin(folder_url)
        m = _PERSONAL_FILE_RE.match(folder_url)
        personal = f"{m.group(1)}/personal/{m.group(2)}" if m else origin
    if not personal:
        return []
    api = (
        f"{personal}/_api/web/GetFolderByServerRelativeUrl('{path}')"
        "/Files?$select=Name,ServerRelativeUrl,TimeLastModified"
    )
    try:
        response = session.get(
            api,
            headers={**headers, "Accept": "application/json;odata=nometadata"},
            timeout=45,
        )
    except requests.RequestException as exc:
        print(f"  Folder list failed: {exc}")
        return []
    if response.status_code >= 400:
        print(f"  Folder list HTTP {response.status_code} for {path}")
        return []
    try:
        payload = response.json()
    except ValueError:
        return []
    rows = payload.get("value") if isinstance(payload, dict) else None
    if rows is None and isinstance(payload, dict):
        rows = (payload.get("d") or {}).get("results")
    files: list[tuple[str, str]] = []
    origin = _sharepoint_origin(folder_url)
    for row in rows or []:
        name = str(row.get("Name") or "")
        rel = str(row.get("ServerRelativeUrl") or "")
        if not looks_like_absence_filename(name) or not rel:
            continue
        files.append((str(row.get("TimeLastModified") or ""), origin + rel))
    files.sort(reverse=True)
    return [_add_or_replace_query_param(item_url, "ga", "1") for _ts, item_url in files]


def download_excel_with_meta(
    url: str,
    *,
    session_seed_url: str | None = None,
    allow_sibling_absence_files: bool = False,
) -> tuple[bytes, dict[str, str]]:
    """Download Excel bytes and return response metadata useful for change detection."""
    if not url and not (allow_sibling_absence_files and session_seed_url):
        raise ValueError("EXCEL_URL is empty")
    session = requests.Session()
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,"
            "application/vnd.ms-excel,application/octet-stream,"
            "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"
        ),
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    }

    to_try: list[str] = []
    tried: set[str] = set()
    last_error = "Downloaded file is not recognized as Excel payload"
    last_data = b""
    saw_login = False
    saw_denied = False
    max_candidates = 40 if allow_sibling_absence_files else 20

    def enqueue(candidate: str, *, front: bool = False) -> None:
        if not candidate or candidate in tried or candidate in to_try:
            return
        if front:
            to_try.insert(0, candidate)
        else:
            to_try.append(candidate)

    seed = (session_seed_url or "").strip()
    if allow_sibling_absence_files and seed:
        print(f"  Seeding guest session from roster share: {seed[:120]}")
        try:
            seed_resp = session.get(seed, headers=headers, allow_redirects=True, timeout=60)
            seed_data = seed_resp.content or b""
            _log_download_attempt(seed_resp, seed_data)
            seed_host = (urlparse(seed_resp.url).netloc or "").lower()
            if "login.microsoftonline.com" in seed_host:
                print("  Roster seed reached login; continuing with absence URL only.")
            else:
                for sib in absence_sibling_urls(seed_resp.url):
                    enqueue(sib)
                parent = (urlparse(seed_resp.url).path or "").rsplit("/", 1)[0]
                origin = _sharepoint_origin(seed_resp.url)
                if parent and origin:
                    listed = _list_sharepoint_folder_files(session, seed_resp.url, headers)
                    for item in reversed(listed):
                        print(f"  Found absence candidate in shared folder: {item[:140]}")
                        enqueue(item, front=True)
                    docs_idx = parent.lower().find("/documents/")
                    if docs_idx >= 0:
                        documents = parent[: docs_idx + len("/Documents")]
                        extra_listed: list[str] = []
                        for folder in ABSENCE_FOLDER_NAMES:
                            extra_listed.extend(
                                _list_sharepoint_folder_files(
                                    session, origin + documents + "/" + folder + "/", headers
                                )
                            )
                        for item in reversed(extra_listed):
                            print(f"  Found absence candidate in extra folder: {item[:140]}")
                            enqueue(item, front=True)
        except requests.RequestException as exc:
            print(f"  Roster seed failed: {exc}")

    for candidate in sharepoint_download_candidates(url):
        enqueue(candidate)
    if allow_sibling_absence_files:
        personal = _personal_site_from_share(url or seed)
        if personal:
            enqueue(f"{personal}/Documents/AbsenceReports/absence-report.xlsb?ga=1")
            enqueue(f"{personal}/Documents/ROSTER_UPLOADS/absence-report.xlsb?ga=1")
            enqueue(f"{personal}/Documents/ABSENCE_UPLOADS/latest.xlsb?ga=1")
            enqueue(f"{personal}/Documents/ROSTER_UPLOADS/latest.xlsb?ga=1")

    for attempt, candidate in enumerate(to_try):
        if candidate in tried:
            continue
        tried.add(candidate)
        print(f"  Attempt {attempt + 1}: {candidate[:140]}")
        try:
            response = session.get(candidate, headers=headers, allow_redirects=True, timeout=30)
        except requests.RequestException as exc:
            last_error = f"Download request failed: {exc}"
            print(f"  {last_error}")
            continue
        if response.status_code >= 400:
            last_error = f"HTTP {response.status_code} for {candidate[:120]}"
            print(f"  {last_error}")
            continue
        data = response.content or b""
        _log_download_attempt(response, data)

        final_host = (urlparse(response.url).netloc or "").lower()
        if "login.microsoftonline.com" in final_host:
            saw_login = True
            last_error = "Reached login.microsoftonline.com for one candidate; trying remaining URLs."
            continue

        if _is_excel_signature(data):
            final_name = (urlparse(response.url).path or "").rsplit("/", 1)[-1].lower()
            if allow_sibling_absence_files and any(marker in final_name for marker in _ROSTER_NAME_MARKERS):
                print(f"  Skipping roster workbook {final_name!r}; looking for absence report.")
                continue
            if allow_sibling_absence_files and final_name == "latest.xlsx":
                print("  Skipping latest.xlsx roster file; looking for absence report.")
                continue
            return data, _response_meta(response, data)

        last_data = data
        last_ctype = (response.headers.get("Content-Type") or "").lower()
        last_sig = _file_signature_hex16(data)
        html = data.decode("utf-8", errors="replace") if not _is_png_signature(data) else ""
        if _html_access_denied(html):
            saw_denied = True
            last_error = (
                "SharePoint sharing link is denied or expired "
                "(error.aspx / cannot access this document). "
                "Overwrite AbsenceReports/absence-report.xlsb or "
                "ROSTER_UPLOADS/absence-report.xlsb instead of creating a new file."
            )
            continue
        last_error = (
            f"Downloaded file is not recognized as Excel payload "
            f"(Content-Type: {last_ctype or 'unknown'}; signature: {last_sig})"
        )

        if _is_png_signature(data):
            continue

        for extra in extract_sharepoint_file_urls(html, response.url):
            if extra not in tried and extra not in to_try and len(to_try) < max_candidates:
                print(f"  Found file URL in HTML: {extra[:140]}")
                to_try.append(extra)

    _save_non_excel_debug(last_data)
    if _is_png_signature(last_data):
        raise ValueError("SharePoint returned a preview image, not the Excel file. Use a direct download link.")
    if saw_denied:
        raise ValueError(last_error)
    if saw_login and "Excel payload" in last_error:
        raise ValueError("Reached login.microsoftonline.com. Check sharing link and direct download URL.")
    raise ValueError(last_error)


def download_text(url: str) -> str:
    bust = _add_or_replace_query_param(url, "_cb", str(int(time.time() * 1000))) if url else url
    r = requests.get(
        bust or url,
        timeout=30,
        headers={"Cache-Control": "no-cache", "Pragma": "no-cache"},
    )
    r.raise_for_status()
    return r.text.strip()


def get_source_name() -> str:
    if SOURCE_NAME_URL:
        try:
            name = download_text(SOURCE_NAME_URL)
            if name:
                return name
        except Exception:
            pass
    return SOURCE_NAME_FALLBACK or "latest.xlsx"


def infer_pages_base_url() -> str:
    return "https://khalidsaif912.github.io/roster-site"


MONTH_NAME_TO_NUM = {
    "january": 1,
    "jan": 1,
    "february": 2,
    "feb": 2,
    "march": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "may": 5,
    "june": 6,
    "jun": 6,
    "july": 7,
    "jul": 7,
    "august": 8,
    "aug": 8,
    "september": 9,
    "sep": 9,
    "sept": 9,
    "october": 10,
    "oct": 10,
    "november": 11,
    "nov": 11,
    "december": 12,
    "dec": 12,
}


_ROSTER_MONTH_HINT = re.compile(
    r"\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\b|20\d{2}",
    re.IGNORECASE,
)


def looks_like_roster_month_filename(name: str) -> bool:
    if not name:
        return False
    return bool(_ROSTER_MONTH_HINT.search(name))


def month_key_from_filename(name: str) -> str | None:
    if not name:
        return None
    n = name.lower()
    n = re.sub(r"[\._\-]+", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    # YYYY-MM or YYYY_MM in filename
    m = re.search(r"\b(20\d{2})[-_ ](0[1-9]|1[0-2])\b", n)
    if m:
        return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}"
    # Month name + year (space optional, e.g. "July 2026" or "July2026")
    m = re.search(
        r"\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)[\s_-]*(20\d{2})\b",
        n,
    )
    if not m:
        return None
    mon_name, year_s = m.group(1), m.group(2)
    mon = MONTH_NAME_TO_NUM.get(mon_name)
    if not mon:
        return None
    return f"{int(year_s):04d}-{mon:02d}"


def add_months(year: int, month: int, delta: int) -> tuple[int, int]:
    y = year
    m = month + delta
    while m <= 0:
        y -= 1
        m += 12
    while m > 12:
        y += 1
        m -= 12
    return y, m


def publish_month_keys(today_year: int, today_month: int, incoming_key: str | None = None) -> list[str]:
    """Months to generate: today±1, plus the incoming file month±1.

    Do not move "today" to the file's day-1. A late-September publish of
    October must still render 28 September from the September workbook, while
    still generating October pages from the new file.
    """
    keys: list[str] = []

    def add(year: int, month: int) -> None:
        key = f"{year:04d}-{month:02d}"
        if key not in keys:
            keys.append(key)

    prev_y, prev_m = add_months(today_year, today_month, -1)
    next_y, next_m = add_months(today_year, today_month, 1)
    add(prev_y, prev_m)
    add(today_year, today_month)
    add(next_y, next_m)
    if incoming_key and re.fullmatch(r"\d{4}-\d{2}", incoming_key.strip()):
        iy, im = int(incoming_key[:4]), int(incoming_key[5:7])
        ipy, ipm = add_months(iy, im, -1)
        iny, inm = add_months(iy, im, 1)
        add(ipy, ipm)
        add(iy, im)
        add(iny, inm)
    return sorted(keys)


def cache_paths(month_key: str) -> tuple[str, str]:
    os.makedirs(ROSTERS_DIR, exist_ok=True)
    return (
        os.path.join(ROSTERS_DIR, f"{month_key}.xlsx"),
        os.path.join(ROSTERS_DIR, f"{month_key}.meta.json"),
    )


def write_bytes(path: str, data: bytes):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)


def read_json(path: str) -> dict | None:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def write_json(path: str, obj: dict):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def try_load_cached_workbook(month_key: str):
    xlsx_path, _ = cache_paths(month_key)
    if not os.path.exists(xlsx_path):
        return None
    try:
        with open(xlsx_path, "rb") as f:
            return load_workbook(BytesIO(f.read()), data_only=True)
    except Exception:
        return None


def cached_source_name(month_key: str) -> str:
    _, meta_path = cache_paths(month_key)
    meta = read_json(meta_path) or {}
    return (meta.get("original_filename") or meta.get("source_name") or "").strip()
