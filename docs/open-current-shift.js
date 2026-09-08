(function () {
  'use strict';

  var DUTY_SHIFTS = { Morning: true, Afternoon: true, Night: true };

  function muscatMinutes(now) {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Muscat',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(now || new Date());
      var hour = 0;
      var minute = 0;
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === 'hour') hour = parseInt(parts[i].value, 10) || 0;
        if (parts[i].type === 'minute') minute = parseInt(parts[i].value, 10) || 0;
      }
      return hour * 60 + minute;
    } catch (e) {
      var d = now || new Date();
      return d.getHours() * 60 + d.getMinutes();
    }
  }

  function currentDutyShift(now) {
    var t = muscatMinutes(now);
    if (t >= 21 * 60 || t < 5 * 60) return 'Night';
    if (t >= 13 * 60) return 'Afternoon';
    return 'Morning';
  }

  function shiftKey(el) {
    return String((el && (el.getAttribute('data-shift') || el.dataset.shift)) || '').trim();
  }

  function setOpen(el, shouldOpen) {
    if (!el) return;
    el.open = !!shouldOpen;
    if (shouldOpen) el.setAttribute('open', '');
    else el.removeAttribute('open');
  }

  function applyDutyOpenState(root) {
    var current = currentDutyShift();
    var cards = (root || document).querySelectorAll('.deptCard');
    for (var i = 0; i < cards.length; i++) {
      var shifts = cards[i].querySelectorAll('details.shiftCard');
      var matched = null;
      for (var j = 0; j < shifts.length; j++) {
        var key = shiftKey(shifts[j]);
        if (!DUTY_SHIFTS[key]) continue;
        setOpen(shifts[j], false);
        if (key === current) matched = shifts[j];
      }
      if (matched) setOpen(matched, true);
    }
    return current;
  }

  var userPickedFilter = false;
  var lastAppliedShift = '';

  function applyNowFilter(current) {
    if (userPickedFilter) return;
    if (typeof window.applyShiftFilter !== 'function') return;
    if (!document.querySelector('.shiftFilterBtn')) return;
    window.applyShiftFilter(current);
  }

  function applyAll() {
    var current = applyDutyOpenState(document);
    if (current !== lastAppliedShift) {
      lastAppliedShift = current;
      applyNowFilter(current);
    }
    return current;
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('.shiftFilterBtn')) userPickedFilter = true;
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAll);
  } else {
    applyAll();
  }
  window.addEventListener('pageshow', applyAll);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) applyAll();
  });

  window.rosterCurrentDutyShift = currentDutyShift;
  window.rosterApplyCurrentDutyShift = applyAll;
})();
