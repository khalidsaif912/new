#!/usr/bin/env python3
"""Copy Mantle banner overlay into GitHub files when generate runs.

Public visitors read only GitHub files:

  docs/assets/banners/manifest.json
  docs/assets/banners/overlay.json
  docs/assets/banners/banner*.jpg
  docs/assets/banners/custom-*.jpg

They never GET Mantle for banners. Desk-log still writes Mantle so a later
generate (when the 10k quota is available) can snapshot into these files.

On HTTP 429 or network error: keep existing overlay.json, manifest.json, and
image files. Do not rewrite overlay to empty {removed:[], custom:[]} — that
would restore deleted banners and drop custom entries.

When overlay.removed lists a numbered banner, drop it from manifest.json
only. The jpg stays in the repo (archive, do not delete).
"""
from __future__ import annotations

import base64
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANTLE_NS = "roster-site-visits"
MANTLE_BASE = f"https://mantledb.sh/v2/{MANTLE_NS}"
OVERLAY_DOC = "banners"
IMAGE_PREFIX = "banner-img-"
MANTLE_KEY = "8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d"
CUSTOM_ID_RE = re.compile(r"^b[a-z0-9]{7,31}$", re.I)


def overlay_path(docs_dir: Path) -> Path:
    return Path(docs_dir) / "assets" / "banners" / "overlay.json"


def manifest_path(docs_dir: Path) -> Path:
    return Path(docs_dir) / "assets" / "banners" / "manifest.json"


def banners_dir(docs_dir: Path) -> Path:
    return Path(docs_dir) / "assets" / "banners"


def _empty_overlay() -> dict:
    return {"removed": [], "custom": [], "at": 0}


def _load_json(path: Path, fallback):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback
    return data if isinstance(data, type(fallback)) else fallback


def _write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _fetch_json(url: str, timeout: int = 12):
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "X-Mantle-Key": MANTLE_KEY},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    if not raw.strip():
        return None
    data = json.loads(raw)
    return data if isinstance(data, dict) else None


def _normalize_overlay(raw) -> dict:
    data = raw.get("data") if isinstance(raw, dict) and isinstance(raw.get("data"), dict) else raw
    if not isinstance(data, dict):
        data = {}
    removed = data.get("removed") if isinstance(data.get("removed"), list) else []
    custom = data.get("custom") if isinstance(data.get("custom"), list) else []
    at = data.get("at")
    try:
        at_n = int(at)
    except (TypeError, ValueError):
        at_n = 0
    return {
        "removed": [str(x) for x in removed],
        "custom": custom,
        "at": at_n,
    }


def custom_id_from_item(item) -> str:
    if not isinstance(item, dict):
        return ""
    raw = str(item.get("id") or item.get("key") or "").strip()
    if raw.startswith("custom:"):
        raw = raw[7:]
    return raw if CUSTOM_ID_RE.match(raw) else ""


def custom_filename(banner_id: str) -> str | None:
    bid = custom_id_from_item({"id": banner_id}) if banner_id else ""
    if not bid:
        bid = str(banner_id or "")
        if bid.startswith("custom:"):
            bid = bid[7:]
        if not CUSTOM_ID_RE.match(bid):
            return None
    return f"custom-{bid}.jpg"


def data_url_to_bytes(src: str) -> bytes | None:
    if not isinstance(src, str) or not src.startswith("data:image/"):
        return None
    if "," not in src:
        return None
    _header, b64 = src.split(",", 1)
    try:
        raw = base64.b64decode(b64, validate=False)
    except Exception:
        return None
    return raw or None


def _image_payload_src(payload) -> str:
    if not isinstance(payload, dict):
        return ""
    nested = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    for blob in (payload, nested):
        if not isinstance(blob, dict):
            continue
        if blob.get("deleted"):
            return ""
        for key in ("d", "src"):
            val = blob.get(key)
            if isinstance(val, str) and val.startswith("data:image/"):
                return val
    return ""


def download_custom_image(docs_dir: Path, banner_id: str) -> str | None:
    filename = custom_filename(banner_id)
    if not filename:
        return None
    bid = filename[len("custom-") : -len(".jpg")]
    encoded = urllib.parse.quote(f"{IMAGE_PREFIX}{bid}", safe="")
    url = f"{MANTLE_BASE}/{encoded}"
    try:
        payload = _fetch_json(url)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return None
    src = _image_payload_src(payload)
    raw = data_url_to_bytes(src)
    if not raw:
        return None
    dest = banners_dir(docs_dir) / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(raw)
    return filename


def apply_overlay_to_manifest(docs_dir: Path, overlay: dict) -> None:
    path = manifest_path(docs_dir)
    manifest = _load_json(path, {"banners": [], "layouts": {}})
    if not isinstance(manifest, dict):
        manifest = {"banners": [], "layouts": {}}
    banners_in = manifest.get("banners") if isinstance(manifest.get("banners"), list) else []
    layouts = manifest.get("layouts") if isinstance(manifest.get("layouts"), dict) else {}
    removed = {str(x) for x in (overlay.get("removed") or [])}

    kept = []
    seen = set()
    dropped = 0
    for name in banners_in:
        name = str(name or "").strip()
        if not name or name in seen:
            continue
        if name in removed or name.startswith("custom:"):
            if name in removed:
                dropped += 1
            continue
        seen.add(name)
        kept.append(name)

    custom_out = overlay.get("custom") if isinstance(overlay.get("custom"), list) else []
    for item in custom_out:
        bid = custom_id_from_item(item)
        if not bid:
            continue
        key = f"custom:{bid}"
        if key in seen:
            continue
        seen.add(key)
        kept.append(key)
        if isinstance(item, dict) and isinstance(item.get("layout"), dict):
            layouts[key] = item["layout"]

    for gone in list(layouts.keys()):
        if gone in removed or (str(gone).startswith("custom:") and gone not in seen):
            layouts.pop(gone, None)

    _write_json(path, {"banners": kept, "layouts": layouts})
    if dropped:
        print(f"manifest: archived {dropped} banner(s) from catalog (files kept)")


def snapshot_overlay_into(docs_dir: Path) -> dict:
    docs_dir = Path(docs_dir)
    dest = overlay_path(docs_dir)
    dest.parent.mkdir(parents=True, exist_ok=True)
    existing = _load_json(dest, _empty_overlay())
    if not isinstance(existing, dict):
        existing = _empty_overlay()

    if os.environ.get("ROSTER_SKIP_MANTLE_SNAPSHOT") == "1":
        print("ROSTER_SKIP_MANTLE_SNAPSHOT=1 — keeping existing overlay.json")
        return existing

    url = f"{MANTLE_BASE}/{OVERLAY_DOC}?ts=generate"
    try:
        payload = _fetch_json(url)
    except urllib.error.HTTPError as exc:
        print(f"WARNING: banner overlay snapshot HTTP {exc.code}; keeping {dest.name}", file=sys.stderr)
        return existing
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        print(f"WARNING: banner overlay snapshot skipped ({exc}); keeping {dest.name}", file=sys.stderr)
        return existing

    overlay = _normalize_overlay(payload)
    custom_out = []
    for item in overlay.get("custom") or []:
        if not isinstance(item, dict):
            continue
        bid = custom_id_from_item(item)
        entry = dict(item)
        if bid:
            filename = download_custom_image(docs_dir, bid)
            if filename:
                entry["id"] = bid
                entry["key"] = f"custom:{bid}"
                entry["src"] = f"assets/banners/{filename}"
            elif not entry.get("src"):
                print(f"custom image not fetched for {bid} — kept in overlay without file", file=sys.stderr)
        custom_out.append(entry)
    overlay["custom"] = custom_out
    _write_json(dest, overlay)
    apply_overlay_to_manifest(docs_dir, overlay)
    print(f"OK: wrote {dest.as_posix()} (removed={len(overlay['removed'])} custom={len(overlay['custom'])})")
    return overlay


def snapshot_banner_overlay(docs_dir: Path) -> bool:
    """Refresh overlay.json + custom-*.jpg from Mantle when reachable.

    Never wipe a good file on 429. Used by generate_and_send*.py.
    """
    before = overlay_path(docs_dir)
    before_text = before.read_text(encoding="utf-8") if before.is_file() else ""
    overlay = snapshot_overlay_into(docs_dir)
    after_text = before.read_text(encoding="utf-8") if before.is_file() else ""
    return after_text != before_text and isinstance(overlay, dict)


def snapshot_overlay() -> dict:
    return snapshot_overlay_into(ROOT / "docs")


def main() -> int:
    snapshot_overlay()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
