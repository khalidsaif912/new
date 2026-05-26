// Hard-guaranteed import page behavior (independent from other scripts).
(function() {
  var IMPORT_DEPT_ORDER = [
    'supervisors',
    'documentation',
    'import checkers',
    'release control',
    'import operators',
    'flight dispatch (import)',
    'flight dispatch (export)'
  ];

  function deptTitleNorm(card) {
    var t = card.querySelector('.deptTitle');
    return (t && t.textContent ? t.textContent : '').trim().toLowerCase();
  }

  function findDeptCardByName(deptName) {
    var target = String(deptName || '').trim().toLowerCase();
    if (!target) return null;
    var cards = Array.from(document.querySelectorAll('.deptCard'));
    return cards.find(function(c) { return deptTitleNorm(c) === target; }) || null;
  }

  function pinDepartmentCardFirst(deptName) {
    var card = findDeptCardByName(deptName);
    if (!card) return false;
    var cards = Array.from(document.querySelectorAll('.deptCard'));
    if (!cards.length || cards[0] === card) return true;
    var parent = card.parentElement;
    if (parent) parent.insertBefore(card, cards[0]);
    return true;
  }

  function reorderImportDepartments(preferredDept) {
    var cards = Array.from(document.querySelectorAll('.deptCard'));
    if (!cards.length) return;
    var parent = cards[0].parentElement;
    if (!parent) return;
    var bottom = document.querySelector('.importBottom');
    var preferred = String(preferredDept || '').trim().toLowerCase();

    if (preferred) {
      pinDepartmentCardFirst(preferred);
      cards = Array.from(document.querySelectorAll('.deptCard'));
    }

    var order = IMPORT_DEPT_ORDER.slice();
    if (preferred && order.indexOf(preferred) === -1) {
      order.unshift(preferred);
    }

    order.forEach(function(dep) {
      if (preferred && dep === preferred) return;
      var card = cards.find(function(c) { return deptTitleNorm(c) === dep; });
      if (card) {
        if (bottom) parent.insertBefore(card, bottom);
        else parent.appendChild(card);
      }
    });

    if (preferred) pinDepartmentCardFirst(preferred);
  }

  function applySavedEmployeeDepartmentFirst() {
    var empId = localStorage.getItem('importSavedEmpId');
    if (!empId) {
      reorderImportDepartments();
      return;
    }
    var base = (function() {
      if (typeof getSiteRootUrl === 'function') return getSiteRootUrl();
      var p = location.pathname || '';
      if (p.indexOf('/roster-site/') !== -1) return location.origin + '/roster-site';
      if (location.hostname && location.hostname.endsWith('github.io')) {
        var segs = p.split('/').filter(Boolean);
        if (segs.length >= 2 && segs[1] === 'docs') return location.origin + '/' + segs[0] + '/docs';
        return location.origin + (segs.length ? '/' + segs[0] : '');
      }
      return location.origin + '/';
    })();
    fetch(base + '/import/schedules/' + encodeURIComponent(empId) + '.json')
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) {
        if (d && d.department) reorderImportDepartments(d.department);
        else reorderImportDepartments();
      })
      .catch(function() { reorderImportDepartments(); });
  }

  function repartitionLeaveRowsInDeptCards() {
    document.querySelectorAll('.deptCard').forEach(function(card) {
      var other = card.querySelector('details.shiftCard[data-shift="Other"]');
      if (!other) return;
      var toMove = [];
      other.querySelectorAll('.empRow').forEach(function(row) {
        var st = row.querySelector('.empStatus');
        if (!st) return;
        var raw = (st.textContent || '').trim().toUpperCase();
        var code = raw.split(/\s+/)[0];
        if (code === 'LV' || code === 'AL' || raw.indexOf('ANNUAL') >= 0) toMove.push(row);
      });
      if (!toMove.length) return;
      var annual = card.querySelector('details.shiftCard[data-shift="Annual Leave"]');
      if (!annual) {
        var template = card.querySelector('details.shiftCard[data-shift="Off Day"]');
        if (!template) return;
        annual = template.cloneNode(true);
        annual.setAttribute('data-shift', 'Annual Leave');
        annual.style.border = '1px solid #10b98144';
        annual.style.background = '#d1fae5';
        var sum = annual.querySelector('.shiftSummary');
        if (sum) { sum.style.background = '#d1fae5'; sum.style.borderBottom = '1px solid #10b98133'; }
        var label = annual.querySelector('.shiftLabel');
        if (label) { label.textContent = 'Annual Leave'; label.style.color = '#065f46'; }
        var icon = annual.querySelector('.shiftIcon');
        if (icon) icon.textContent = '✈️';
        var emptyBody = annual.querySelector('.shiftBody');
        if (emptyBody) emptyBody.innerHTML = '';
        other.parentNode.insertBefore(annual, other);
      }
      var body = annual.querySelector('.shiftBody');
      toMove.forEach(function(row) { body.appendChild(row); });
      var oc = other.querySelector('.shiftCount');
      var left = other.querySelectorAll('.empRow').length;
      if (oc) oc.textContent = String(left);
      if (!left) other.remove();
      var ac = annual.querySelector('.shiftCount');
      if (ac) ac.textContent = String(annual.querySelectorAll('.empRow').length);
    });
  }

  function getImportCurrentShiftGroup() {
    var now = new Date();
    var muscat = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    var t = muscat.getHours() * 60 + muscat.getMinutes();
    if (t >= 21 * 60 || t < 5 * 60) return 'Night';
    if (t >= 13 * 60) return 'Afternoon';
    return 'Morning';
  }

  function syncImportShiftDetailsOpen() {
    var shift = getImportCurrentShiftGroup();
    document.querySelectorAll('details.shiftCard').forEach(function(d) {
      d.removeAttribute('open');
    });
    document.querySelectorAll('details.shiftCard[data-shift="' + shift + '"]').forEach(function(d) {
      d.setAttribute('open', '');
    });
  }

  window.reorderImportDepartments = reorderImportDepartments;
  window.applySavedEmployeeDepartmentFirst = applySavedEmployeeDepartmentFirst;

  repartitionLeaveRowsInDeptCards();
  applySavedEmployeeDepartmentFirst();
  syncImportShiftDetailsOpen();

  window.addEventListener('storage', function(e) {
    if (e.key === 'importSavedEmpId' && typeof applySavedEmployeeDepartmentFirst === 'function') {
      applySavedEmployeeDepartmentFirst();
    }
  });

  var lastUpdatedEl = document.getElementById('importLastUpdated');
  if (lastUpdatedEl) {
    var now = new Date();
    var muscat = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    var day = String(muscat.getDate()).padStart(2, '0');
    var mon = muscat.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    var year = muscat.getFullYear();
    var hh = String(muscat.getHours()).padStart(2, '0');
    var mm = String(muscat.getMinutes()).padStart(2, '0');
    lastUpdatedEl.textContent = (day + mon + year + ' / ' + hh + ':' + mm).toUpperCase();
  }
})();
