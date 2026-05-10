#!/usr/bin/env python3
"""Download and store A Cup of Book image from SharePoint-like links."""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from io import BytesIO
from pathlib import Path
from typing import Iterable
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import requests
from PIL import Image, UnidentifiedImageError

IMAGE_DIR = Path("docs/a-cup-of-book/images")
INDEX_HTML = Path("docs/a-cup-of-book/index.html")
ENV_URL_KEY = "A_CUP_OF_BOOK"
NAME_RE = re.compile(r"^cup_of_book_(\d+)\.(?:jpe?g|png|webp)$", re.IGNORECASE)
FILES_BLOCK_RE = re.compile(r"var\s+FILES\s*=\s*\[[\s\S]*?\]\s*;", re.MULTILINE)
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


class DownloadValidationError(RuntimeError):
    """Raised when remote response is not a valid image payload."""


def is_sharepoint_like_host(hostname: str) -> bool:
    host = (hostname or "").lower()
    return (
        "sharepoint.com" in host
        or "onedrive.live.com" in host
        or host.endswith("1drv.ms")
        or ".1drv.ms" in host
    )


def ensure_download_params(url: str) -> str:
    """Add/override download parameters for SharePoint-like URLs only."""
    parsed = urlparse(url)
    if not is_sharepoint_like_host(parsed.hostname or ""):
        return url

    query_pairs = parse_qsl(parsed.query, keep_blank_values=True)
    filtered_pairs = [(k, v) for (k, v) in query_pairs if k not in {"download", "web"}]
    filtered_pairs.extend([("download", "1"), ("web", "0")])
    new_query = urlencode(filtered_pairs, doseq=True)
    return urlunparse(parsed._replace(query=new_query))


def sniff_image_type(payload: bytes) -> str | None:
    if payload.startswith(b"\xFF\xD8\xFF"):
        return "jpeg"
    if payload.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if len(payload) >= 12 and payload[:4] == b"RIFF" and payload[8:12] == b"WEBP":
        return "webp"
    return None


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def bytes_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def existing_image_files(image_dir: Path) -> Iterable[Path]:
    if not image_dir.exists():
        return []
    return sorted(
        p
        for p in image_dir.iterdir()
        if p.is_file()
        and p.suffix.lower() in ALLOWED_IMAGE_EXTENSIONS
        and NAME_RE.match(p.name)
    )


def cup_sequence(name: str) -> int:
    m = NAME_RE.match(name)
    return int(m.group(1)) if m else 10**9


def next_target_path(image_dir: Path) -> Path:
    max_num = 0
    for p in existing_image_files(image_dir):
        m = NAME_RE.match(p.name)
        if not m:
            continue
        max_num = max(max_num, int(m.group(1)))
    return image_dir / f"cup_of_book_{max_num + 1:02d}.jpg"


def remove_duplicate_cup_images(image_dir: Path) -> int:
    """Drop files that have identical bytes to an earlier cup_of_book_* image (keep lowest sequence)."""
    files = sorted(existing_image_files(image_dir), key=lambda p: (cup_sequence(p.name), p.name.lower()))
    by_hash: dict[str, list[Path]] = {}
    for p in files:
        h = file_sha256(p)
        by_hash.setdefault(h, []).append(p)

    removed = 0
    for paths in by_hash.values():
        if len(paths) <= 1:
            continue
        keep = min(paths, key=lambda p: (cup_sequence(p.name), p.name.lower()))
        for p in paths:
            if p == keep:
                continue
            p.unlink(missing_ok=True)
            removed += 1
            print(f"Removed duplicate image (same as {keep.name}): {p.name}")
    return removed


def gallery_filenames(image_dir: Path) -> list[str]:
    files = sorted(existing_image_files(image_dir), key=lambda p: (cup_sequence(p.name), p.name.lower()))
    return [p.name for p in files]


def sync_index_html_files_list(index_path: Path, image_dir: Path) -> bool:
    """Rewrite `var FILES = [...]` in the gallery page to match files on disk."""
    if not index_path.is_file():
        return False
    text = index_path.read_text(encoding="utf-8")
    if not FILES_BLOCK_RE.search(text):
        return False
    names = gallery_filenames(image_dir)
    new_block = "var FILES = " + json.dumps(names, ensure_ascii=False) + ";"
    updated = FILES_BLOCK_RE.sub(new_block, text, count=1)
    if updated == text:
        return False
    index_path.write_text(updated, encoding="utf-8")
    print(f"Updated gallery list in {index_path.as_posix()} ({len(names)} file(s))")
    return True


def convert_to_jpeg_bytes(payload: bytes) -> bytes:
    try:
        with Image.open(BytesIO(payload)) as img:
            rgb_img = img.convert("RGB")
            out = BytesIO()
            rgb_img.save(out, format="JPEG", quality=95, optimize=True)
            return out.getvalue()
    except (UnidentifiedImageError, OSError) as exc:
        raise DownloadValidationError(f"Failed to decode image with Pillow: {exc}") from exc


def download_image(url: str) -> tuple[bytes, str, str]:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; CupOfBookBot/1.0; +https://github.com/actions)",
        "Accept": "image/*,*/*",
    }
    response = requests.get(
        url,
        timeout=60,
        allow_redirects=True,
        headers=headers,
    )
    response.raise_for_status()

    payload = response.content
    content_type = response.headers.get("Content-Type", "")
    final_url = response.url
    detected = sniff_image_type(payload)

    if detected is None:
        first_16_hex = payload[:16].hex(" ")
        raise DownloadValidationError(
            "Downloaded payload is not a valid JPG/PNG/WEBP image.\n"
            f"Content-Type: {content_type}\n"
            f"Final URL: {final_url}\n"
            f"First 16 bytes (hex): {first_16_hex}"
        )

    return payload, content_type, final_url


def main() -> int:
    raw_url = (os.getenv(ENV_URL_KEY) or "").strip()
    if not raw_url:
        print(f"Missing required environment variable: {ENV_URL_KEY}", file=sys.stderr)
        return 1

    normalized_url = ensure_download_params(raw_url)
    print(f"Downloading from: {normalized_url}")

    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    remove_duplicate_cup_images(IMAGE_DIR)

    try:
        payload, content_type, final_url = download_image(normalized_url)
    except requests.RequestException as exc:
        print(f"Download failed: {exc}", file=sys.stderr)
        sync_index_html_files_list(INDEX_HTML, IMAGE_DIR)
        return 1
    except DownloadValidationError as exc:
        print(str(exc), file=sys.stderr)
        sync_index_html_files_list(INDEX_HTML, IMAGE_DIR)
        return 1

    existing_files = list(existing_image_files(IMAGE_DIR))
    existing_hashes = {file_sha256(p) for p in existing_files}

    original_hash = bytes_sha256(payload)
    if original_hash in existing_hashes:
        print("Image already exists (same file bytes), skipping new file")
        sync_index_html_files_list(INDEX_HTML, IMAGE_DIR)
        return 0

    jpg_payload = convert_to_jpeg_bytes(payload)
    jpg_hash = bytes_sha256(jpg_payload)
    if jpg_hash in existing_hashes:
        print("Image already exists (same content after JPEG normalize), skipping new file")
        sync_index_html_files_list(INDEX_HTML, IMAGE_DIR)
        return 0

    target_path = next_target_path(IMAGE_DIR)
    target_path.write_bytes(jpg_payload)
    print(f"Saved new image: {target_path.as_posix()}")

    remove_duplicate_cup_images(IMAGE_DIR)
    sync_index_html_files_list(INDEX_HTML, IMAGE_DIR)

    print(f"Content-Type: {content_type}")
    print(f"Final URL: {final_url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
