"""Bake Mantle banner overlay + announce popups into docs for offline fallback."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

MANTLE_BANNERS_URL = "https://mantledb.sh/v2/roster-site-visits/banners"
MANTLE_ANNOUNCE_URL = "https://mantledb.sh/v2/roster-site-visits/announce-popups"
MANTLE_KEY = "8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d"


def overlay_path(docs_dir: Path) -> Path:
    return docs_dir / "assets" / "banners" / "overlay.json"


def announce_path(docs_dir: Path) -> Path:
    return docs_dir / "assets" / "announce" / "popups.json"


def _mantle_get(url: str) -> tuple[int, str] | tuple[None, Exception]:
    req = urllib.request.Request(
        url + "?ts=generate",
        headers={"Accept": "application/json", "X-Mantle-Key": MANTLE_KEY},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as res:
            status = getattr(res, "status", 200)
            raw = res.read().decode("utf-8")
            return status, raw
    except Exception as err:
        return None, err


def snapshot_banner_overlay(docs_dir: Path) -> bool:
    """Refresh overlay.json from Mantle when reachable. Never wipe a good file on 429."""
    dest = overlay_path(docs_dir)
    dest.parent.mkdir(parents=True, exist_ok=True)
    status, raw = _mantle_get(MANTLE_BANNERS_URL)
    if status is None:
        err = raw
        if isinstance(err, urllib.error.HTTPError):
            print(f"WARNING: banner overlay snapshot HTTP {err.code}; keeping {dest.name}")
        else:
            print(f"WARNING: banner overlay snapshot skipped: {err}")
        return False

    if status != 200:
        print(f"WARNING: banner overlay snapshot status {status}; keeping {dest.name}")
        return False
    try:
        data = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        print("WARNING: banner overlay snapshot was not JSON; keeping file")
        return False
    if not isinstance(data, dict):
        return False
    payload = {
        "removed": list(data.get("removed") or []),
        "custom": list(data.get("custom") or []),
        "at": data.get("at") or 0,
    }
    dest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK: wrote {dest.as_posix()} (removed={len(payload['removed'])} custom={len(payload['custom'])})")
    return True


def snapshot_announce_popups(docs_dir: Path) -> bool:
    """Refresh announce popups.json from Mantle. Never wipe a good file on failure."""
    dest = announce_path(docs_dir)
    dest.parent.mkdir(parents=True, exist_ok=True)
    status, raw = _mantle_get(MANTLE_ANNOUNCE_URL)
    if status is None:
        err = raw
        if isinstance(err, urllib.error.HTTPError):
            if err.code == 404:
                if not dest.exists():
                    dest.write_text('{"items": [], "at": 0}\n', encoding="utf-8")
                print(f"OK: announce popups empty (404); kept/wrote {dest.name}")
                return True
            print(f"WARNING: announce popups snapshot HTTP {err.code}; keeping {dest.name}")
        else:
            print(f"WARNING: announce popups snapshot skipped: {err}")
        return False

    if status == 404:
        if not dest.exists():
            dest.write_text('{"items": [], "at": 0}\n', encoding="utf-8")
        print(f"OK: announce popups empty (404); kept/wrote {dest.name}")
        return True
    if status != 200:
        print(f"WARNING: announce popups snapshot status {status}; keeping {dest.name}")
        return False
    try:
        data = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        print("WARNING: announce popups snapshot was not JSON; keeping file")
        return False
    if not isinstance(data, dict):
        return False
    items = data.get("items") if isinstance(data.get("items"), list) else []
    payload = {"items": items, "at": data.get("at") or 0}
    dest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK: wrote {dest.as_posix()} (items={len(items)})")
    return True
