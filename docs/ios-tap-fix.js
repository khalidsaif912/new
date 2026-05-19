/**
 * iOS Safari touch fixes: synthetic click for chips/buttons that use href="#" + onclick.
 */
(function () {
  'use strict';

  var ua = navigator.userAgent || '';
  var isIOS =
    /iP(hone|ad|od)/i.test(ua) ||
    (ua.indexOf('Macintosh') >= 0 && 'ontouchend' in document);
  if (!isIOS) return;

  var TAP_SEL =
    'a.summaryChip, a.btn, button.langToggle, button.summaryChip.shiftFilterBtn, #summarySwitchChip';

  function tapTarget(el) {
    if (!el || !el.closest) return null;
    if (el.closest('.datePickerWrapper')) return null;
    return el.closest(TAP_SEL);
  }

  var lastTouch = 0;

  document.addEventListener(
    'touchend',
    function (e) {
      var el = tapTarget(e.target);
      if (!el) return;
      lastTouch = Date.now();
      if (e.cancelable) e.preventDefault();
      try {
        el.click();
      } catch (err) {
        /* ignore */
      }
    },
    { passive: false }
  );

  document.addEventListener(
    'click',
    function (e) {
      if (Date.now() - lastTouch > 450) return;
      var el = tapTarget(e.target);
      if (!el) return;
      e.preventDefault();
    },
    true
  );
})();
