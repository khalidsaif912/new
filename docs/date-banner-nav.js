(function () {
  'use strict';

  function addDays(iso, delta) {
    var p = (iso || '').split('-');
    if (p.length !== 3) return '';
    var d = new Date(Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)));
    d.setUTCDate(d.getUTCDate() + delta);
    return d.getUTCFullYear() + '-' +
      String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(d.getUTCDate()).padStart(2, '0');
  }

  function init() {
    var header = document.querySelector('.header.homeDateSplit');
    var picker = document.getElementById('datePicker');
    if (!header || !picker) return;

    var origOpen = window.openDatePicker;
    window.openDatePicker = function () {
      picker.classList.add('datePicker-center-open');
      if (typeof origOpen === 'function') origOpen();
      else {
        try { picker.focus({ preventScroll: true }); } catch (e) { picker.focus(); }
        if (typeof picker.showPicker === 'function') {
          try { picker.showPicker(); return; } catch (e2) {}
        }
        try { picker.click(); } catch (e3) {}
      }
    };

    function restorePickerPos() {
      picker.classList.remove('datePicker-center-open');
    }
    picker.addEventListener('blur', function () {
      setTimeout(restorePickerPos, 350);
    });
    picker.addEventListener('change', restorePickerPos);

    var startX = 0;
    var startY = 0;
    var tracking = false;
    var axis = '';
    var pointerId = null;
    var SWIPE_MIN = 36;
    var BLOCKED = 'a, button, input, select, textarea, .langToggle, #banner-changer-btn';

    function blocked(target) {
      return !!(target && target.closest && target.closest(BLOCKED));
    }

    function reset() {
      tracking = false;
      axis = '';
      pointerId = null;
    }

    function currentIso() {
      if (picker.value) return picker.value;
      var m = (window.location.pathname || '').match(/\/date\/(\d{4}-\d{2}-\d{2})\//);
      return m ? m[1] : '';
    }

    function go(delta) {
      var iso = currentIso();
      if (!iso) return;
      var next = addDays(iso, delta);
      if (!next) return;
      if (picker.min && next < picker.min) return;
      if (picker.max && next > picker.max) return;
      if (next === iso) return;
      picker.value = next;
      picker.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function finish(dx, dy, evt) {
      if (!tracking) return;
      var wasHorizontal = axis === 'h';
      reset();
      if (!wasHorizontal) return;
      if (Math.abs(dx) < SWIPE_MIN) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.05) return;
      if (evt) {
        if (evt.cancelable) evt.preventDefault();
        evt.stopPropagation();
      }
      go(dx < 0 ? 1 : -1);
    }

    header.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1 || blocked(e.target)) {
        reset();
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
      axis = '';
    }, { passive: true, capture: true });

    header.addEventListener('touchmove', function (e) {
      if (!tracking || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - startX;
      var dy = e.touches[0].clientY - startY;
      if (!axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      }
      if (axis === 'h' && e.cancelable) e.preventDefault();
    }, { passive: false, capture: true });

    header.addEventListener('touchend', function (e) {
      if (!tracking || !e.changedTouches.length) return;
      var t = e.changedTouches[0];
      finish(t.clientX - startX, t.clientY - startY, e);
    }, { passive: false, capture: true });

    header.addEventListener('touchcancel', function () {
      reset();
    }, { passive: true, capture: true });

    header.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' || e.button !== 0 || blocked(e.target)) return;
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
      axis = '';
      pointerId = e.pointerId;
      try { header.setPointerCapture(e.pointerId); } catch (err) {}
    });

    header.addEventListener('pointermove', function (e) {
      if (!tracking || e.pointerType === 'touch') return;
      if (pointerId != null && e.pointerId !== pointerId) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      }
    });

    header.addEventListener('pointerup', function (e) {
      if (!tracking || e.pointerType === 'touch') return;
      if (pointerId != null && e.pointerId !== pointerId) return;
      finish(e.clientX - startX, e.clientY - startY, e);
    });

    header.addEventListener('pointercancel', function (e) {
      if (e.pointerType === 'touch') return;
      reset();
    });

    header.addEventListener('wheel', function (e) {
      if (blocked(e.target)) return;
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      if (Math.abs(e.deltaX) < 28) return;
      e.preventDefault();
      go(e.deltaX > 0 ? 1 : -1);
    }, { passive: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
