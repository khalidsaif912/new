#!/usr/bin/env python3
"""Add dept-head click to expand/collapse all shift cards on roster pages."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

OLD = """  document.querySelectorAll('.deptHead').forEach(function(head){
    bindLongPress(head, function(){
      var card = head.closest('.deptCard');
      if(!card) return;
      card.querySelectorAll('.shiftCard').forEach(function(shiftCard){
        shiftCard.style.display = '';
        shiftCard.setAttribute('open', '');
      });
      captureRosterElement(card, 'department');
    });
  });"""

NEW = """  document.querySelectorAll('.deptHead').forEach(function(head){
    bindLongPress(head, function(){
      var card = head.closest('.deptCard');
      if(!card) return;
      card.querySelectorAll('.shiftCard').forEach(function(shiftCard){
        shiftCard.style.display = '';
        shiftCard.setAttribute('open', '');
      });
      captureRosterElement(card, 'department');
    });

    if (head.dataset.deptShiftToggleBound === '1') return;
    head.dataset.deptShiftToggleBound = '1';
    head.addEventListener('click', function() {
      if (suppressNextClick) return;
      var card = head.closest('.deptCard');
      if (!card) return;
      card.classList.remove('collapsed');
      var shifts = card.querySelectorAll('details.shiftCard');
      if (!shifts.length) return;
      var anyClosed = false;
      shifts.forEach(function(d) {
        if (!d.open) anyClosed = true;
      });
      shifts.forEach(function(d) {
        if (anyClosed) d.setAttribute('open', '');
        else d.removeAttribute('open');
      });
    });
  });"""


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "deptShiftToggleBound" in text:
        return False
    if OLD not in text:
        return False
    path.write_text(text.replace(OLD, NEW, 1), encoding="utf-8", newline="\n")
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
