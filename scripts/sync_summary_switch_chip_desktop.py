#!/usr/bin/env python3
"""Restore employees/departments summary chip, visible on large screens only.

Idempotent. Inserts #summarySwitchChip after Read&Sign (or before My Schedule),
adds desktop-only CSS, and restores the switch loop on home.html if missing.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

CHIP_HTML = """    <div class="summaryChip" id="summarySwitchChip">
      <div class="chipVal" id="summarySwitchVal">{emp}</div>
      <div class="chipLabel" id="summarySwitchLabel" data-key="employees">Employees</div>
    </div>
"""

CSS_SNIPPET = """    /* Emp/Depts count: large screens only (Read&Sign keeps the mobile slot) */
    #summarySwitchChip { display:none !important; }
    @media (min-width:1024px){
      #summarySwitchChip {
        display:flex !important;
        flex-direction:column;
        align-items:center;
        justify-content:center;
      }
    }
"""

HOME_INIT = """startSummarySwitchLoop();

(function bindSummarySwitchScroll() {
  var chip = document.getElementById('summarySwitchChip');
  if (!chip || chip.__scrollBound) return;
  chip.__scrollBound = true;
  chip.style.cursor = 'pointer';
  chip.setAttribute('role', 'button');
  chip.setAttribute('tabindex', '0');
  function ensureShuffleButton() {
    if (document.getElementById('bgTextureShuffleBtn')) return;
    try {
      var root = getSiteRootUrl();
      var src = root + '/bg-texture-shuffle.js?v=20260728c';
      if (document.querySelector('script[data-local-src="' + src + '"]')) return;
      var s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.setAttribute('data-local-src', src);
      document.body.appendChild(s);
    } catch (e) {}
  }
  function scrollToBottom() {
    ensureShuffleButton();
    function go() {
      var root = document.scrollingElement || document.documentElement;
      var top = Math.max(0, root.scrollHeight - root.clientHeight);
      window.scrollTo({ top: top, left: 0, behavior: 'smooth' });
    }
    go();
    // The "Shuffle background" button is injected lazily (requestIdleCallback,
    // up to ~3s), which grows the footer. Re-scroll several times so we always
    // land on the true bottom once that button appears.
    var delays = [150, 400, 800, 1400, 2200, 3200];
    delays.forEach(function (ms) { window.setTimeout(go, ms); });
  }
  chip.addEventListener('click', scrollToBottom);
  chip.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToBottom(); }
  });
})();

"""


def iter_html() -> list[Path]:
    paths: list[Path] = []
    for p in DOCS.rglob("*.html"):
        rel = p.relative_to(DOCS).as_posix()
        if rel.startswith("read-and-sign/"):
            continue
        paths.append(p)
    return paths


def extract_emp_count(text: str) -> int:
    m = re.search(
        r"window\.__summaryCounts\s*=\s*window\.__summaryCounts\s*\|\|\s*\{\s*employees:\s*(\d+)",
        text,
    )
    if m:
        return int(m.group(1))
    m = re.search(r"employees:\s*(\d+).*departments:", text)
    if m:
        return int(m.group(1))
    return 0


def ensure_css(text: str) -> tuple[str, bool]:
    if "#summarySwitchChip { display:none" in text or "#summarySwitchChip{display:none" in text:
        return text, False
    marker = "    #summarySwitchChip .chipVal { transition:opacity .2s ease; }"
    if marker in text:
        return text.replace(marker, CSS_SNIPPET + "\n" + marker, 1), True
    # Fallback: after readSignChip hover CSS
    alt = "    a.summaryChip.readSignChip:hover { box-shadow:0 8px 20px rgba(15,118,110,.18); }"
    if alt in text:
        return text.replace(alt, alt + "\n" + CSS_SNIPPET, 1), True
    return text, False


def ensure_chip(text: str) -> tuple[str, bool]:
    if 'id="summarySwitchChip"' in text:
        return text, False
    if 'id="readSignChipBtn"' not in text and 'id="myScheduleBtn"' not in text:
        return text, False

    emp = extract_emp_count(text)
    chip = CHIP_HTML.format(emp=emp)

    # Prefer: right after Read&Sign chip
    if 'id="readSignChipBtn"' in text:
        text2, n = re.subn(
            r'(<a\b[^>]*\bid="readSignChipBtn"[^>]*>[\s\S]*?</a>\s*)',
            r"\1" + chip,
            text,
            count=1,
        )
        if n:
            return text2, True

    # Fallback: before My Schedule
    text2, n = re.subn(
        r'(<a\b[^>]*\bid="myScheduleBtn")',
        chip + r"\1",
        text,
        count=1,
    )
    if n:
        return text2, True
    return text, False


def ensure_home_init(path: Path, text: str) -> tuple[str, bool]:
    if path.name != "home.html":
        return text, False
    if "startSummarySwitchLoop();" in text and "bindSummarySwitchScroll" in text:
        return text, False
    old = "/* summarySwitchChip (employees/departments) replaced by Read and Sign */\n"
    if old in text:
        return text.replace(old, HOME_INIT, 1), True
    # Insert before department layout block
    marker = "// Department layout: all sections open + time-based shift open"
    idx = text.find(marker)
    if idx == -1:
        return text, False
    # Find start of comment line before marker
    line_start = text.rfind("\n", 0, idx)
    insert_at = line_start + 1 if line_start != -1 else idx
    return text[:insert_at] + HOME_INIT + text[insert_at:], True


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8", errors="replace")
    if 'class="summaryBar"' not in text and "class='summaryBar'" not in text:
        return False

    changed = False
    text, c = ensure_css(text)
    changed = changed or c
    text, c = ensure_chip(text)
    changed = changed or c
    text, c = ensure_home_init(path, text)
    changed = changed or c

    if changed:
        path.write_text(text, encoding="utf-8")
    return changed


def main() -> int:
    updated = 0
    for path in iter_html():
        try:
            if patch_file(path):
                updated += 1
                print(f"updated {path.relative_to(ROOT)}")
        except Exception as exc:  # noqa: BLE001
            print(f"skip {path}: {exc}")
    print(f"done, updated {updated} file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
