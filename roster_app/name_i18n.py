"""Arabic name translation for employee rosters.

The site is bilingual (English / Arabic). Employee names come from the source
Excel in English only, so this module provides an Arabic rendering for each
name and – crucially – an easy way for the site owner to *correct* those
Arabic spellings by editing a single JSON file.

How it works
------------
* Every employee name is looked up in ``docs/name_translations.json`` by its
  English base name (the part before the ``- <id>`` suffix), upper-cased.
* If a name is missing from that file, a best-effort automatic transliteration
  is generated, stored back into the file, and the name is added to the
  ``auto_generated`` review list so the owner knows to double-check it.
* Existing entries are **never overwritten**, so any manual correction the
  owner makes is preserved across regenerations.

Editing guide (for the owner)
-----------------------------
Open ``docs/name_translations.json`` and change the Arabic value next to any
English name. That's it – the next time the pages are generated (or the moment
you switch the live page to Arabic) the corrected spelling is used.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[1]
TRANSLATIONS_PATH = REPO_ROOT / "docs" / "name_translations.json"

_INSTRUCTIONS = (
    "عدّل القيمة العربية لأي اسم لتصحيح ترجمته. المفتاح هو الاسم بالإنجليزية "
    "(بحروف كبيرة). لا تحذف الأسماء. تُطبّق الترجمة تلقائياً عند تبديل اللغة "
    "إلى العربية. الأسماء المُدرجة في auto_generated تُرجمت آلياً وتحتاج مراجعة؛ "
    "بعد تصحيح الاسم يمكنك حذفه من هذه القائمة."
)

# ── Common full-token spellings (English token -> Arabic) ──────────────────
# Covers the most frequent Omani / Arabic given names and particles so the
# automatic guess is close to correct for typical rosters.
_COMMON_TOKENS: Dict[str, str] = {
    "ABDUL": "عبد",
    "ABDULLA": "عبدالله",
    "ABDULLAH": "عبدالله",
    "ABDALLAH": "عبدالله",
    "ABDULRAHMAN": "عبدالرحمن",
    "ABDULRAHIM": "عبدالرحيم",
    "ABDULAZIZ": "عبدالعزيز",
    "ABDULLATIF": "عبداللطيف",
    "ABDULKARIM": "عبدالكريم",
    "ABDULMALIK": "عبدالمالك",
    "ABDULHAKIM": "عبدالحكيم",
    "ABDULQADIR": "عبدالقادر",
    "AHMED": "أحمد",
    "AHMAD": "أحمد",
    "AKRAM": "أكرم",
    "ALI": "علي",
    "AL": "ال",
    "AMER": "عامر",
    "AMIR": "أمير",
    "AMIRA": "أميرة",
    "AMIN": "أمين",
    "AMNA": "آمنة",
    "ANWAR": "أنور",
    "ARIF": "عارف",
    "ASHRAF": "أشرف",
    "ASMA": "أسماء",
    "AYA": "آية",
    "AYMAN": "أيمن",
    "AZIZ": "عزيز",
    "BADAR": "بدر",
    "BADR": "بدر",
    "BAKR": "بكر",
    "BASIM": "باسم",
    "BASMA": "بسمة",
    "BILAL": "بلال",
    "BIN": "بن",
    "BINT": "بنت",
    "DAWOOD": "داوود",
    "DAUD": "داوود",
    "FADHIL": "فاضل",
    "FADHEL": "فاضل",
    "FAHAD": "فهد",
    "FAHD": "فهد",
    "FAISAL": "فيصل",
    "FAROOQ": "فاروق",
    "FARUQ": "فاروق",
    "FATIMA": "فاطمة",
    "FATMA": "فاطمة",
    "FAWAZ": "فواز",
    "GHALIB": "غالب",
    "HABIB": "حبيب",
    "HAMAD": "حمد",
    "HAMDAN": "حمدان",
    "HAMED": "حامد",
    "HAMID": "حامد",
    "HAMZA": "حمزة",
    "HANI": "هاني",
    "HAITHAM": "هيثم",
    "HARITH": "حارث",
    "HASSAN": "حسن",
    "HASAN": "حسن",
    "HATIM": "حاتم",
    "HAYA": "هيا",
    "HILAL": "هلال",
    "HISHAM": "هشام",
    "HUDA": "هدى",
    "HUSSAIN": "حسين",
    "HUSSEIN": "حسين",
    "IBRAHIM": "إبراهيم",
    "IDREES": "إدريس",
    "IMRAN": "عمران",
    "ISA": "عيسى",
    "ISMAIL": "إسماعيل",
    "ISSA": "عيسى",
    "JABIR": "جابر",
    "JAMAL": "جمال",
    "JAMEEL": "جميل",
    "JASIM": "جاسم",
    "JASSIM": "جاسم",
    "JUMA": "جمعة",
    "JUMAA": "جمعة",
    "KAMAL": "كمال",
    "KARIM": "كريم",
    "KHALID": "خالد",
    "KHALED": "خالد",
    "KHALFAN": "خلفان",
    "KHAMIS": "خميس",
    "LATIFA": "لطيفة",
    "LAYLA": "ليلى",
    "LEENA": "لينا",
    "MAHER": "ماهر",
    "MAHMOUD": "محمود",
    "MAHMUD": "محمود",
    "MAJID": "ماجد",
    "MALIK": "مالك",
    "MANSOOR": "منصور",
    "MANSUR": "منصور",
    "MARIAM": "مريم",
    "MARYAM": "مريم",
    "MARWAN": "مروان",
    "MAZIN": "مازن",
    "MAZEN": "مازن",
    "MOHAMMED": "محمد",
    "MOHAMMAD": "محمد",
    "MOHAMED": "محمد",
    "MUHAMMAD": "محمد",
    "MOHD": "محمد",
    "MOOSA": "موسى",
    "MUSA": "موسى",
    "MUNA": "منى",
    "MUNIR": "منير",
    "MURAD": "مراد",
    "MUSTAFA": "مصطفى",
    "NABIL": "نبيل",
    "NADER": "نادر",
    "NADIR": "نادر",
    "NADIA": "نادية",
    "NAIF": "نايف",
    "NASER": "ناصر",
    "NASIR": "ناصر",
    "NASSER": "ناصر",
    "NAWAF": "نواف",
    "NIZAR": "نزار",
    "NOOR": "نور",
    "NOURA": "نورة",
    "OMAR": "عمر",
    "OSAMA": "أسامة",
    "OTHMAN": "عثمان",
    "QAIS": "قيس",
    "QASIM": "قاسم",
    "RAKAN": "راكان",
    "RASHID": "راشد",
    "RASHED": "راشد",
    "RAYAN": "ريان",
    "RIYADH": "رياض",
    "RIYAD": "رياض",
    "SAAD": "سعد",
    "SABAH": "صباح",
    "SAEED": "سعيد",
    "SAID": "سعيد",
    "SAIF": "سيف",
    "SALAH": "صلاح",
    "SALEH": "صالح",
    "SALIM": "سالم",
    "SALEM": "سالم",
    "SALMA": "سلمى",
    "SALMAN": "سلمان",
    "SAMI": "سامي",
    "SAMIR": "سمير",
    "SARA": "سارة",
    "SARAH": "سارة",
    "SATTAM": "سطام",
    "SAUD": "سعود",
    "SHADI": "شادي",
    "SHAKIR": "شاكر",
    "SHARIF": "شريف",
    "SIF": "سيف",
    "SULAIMAN": "سليمان",
    "SULAYMAN": "سليمان",
    "SULTAN": "سلطان",
    "TALAL": "طلال",
    "TALIB": "طالب",
    "TARIQ": "طارق",
    "TAREK": "طارق",
    "TAHA": "طه",
    "THAMER": "ثامر",
    "UMAR": "عمر",
    "USAMA": "أسامة",
    "WAEL": "وائل",
    "WALEED": "وليد",
    "WALID": "وليد",
    "YAHYA": "يحيى",
    "YAQOOB": "يعقوب",
    "YAQUB": "يعقوب",
    "YASIR": "ياسر",
    "YASSER": "ياسر",
    "YASER": "ياسر",
    "YOUSEF": "يوسف",
    "YOUSUF": "يوسف",
    "YUSUF": "يوسف",
    "YUNUS": "يونس",
    "ZAHRA": "زهراء",
    "ZAID": "زيد",
    "ZAYD": "زيد",
    "ZAKI": "زكي",
    "ZAKARIYA": "زكريا",
    "ZIYAD": "زياد",
}

# Multi-character digraphs handled before single letters.
_DIGRAPHS = [
    ("KH", "خ"),
    ("SH", "ش"),
    ("TH", "ث"),
    ("DH", "ذ"),
    ("GH", "غ"),
    ("PH", "ف"),
    ("CH", "تش"),
    ("CK", "ك"),
    ("OO", "و"),
    ("OU", "و"),
    ("EE", "ي"),
    ("AA", "ا"),
    ("AI", "اي"),
    ("AY", "اي"),
    ("EI", "ي"),
    ("EY", "ي"),
    ("IE", "ي"),
]

_SINGLE = {
    "A": "ا",
    "B": "ب",
    "C": "ك",
    "D": "د",
    "E": "ي",
    "F": "ف",
    "G": "ج",
    "H": "ه",
    "I": "ي",
    "J": "ج",
    "K": "ك",
    "L": "ل",
    "M": "م",
    "N": "ن",
    "O": "و",
    "P": "ب",
    "Q": "ق",
    "R": "ر",
    "S": "س",
    "T": "ت",
    "U": "و",
    "V": "ف",
    "W": "و",
    "X": "كس",
    "Y": "ي",
    "Z": "ز",
}

_ID_RE = re.compile(r"\s*-\s*(\d{3,})\s*$")


def split_name_id(full_name: str) -> tuple[str, Optional[str]]:
    """Split ``"AHMED KHALID - 12345"`` into ``("AHMED KHALID", "12345")``."""
    if not full_name:
        return "", None
    m = _ID_RE.search(full_name)
    if not m:
        return full_name.strip(), None
    base = full_name[: m.start()].strip()
    return base, m.group(1)


def _key_for(base_name: str) -> str:
    return re.sub(r"\s+", " ", base_name).strip().upper()


def _translit_token(token: str) -> str:
    """Best-effort transliteration of a single English token to Arabic."""
    up = token.upper()
    if up in _COMMON_TOKENS:
        return _COMMON_TOKENS[up]
    if not re.search(r"[A-Z]", up):
        return token  # digits / already Arabic – leave as-is

    out: List[str] = []
    i = 0
    n = len(up)
    while i < n:
        ch = up[i]
        pair = up[i : i + 2]
        matched = False
        for dg, ar in _DIGRAPHS:
            if pair == dg:
                # A leading long-vowel digraph collapses to a single alef.
                out.append(ar)
                i += 2
                matched = True
                break
        if matched:
            continue
        if ch.isalpha():
            # Drop a doubled consonant (e.g. "MM" -> single) for readability.
            if out and i > 0 and up[i - 1] == ch and ch not in "AEIOU":
                i += 1
                continue
            out.append(_SINGLE.get(ch, ch))
        i += 1
    return "".join(out)


def transliterate_name(base_name: str) -> str:
    """Transliterate a full (multi-token) English name to Arabic."""
    tokens = [t for t in re.split(r"\s+", base_name.strip()) if t]
    return " ".join(_translit_token(t) for t in tokens).strip()


class NameTranslator:
    """Loads / updates the Arabic name map for a generation run."""

    def __init__(self, path: Path = TRANSLATIONS_PATH):
        self.path = path
        self.names: Dict[str, str] = {}
        self.auto_generated: List[str] = []
        self._dirty = False
        self._load()

    def _load(self) -> None:
        if not self.path.is_file():
            return
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return
        raw = data.get("names", {}) if isinstance(data, dict) else {}
        if isinstance(raw, dict):
            self.names = {str(k): str(v) for k, v in raw.items()}
        auto = data.get("auto_generated", []) if isinstance(data, dict) else []
        if isinstance(auto, list):
            self.auto_generated = [str(x) for x in auto]

    def arabic_display(self, full_name: str) -> str:
        """Return the Arabic display string (with the ``- id`` suffix kept)."""
        base, emp_id = split_name_id(full_name)
        key = _key_for(base)
        if not key:
            return full_name
        ar_base = self.names.get(key)
        if not ar_base:
            ar_base = transliterate_name(base)
            self.names[key] = ar_base
            if key not in self.auto_generated:
                self.auto_generated.append(key)
            self._dirty = True
        if not ar_base:
            ar_base = base
        return f"{ar_base} - {emp_id}" if emp_id else ar_base

    def flush(self) -> None:
        """Persist newly discovered names back to the JSON file."""
        if not self._dirty and self.path.is_file():
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "_instructions": _INSTRUCTIONS,
            "names": {k: self.names[k] for k in sorted(self.names)},
            "auto_generated": sorted(set(self.auto_generated)),
        }
        self.path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        self._dirty = False


# Module-level singleton so standalone HTML-building helpers can reach it
# without threading the object through every function signature.
_ACTIVE: Optional[NameTranslator] = None


def get_translator() -> NameTranslator:
    global _ACTIVE
    if _ACTIVE is None:
        _ACTIVE = NameTranslator()
    return _ACTIVE


def arabic_display(full_name: str) -> str:
    return get_translator().arabic_display(full_name)


def flush() -> None:
    if _ACTIVE is not None:
        _ACTIVE.flush()
