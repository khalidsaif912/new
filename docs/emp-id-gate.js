/**
 * Force-logout locked employee IDs, and helpers for password-gated save.
 * Locked ID 81021 must re-enter secret K8715s to save/login again.
 */
(function (global) {
  'use strict';

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

  function normId(id) {
    return String(id || '').trim();
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

  function checkEmpSecret(secret) {
    return String(secret || '') === EMP_SECRET;
  }

  forceLogoutLocked();

  global.rosterEmpIdGate = {
    forceLogoutLocked: forceLogoutLocked,
    clearSavedEmp: clearSavedEmp,
    isProtectedEmpId: isProtectedEmpId,
    checkEmpSecret: checkEmpSecret,
    EMP_SECRET: EMP_SECRET,
    LOCKED_ID: '81021'
  };
})(window);
