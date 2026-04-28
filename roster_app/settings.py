import os
from zoneinfo import ZoneInfo

EXCEL_URL = os.environ.get("EXCEL_URL", "").strip()

# Optional: a plain-text file containing the original roster filename
# (used to display the source name on the website).
SOURCE_NAME_URL = os.environ.get("SOURCE_NAME_URL", "").strip()
SOURCE_NAME_FALLBACK = os.environ.get("SOURCE_NAME_FALLBACK", "latest.xlsx").strip()

PAGES_BASE_URL = os.environ.get("PAGES_BASE_URL", "").strip()  # optional
TZ = ZoneInfo("Asia/Muscat")
AUTO_OPEN_ACTIVE_SHIFT_IN_FULL = True

# Local cache directory inside repo (committed by actions)
ROSTERS_DIR = os.environ.get("ROSTERS_DIR", "rosters").strip() or "rosters"

# Excel sheets
DEPARTMENTS = [
    ("Officers", "Officers"),
    ("Supervisors", "Supervisors"),
    ("Load Control", "Load Control"),
    ("Export Checker", "Export Checker"),
    ("Export Operators", "Export Operators"),
    ("Unassigned", "Unassigned"),
]

# For day-row matching only
DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

SHIFT_MAP = {
    "MN06": ("MN06", "Morning"),
    "ME06": ("ME06", "Morning"),
    "ME07": ("ME07", "Morning"),
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
