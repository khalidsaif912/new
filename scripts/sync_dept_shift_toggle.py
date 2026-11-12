#!/usr/bin/env python3
"""Add dept-head click: expand/collapse with the current shift open.

Legacy helper kept in sync with the generator. Pages generated after the
collapse-state change already contain the handler, so this is a no-op there.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

NEW_HANDLER = """    head.addEventListener('click', function() {
      if (suppressNextClick) return;
      var card = head.closest('.deptCard');
      if (!card) return;
      if (typeof window.rosterToggleDeptCard === 'function') {
        window.rosterToggleDeptCard(card);
      } else {
        card.classList.toggle('collapsed');
      }
    });
    head.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      e.preventDefault();
      head.click();
    });"""


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "rosterToggleDeptCard" in text:
        return False
    if "deptShiftToggleBound" in text:
        return False
    head = "      captureRosterElement(card, 'department');\n    });\n  });"
    if head not in text:
        return False
    text = text.replace(
        head,
        "      captureRosterElement(card, 'department');\n    });\n\n" + NEW_HANDLER + "\n  });",
        1,
    )
    path.write_text(text, encoding="utf-8", newline="\n")
    return True


def main() -> int:
    updated = 0
    for base in (ROOT / "docs",):
        for path in sorted(base.rglob("index.html")):
            if "my-schedule" in str(path).lower():
                continue
            if patch_file(path):
                updated += 1
    print(f"patched={updated}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
