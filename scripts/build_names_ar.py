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
TRAINING_SOURCES = [
    ROOT / "training" / "index.html",
    *sorted((ROOT / "training" / "archive").glob("*.html")),
]
OUT = ROOT / "roster-diff" / "names-ar.json"
RE = re.compile(r'data-name-ar="([^"]+)"[^>]*>([^<]+)<', re.I)
TRAINING_RE = re.compile(
    r'class="empCode">\s*(\d{3,})\s*</span>\s*<span class="empName"([^>]*)>', re.S
)
HONORIFIC = re.compile(r"^(?:السيد|السيدة|Mr\.?|Ms\.?|Mrs\.?)\s+", re.I)

# Not present in any roster snapshot; Arabic forms of the absence-file names.
MANUAL = {
    "81222": ("حميد بركات حميد البلوشي", "Humaid Barkat Humaid Al Balushi"),
    "82453": ("نايف درويش علي البلوشي", "Nayif Darwish Ali Al Balushi"),
    "82542": ("عبدالله خلف صالح المعولي", "Abdullah Khalaf Saleh Al-Maawali"),
    "82572": ("هيثم مبارك مرهون الهدابي", "Haitham Mubarak Marhoon Al Hadabi"),
    "82613": ("محمد إبراهيم شامبيه البلوشي", "Mohamed Ibrahim Shambeh Al Bulushi"),
    "990758": ("أنور محمد جمعة البلوشي", "Anwar Mohammed Juma Al Balushi"),
}


def norm_name(value: str) -> str:
    value = re.sub(r"-\s*\d+\s*$", "", value.strip()).lower()
    value = re.sub(r"[^a-z0-9\u0600-\u06ff]", " ", value)
    return re.sub(r"\s+", " ", value).strip()


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
            by_en[norm_name(en_name)] = ar_name
    return {"byId": by_id, "byEn": by_en}


def extract_training() -> dict:
    by_id: dict[str, str] = {}
    by_en: dict[str, str] = {}
    for path in TRAINING_SOURCES:
        if not path.exists():
            continue
        html = path.read_text(encoding="utf-8", errors="ignore")
        for eid, attrs in TRAINING_RE.findall(html):
            ar_m = re.search(r'data-name-ar="([^"]*)"', attrs)
            en_m = re.search(r'data-name-en="([^"]*)"', attrs)
            ar = HONORIFIC.sub("", (ar_m.group(1) if ar_m else "").strip())
            en = HONORIFIC.sub("", (en_m.group(1) if en_m else "").strip())
            if not ar:
                continue
            by_id.setdefault(eid, ar)
            if en:
                by_en.setdefault(norm_name(en), ar)
    return {"byId": by_id, "byEn": by_en}


def merge(target: dict, source: dict) -> None:
    for eid, ar in source.get("byId", {}).items():
        target["byId"].setdefault(eid, ar)
    for en, ar in source.get("byEn", {}).items():
        target["byEn"].setdefault(norm_name(en), ar)


def main() -> None:
    previous = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    payload = {}
    combined = {"byId": {}, "byEn": {}}
    for key, path in SOURCES.items():
        payload[key] = extract(path) if path.exists() else {"byId": {}, "byEn": {}}
        # Keep names of employees who since left the current roster snapshots.
        merge(payload[key], previous.get(key) or {"byId": {}, "byEn": {}})
        merge(combined, payload[key])
        print(key, "ids", len(payload[key]["byId"]), "en", len(payload[key]["byEn"]))

    payload["training"] = extract_training()
    payload["manual"] = {
        "byId": {eid: ar for eid, (ar, _) in MANUAL.items()},
        "byEn": {norm_name(en): ar for ar, en in MANUAL.values()},
    }
    merge(combined, payload["training"])
    merge(combined, payload["manual"])
    payload["all"] = combined
    print("training ids", len(payload["training"]["byId"]))
    print("all ids", len(combined["byId"]), "en", len(combined["byEn"]))

    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
