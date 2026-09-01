import re
import pathlib

root = pathlib.Path("docs")
new_ver = "20260811r1"
n = 0
paths = list(root.rglob("index.html")) + list(root.rglob("home.html"))
for p in paths:
    try:
        c = p.read_text(encoding="utf-8")
    except Exception:
        continue
    if "var ver = '" not in c and "site-apps.js?v=" not in c:
        continue
    n2 = re.sub(r"var ver = '[^']+'", f"var ver = '{new_ver}'", c)
    n2 = re.sub(r"site-apps\.js\?v=[^\"']+", f"site-apps.js?v={new_ver}", n2)
    if n2 != c:
        p.write_text(n2, encoding="utf-8", newline="\n")
        n += 1
print("updated", n)
for s in [
    "docs/home.html",
    "docs/date/2026-08-11/index.html",
    "docs/date/2026-08-01/index.html",
]:
    t = pathlib.Path(s).read_text(encoding="utf-8")
    m = re.search(r"var ver = '([^']+)'", t)
    print(s, m.group(1) if m else "none")
