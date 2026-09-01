from pathlib import Path
import re
import subprocess

# Extract last good full index from git (commit before redirector)
# Prefer eff05d90d where static modal was added
raw = subprocess.check_output(
    ["git", "show", "eff05d90d:docs/index.html"],
    cwd=r"C:\Users\PC\Documents\GitHub\roster-site",
)
# git show returns bytes as utf-8 typically
text = raw.decode("utf-8")
text = text.replace("<title>Duty Roster</title>", "<title>Duty Roster · v20260807c</title>", 1)
text = text.replace("site-visits.js?v=20260807b", "site-visits.js?v=20260807c")
text = re.sub(r"change-alert\.js\?v=[^'\"]+", "change-alert.js?v=20260807c", text)
text = re.sub(r"holiday-ticker\.js\?v=[^'\"]+", "holiday-ticker.js?v=20260807c", text)
if "home-ui-force.js" not in text:
    text = text.replace(
        '<script src="site-visits.js?v=20260807c"></script>',
        '<script src="site-visits.js?v=20260807c"></script>\n  <script src="home-ui-force.js?v=20260807c"></script>',
        1,
    )
out = Path(r"C:\Users\PC\Documents\GitHub\roster-site\docs\home.html")
out.write_text(text, encoding="utf-8", newline="\n")
print("home size", out.stat().st_size)
print("V6", "rosterIdeasDoneV6" in text)
print("force", "home-ui-force.js" in text)
print("title", "v20260807c" in text)
