# -*- coding: utf-8 -*-
"""Build per-employee contact candidate lists for phone-match UI."""
import csv, json, re, urllib.request
from io import StringIO
from pathlib import Path
from difflib import SequenceMatcher

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "docs" / "tools" / "phone-match"
OUT_DIR.mkdir(parents=True, exist_ok=True)

url = "https://docs.google.com/spreadsheets/d/1IxxJHbvt3I61xb-yYVLTBSsh7hPpIcQ6/export?format=csv"
raw = urllib.request.urlopen(url).read().decode("utf-8-sig")
rows = list(csv.reader(StringIO(raw)))


def digs(s):
    return re.sub(r"\D", "", str(s or ""))


def norm_phone(s):
    d = digs(s)
    if d.startswith("00968"):
        d = d[5:]
    if d.startswith("0") and len(d) == 9:
        d = d[1:]
    if len(d) == 8 and d[0] in "79":
        return "968" + d
    if d.startswith("968") and len(d) == 11 and d[3] in "79":
        return d
    return ""


def clean_name(s):
    s = str(s or "").strip()
    s = re.sub(r"[✅⭐♾️⌚༊෴✿〄࿐~_·•‧․∙❤📸]+", " ", s)
    s = re.sub(r"[.\u200f\u200e]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"^[\W_]+", "", s, flags=re.UNICODE).strip()
    return s


def has_letters(s):
    return bool(re.search(r"[\u0600-\u06FFa-zA-Z]", s or ""))


def norm_ar(s):
    s = (s or "").strip()
    s = re.sub(r"[ًٌٍَُِّْـ]", "", s)
    s = (
        s.replace("أ", "ا")
        .replace("إ", "ا")
        .replace("آ", "ا")
        .replace("ة", "ه")
        .replace("ى", "ي")
        .replace("عبد ال", "عبدال")
    )
    return re.sub(r"\s+", " ", s).strip().lower()


def tokens(s):
    s2 = re.sub(r"[^a-z0-9\u0600-\u06ff\s]", " ", norm_ar(s))
    parts = [p for p in re.split(r"\s+", s2) if len(p) >= 2]
    stop = {"ابو", "أبو", "بن", "ابن", "ال", "mr", "mrs", "al", "and", "b"}
    return [p for p in parts if p not in stop]


contacts = []
seen_ph = set()
for i, r in enumerate(rows[1:], start=2):
    if not r:
        continue
    name = (r[0] if len(r) > 0 else "").strip()
    phone = (r[1] if len(r) > 1 else "").strip()
    p = norm_phone(phone) or norm_phone(name)
    cn = clean_name(name)
    if not p or p in seen_ph:
        continue
    if not has_letters(cn):
        continue
    seen_ph.add(p)
    contacts.append(
        {
            "id": f"c{i}",
            "row": i,
            "name": cn,
            "raw": name,
            "phone": p,
            "label": f"{cn} — {p}",
            "tok": tokens(cn),
            "ar_n": norm_ar(cn),
        }
    )

emps = json.loads((ROOT / "docs/schedules/index.json").read_text(encoding="utf-8"))[
    "employees"
]
names_map = json.loads((ROOT / "docs/name_translations.json").read_text(encoding="utf-8")).get(
    "names", {}
)

# existing phones
js = (ROOT / "docs/emp-contact.js").read_text(encoding="utf-8")
m = re.search(r"MANTLE_KEY\s*=\s*['\"]([^'\"]+)['\"]", js)
key = m.group(1) if m else ""
existing = {}
try:
    req = urllib.request.Request(
        "https://mantledb.sh/v2/roster-site-visits/phones",
        headers={"Accept": "application/json", "X-Mantle-Key": key},
    )
    mantle = json.loads(urllib.request.urlopen(req, timeout=20).read().decode())
    for row in mantle.get("phones") or []:
        if row and row.get("id"):
            existing[str(row["id"])] = {
                "phone": str(row.get("phone") or ""),
                "name": str(row.get("name") or ""),
            }
except Exception:
    pass

employees = []
for e in sorted(emps, key=lambda x: x["name"].lower()):
    eid = str(e["id"])
    en = e["name"].strip()
    ar = names_map.get(en.upper()) or names_map.get(en) or ""
    if not ar:
        for k, v in names_map.items():
            if k.replace("*", "").strip().upper() == en.upper():
                ar = v
                break
    etok = tokens(ar) + tokens(en)
    ear = norm_ar(ar)
    scored = []
    for c in contacts:
        score = 0.0
        if ear and c["ar_n"]:
            if c["ar_n"] == ear:
                score = 1.0
            elif ear in c["ar_n"] or c["ar_n"] in ear:
                score = 0.92
            else:
                r = SequenceMatcher(None, c["ar_n"], ear).ratio()
                if r >= 0.7:
                    score = max(score, r)
        inter = set(c["tok"]) & set(etok)
        inter = {t for t in inter if len(t) >= 3}
        if inter:
            fam = (tokens(ar)[-1:] + tokens(en)[-1:])
            bonus = 0.12 if any(t in inter for t in fam) else 0
            first = (tokens(ar)[:1] + tokens(en)[:1])
            bonus += 0.1 if any(t in inter for t in first) else 0
            ov = len(inter) / max(2, min(len(c["tok"]) or 1, len(etok) or 1))
            score = max(score, 0.5 + 0.3 * ov + bonus)
        # latin name in contact
        en_c = re.sub(r"[^a-z]", "", en.lower())
        cn_c = re.sub(r"[^a-z]", "", c["name"].lower())
        if en_c and cn_c and len(en_c) > 5 and (en_c in cn_c or cn_c in en_c):
            score = max(score, 0.88)
        if score >= 0.55:
            scored.append((score, c))
    scored.sort(key=lambda x: (-x[0], x[1]["name"]))
    # keep top 25 unique
    opts = []
    seen = set()
    for sc, c in scored[:40]:
        if c["phone"] in seen:
            continue
        seen.add(c["phone"])
        opts.append(
            {
                "phone": c["phone"],
                "name": c["name"],
                "raw": c["raw"],
                "score": round(sc, 3),
                "label": f"{c['name']} — {c['phone']}",
            }
        )
        if len(opts) >= 20:
            break

    employees.append(
        {
            "id": eid,
            "en": en,
            "ar": ar,
            "dept": e.get("department") or "",
            "currentPhone": (existing.get(eid) or {}).get("phone") or "",
            "candidates": opts,
            "suggested": opts[0]["phone"] if opts and opts[0]["score"] >= 0.85 else "",
        }
    )

# all named contacts for manual pick (compact)
all_contacts = [
    {"phone": c["phone"], "name": c["name"], "label": c["label"]}
    for c in sorted(contacts, key=lambda x: x["name"])
]

payload = {
    "sourceSheet": "https://docs.google.com/spreadsheets/d/1IxxJHbvt3I61xb-yYVLTBSsh7hPpIcQ6",
    "generatedAt": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
    "employees": employees,
    "allContacts": all_contacts,
    "summary": {
        "employees": len(employees),
        "namedContacts": len(all_contacts),
        "withCandidates": sum(1 for e in employees if e["candidates"]),
        "withSuggestion": sum(1 for e in employees if e["suggested"]),
        "alreadyHavePhone": sum(1 for e in employees if e["currentPhone"]),
    },
}
(OUT_DIR / "data.json").write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
print(json.dumps(payload["summary"], ensure_ascii=False))
