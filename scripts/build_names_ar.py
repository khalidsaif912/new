#!/usr/bin/env python3
"""Build Arabic name lookup JSON from roster HTML pages."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "docs"
SOURCES = {
    "export": ROOT / "index.html",
    "import": ROOT / "import" / "index.html",
}
OUT = ROOT / "roster-diff" / "names-ar.json"
RE = re.compile(r'data-name-ar="([^"]+)"[^>]*>([^<]+)<', re.I)


def extract(path: Path) -> dict:
    html = path.read_text(encoding="utf-8", errors="ignore")
    by_id: dict[str, str] = {}
    by_en: dict[str, str] = {}
    for ar_full, en_full in RE.findall(html):
        ar_full = ar_full.strip()
        en_full = en_full.strip()
        if not ar_full or not en_full:
            continue
        id_m = re.search(r"(\d{3,})\s*$", en_full) or re.search(r"(\d{3,})\s*$", ar_full)
        eid = id_m.group(1) if id_m else ""
        en_name = re.sub(r"-\s*\d+\s*$", "", en_full).strip()
        ar_name = re.sub(r"-\s*\d+\s*$", "", ar_full).strip()
        if eid and eid not in by_id:
            by_id[eid] = ar_name
        if en_name:
            by_en[en_name.lower()] = ar_name
    return {"byId": by_id, "byEn": by_en}


def main() -> None:
    payload = {}
    for key, path in SOURCES.items():
        payload[key] = extract(path) if path.exists() else {"byId": {}, "byEn": {}}
        print(key, "ids", len(payload[key]["byId"]), "en", len(payload[key]["byEn"]))
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
