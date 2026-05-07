import os
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import requests


def _add_or_replace_query_param(url: str, key: str, value: str) -> str:
    parsed = urlparse(url)
    params = dict(parse_qsl(parsed.query, keep_blank_values=True))
    params[key] = value
    return urlunparse(parsed._replace(query=urlencode(params, doseq=True)))


def _normalize_share_link(url: str) -> str:
    if not url:
        return url
    host = (urlparse(url).netloc or "").lower()
    if ("onedrive.live.com" in host) or ("1drv.ms" in host) or ("sharepoint.com" in host):
        return _add_or_replace_query_param(url, "download", "1")
    return url


def download_excel(url: str) -> bytes:
    if not url or not url.strip():
        raise ValueError("EXCEL_URL is empty")

    normalized_url = _normalize_share_link(url.strip())
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,"
            "application/vnd.ms-excel.sheet.binary.macroenabled.12,"
            "application/octet-stream,*/*"
        ),
    }

    response = requests.get(
        normalized_url,
        headers=headers,
        timeout=60,
        allow_redirects=True,
    )
    response.raise_for_status()

    data = response.content or b""
    content_type = (response.headers.get("Content-Type") or "").lower()
    sig16 = data[:16].hex()
    is_xlsx = data.startswith(b"PK")
    is_ole = (data[:8] or b"").startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")

    print(f"Requested URL: {normalized_url}")
    print(f"Final URL: {response.url}")
    print(f"Content-Type: {content_type or 'unknown'}")
    print(f"First 16 bytes: {sig16}")

    if not (is_xlsx or is_ole):
        if "text/html" in content_type:
            raise ValueError(
                "URL returned an HTML page (preview/login) instead of Excel. "
                "Check share permissions and direct download settings."
            )
        if content_type.startswith("image/"):
            raise ValueError("URL returned an image payload, not an Excel file.")
        raise ValueError("Downloaded payload is not a valid Excel file (xlsx/xlsb).")

    return data


def main() -> None:
    excel_url = (os.environ.get("EXCEL_URL") or "").strip()
    data = download_excel(excel_url)
    out_path = "latest.xlsx"
    with open(out_path, "wb") as f:
        f.write(data)
    print(f"Download succeeded: {out_path}")
    print(f"Size bytes: {len(data)}")


if __name__ == "__main__":
    main()
