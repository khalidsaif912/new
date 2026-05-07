import json
import os
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import requests


def add_or_replace_query_param(url: str, key: str, value: str) -> str:
    parsed = urlparse(url)
    params = dict(parse_qsl(parsed.query, keep_blank_values=True))
    params[key] = value
    return urlunparse(parsed._replace(query=urlencode(params, doseq=True)))


def normalize_sharepoint_url(url: str) -> str:
    if not url:
        return url
    host = (urlparse(url).netloc or "").lower()
    if "sharepoint.com" not in host and "onedrive.live.com" not in host and "1drv.ms" not in host:
        return url
    out = add_or_replace_query_param(url, "download", "1")
    out = add_or_replace_query_param(out, "web", "0")
    return out


def detect_kind(data: bytes, content_type: str) -> str:
    if data.startswith(b"PK\x03\x04"):
        return "zip_excel_xlsx_or_xlsb_container"
    if (data[:8] or b"").startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        return "ole_excel_xls"
    if (data[:8] or b"").startswith(b"\x89PNG\r\n\x1a\n"):
        return "png_preview"
    ctype = (content_type or "").lower()
    if "text/html" in ctype:
        return "html_page"
    return "unknown"


def probe(label: str, raw_url: str) -> dict:
    if not raw_url:
        return {"label": label, "error": "URL is empty"}

    session = requests.Session()
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,application/xml;q=0.9,"
            "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*;q=0.8"
        ),
    }

    normalized = normalize_sharepoint_url(raw_url.strip())
    response = session.get(normalized, headers=headers, allow_redirects=True, timeout=60)
    response.raise_for_status()
    data = response.content or b""
    content_type = (response.headers.get("Content-Type") or "").lower()

    return {
        "label": label,
        "requested_url": normalized,
        "final_url": response.url,
        "status_code": response.status_code,
        "redirect_chain": [r.url for r in response.history] + [response.url],
        "content_type": content_type,
        "size_bytes": len(data),
        "first16_hex": data[:16].hex(),
        "kind": detect_kind(data, content_type),
    }


def main() -> None:
    export_url = (os.environ.get("EXPORT_EXCEL_URL") or os.environ.get("EXCEL_URL") or "").strip()
    absence_url = (os.environ.get("ABSENCE_EXCEL_URL") or "").strip()

    report = {"probes": []}

    try:
        report["probes"].append(probe("export_roster", export_url))
    except Exception as e:
        report["probes"].append({"label": "export_roster", "error": str(e)})

    try:
        report["probes"].append(probe("absence_report", absence_url))
    except Exception as e:
        report["probes"].append({"label": "absence_report", "error": str(e)})

    print(json.dumps(report, ensure_ascii=False, indent=2))

    with open("sharepoint_probe_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
