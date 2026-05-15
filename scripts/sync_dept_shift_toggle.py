#!/usr/bin/env python3
"""Add dept-head click: 3-state shift open cycle on roster pages."""

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
      var step = parseInt(card.dataset.deptShiftStep || '0', 10);
      if (isNaN(step) || step < 0 || step > 2) step = 0;
      if (step === 0) {
        shifts.forEach(function(d) { d.setAttribute('open', ''); });
        card.dataset.deptShiftStep = '1';
      } else if (step === 1) {
        shifts.forEach(function(d) { d.removeAttribute('open'); });
        card.dataset.deptShiftStep = '2';
      } else {
        var now = new Date();
        var muscatTime = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
        var hour = muscatTime.getHours();
        var minute = muscatTime.getMinutes();
        var tt = hour * 60 + minute;
        var currentShift = (tt >= 21 * 60 || tt < 5 * 60) ? 'Night' : (tt >= 13 * 60 ? 'Afternoon' : 'Morning');
        shifts.forEach(function(d) { d.removeAttribute('open'); });
        var target = null;
        shifts.forEach(function(d) {
          if (d.dataset.shift === currentShift) target = d;
        });
        if (!target) target = shifts[0];
        if (target) target.setAttribute('open', '');
        card.dataset.deptShiftStep = '0';
      }
    });
  });"""

OLD_2STATE = """      var anyClosed = false;
      shifts.forEach(function(d) {
        if (!d.open) anyClosed = true;
      });
      shifts.forEach(function(d) {
        if (anyClosed) d.setAttribute('open', '');
        else d.removeAttribute('open');
      });"""

NEW_3STATE = """      var step = parseInt(card.dataset.deptShiftStep || '0', 10);
      if (isNaN(step) || step < 0 || step > 2) step = 0;
      if (step === 0) {
        shifts.forEach(function(d) { d.setAttribute('open', ''); });
        card.dataset.deptShiftStep = '1';
      } else if (step === 1) {
        shifts.forEach(function(d) { d.removeAttribute('open'); });
        card.dataset.deptShiftStep = '2';
      } else {
        var now = new Date();
        var muscatTime = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
        var hour = muscatTime.getHours();
        var minute = muscatTime.getMinutes();
        var tt = hour * 60 + minute;
        var currentShift = (tt >= 21 * 60 || tt < 5 * 60) ? 'Night' : (tt >= 13 * 60 ? 'Afternoon' : 'Morning');
        shifts.forEach(function(d) { d.removeAttribute('open'); });
        var target = null;
        shifts.forEach(function(d) {
          if (d.dataset.shift === currentShift) target = d;
        });
        if (!target) target = shifts[0];
        if (target) target.setAttribute('open', '');
        card.dataset.deptShiftStep = '0';
      }"""


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "deptShiftStep" in text:
        return False
    if OLD_2STATE in text:
        path.write_text(text.replace(OLD_2STATE, NEW_3STATE, 1), encoding="utf-8", newline="\n")
        return True
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
