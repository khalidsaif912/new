from pathlib import Path
import re

p = Path(r"c:\Users\PC\Documents\GitHub\roster-site\docs\home.html")
t = p.read_text(encoding="utf-8")
t = t.replace("<title>Duty Roster</title>", "<title>Duty Roster · v20260807c</title>", 1)
t = t.replace("site-visits.js?v=20260807b", "site-visits.js?v=20260807c")
t = re.sub(r"change-alert\.js\?v=[^'\"]+", "change-alert.js?v=20260807c", t)
t = re.sub(r"holiday-ticker\.js\?v=[^'\"]+", "holiday-ticker.js?v=20260807c", t)
p.write_text(t, encoding="utf-8")
print("ok", "v20260807c" in p.read_text(encoding="utf-8"))
print("size", p.stat().st_size)
