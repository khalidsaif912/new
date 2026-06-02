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

OLD_DEPT_CAPTURE = """    bindLongPress(head, function(){
      var card = head.closest('.deptCard');
      if(!card) return;
      card.querySelectorAll('.shiftCard').forEach(function(shiftCard){
        shiftCard.style.display = '';
        shiftCard.setAttribute('open', '');
      });
      captureRosterElement(card, 'department');
    });"""

NEW_DEPT_CAPTURE = """    bindLongPress(head, function(){
      var card = head.closest('.deptCard');
      if(!card) return;
      card.classList.remove('collapsed');
      card.querySelectorAll('.shiftCard').forEach(function(shiftCard){
        shiftCard.style.display = '';
        shiftCard.setAttribute('open', '');
      });
      captureRosterElement(card, 'department', { expandAllShifts: true });
    });"""

OLD_CAPTURE_FUNC = """async function captureRosterElement(target, fileNamePrefix, opts) {
  opts = opts || {};
  if(!target || typeof html2canvas !== 'function') return;
  setCaptureBusy(true);
  try {
    var header = document.querySelector('.header');
    var wrap = document.createElement('div');
    wrap.style.position = 'fixed';
    wrap.style.left = '-10000px';
    wrap.style.top = '0';
    wrap.style.width = rosterSnapshotLayoutWidth() + 'px';
    wrap.style.boxSizing = 'border-box';
    wrap.style.background = '#eef1f7';
    wrap.style.padding = '14px';
    wrap.style.zIndex = '9998';

    if(header) {
      var headerClone = header.cloneNode(true);
      headerClone.style.marginBottom = '10px';
      wrap.appendChild(headerClone);
    }
    if (opts.prependClone && opts.prependClone.nodeType === 1) {
      var pre = opts.prependClone.cloneNode(true);
      pre.style.marginBottom = '8px';
      wrap.appendChild(pre);
    }
    var targetClone = target.cloneNode(true);
    targetClone.style.marginTop = '0';
    targetClone.style.width = '100%';
    targetClone.style.maxWidth = '100%';
    targetClone.style.boxSizing = 'border-box';
    wrap.appendChild(targetClone);
    document.body.appendChild(wrap);

    var canvas = await html2canvas(wrap, {
      backgroundColor: '#eef1f7',
      scale: Math.max(2, window.devicePixelRatio || 1),
      useCORS: true
    });
    wrap.remove();

    canvas.toBlob(function(blob){
      if(!blob) return;
      var stamp = new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
      openCaptureSheet(blob, fileNamePrefix + '-' + stamp + '.png');
    }, 'image/png');
  } catch(err) {
    alert('Could not create image snapshot.');
  } finally {
    setCaptureBusy(false);
  }
}"""

NEW_CAPTURE_FUNC = """async function captureRosterElement(target, fileNamePrefix, opts) {
  opts = opts || {};
  if(!target || typeof html2canvas !== 'function') return;
  setCaptureBusy(true);
  try {
    function waitForCaptureLayout() {
      return new Promise(function(resolve) {
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(function() {
            requestAnimationFrame(resolve);
          });
        } else {
          setTimeout(resolve, 32);
        }
      });
    }
    var header = document.querySelector('.header');
    var wrap = document.createElement('div');
    wrap.style.position = 'fixed';
    wrap.style.left = '-10000px';
    wrap.style.top = '0';
    wrap.style.width = rosterSnapshotLayoutWidth() + 'px';
    wrap.style.boxSizing = 'border-box';
    wrap.style.background = '#eef1f7';
    wrap.style.padding = '14px';
    wrap.style.zIndex = '9998';

    if(header) {
      var headerClone = header.cloneNode(true);
      headerClone.style.marginBottom = '10px';
      wrap.appendChild(headerClone);
    }
    if (opts.prependClone && opts.prependClone.nodeType === 1) {
      var pre = opts.prependClone.cloneNode(true);
      pre.style.marginBottom = '8px';
      wrap.appendChild(pre);
    }
    var targetClone = target.cloneNode(true);
    if (opts.expandAllShifts) {
      targetClone.classList.remove('collapsed');
      targetClone.querySelectorAll('.shiftCard').forEach(function(shiftCard) {
        shiftCard.style.display = '';
        shiftCard.setAttribute('open', '');
      });
    }
    targetClone.style.marginTop = '0';
    targetClone.style.width = '100%';
    targetClone.style.maxWidth = '100%';
    targetClone.style.boxSizing = 'border-box';
    wrap.appendChild(targetClone);
    document.body.appendChild(wrap);
    await waitForCaptureLayout();

    var canvas = await html2canvas(wrap, {
      backgroundColor: '#eef1f7',
      scale: Math.max(2, window.devicePixelRatio || 1),
      useCORS: true
    });
    wrap.remove();

    canvas.toBlob(function(blob){
      if(!blob) return;
      var stamp = new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
      openCaptureSheet(blob, fileNamePrefix + '-' + stamp + '.png');
    }, 'image/png');
  } catch(err) {
    alert('Could not create image snapshot.');
  } finally {
    setCaptureBusy(false);
  }
}"""


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text
    def replace_block(src: str, dst: str) -> None:
        nonlocal text
        if src in text:
            text = text.replace(src, dst, 1)
            return
        src_crlf = src.replace("\n", "\r\n")
        dst_crlf = dst.replace("\n", "\r\n")
        if src_crlf in text:
            text = text.replace(src_crlf, dst_crlf, 1)

    if OLD_BIND_HTML in text:
        text = text.replace(OLD_BIND_HTML, NEW_BIND_HTML, 1)
    else:
        replace_block(OLD_BIND_HTML, NEW_BIND_HTML)
    text = text.replace(
        "captureRosterElement(card, 'department');",
        "captureRosterElement(card, 'department', { expandAllShifts: true });",
    )
    replace_block(OLD_DEPT_CAPTURE, NEW_DEPT_CAPTURE)
    replace_block(OLD_CAPTURE_FUNC, NEW_CAPTURE_FUNC)
    if text == orig:
        return False
    path.write_text(text, encoding="utf-8")
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
