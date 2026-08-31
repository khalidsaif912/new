/**
 * Force-logout locked employee IDs, and helpers for password-gated save.
 * Locked IDs (81021 + Former Colleagues / زملاء سابقون) must re-enter
 * secret K8715s to save/login again. 8715 is PIN-protected but stays logged in.
 */
(function (global) {
  'use strict';

  var ALUMNI_IDS = [
    '82653', '8647', '82545', '8714', '82615', '8542', '8722', '8611', '8646',
    '82428', '82427', '82559', '8608', '82664', '8336', '82431', '82049',
    '80481', '82642'
  ];

  var LOCKED_LOGOUT_IDS = { '81021': true };
  var PROTECTED_SAVE_IDS = { '81021': true, '8715': true };
  var EMP_SECRET = 'K8715s';
  var SAVE_KEYS = [
    'exportSavedEmpId',
    'savedEmpId',
    'importSavedEmpId',
    'exportSavedEmpName',
    'savedEmpName',
    'importSavedEmpName'
  ];
  var RELOAD_FLAG = 'rosterEmpIdGateReload';

  ALUMNI_IDS.forEach(function (id) {
    LOCKED_LOGOUT_IDS[id] = true;
    PROTECTED_SAVE_IDS[id] = true;
  });

  function normId(id) {
    return String(id || '').trim();
  }

  function isNumericEmpId(id) {
    return /^\d+$/.test(id);
  }

  function readSavedId() {
    try {
      return (
        localStorage.getItem('exportSavedEmpId') ||
        localStorage.getItem('savedEmpId') ||
        localStorage.getItem('importSavedEmpId') ||
        ''
      );
    } catch (e) {
      return '';
    }
  }

  function clearSavedEmp() {
    try {
      SAVE_KEYS.forEach(function (k) {
        localStorage.removeItem(k);
      });
    } catch (e) {}
  }

  function forceLogoutLocked() {
    var id = normId(readSavedId());
    if (LOCKED_LOGOUT_IDS[id]) {
      clearSavedEmp();
      return true;
    }
    return false;
  }

  function isProtectedEmpId(id) {
    return !!PROTECTED_SAVE_IDS[normId(id)];
  }

  function isLockedLogoutId(id) {
    return !!LOCKED_LOGOUT_IDS[normId(id)];
  }

  function checkEmpSecret(secret) {
    return String(secret || '') === EMP_SECRET;
  }

  function addLockedId(id) {
    id = normId(id);
    if (!isNumericEmpId(id) || id === '8715') return false;
    var added = !LOCKED_LOGOUT_IDS[id];
    LOCKED_LOGOUT_IDS[id] = true;
    PROTECTED_SAVE_IDS[id] = true;
    return added;
  }

  function mergePeople(list) {
    var changed = false;
    if (!list || !list.length) return changed;
    for (var i = 0; i < list.length; i++) {
      var raw = list[i];
      var id = normId(raw && (raw.id != null ? raw.id : raw));
      if (addLockedId(id)) changed = true;
    }
    return changed;
  }

  function alumniUrlFromScript() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (src.indexOf('emp-id-gate.js') !== -1) {
        return src.replace(/emp-id-gate\.js(\?.*)?$/, 'alumni.json');
      }
    }
    return '';
  }

  function mergeAlumniFromJson() {
    var url = alumniUrlFromScript();
    if (!url || typeof fetch !== 'function') return;
    fetch(url, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        var changed = mergePeople(data.people);
        if (data.groups) {
          for (var g = 0; g < data.groups.length; g++) {
            if (mergePeople(data.groups[g] && data.groups[g].people)) changed = true;
          }
        }
        if (changed && forceLogoutLocked()) {
          try {
            if (sessionStorage.getItem(RELOAD_FLAG) === '1') return;
            sessionStorage.setItem(RELOAD_FLAG, '1');
          } catch (e) {}
          location.reload();
          return;
        }
        try { sessionStorage.removeItem(RELOAD_FLAG); } catch (e) {}
      })
      .catch(function () {});
  }

  forceLogoutLocked();
  mergeAlumniFromJson();

  global.rosterEmpIdGate = {
    forceLogoutLocked: forceLogoutLocked,
    clearSavedEmp: clearSavedEmp,
    isProtectedEmpId: isProtectedEmpId,
    isLockedLogoutId: isLockedLogoutId,
    checkEmpSecret: checkEmpSecret,
    EMP_SECRET: EMP_SECRET,
    LOCKED_ID: '81021'
  };
})(window);
