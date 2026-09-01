# -*- coding: utf-8 -*-
import csv, json, re, urllib.request
from io import StringIO
from pathlib import Path
from difflib import SequenceMatcher

ROOT = Path(__file__).resolve().parent

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
    s = re.sub(r"[✅⭐♾️⌚༊෴✿〄࿐~_·•‧․∙]+", " ", s)
    s = re.sub(r"[.\u200f\u200e]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    # drop leading checkmarks leftover
    s = re.sub(r"^[\W_]+", "", s, flags=re.UNICODE).strip()
    return s


def has_letters(s):
    return bool(re.search(r"[\u0600-\u06FFa-zA-Z]", s or ""))


contacts = []
for i, r in enumerate(rows[1:], start=2):
    if not r:
        continue
    name = (r[0] if len(r) > 0 else "").strip()
    phone = (r[1] if len(r) > 1 else "").strip()
    p = norm_phone(phone) or norm_phone(name)
    cn = clean_name(name)
    name_is_phone = (not has_letters(cn)) or digs(name) == digs(phone)
    if not p:
        continue
    contacts.append(
        {
            "row": i,
            "raw_name": name,
            "name": cn,
            "phone": p,
            "name_is_phone": bool(name_is_phone) or not cn,
        }
    )

emps = json.loads((ROOT / "docs/schedules/index.json").read_text(encoding="utf-8"))[
    "employees"
]
names_map = json.loads((ROOT / "docs/name_translations.json").read_text(encoding="utf-8")).get(
    "names", {}
)

# emp id -> en/ar
emp_info = {}
for e in emps:
    eid = str(e["id"])
    en = e["name"].strip()
    ar = names_map.get(en.upper()) or names_map.get(en) or ""
    # also try without extras
    if not ar:
        for k, v in names_map.items():
            if k.replace("*", "").strip().upper() == en.upper():
                ar = v
                break
    emp_info[eid] = {"id": eid, "en": en, "ar": ar, "dept": e.get("department", "")}


def norm_ar(s):
    s = (s or "").strip()
    s = re.sub(r"[ًٌٍَُِّْـ]", "", s)
    s = s.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ة", "ه").replace("ى", "ي")
    s = s.replace("عبد ال", "عبدال")
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s


def tokens(s):
    s = norm_ar(s)
    # also latin
    s2 = re.sub(r"[^a-z0-9\u0600-\u06ff\s]", " ", (s or "").lower())
    parts = [p for p in re.split(r"\s+", s2) if len(p) >= 2]
    # drop common noise
    stop = {"ابو", "أبو", "بن", "ابن", "ال", "mr", "mrs", "al"}
    return [p for p in parts if p not in stop and p != "ال"]


# Build searchable emp list
emp_search = []
for eid, info in emp_info.items():
    ar_n = norm_ar(info["ar"])
    en_n = info["en"].lower()
    emp_search.append(
        {
            **info,
            "ar_n": ar_n,
            "en_n": en_n,
            "tok": set(tokens(info["ar"]) + tokens(info["en"])),
        }
    )

# Existing mantle phones (best-effort with key from emp-contact.js)
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
        existing[str(row.get("id"))] = row
except Exception as e:
    mantle = {"error": str(e)}

named = [c for c in contacts if not c["name_is_phone"] and c["name"]]

matches = []
for c in named:
    cn = c["name"]
    cn_n = norm_ar(cn)
    ctok = set(tokens(cn))
    best = []
    for e in emp_search:
        score = 0.0
        why = []
        if e["ar_n"] and (cn_n == e["ar_n"] or cn_n in e["ar_n"] or e["ar_n"] in cn_n):
            score = max(score, 0.95 if cn_n == e["ar_n"] else 0.85)
            why.append("ar-substring")
        if e["ar_n"]:
            r = SequenceMatcher(None, cn_n, e["ar_n"]).ratio()
            if r >= 0.72:
                score = max(score, r)
                why.append(f"ar-fuzzy:{r:.2f}")
        # english contained in contact?
        en_compact = re.sub(r"[^a-z]", "", e["en_n"])
        cn_lat = re.sub(r"[^a-z]", "", cn.lower())
        if en_compact and cn_lat and (en_compact in cn_lat or cn_lat in en_compact):
            score = max(score, 0.9)
            why.append("en")
        # token overlap on family name (last token)
        if ctok and e["tok"]:
            inter = ctok & e["tok"]
            # prefer longer tokens
            inter = {t for t in inter if len(t) >= 3}
            if inter:
                # family-ish: last arabic token
                fam = tokens(e["ar"])[-1:] + tokens(e["en"])[-1:]
                bonus = 0.15 if any(t in inter for t in fam) else 0.0
                ov = len(inter) / max(2, min(len(ctok), len(e["tok"])))
                sc = 0.55 + 0.35 * ov + bonus
                if sc > score:
                    score = sc
                    why.append(f"tokens:{','.join(sorted(inter))}")
        if score >= 0.72:
            best.append((score, e, why))
    best.sort(key=lambda x: -x[0])
    if best:
        top = best[0]
        matches.append(
            {
                "contact": c,
                "score": round(top[0], 3),
                "why": top[2],
                "emp": {
                    "id": top[1]["id"],
                    "en": top[1]["en"],
                    "ar": top[1]["ar"],
                    "dept": top[1]["dept"],
                },
                "alts": [
                    {
                        "score": round(s, 3),
                        "id": e["id"],
                        "en": e["en"],
                        "ar": e["ar"],
                    }
                    for s, e, _ in best[1:4]
                ],
                "already": existing.get(top[1]["id"]),
            }
        )

# dedupe by emp id keeping highest score unique contact
matches.sort(key=lambda m: (-m["score"], m["contact"]["row"]))
seen_emp = set()
seen_phone = set()
unique = []
for m in matches:
    eid = m["emp"]["id"]
    ph = m["contact"]["phone"]
    if eid in seen_emp or ph in seen_phone:
        continue
    # skip if already same phone stored
    alr = m.get("already") or {}
    if digs(alr.get("phone")) == ph:
        m["status"] = "already_same"
    elif alr.get("phone"):
        m["status"] = "already_other"
    else:
        m["status"] = "new"
    seen_emp.add(eid)
    seen_phone.add(ph)
    unique.append(m)

out = {
    "summary": {
        "contacts_total": len(contacts),
        "named_contacts": len(named),
        "employees": len(emps),
        "with_ar_name": sum(1 for e in emp_info.values() if e["ar"]),
        "mantle_phones": len(existing),
        "candidate_matches": len(unique),
        "new": sum(1 for m in unique if m["status"] == "new"),
        "already_same": sum(1 for m in unique if m["status"] == "already_same"),
        "already_other": sum(1 for m in unique if m["status"] == "already_other"),
    },
    "queue": unique,
}
(ROOT / "_tmp_phone_match_queue.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(json.dumps(out["summary"], ensure_ascii=False))
print("---FIRST5---")
for m in unique[:5]:
    c = m["contact"]
    e = m["emp"]
    print(
        json.dumps(
            {
                "status": m["status"],
                "score": m["score"],
                "contact_name": c["name"],
                "phone": c["phone"],
                "emp_id": e["id"],
                "emp_en": e["en"],
                "emp_ar": e["ar"],
                "alts": m["alts"],
                "already": m.get("already"),
            },
            ensure_ascii=False,
        )
    )
