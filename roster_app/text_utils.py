import re
from datetime import datetime

from roster_app.settings import SHIFT_MAP


def clean(v) -> str:
    if v is None:
        return ""
    return re.sub(r"\s+", " ", str(v).replace("\u00A0", " ")).strip()


def to_western_digits(s: str) -> str:
    if s is None:
        return ""
    s = str(s)
    arabic = {"٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9"}
    farsi = {"۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9"}
    mp = {**arabic, **farsi}
    return "".join(mp.get(ch, ch) for ch in s)


def norm(s) -> str:
    return clean(to_western_digits(s))


def looks_like_time(s: str) -> bool:
    up = norm(s).upper()
    return bool(
        re.match(r"^\d{3,4}\s*H?\s*-\s*\d{3,4}\s*H?$", up)
        or re.match(r"^\d{3,4}\s*H$", up)
        or re.match(r"^\d{3,4}$", up)
    )


def looks_like_employee_name(s: str) -> bool:
    v = norm(s)
    if not v:
        return False
    up = v.upper()
    if looks_like_time(up):
        return False
    if re.search(r"(ANNUAL\s*LEAVE|SICK\s*LEAVE|REST\/OFF\s*DAY|REST|OFF\s*DAY|TRAINING|STANDBY)", up):
        return False
    if re.search(r"-\s*\d{3,}", v) and re.search(r"[A-Za-z\u0600-\u06FF]", v):
        return True
    parts = [p for p in v.split(" ") if p]
    return bool(re.search(r"[A-Za-z\u0600-\u06FF]", v) and len(parts) >= 2)


def looks_like_shift_code(s: str) -> bool:
    v = norm(s).upper()
    if not v:
        return False
    if looks_like_time(v):
        return False
    if v in ["OFF", "O", "LV", "TR", "ST", "SL", "AL", "STM", "STN", "STNE22", "STME06", "STMN06", "STAE14", "OT"]:
        return True
    if re.match(r"^(MN|AN|NN|NT|ME|AE|NE)\d{1,2}", v):
        return True
    if re.search(r"(ANNUAL\s*LEAVE|SICK\s*LEAVE|REST\/OFF\s*DAY|REST|OFF\s*DAY|TRAINING|STANDBY)", v):
        return True
    if len(v) >= 3 and re.search(r"[A-Z]", v):
        return True
    return False


def map_shift(code: str):
    c0 = norm(code)
    c = c0.upper()
    if not c or c == "0":
        return ("-", "Other")
    if c == "AL" or c == "LV" or "ANNUAL LEAVE" in c:
        return ("AL", "Annual Leave")
    if c == "SL" or "SICK LEAVE" in c:
        return ("SL", "Sick Leave")
    if c in ["TR"] or "TRAINING" in c:
        return ("TR", "Training")
    if c in ["ST", "STM", "STN", "STNE22", "STME06", "STMN06", "STAE14"] or "STANDBY" in c:
        return (c0, "Standby")
    if c == "OT" or c.startswith("OT"):
        return (c0, "Standby")
    if c in ["OFF", "O"] or re.search(r"(REST|OFF\s*DAY|REST\/OFF)", c):
        return ("OFF", "Off Day")
    if c in SHIFT_MAP:
        return SHIFT_MAP[c]
    return (c0, "Other")


def current_shift_key(now: datetime) -> str:
    t = now.hour * 60 + now.minute
    if t >= 21 * 60 or t < 5 * 60:
        return "Night"
    if t >= 13 * 60:
        return "Afternoon"
    return "Morning"
