#!/usr/bin/env python3
"""Patch training pages: topDock grid layout + A Cup of Book two-line label."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRAINING = ROOT / "docs" / "training"

OLD_TOP_DOCK = re.compile(
    r"\.topDock\{display:grid;grid-template-columns:1\.12fr[^}]+\}\s*"
    r"\.dockCard\{[^}]+\}\s*"
    r"\.dockCard:hover\{[^}]+\}\s*"
    r"\.dockCard:active\{[^}]+\}\s*"
    r"\.dockAction\{[^}]+\}",
    re.DOTALL,
)

NEW_TOP_DOCK_START = """.topDock{
  display:grid;
  grid-template-columns:repeat(5, minmax(0, 1fr));
  gap:10px;
  margin-top:18px;
  align-items:stretch;
}
.dockCard{
  min-width:0;width:100%;padding:12px 8px;border-radius:20px;
  min-height:76px;
  background:#fff;
  border:1px solid rgba(15,23,42,.07);
  box-shadow:var(--shadow-soft);
  transition:transform .28s ease,box-shadow .28s ease,border-color .28s ease;
  text-align:center;position:relative;overflow:hidden;
  touch-action:manipulation;
  -webkit-tap-highlight-color:transparent;
}
.dockCard:hover{
  transform:translateY(-5px);
  box-shadow:0 18px 40px rgba(15,23,42,.11);
  border-color:rgba(37,99,235,.16);
}
.dockCard:active{transform:translateY(-2px)}
.dockAction{cursor:pointer;border:none;font-family:inherit;background:#fff}"""

OLD_LABEL_BLOCK = re.compile(
    r"\.otherPageLabel\{padding-inline:2px[^}]*\}\s*"
    r"\.dockValue\{font-size:22px[^}]*\}\s*"
    r"\.searchGlyph\{[^}]*\}\s*"
    r"#searchToggle:hover \.searchGlyph\{[^}]*\}\s*"
    r"\.dockLabel,\.rosterLabel,\.savedName,\.otherPageLabel\{[^}]+\}\s*"
    r"\.otherPageLabel\{color:#5b3517\}\s*",
    re.DOTALL,
)

NEW_LABEL_BLOCK = """.dockValue{font-size:22px;font-weight:900;line-height:1;color:var(--blue);font-family:'Sora',sans-serif;letter-spacing:-.03em}
.searchGlyph{font-size:34px;line-height:1;display:inline-block;transition:transform .28s ease}
#searchToggle:hover .searchGlyph{transform:translateY(-3px) scale(1.08) rotate(-6deg)}
.dockLabel,.rosterLabel,.savedName,.otherPageLabel{
  margin-top:5px;
  font-size:clamp(7px, 1.85vw, 9px);
  font-weight:800;
  line-height:1.2;
  letter-spacing:.06em;
  color:var(--muted);
  text-align:center;
  text-transform:uppercase;
  white-space:normal;
  word-break:break-word;
  hyphens:auto;
  max-width:100%;
  padding:0 3px;
}
.otherPageLabel{
  color:#5b3517;
  text-transform:none;
  letter-spacing:.02em;
  font-size:clamp(7px, 1.7vw, 8px);
  line-height:1.15;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:1px;
}
.dockLabelLine{display:block}
.rosterLabel{color:var(--blue2)}
"""

OLD_MQ720 = re.compile(
    r"  \.topDock\{grid-template-columns:\.80fr[^}]+\}\s*"
    r"  \.dockCard\{padding:10px 6px[^}]+\}\s*"
    r"  \.statsTicker\{height:42px\}[^}]*\}\s*"
    r"  \.rosterIcon\{width:30px;height:30px\}",
    re.DOTALL,
)

NEW_MQ720 = """  .topDock{
    grid-template-columns:repeat(4, minmax(0, 1fr));
    grid-template-rows:auto auto;
    gap:10px;
    margin-top:14px;
  }
  .statsCard{grid-column:1 / -1}
  .dockCard{padding:11px 6px;border-radius:18px;min-height:70px}
  .statsTicker{height:44px}
  .statsValue{font-size:24px}
  .statsLabel{font-size:8px;letter-spacing:.08em}
  .savedIcon{width:34px;height:34px;font-size:16px}
  .otherPageInner{min-height:48px;padding-inline:2px}
  .otherIcon{width:30px;height:30px}
  .bookCupIcon{width:58px;height:58px}
  .rosterIcon{width:30px;height:30px}
  .dockLabel,.rosterLabel,.savedName{font-size:8px}
  .otherPageLabel{font-size:7.5px}"""

OLD_MQ420 = re.compile(
    r"  \.topDock\{grid-template-columns:\.76fr[^}]+\}\s*"
    r"  \.dockCard\{padding:8px 5px[^}]+\}\s*"
    r"  \.statsTicker\{height:38px\}",
    re.DOTALL,
)

NEW_MQ420 = """  .topDock{gap:8px}
  .dockCard{padding:10px 5px;border-radius:16px;min-height:66px}
  .statsTicker{height:40px}"""

CUP_LABEL_OLD = (
    '<div class="dockLabel otherPageLabel">A Cup of Book</div></div>'
)
CUP_LABEL_NEW = (
    '<div class="dockLabel otherPageLabel" aria-label="A Cup of Book">'
    '<span class="dockLabelLine">A Cup</span>'
    '<span class="dockLabelLine">of Book</span></div></div>'
)


def patch_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    orig = text
    notes: list[str] = []

    if "grid-template-columns:repeat(5, minmax(0, 1fr))" not in text:
        if OLD_TOP_DOCK.search(text):
            text = OLD_TOP_DOCK.sub(NEW_TOP_DOCK_START, text, count=1)
            notes.append("topDock")
        elif ".topDock{display:grid;grid-template-columns:1.12fr" in text:
            text = text.replace(
                ".topDock{display:grid;grid-template-columns:1.12fr .74fr .58fr .82fr .96fr;gap:12px;margin-top:18px;align-items:stretch}",
                ".topDock{display:grid;grid-template-columns:repeat(5, minmax(0, 1fr));gap:10px;margin-top:18px;align-items:stretch}",
                1,
            )
            text = text.replace(
                "text-align:center;position:relative;overflow:visible;",
                "text-align:center;position:relative;overflow:hidden;touch-action:manipulation;-webkit-tap-highlight-color:transparent;min-height:76px;",
                1,
            )
            notes.append("topDock-fallback")

    if ".dockLabelLine{display:block}" not in text:
        if OLD_LABEL_BLOCK.search(text):
            text = OLD_LABEL_BLOCK.sub(NEW_LABEL_BLOCK, text, count=1)
            notes.append("labels")
        text = re.sub(
            r"\.rosterLabel\{color:var\(--blue2\);font-weight:700;font-size:10px;overflow:hidden;text-overflow:ellipsis\}\s*",
            "",
            text,
            count=1,
        )

    if "grid-template-columns:repeat(4, minmax(0, 1fr))" not in text:
        if OLD_MQ720.search(text):
            text = OLD_MQ720.sub(NEW_MQ720, text, count=1)
            notes.append("mq720")
        elif ".topDock{grid-template-columns:.80fr 62px" in text:
            text = text.replace(
                "  .topDock{grid-template-columns:.80fr 62px 54px 66px 70px;gap:8px;margin-top:14px}",
                NEW_MQ720.split(".rosterIcon")[0].rstrip(),
                1,
            )
            notes.append("mq720-fallback")

    if ".topDock{gap:8px}" not in text.split("@media(max-width:420px)")[1][:400] if "@media(max-width:420px)" in text else "":
        if OLD_MQ420.search(text):
            text = OLD_MQ420.sub(NEW_MQ420, text, count=1)
            notes.append("mq420")
        elif "  .topDock{grid-template-columns:.76fr 56px" in text:
            text = text.replace(
                "  .topDock{grid-template-columns:.76fr 56px 48px 62px 64px;gap:6px}\n  .dockCard{padding:8px 5px;border-radius:16px}\n  .statsTicker{height:38px}",
                NEW_MQ420 + "\n  .statsValue{font-size:22px}",
                1,
            )
            notes.append("mq420-fallback")

    if CUP_LABEL_OLD in text:
        text = text.replace(CUP_LABEL_OLD, CUP_LABEL_NEW)
        notes.append("cup-label")

    if "  .dockLabel,.rosterLabel,.savedName{font-size:7px" not in text and "@media(max-width:420px)" in text:
        text = text.replace(
            "  .peopleBadge{min-width:32px;height:32px;font-size:10px}",
            "  .dockLabel,.rosterLabel,.savedName{font-size:7px;letter-spacing:.05em}\n  .otherPageLabel{font-size:7px}\n  .peopleBadge{min-width:32px;height:32px;font-size:10px}",
            1,
        )
        notes.append("mq420-labels")

    if text != orig:
        path.write_text(text, encoding="utf-8", newline="\n")
    return notes


def main() -> int:
    changed = 0
    for path in sorted(TRAINING.rglob("*.html")):
        notes = patch_file(path)
        if notes:
            changed += 1
            print(f"patched {path.relative_to(ROOT)}: {', '.join(notes)}")
    print(f"done: {changed} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
