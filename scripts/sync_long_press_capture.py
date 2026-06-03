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
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        setTimeout(function() { suppressNextClick = false; }, 0);
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

OLD_DEPT_BIND_SCOPE = """  document.querySelectorAll('.deptHead').forEach(function(head){
    bindLongPress(head, function(){
      var card = head.closest('.deptCard');
      if(!card) return;
      card.classList.remove('collapsed');
      card.querySelectorAll('.shiftCard').forEach(function(shiftCard){
        shiftCard.style.display = '';
        shiftCard.setAttribute('open', '');
      });
      captureRosterElement(card, 'department', { expandAllShifts: true });
    });

    if (head.dataset.deptShiftToggleBound === '1') return;"""

NEW_DEPT_BIND_SCOPE = """  document.querySelectorAll('.deptHead').forEach(function(head){
    if (head.dataset.deptCaptureBound !== '1') {
      head.dataset.deptCaptureBound = '1';
      bindLongPress(head, function(){
        var cardForLongPress = head.closest('.deptCard');
        if(!cardForLongPress) return;
        cardForLongPress.classList.remove('collapsed');
        cardForLongPress.querySelectorAll('.shiftCard').forEach(function(shiftCard){
          shiftCard.style.display = '';
          shiftCard.setAttribute('open', '');
        });
        captureRosterElement(cardForLongPress, 'department', { expandAllShifts: true });
      });
    }

    if (head.dataset.deptShiftToggleBound === '1') return;"""

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
    wrap.style.position = 'absolute';
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
    var sourceTarget = target;
    if (opts.expandAllShifts && target && typeof target.closest === 'function') {
      var sourceDept = target.closest('.deptCard');
      if (sourceDept) sourceTarget = sourceDept;
    }
    var targetClone = null;
    if (opts.expandAllShifts) {
      var dept = sourceTarget;
      targetClone = document.createElement('div');
      targetClone.className = 'deptCard';
      var strip = dept && dept.firstElementChild ? dept.firstElementChild.cloneNode(true) : null;
      var head = dept ? dept.querySelector('.deptHead') : null;
      var stack = document.createElement('div');
      stack.className = 'shiftStack';
      stack.style.display = 'flex';
      if (strip) targetClone.appendChild(strip);
      if (head) targetClone.appendChild(head.cloneNode(true));
      var srcCards = dept ? Array.from(dept.querySelectorAll('.shiftCard')) : [];
      srcCards.forEach(function(srcCard) {
        var shiftCard = srcCard.cloneNode(true);
        if (String(shiftCard.tagName || '').toUpperCase() === 'DETAILS') {
          var flatCard = document.createElement('div');
          flatCard.className = shiftCard.className;
          if (shiftCard.getAttribute('style')) flatCard.setAttribute('style', shiftCard.getAttribute('style'));
          Array.from(shiftCard.children).forEach(function(ch) { flatCard.appendChild(ch.cloneNode(true)); });
          shiftCard = flatCard;
        }
        shiftCard.style.display = 'block';
        var body = shiftCard.querySelector('.shiftBody');
        if (body) body.style.display = 'block';
        stack.appendChild(shiftCard);
      });
      targetClone.appendChild(stack);
    } else {
      targetClone = sourceTarget.cloneNode(true);
    }
    targetClone.style.marginTop = '0';
    targetClone.style.width = '100%';
    targetClone.style.maxWidth = '100%';
    targetClone.style.boxSizing = 'border-box';
    wrap.appendChild(targetClone);
    document.body.appendChild(wrap);
    await waitForCaptureLayout();
    var captureWidth = Math.ceil(wrap.scrollWidth || wrap.offsetWidth || 0);
    var captureHeight = Math.ceil(wrap.scrollHeight || wrap.offsetHeight || 0);

    var canvas = await html2canvas(wrap, {
      backgroundColor: '#eef1f7',
      scale: Math.max(2, window.devicePixelRatio || 1),
      useCORS: true,
      width: captureWidth || undefined,
      height: captureHeight || undefined,
      windowWidth: captureWidth || window.innerWidth,
      windowHeight: captureHeight || window.innerHeight
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
    text = text.replace(
        "        e.preventDefault();\n        e.stopPropagation();\n        suppressNextClick = false;",
        "        e.preventDefault();\n        e.stopPropagation();\n        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();\n        setTimeout(function() { suppressNextClick = false; }, 0);",
    )
    text = text.replace(
        "        e.preventDefault();\r\n        e.stopPropagation();\r\n        suppressNextClick = false;",
        "        e.preventDefault();\r\n        e.stopPropagation();\r\n        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();\r\n        setTimeout(function() { suppressNextClick = false; }, 0);",
    )
    text = text.replace(
        "    var cardForLongPress = head.closest('.deptCard');\n    if (cardForLongPress && cardForLongPress.dataset.deptCaptureBound !== '1') {\n      cardForLongPress.dataset.deptCaptureBound = '1';\n      bindLongPress(cardForLongPress, function(ev){\n        var t = ev && ev.target;\n        if (t && typeof t.closest === 'function' && t.closest('.shiftSummary')) return;\n        cardForLongPress.classList.remove('collapsed');\n        cardForLongPress.querySelectorAll('.shiftCard').forEach(function(shiftCard){\n          shiftCard.style.display = '';\n          shiftCard.setAttribute('open', '');\n        });\n        captureRosterElement(cardForLongPress, 'department', { expandAllShifts: true });\n      });\n    }\n",
        "    if (head.dataset.deptCaptureBound !== '1') {\n      head.dataset.deptCaptureBound = '1';\n      bindLongPress(head, function(){\n        var cardForLongPress = head.closest('.deptCard');\n        if(!cardForLongPress) return;\n        cardForLongPress.classList.remove('collapsed');\n        cardForLongPress.querySelectorAll('.shiftCard').forEach(function(shiftCard){\n          shiftCard.style.display = '';\n          shiftCard.setAttribute('open', '');\n        });\n        captureRosterElement(cardForLongPress, 'department', { expandAllShifts: true });\n      });\n    }\n",
    )
    text = text.replace(
        "    var cardForLongPress = head.closest('.deptCard');\r\n    if (cardForLongPress && cardForLongPress.dataset.deptCaptureBound !== '1') {\r\n      cardForLongPress.dataset.deptCaptureBound = '1';\r\n      bindLongPress(cardForLongPress, function(ev){\r\n        var t = ev && ev.target;\r\n        if (t && typeof t.closest === 'function' && t.closest('.shiftSummary')) return;\r\n        cardForLongPress.classList.remove('collapsed');\r\n        cardForLongPress.querySelectorAll('.shiftCard').forEach(function(shiftCard){\r\n          shiftCard.style.display = '';\r\n          shiftCard.setAttribute('open', '');\r\n        });\r\n        captureRosterElement(cardForLongPress, 'department', { expandAllShifts: true });\r\n      });\r\n    }\r\n",
        "    if (head.dataset.deptCaptureBound !== '1') {\r\n      head.dataset.deptCaptureBound = '1';\r\n      bindLongPress(head, function(){\r\n        var cardForLongPress = head.closest('.deptCard');\r\n        if(!cardForLongPress) return;\r\n        cardForLongPress.classList.remove('collapsed');\r\n        cardForLongPress.querySelectorAll('.shiftCard').forEach(function(shiftCard){\r\n          shiftCard.style.display = '';\r\n          shiftCard.setAttribute('open', '');\r\n        });\r\n        captureRosterElement(cardForLongPress, 'department', { expandAllShifts: true });\r\n      });\r\n    }\r\n",
    )
    replace_block(OLD_DEPT_CAPTURE, NEW_DEPT_CAPTURE)
    replace_block(OLD_DEPT_BIND_SCOPE, NEW_DEPT_BIND_SCOPE)
    replace_block(OLD_CAPTURE_FUNC, NEW_CAPTURE_FUNC)
    text = text.replace(
        "var targetClone = target.cloneNode(true);",
        "var sourceTarget = target;\n    if (opts.expandAllShifts && target && typeof target.closest === 'function') {\n      var sourceDept = target.closest('.deptCard');\n      if (sourceDept) sourceTarget = sourceDept;\n    }\n    var targetClone = sourceTarget.cloneNode(true);",
    )
    text = text.replace(
        "var srcCards = Array.from(target.querySelectorAll('.shiftCard'));",
        "var srcCards = Array.from(sourceTarget.querySelectorAll('.shiftCard'));",
    )
    text = text.replace(
        "    var targetClone = sourceTarget.cloneNode(true);\n    if (opts.expandAllShifts) {\n      targetClone.classList.remove('collapsed');\n      var cloneStack = targetClone.querySelector('.shiftStack');\n      var srcCards = Array.from(sourceTarget.querySelectorAll('.shiftCard'));\n      if (cloneStack && srcCards.length) {\n        cloneStack.innerHTML = '';\n        srcCards.forEach(function(srcCard) {\n          var shiftCard = srcCard.cloneNode(true);\n          shiftCard.style.display = 'block';\n          if (String(shiftCard.tagName || '').toUpperCase() === 'DETAILS') {\n            shiftCard.open = true;\n            shiftCard.setAttribute('open', '');\n          }\n          var body = shiftCard.querySelector('.shiftBody');\n          if (body) body.style.display = 'block';\n          cloneStack.appendChild(shiftCard);\n        });\n        cloneStack.style.display = 'flex';\n      }\n    }",
        "    var targetClone = null;\n    if (opts.expandAllShifts) {\n      var dept = sourceTarget;\n      targetClone = document.createElement('div');\n      targetClone.className = 'deptCard';\n      var strip = dept && dept.firstElementChild ? dept.firstElementChild.cloneNode(true) : null;\n      var head = dept ? dept.querySelector('.deptHead') : null;\n      var stack = document.createElement('div');\n      stack.className = 'shiftStack';\n      stack.style.display = 'flex';\n      if (strip) targetClone.appendChild(strip);\n      if (head) targetClone.appendChild(head.cloneNode(true));\n      var srcCards = dept ? Array.from(dept.querySelectorAll('.shiftCard')) : [];\n      srcCards.forEach(function(srcCard) {\n        var shiftCard = srcCard.cloneNode(true);\n        shiftCard.style.display = 'block';\n        if (String(shiftCard.tagName || '').toUpperCase() === 'DETAILS') {\n          shiftCard.open = true;\n          shiftCard.setAttribute('open', '');\n        }\n        var body = shiftCard.querySelector('.shiftBody');\n        if (body) body.style.display = 'block';\n        stack.appendChild(shiftCard);\n      });\n      targetClone.appendChild(stack);\n    } else {\n      targetClone = sourceTarget.cloneNode(true);\n    }",
    )
    text = text.replace(
        "    var targetClone = sourceTarget.cloneNode(true);\r\n    if (opts.expandAllShifts) {\r\n      targetClone.classList.remove('collapsed');\r\n      var cloneStack = targetClone.querySelector('.shiftStack');\r\n      var srcCards = Array.from(sourceTarget.querySelectorAll('.shiftCard'));\r\n      if (cloneStack && srcCards.length) {\r\n        cloneStack.innerHTML = '';\r\n        srcCards.forEach(function(srcCard) {\r\n          var shiftCard = srcCard.cloneNode(true);\r\n          shiftCard.style.display = 'block';\r\n          if (String(shiftCard.tagName || '').toUpperCase() === 'DETAILS') {\r\n            shiftCard.open = true;\r\n            shiftCard.setAttribute('open', '');\r\n          }\r\n          var body = shiftCard.querySelector('.shiftBody');\r\n          if (body) body.style.display = 'block';\r\n          cloneStack.appendChild(shiftCard);\r\n        });\r\n        cloneStack.style.display = 'flex';\r\n      }\r\n    }",
        "    var targetClone = null;\r\n    if (opts.expandAllShifts) {\r\n      var dept = sourceTarget;\r\n      targetClone = document.createElement('div');\r\n      targetClone.className = 'deptCard';\r\n      var strip = dept && dept.firstElementChild ? dept.firstElementChild.cloneNode(true) : null;\r\n      var head = dept ? dept.querySelector('.deptHead') : null;\r\n      var stack = document.createElement('div');\r\n      stack.className = 'shiftStack';\r\n      stack.style.display = 'flex';\r\n      if (strip) targetClone.appendChild(strip);\r\n      if (head) targetClone.appendChild(head.cloneNode(true));\r\n      var srcCards = dept ? Array.from(dept.querySelectorAll('.shiftCard')) : [];\r\n      srcCards.forEach(function(srcCard) {\r\n        var shiftCard = srcCard.cloneNode(true);\r\n        shiftCard.style.display = 'block';\r\n        if (String(shiftCard.tagName || '').toUpperCase() === 'DETAILS') {\r\n          shiftCard.open = true;\r\n          shiftCard.setAttribute('open', '');\r\n        }\r\n        var body = shiftCard.querySelector('.shiftBody');\r\n        if (body) body.style.display = 'block';\r\n        stack.appendChild(shiftCard);\r\n      });\r\n      targetClone.appendChild(stack);\r\n    } else {\r\n      targetClone = sourceTarget.cloneNode(true);\r\n    }",
    )
    text = text.replace(
        "      targetClone.querySelectorAll('.shiftCard').forEach(function(shiftCard) {\n        shiftCard.style.display = '';\n        shiftCard.setAttribute('open', '');\n      });",
        "      targetClone.querySelectorAll('details.shiftCard').forEach(function(shiftCard) {\n        shiftCard.style.display = 'block';\n        shiftCard.open = true;\n        shiftCard.setAttribute('open', '');\n        var body = shiftCard.querySelector('.shiftBody');\n        if (body) body.style.display = 'block';\n      });\n      var stack = targetClone.querySelector('.shiftStack');\n      if (stack) stack.style.display = 'flex';",
    )
    text = text.replace(
        "      targetClone.querySelectorAll('.shiftCard').forEach(function(shiftCard) {\r\n        shiftCard.style.display = '';\r\n        shiftCard.setAttribute('open', '');\r\n      });",
        "      targetClone.querySelectorAll('details.shiftCard').forEach(function(shiftCard) {\r\n        shiftCard.style.display = 'block';\r\n        shiftCard.open = true;\r\n        shiftCard.setAttribute('open', '');\r\n        var body = shiftCard.querySelector('.shiftBody');\r\n        if (body) body.style.display = 'block';\r\n      });\r\n      var stack = targetClone.querySelector('.shiftStack');\r\n      if (stack) stack.style.display = 'flex';",
    )
    text = text.replace(
        "      targetClone.querySelectorAll('details.shiftCard').forEach(function(shiftCard) {\n        shiftCard.style.display = 'block';\n        shiftCard.open = true;\n        shiftCard.setAttribute('open', '');\n        var body = shiftCard.querySelector('.shiftBody');\n        if (body) body.style.display = 'block';\n      });\n      var stack = targetClone.querySelector('.shiftStack');\n      if (stack) stack.style.display = 'flex';",
        "      var cloneStack = targetClone.querySelector('.shiftStack');\n      var srcCards = Array.from(target.querySelectorAll('.shiftCard'));\n      if (cloneStack && srcCards.length) {\n        cloneStack.innerHTML = '';\n        srcCards.forEach(function(srcCard) {\n          var shiftCard = srcCard.cloneNode(true);\n          shiftCard.style.display = 'block';\n          if (String(shiftCard.tagName || '').toUpperCase() === 'DETAILS') {\n            shiftCard.open = true;\n            shiftCard.setAttribute('open', '');\n          }\n          var body = shiftCard.querySelector('.shiftBody');\n          if (body) body.style.display = 'block';\n          cloneStack.appendChild(shiftCard);\n        });\n        cloneStack.style.display = 'flex';\n      }",
    )
    text = text.replace(
        "      targetClone.querySelectorAll('details.shiftCard').forEach(function(shiftCard) {\r\n        shiftCard.style.display = 'block';\r\n        shiftCard.open = true;\r\n        shiftCard.setAttribute('open', '');\r\n        var body = shiftCard.querySelector('.shiftBody');\r\n        if (body) body.style.display = 'block';\r\n      });\r\n      var stack = targetClone.querySelector('.shiftStack');\r\n      if (stack) stack.style.display = 'flex';",
        "      var cloneStack = targetClone.querySelector('.shiftStack');\r\n      var srcCards = Array.from(target.querySelectorAll('.shiftCard'));\r\n      if (cloneStack && srcCards.length) {\r\n        cloneStack.innerHTML = '';\r\n        srcCards.forEach(function(srcCard) {\r\n          var shiftCard = srcCard.cloneNode(true);\r\n          shiftCard.style.display = 'block';\r\n          if (String(shiftCard.tagName || '').toUpperCase() === 'DETAILS') {\r\n            shiftCard.open = true;\r\n            shiftCard.setAttribute('open', '');\r\n          }\r\n          var body = shiftCard.querySelector('.shiftBody');\r\n          if (body) body.style.display = 'block';\r\n          cloneStack.appendChild(shiftCard);\r\n        });\r\n        cloneStack.style.display = 'flex';\r\n      }",
    )
    text = text.replace("    wrap.style.position = 'fixed';", "    wrap.style.position = 'absolute';")
    text = text.replace(
        "    document.body.appendChild(wrap);\n    await waitForCaptureLayout();\n\n    var canvas = await html2canvas(wrap, {\n      backgroundColor: '#eef1f7',\n      scale: Math.max(2, window.devicePixelRatio || 1),\n      useCORS: true\n    });",
        "    document.body.appendChild(wrap);\n    await waitForCaptureLayout();\n    var captureWidth = Math.ceil(wrap.scrollWidth || wrap.offsetWidth || 0);\n    var captureHeight = Math.ceil(wrap.scrollHeight || wrap.offsetHeight || 0);\n\n    var canvas = await html2canvas(wrap, {\n      backgroundColor: '#eef1f7',\n      scale: Math.max(2, window.devicePixelRatio || 1),\n      useCORS: true,\n      width: captureWidth || undefined,\n      height: captureHeight || undefined,\n      windowWidth: captureWidth || window.innerWidth,\n      windowHeight: captureHeight || window.innerHeight\n    });",
    )
    text = text.replace(
        "    document.body.appendChild(wrap);\r\n    await waitForCaptureLayout();\r\n\r\n    var canvas = await html2canvas(wrap, {\r\n      backgroundColor: '#eef1f7',\r\n      scale: Math.max(2, window.devicePixelRatio || 1),\r\n      useCORS: true\r\n    });",
        "    document.body.appendChild(wrap);\r\n    await waitForCaptureLayout();\r\n    var captureWidth = Math.ceil(wrap.scrollWidth || wrap.offsetWidth || 0);\r\n    var captureHeight = Math.ceil(wrap.scrollHeight || wrap.offsetHeight || 0);\r\n\r\n    var canvas = await html2canvas(wrap, {\r\n      backgroundColor: '#eef1f7',\r\n      scale: Math.max(2, window.devicePixelRatio || 1),\r\n      useCORS: true,\r\n      width: captureWidth || undefined,\r\n      height: captureHeight || undefined,\r\n      windowWidth: captureWidth || window.innerWidth,\r\n      windowHeight: captureHeight || window.innerHeight\r\n    });",
    )
    text = text.replace(
        "function openCaptureSheet(blob, fileName) {",
        "function openCaptureSheet(blob, fileName, captureMode) {",
    )
    text = text.replace(
        "function openCaptureSheet(blob, fileName) {\r\n",
        "function openCaptureSheet(blob, fileName, captureMode) {\r\n",
    )
    text = text.replace(
        "  var preview = document.getElementById('capturePreview');\n  if(!sheet || !shareBtn || !saveBtn || !cancelBtn) return;\n",
        "  var preview = document.getElementById('capturePreview');\n  var title = sheet ? sheet.querySelector('.captureSheetTitle') : null;\n  if(!sheet || !shareBtn || !saveBtn || !cancelBtn) return;\n  var modeText = captureMode || 'UNKNOWN';\n  if (title) title.textContent = 'Share or save image (' + modeText + ')';\n",
    )
    text = text.replace(
        "  var preview = document.getElementById('capturePreview');\r\n  if(!sheet || !shareBtn || !saveBtn || !cancelBtn) return;\r\n",
        "  var preview = document.getElementById('capturePreview');\r\n  var title = sheet ? sheet.querySelector('.captureSheetTitle') : null;\r\n  if(!sheet || !shareBtn || !saveBtn || !cancelBtn) return;\r\n  var modeText = captureMode || 'UNKNOWN';\r\n  if (title) title.textContent = 'Share or save image (' + modeText + ')';\r\n",
    )
    text = text.replace(
        "      openCaptureSheet(blob, fileNamePrefix + '-' + stamp + '.png');",
        "      var mode = opts && opts.expandAllShifts ? 'DEPARTMENT' : 'SHIFT';\n      console.log('[capture] mode=' + mode + ' target=' + (target && target.className ? target.className : 'unknown'));\n      openCaptureSheet(blob, fileNamePrefix + '-' + stamp + '.png', mode);",
    )
    text = text.replace(
        "      openCaptureSheet(blob, fileNamePrefix + '-' + stamp + '.png');\r\n",
        "      var mode = opts && opts.expandAllShifts ? 'DEPARTMENT' : 'SHIFT';\r\n      console.log('[capture] mode=' + mode + ' target=' + (target && target.className ? target.className : 'unknown'));\r\n      openCaptureSheet(blob, fileNamePrefix + '-' + stamp + '.png', mode);\r\n",
    )
    text = text.replace(
        "      srcCards.forEach(function(srcCard) {\n        var shiftCard = srcCard.cloneNode(true);\n        shiftCard.style.display = 'block';\n        if (String(shiftCard.tagName || '').toUpperCase() === 'DETAILS') {\n          shiftCard.open = true;\n          shiftCard.setAttribute('open', '');\n        }\n        var body = shiftCard.querySelector('.shiftBody');\n        if (body) body.style.display = 'block';\n        stack.appendChild(shiftCard);\n      });",
        "      srcCards.forEach(function(srcCard) {\n        var shiftCard = srcCard.cloneNode(true);\n        if (String(shiftCard.tagName || '').toUpperCase() === 'DETAILS') {\n          var flatCard = document.createElement('div');\n          flatCard.className = shiftCard.className;\n          if (shiftCard.getAttribute('style')) flatCard.setAttribute('style', shiftCard.getAttribute('style'));\n          Array.from(shiftCard.children).forEach(function(ch) { flatCard.appendChild(ch.cloneNode(true)); });\n          shiftCard = flatCard;\n        }\n        shiftCard.style.display = 'block';\n        var body = shiftCard.querySelector('.shiftBody');\n        if (body) body.style.display = 'block';\n        stack.appendChild(shiftCard);\n      });",
    )
    text = text.replace(
        "      srcCards.forEach(function(srcCard) {\r\n        var shiftCard = srcCard.cloneNode(true);\r\n        shiftCard.style.display = 'block';\r\n        if (String(shiftCard.tagName || '').toUpperCase() === 'DETAILS') {\r\n          shiftCard.open = true;\r\n          shiftCard.setAttribute('open', '');\r\n        }\r\n        var body = shiftCard.querySelector('.shiftBody');\r\n        if (body) body.style.display = 'block';\r\n        stack.appendChild(shiftCard);\r\n      });",
        "      srcCards.forEach(function(srcCard) {\r\n        var shiftCard = srcCard.cloneNode(true);\r\n        if (String(shiftCard.tagName || '').toUpperCase() === 'DETAILS') {\r\n          var flatCard = document.createElement('div');\r\n          flatCard.className = shiftCard.className;\r\n          if (shiftCard.getAttribute('style')) flatCard.setAttribute('style', shiftCard.getAttribute('style'));\r\n          Array.from(shiftCard.children).forEach(function(ch) { flatCard.appendChild(ch.cloneNode(true)); });\r\n          shiftCard = flatCard;\r\n        }\r\n        shiftCard.style.display = 'block';\r\n        var body = shiftCard.querySelector('.shiftBody');\r\n        if (body) body.style.display = 'block';\r\n        stack.appendChild(shiftCard);\r\n      });",
    )
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
