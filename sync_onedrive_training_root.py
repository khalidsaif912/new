#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

import requests

from parse_training_source_html import parse_source_html


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def onedrive_to_download_url(url: str) -> str:
    """
    يحوّل رابط مشاركة OneDrive إلى رابط تنزيل مباشر للملف.
    
    روابط OneDrive المشتركة تفتح الـ viewer وليس الملف مباشرة.
    الحل: استبدال آخر جزء في الرابط بـ download=1
    
    أنواع الروابط المدعومة:
      https://1drv.ms/u/s!Axxx
      https://onedrive.live.com/...
      https://<tenant>.sharepoint.com/:u:/...
    """
    if "download=1" in url.lower():
        return url

    # SharePoint / OneDrive for Business
    # مثال: https://company.sharepoint.com/:u:/g/personal/.../AbcXyz?e=token
    sp_match = re.match(r"(https://[^/]+\.sharepoint\.com/)(:[\w]+:/[^?]+)(\?.*)?", url)
    if sp_match:
        sep = "&" if "?" in url else "?"
        return url + sep + "download=1"

    # OneDrive personal short links (1drv.ms) أو onedrive.live.com
    if "1drv.ms" in url or "onedrive.live.com" in url:
        sep = "&" if "?" in url else "?"
        return url + sep + "download=1"

    # إذا كان الرابط يحتوي على download=1 بالفعل أو رابط مباشر
    return url


def sharepoint_download_aspx_candidates(share_url: str) -> list[str]:
    """
    روابط المشاركة من نوع :u:/g/personal/USER/ITEM غالباً تحتاج download.aspx
    مع باراميتر share= الرابط الكامل مشفّر.
    """
    out: list[str] = []
    m = re.match(
        r"(https://[^/]+\.sharepoint\.com)/:u:/g/personal/([^/]+)/([^/?]+)(\?[^#]*)?",
        share_url,
        re.I,
    )
    if not m:
        return out
    host = m.group(1)
    user_seg = m.group(2)
    enc = quote(share_url, safe="")
    out.append(f"{host}/personal/{user_seg}/_layouts/15/download.aspx?share={enc}")
    out.append(f"{host}/personal/{user_seg}/_layouts/15/download.aspx?SourceUrl={enc}")
    return out


def looks_like_auth_or_shell_html(html: str) -> bool:
    low = html.lower()
    if "<table" in low:
        return False
    markers = (
        'name="login"',
        "sign in to your account",
        "pickredirect",
        "you need permission",
        "access denied",
        "donthavesharepointaccess",
        "session expired",
        "id=\"login_form\"",
        "logon.microsoftonline.com",
    )
    return any(m in low for m in markers)


def fetch_training_html_candidates(share_url: str) -> tuple[bytes, str]:
    """
    يجرّب عدة روابط (download=1، download.aspx، إلخ) مع جلسة طلبات
    لتحسين احتمال الحصول على HTML الملف وليس واجهة SharePoint.
    """
    candidates: list[str] = []
    seen: set[str] = set()

    def add(u: str) -> None:
        u = u.strip()
        if u and u not in seen:
            seen.add(u)
            candidates.append(u)

    add(share_url)
    add(onedrive_to_download_url(share_url))
    for u in sharepoint_download_aspx_candidates(share_url):
        add(u)

    session = requests.Session()
    session.headers.update(
        {
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 training-page-sync"
            ),
        }
    )

    errors: list[str] = []
    try:
        seed = session.get(share_url, timeout=90, allow_redirects=True)
        if seed.status_code >= 400:
            errors.append(f"seed GET {share_url!r} -> HTTP {seed.status_code}")
    except requests.RequestException as exc:
        errors.append(f"seed GET failed: {exc}")

    last_body: bytes = b""
    last_url = ""

    for url in candidates:
        last_url = url
        try:
            response = session.get(url, timeout=120, allow_redirects=True)
            response.raise_for_status()
        except requests.RequestException as exc:
            errors.append(f"{url!r}: {exc}")
            continue

        content = response.content
        last_body = content
        text = content.decode("utf-8", errors="replace")

        if looks_like_auth_or_shell_html(text):
            errors.append(f"{url!r}: appears to be login/shell HTML (no <table>)")
            continue

        try:
            parsed = parse_source_html(text)
        except Exception as exc:
            errors.append(f"{url!r}: parse failed: {exc}")
            continue

        if parsed.get("months"):
            print(f"[INFO] training source fetched from: {url}")
            return content, url

        if "<table" in text.lower():
            print(f"[INFO] training HTML (has <table>) fetched from: {url}")
            return content, url

        errors.append(f"{url!r}: parsed months=0 and no <table> in body")

    preview = last_body[:800].decode("utf-8", errors="replace")
    err_lines = "\n".join(f"  - {line}" for line in errors[:12])
    raise RuntimeError(
        "تعذّر تنزيل HTML التدريب من OneDrive/SharePoint.\n"
        f"آخر URL جُرّب: {last_url}\n"
        "جرّب أحد الخيارات التالية في TRAINING_PAGE_SOURCE_URL:\n"
        "  • رابط مشاركة «Anyone with the link can view» للملف نفسه (.htm/.html).\n"
        "  • أو ارفع نسخة HTML إلى مسار عام (مثل raw.githubusercontent.com) وضع رابطها المباشر.\n"
        f"تفاصيل المحاولات:\n{err_lines}\n"
        f"بداية الاستجابة الأخيرة:\n{preview!r}\n"
    )


def download_shared_html(share_url: str) -> bytes:
    content, used_url = fetch_training_html_candidates(share_url)
    return content


def load_existing_archive(path: Path) -> dict:
    if not path.exists():
        return {"months": []}
    data = json.loads(path.read_text(encoding="utf-8"))
    if "months" not in data or not isinstance(data["months"], list):
        return {"months": []}
    return data


def merge_months(existing: dict, incoming: dict) -> dict:
    merged = {item["month_id"]: item for item in existing.get("months", []) if "month_id" in item}
    for item in incoming.get("months", []):
        if "month_id" in item:
            merged[item["month_id"]] = item
    return {"months": [merged[key] for key in sorted(merged.keys())]}


def write_if_changed(path: Path, content: bytes) -> bool:
    if path.exists() and path.read_bytes() == content:
        return False
    path.write_bytes(content)
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync shared HTML and rebuild pages under docs/training/.")
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--data-file", default="training_courses_data.json")
    parser.add_argument("--generator-script", default="generate_training_archive_pages.py")
    parser.add_argument("--site-output-dir", default="docs/training")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    data_file = (repo_root / args.data_file).resolve()
    generator_script = (repo_root / args.generator_script).resolve()
    site_output_dir = (repo_root / args.site_output_dir).resolve()

    share_url = os.environ.get("TRAINING_PAGE_SOURCE_URL")
    if not share_url:
        raise RuntimeError("Missing environment variable: TRAINING_PAGE_SOURCE_URL")

    payload = download_shared_html(share_url)
    incoming = parse_source_html(payload.decode("utf-8", errors="replace"))
    existing = load_existing_archive(data_file)
    merged = merge_months(existing, incoming)
    changed = write_if_changed(data_file, json.dumps(merged, ensure_ascii=False, indent=2).encode("utf-8"))

    subprocess.run([sys.executable, str(generator_script), str(data_file), "-o", str(site_output_dir)], check=True)

    print(f"[OK] synced source HTML into {data_file.name}")
    print(f"[OK] rebuilt training pages in {site_output_dir}")
    print(f"[INFO] data_changed={str(changed).lower()}")
    print(f"[INFO] source_sha256={sha256_bytes(payload).lower()}")
    print(f"[INFO] months_in_archive={len(merged.get('months', []))}")


if __name__ == "__main__":
    main()
