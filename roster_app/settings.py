import os
from zoneinfo import ZoneInfo

EXCEL_URL = os.environ.get("EXCEL_URL", "").strip()

# Optional: a plain-text file containing the original roster filename
# (used to display the source name on the website).
SOURCE_NAME_URL = os.environ.get("SOURCE_NAME_URL", "").strip()
SOURCE_NAME_FALLBACK = os.environ.get("SOURCE_NAME_FALLBACK", "latest.xlsx").strip()

PAGES_BASE_URL = os.environ.get("PAGES_BASE_URL", "").strip()  # optional
TZ = ZoneInfo("Asia/Muscat")

# Local cache directory inside repo (committed by actions)
ROSTERS_DIR = os.environ.get("ROSTERS_DIR", "rosters").strip() or "rosters"

# Excel sheets
DEPARTMENTS = [
    ("Officers", "Officers"),
    ("Supervisors", "Supervisors"),
    ("Load Control", "Load Control"),
    ("Export Checker", "Export Checker"),
    ("Export Operators", "Export Operators"),
    ("Flight Dispatch", "Flight Dispatch"),
    ("FLTA", "FLTA"),
    ("Unassigned", "Unassigned"),
]

# Combined/settings tabs are not department cards (would duplicate or be empty).
SKIP_ROSTER_SHEETS = frozenset({
    "setting",
    "master",
    "full staffs as per jd",
})


def is_skipped_roster_sheet(name: str) -> bool:
    key = (name or "").strip().lower()
    return (not key) or key in SKIP_ROSTER_SHEETS or key.startswith("setting")


def ordered_department_sheets(sheetnames, hidden=None):
    """Known export depts first, then any extra visible roster sheets (Security, Absences, …)."""
    names = list(sheetnames or [])
    hidden = set(hidden or [])
    out: list[tuple[str, str]] = []
    seen: set[str] = set()
    for sheet_name, dept_name in DEPARTMENTS:
        if sheet_name in names and sheet_name not in hidden:
            out.append((sheet_name, dept_name))
            seen.add(sheet_name)
    for name in names:
        if name in seen or name in hidden or is_skipped_roster_sheet(name):
            continue
        out.append((name, (name or "").strip() or name))
        seen.add(name)
    return out

# For day-row matching only
DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

SHIFT_MAP = {
    "MN06": ("MN06", "Morning"),
    "ME06": ("ME06", "Morning"),
    "ME07": ("ME07", "Morning"),
    "ME12": ("ME12", "Morning"),
    "MN12": ("MN12", "Afternoon"),
    "AN13": ("AN13", "Afternoon"),
    "AE14": ("AE14", "Afternoon"),
    "NN21": ("NN21", "Night"),
    "NE22": ("NE22", "Night"),
}

GROUP_ORDER = [
    "Morning",
    "Afternoon",
    "Night",
    "Standby",
    "Off Day",
    "Annual Leave",
    "Sick Leave",
    "Training",
    "Other",
]
