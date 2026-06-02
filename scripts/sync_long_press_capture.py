#!/usr/bin/env python3
"""Make long-press capture stable on touch with movement threshold."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

OLD_BIND_HTML = """  function bindLongPress(el, onLongPress){
    if(!el) return;
    var timer = null;
    var moved = false;

    function clear(){
      if(timer) clearTimeout(timer);
      timer = null;
    }

    el.addEventListener('pointerdown', function(e){
      moved = false;
      clear();
      timer = setTimeout(function(){
        suppressNextClick = true;
        onLongPress(e);
      }, LONG_PRESS_MS);
    });
    el.addEventListener('pointermove', function(){ moved = true; clear(); });
    el.addEventListener('pointerup', clear);
    el.addEventListener('pointercancel', clear);
    el.addEventListener('pointerleave', function(){ if(moved) clear(); });
    el.addEventListener('click', function(e){
      if(suppressNextClick){
        e.preventDefault();
        e.stopPropagation();
        suppressNextClick = false;
      }
    }, true);
  }"""

NEW_BIND_HTML = """  function bindLongPress(el, onLongPress){
    if(!el) return;
    var timer = null;
    var moved = false;
    var startX = 0;
    var startY = 0;
    var tracking = false;
    var MOVE_TOLERANCE_PX = 8;

    function clear(){
      if(timer) clearTimeout(timer);
      timer = null;
    }

    el.addEventListener('pointerdown', function(e){
      if(e.button !== 0 && e.button !== undefined) return;
      moved = false;
      tracking = true;
      startX = Number(e.clientX || 0);
      startY = Number(e.clientY || 0);
      clear();
      timer = setTimeout(function(){
        timer = null;
        if(!tracking || moved) return;
        suppressNextClick = true;
        onLongPress(e);
      }, LONG_PRESS_MS);
    });
    el.addEventListener('pointermove', function(e){
      if(!tracking) return;
      var dx = Math.abs(Number(e.clientX || 0) - startX);
      var dy = Math.abs(Number(e.clientY || 0) - startY);
      if(dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX){
        moved = true;
        clear();
      }
    });
    el.addEventListener('pointerup', function(){ tracking = false; clear(); });
    el.addEventListener('pointercancel', function(){ tracking = false; clear(); });
    el.addEventListener('pointerleave', function(e){
      if(e.pointerType === 'mouse' || moved){
        tracking = false;
        clear();
      }
    });
    el.addEventListener('click', function(e){
      if(suppressNextClick){
        e.preventDefault();
        e.stopPropagation();
        suppressNextClick = false;
      }
    }, true);
    el.addEventListener('contextmenu', function(e){
      if(suppressNextClick) e.preventDefault();
    });
  }"""


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if OLD_BIND_HTML not in text:
        return False
    path.write_text(text.replace(OLD_BIND_HTML, NEW_BIND_HTML, 1), encoding="utf-8")
    return True


def iter_targets() -> list[Path]:
    targets: list[Path] = []
    for base in (ROOT / "docs",):
        targets.extend(base.rglob("index.html"))
    return targets


def main() -> int:
    updated = 0
    for path in iter_targets():
        try:
            if patch_file(path):
                updated += 1
        except UnicodeDecodeError:
            continue
    print(f"patched {updated} html files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
