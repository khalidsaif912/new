#!/usr/bin/env python3
"""Let label#dateTag receive clicks; remove blocked picker handlers."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

OLD_BLOCK = """  var dateWrap = document.querySelector('.datePickerWrapper');
  if (dateWrap) {
    dateWrap.addEventListener('touchend', onDateWrapActivate, { passive: false });
    dateWrap.addEventListener('click', function(e) {
      if (e.target === picker) return;
      onDateWrapActivate(e);
    });
    function onPickerActivate(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setDatePickerBusy(true);
      openDatePicker();
    }
    picker.addEventListener('click', onPickerActivate);
    picker.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        onPickerActivate(e);
      }
    });
  }"""

NEW_BLOCK = """  var dateWrap = document.querySelector('.datePickerWrapper');
  if (dateWrap) {
    dateWrap.addEventListener('touchend', function(e) {
      if (e.target.closest && e.target.closest('#dateTag')) {
        e.preventDefault();
        openDatePicker();
        return;
      }
      onDateWrapActivate(e);
    }, { passive: false });
    dateWrap.addEventListener('click', function(e) {
      if (e.target.closest && e.target.closest('#dateTag')) return;
      if (e.target === picker) return;
      onDateWrapActivate(e);
    });
  }"""

GEN_OLD = OLD_BLOCK.replace("{", "{{").replace("}", "}}")
GEN_NEW = NEW_BLOCK.replace("{", "{{").replace("}", "}}")


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if OLD_BLOCK in text:
        path.write_text(text.replace(OLD_BLOCK, NEW_BLOCK, 1), encoding="utf-8")
        return True
    return False


def patch_generate() -> bool:
    path = ROOT / "generate_and_send.py"
    text = path.read_text(encoding="utf-8")
    if GEN_OLD in text:
        path.write_text(text.replace(GEN_OLD, GEN_NEW, 1), encoding="utf-8")
        return True
    return False


def main() -> None:
    n = sum(1 for html in DOCS.rglob("*.html") if patch_file(html))
    gen = patch_generate()
    print(f"patched {n} html" + (" + generator" if gen else ""))


if __name__ == "__main__":
    main()
