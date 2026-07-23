(function () {
  'use strict';

  var STYLE_ID = 'emp-contact-styles';
  var PHONE_LOG_URL = 'https://mantledb.sh/v2/roster-site-visits/phones';
  var MANTLE_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  var ADMIN_ID = '8715';
  var ADMIN_SECRET = 'K8715s';
  var phoneById = Object.create(null);
  var emailById = Object.create(null);
  var phonesReady = false;
  var openBlock = null;
  var editTarget = null;

  function getLang() {
    return (
      localStorage.getItem('rosterLang') ||
      localStorage.getItem('importPrefLang') ||
      localStorage.getItem('appLang') ||
      'en'
    );
  }

  function t(ar, en) {
    return getLang() === 'ar' ? ar : en;
  }

  function getViewerId() {
    try {
      var id = (
        localStorage.getItem('exportSavedEmpId') ||
        localStorage.getItem('savedEmpId') ||
        localStorage.getItem('importSavedEmpId') ||
        ''
      ).trim();
      return /^\d+$/.test(id) ? id : '';
    } catch (e) {
      return '';
    }
  }

  function empIdFromRow(row) {
    var raw = row.getAttribute('data-emp-name') || '';
    var m = raw.match(/(\d{3,})\s*$/) || raw.match(/- (\d+)/);
    return m ? m[1] : '';
  }

  function empDisplayName(row) {
    var raw = row.getAttribute('data-emp-name') || '';
    return String(raw)
      .replace(/\s*[-–—]\s*\d+\s*$/, '')
      .replace(/\s*\(\s*Inventory\s*\)\s*$/i, '')
      .trim();
  }

  function digitsOnly(phone) {
    return String(phone || '').replace(/\D/g, '');
  }

  function normalizeOmanPhone(raw) {
    var p = digitsOnly(raw);
    if (p.indexOf('00') === 0) p = p.slice(2);
    if (p.length === 8) p = '968' + p;
    return p;
  }

  function isValidOmanMobile(raw) {
    return /^968[79]\d{7}$/.test(normalizeOmanPhone(raw));
  }

  function telHref(phone) {
    var p = normalizeOmanPhone(phone);
    if (!p) return '';
    return 'tel:+' + p;
  }

  function halt(ev) {
    if (!ev) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
  }

  /** Who may add/edit contact for targetId */
  function canEditTarget(targetId) {
    var viewer = getViewerId();
    var target = String(targetId || '');
    if (!viewer || !target) return false;
    // Nobody except 8715 may touch 8715's record.
    if (target === ADMIN_ID) return viewer === ADMIN_ID;
    // Self, or admin 8715.
    return viewer === target || viewer === ADMIN_ID;
  }

  function needsSecretFor(targetId) {
    // Protect admin number; also require secret when admin edits anyone.
    var viewer = getViewerId();
    var target = String(targetId || '');
    if (target === ADMIN_ID) return true;
    if (viewer === ADMIN_ID && viewer !== target) return true;
    return false;
  }

  function isContactUi(el) {
    if (!el || typeof el.closest !== 'function') return null;
    return (
      el.closest('.empTrailHit') ||
      el.closest('.empRowTrail') ||
      el.closest('.empContactToggle') ||
      el.closest('.empStatusHit') ||
      el.closest('.empContactPanel') ||
      el.closest('.empContactAct') ||
      el.closest('.empContactShifts') ||
      el.closest('.empContactShell')
    );
  }

  function chevronSvg() {
    return (
      '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" aria-hidden="true">' +
      '<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }

  function phoneSvg() {
    return (
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">' +
      '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9z" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }

  function whatsappSvg() {
    return (
      '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
      '<path fill="currentColor" d="M12.04 2C6.58 2 2.15 6.4 2.15 11.84c0 1.99.59 3.84 1.61 5.4L2 22l4.92-1.7a9.86 9.86 0 0 0 5.12 1.41h.01c5.46 0 9.89-4.4 9.89-9.84C21.94 6.4 17.5 2 12.04 2zm5.75 14.04c-.24.68-1.4 1.25-1.93 1.33-.49.07-1.12.1-1.81-.11-.42-.13-.95-.3-1.64-.59-2.88-1.25-4.76-4.15-4.9-4.34-.15-.2-1.17-1.56-1.17-2.97 0-1.41.74-2.1 1-2.39.26-.28.57-.35.76-.35h.55c.17 0 .41-.07.64.49.24.58.81 2 .88 2.14.07.14.12.31.02.5-.1.2-.15.31-.3.48-.15.17-.31.37-.44.5-.15.14-.3.29-.13.57.17.28.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.28.14.45.12.61-.07.17-.2.7-.81.88-1.09.19-.28.37-.23.62-.14.26.1 1.63.77 1.91.91.28.14.47.21.54.33.07.12.07.68-.17 1.36z"/>' +
      '</svg>'
    );
  }

  function mailSvg() {
    return (
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">' +
      '<rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M4 7l8 6 8-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }

  function waHref(phone) {
    var p = normalizeOmanPhone(phone);
    if (!p) return '';
    return 'https://wa.me/' + p;
  }

  function injectStyles() {
    var st = document.getElementById(STYLE_ID);
    if (!st) {
      st = document.createElement('style');
      st.id = STYLE_ID;
      document.head.appendChild(st);
    }
    st.textContent = [
      '.empRowTrail{',
      'display:flex;align-items:center;justify-content:flex-end;gap:4px;',
      'flex-shrink:0;align-self:flex-start;pointer-events:auto;cursor:pointer;',
      'padding:0 0 0 8px;margin:0;position:relative;z-index:2;',
      '-webkit-tap-highlight-color:transparent;',
      '}',
      /* Invisible hit zone on the right of the name row only (not the open panel). */
      '.empTrailHit{',
      'position:absolute;top:0;right:0;height:40px;width:78px;z-index:1;',
      'cursor:pointer;-webkit-tap-highlight-color:transparent;',
      '}',
      '.empMain{min-width:0;flex:1;display:flex;flex-direction:column;align-items:stretch;gap:0;position:relative}',
      '.empBlock{position:relative;background:transparent;display:flex;flex-direction:column}',
      '.empBlock > .empRow{align-items:center}',
      '.empContactToggle,.empStatusHit{',
      'display:inline-flex;align-items:center;justify-content:center;',
      'padding:0;margin:0;border:none;cursor:pointer;',
      'background:transparent;box-shadow:none;outline:none;',
      '-webkit-tap-highlight-color:transparent;flex-shrink:0;',
      '}',
      '.empContactToggle{',
      'width:18px;height:18px;color:#64748b;',
      'transition:color .15s ease,transform .15s ease;',
      '}',
      '.empContactToggle:hover,.empStatusHit:hover{opacity:.9}',
      '.empContactToggle:active{transform:scale(.9)}',
      '.empContactToggle svg{display:block;transition:transform .25s cubic-bezier(.22,1,.36,1)}',
      '.empBlock.is-open .empContactToggle{color:#0284c7}',
      '.empBlock.is-open .empContactToggle svg{transform:rotate(180deg)}',
      '.empStatusHit{font:inherit;font-size:13px;font-weight:600;line-height:1.2}',
      /* Full-width under the employee row so all 5 codes fit */
      '.empContactShell{',
      'display:grid;grid-template-rows:0fr;',
      'transition:grid-template-rows .28s cubic-bezier(.22,1,.36,1);',
      'width:100%;box-sizing:border-box;',
      '}',
      '.empBlock.is-open .empContactShell{grid-template-rows:1fr}',
      '.empContactShell > .empContactClip{min-height:0;overflow:hidden;background:transparent;border:0;box-shadow:none}',
      '.empContactPanel{',
      'display:flex;flex-wrap:nowrap;align-items:center;justify-content:flex-start;gap:5px;',
      'padding:0 14px;opacity:0;transform:translateY(-3px);',
      'transition:opacity .22s ease,transform .22s ease,padding .22s ease;',
      'min-width:0;box-sizing:border-box;width:100%;',
      '}',
      '.empBlock.is-open .empContactPanel{padding:4px 14px 8px;opacity:1;transform:translateY(0)}',
      '.empContactActs{',
      'display:inline-flex;flex-wrap:nowrap;align-items:center;justify-content:flex-start;',
      'gap:5px;min-height:26px;flex:0 0 auto;',
      '}',
      '.empContactAct{',
      'width:26px;height:26px;border-radius:8px;flex:0 0 auto;',
      'display:inline-flex;align-items:center;justify-content:center;',
      'text-decoration:none;border:1px solid rgba(148,163,184,.28);',
      'background:rgba(255,255,255,.45);backdrop-filter:blur(8px);',
      '-webkit-backdrop-filter:blur(8px);color:#334155;',
      'transition:transform .12s ease,opacity .15s ease,background .15s ease;',
      '-webkit-tap-highlight-color:transparent;user-select:none;',
      '}',
      '.empContactAct .empContactLbl{display:none}',
      '.empContactAct:active{transform:scale(.94)}',
      '.empContactAct svg{display:block;width:13px;height:13px}',
      '.empContactAct--call{color:#047857;border-color:rgba(16,185,129,.28);background:rgba(16,185,129,.10)}',
      '.empContactAct--wa{color:#128C7E;border-color:rgba(18,140,126,.30);background:rgba(37,211,102,.12)}',
      '.empContactAct--mail{color:#0369a1;border-color:rgba(14,165,233,.28);background:rgba(14,165,233,.10)}',
      '.empContactAct.is-muted{opacity:.55}',
      '.empContactSep{',
      'width:1px;align-self:center;height:16px;min-height:16px;margin:0 2px;',
      'background:rgba(148,163,184,.45);flex:0 0 auto;',
      '}',
      '.empContactShifts{',
      'display:inline-flex;flex-wrap:nowrap;gap:2px;align-items:center;',
      'min-height:22px;min-width:0;flex:1 1 auto;',
      '}',
      '.empContactShiftLine{',
      'display:inline-flex;flex-wrap:nowrap;align-items:center;gap:2px;',
      'font:800 11px/1.2 system-ui,Segoe UI,sans-serif;',
      'letter-spacing:0;white-space:nowrap;',
      '}',
      '.empContactShiftCode{color:#64748b;flex:0 0 auto}',
      '.empContactShiftCode.is-today{color:#0f766e}',
      '.empContactShiftSep{color:#cbd5e1;font-weight:700;padding:0;flex:0 0 auto}',
      '.empContactShiftsEmpty{',
      'font:600 11px/1.3 system-ui,Segoe UI,sans-serif;color:#94a3b8;',
      '}',
      '.empContactToast{',
      'position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(12px);',
      'background:rgba(15,23,42,.92);color:#fff;padding:10px 14px;border-radius:999px;',
      'font:700 13px/1.2 system-ui,Segoe UI,sans-serif;z-index:10050;opacity:0;',
      'pointer-events:none;transition:opacity .2s ease,transform .2s ease;',
      'max-width:min(92vw,340px);text-align:center;',
      '}',
      '.empContactToast.show{opacity:1;transform:translateX(-50%) translateY(0)}',
      '.empContactSheet{',
      'position:fixed;inset:0;z-index:10060;display:none;align-items:center;justify-content:center;',
      'padding:16px;background:rgba(15,23,42,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);',
      '}',
      '.empContactSheet.open{display:flex}',
      '.empContactCard{',
      'width:min(100%,400px);background:linear-gradient(180deg,#fff,#f8fbff);',
      'border:1px solid rgba(148,163,184,.28);border-radius:20px;padding:18px 16px 14px;',
      'box-shadow:0 24px 60px rgba(15,23,42,.28);text-align:center;',
      '}',
      '.empContactCard h2{margin:0 0 6px;font-size:17px;font-weight:900;color:#0f172a}',
      '.empContactCard .sub{margin:0 0 12px;font-size:12px;color:#64748b;font-weight:700}',
      '.empContactCard input{',
      'width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:12px;',
      'padding:12px;font:inherit;font-size:16px;direction:ltr;text-align:center;margin:0 0 10px;',
      '}',
      '.empContactCard .row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.empContactCard button{',
      'min-height:44px;border:0;border-radius:14px;font:inherit;font-weight:800;cursor:pointer;',
      '}',
      '.empContactSave{background:#0f766e;color:#fff}',
      '.empContactCancel{background:#e2e8f0;color:#334155}',
      '.empContactMsg{min-height:18px;margin-top:10px;font-size:12px;font-weight:800;color:#0f766e}',
      '.empContactMsg.err{color:#dc2626}',
      '@media (prefers-reduced-motion:reduce){',
      '.empContactShell,.empContactPanel,.empContactToggle svg{transition:none!important}',
      '}'
    ].join('');
  }

  function showToast(msg) {
    var el = document.getElementById('empContactToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'empContactToast';
      el.className = 'empContactToast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      el.classList.remove('show');
    }, 2400);
  }

  function mantleHeaders() {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Mantle-Key': MANTLE_KEY
    };
  }

  function applyOverrides() {
    var map = window.ROSTER_CONTACT_OVERRIDES;
    if (!map || typeof map !== 'object') return;
    Object.keys(map).forEach(function (id) {
      var row = map[id] || {};
      if (row.phone) phoneById[String(id)] = String(row.phone);
      if (row.email) emailById[String(id)] = String(row.email);
    });
  }

  function loadPhones() {
    applyOverrides();
    return fetch(PHONE_LOG_URL + '?ts=' + Date.now(), {
      headers: { Accept: 'application/json', 'X-Mantle-Key': MANTLE_KEY },
      cache: 'no-store'
    })
      .then(function (r) {
        if (r.status === 404) return { phones: [] };
        if (!r.ok) throw new Error('phones');
        return r.json().catch(function () {
          return { phones: [] };
        });
      })
      .then(function (json) {
        var list = Array.isArray(json && json.phones) ? json.phones : [];
        list.forEach(function (item) {
          if (!item || !item.id) return;
          var id = String(item.id);
          if (item.phone) phoneById[id] = String(item.phone);
          if (item.email) emailById[id] = String(item.email);
        });
        phonesReady = true;
        refreshAllPanels();
      })
      .catch(function () {
        phonesReady = true;
        refreshAllPanels();
      });
  }

  function saveContactToMantle(row) {
    return fetch(PHONE_LOG_URL + '?ts=' + Date.now(), {
      headers: { Accept: 'application/json', 'X-Mantle-Key': MANTLE_KEY },
      cache: 'no-store'
    })
      .then(function (r) {
        if (r.status === 404) return {};
        if (!r.ok) throw new Error('read');
        return r.json().catch(function () {
          return {};
        });
      })
      .then(function (cur) {
        var list = Array.isArray(cur && cur.phones) ? cur.phones.slice() : [];
        var kept = list.filter(function (item) {
          return !(item && String(item.id) === String(row.id));
        });
        kept.unshift(row);
        if (kept.length > 800) kept.length = 800;
        return fetch(PHONE_LOG_URL, {
          method: 'POST',
          headers: mantleHeaders(),
          body: JSON.stringify({ phones: kept })
        }).then(function (r) {
          if (!r.ok) throw new Error('write');
        });
      });
  }

  function ensureEditSheet() {
    var sheet = document.getElementById('empContactSheet');
    if (sheet) return sheet;
    sheet = document.createElement('div');
    sheet.id = 'empContactSheet';
    sheet.className = 'empContactSheet';
    sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML =
      '<div class="empContactCard" role="dialog" aria-modal="true">' +
      '<h2 id="empContactSheetTitle"></h2>' +
      '<div class="sub" id="empContactSheetSub"></div>' +
      '<input id="empContactPhoneInput" type="text" inputmode="numeric" autocomplete="off" maxlength="15" placeholder="9XXXXXXX" dir="ltr">' +
      '<input id="empContactEmailInput" type="email" autocomplete="off" maxlength="80" placeholder="email@example.com" dir="ltr">' +
      '<input id="empContactSecretInput" type="password" autocomplete="off" maxlength="24" placeholder="" dir="ltr" hidden>' +
      '<div class="row2">' +
      '<button type="button" class="empContactSave" id="empContactSaveBtn"></button>' +
      '<button type="button" class="empContactCancel" id="empContactCancelBtn"></button>' +
      '</div>' +
      '<div class="empContactMsg" id="empContactMsg"></div>' +
      '</div>';
    document.body.appendChild(sheet);

    sheet.addEventListener('click', function (ev) {
      if (ev.target === sheet) closeEditSheet();
    });
    document.getElementById('empContactCancelBtn').addEventListener('click', function (ev) {
      halt(ev);
      closeEditSheet();
    });
    document.getElementById('empContactSaveBtn').addEventListener('click', function (ev) {
      halt(ev);
      submitEditSheet();
    });
    return sheet;
  }

  function closeEditSheet() {
    var sheet = document.getElementById('empContactSheet');
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    editTarget = null;
  }

  function openEditSheet(target) {
    if (!target || !target.id) return;
    if (!canEditTarget(target.id)) {
      showToast(t('ليست لديك صلاحية تعديل بيانات هذا الموظف', 'You cannot edit this employee contact'));
      return;
    }
    // Extra lock: only 8715 session may open editor for 8715.
    if (String(target.id) === ADMIN_ID && getViewerId() !== ADMIN_ID) {
      showToast(t('لا يمكن حفظ/تعديل رقم 8715 من حساب آخر', 'Only 8715 can edit this contact'));
      return;
    }

    editTarget = target;
    var sheet = ensureEditSheet();
    var title = document.getElementById('empContactSheetTitle');
    var sub = document.getElementById('empContactSheetSub');
    var phoneIn = document.getElementById('empContactPhoneInput');
    var emailIn = document.getElementById('empContactEmailInput');
    var secretIn = document.getElementById('empContactSecretInput');
    var msg = document.getElementById('empContactMsg');
    var saveBtn = document.getElementById('empContactSaveBtn');
    var cancelBtn = document.getElementById('empContactCancelBtn');
    var focusField = target.focusField === 'email' ? 'email' : 'phone';

    title.textContent =
      focusField === 'email'
        ? t('إضافة / تعديل البريد', 'Add / edit email')
        : t('إضافة / تعديل الرقم', 'Add / edit phone');
    sub.textContent = (target.name || '') + ' — ' + target.id;
    phoneIn.value = phoneById[target.id] ? String(phoneById[target.id]).replace(/^968/, '') : '';
    emailIn.value = emailById[target.id] || '';
    phoneIn.placeholder = t('رقم الجوال', 'Mobile number');
    emailIn.placeholder = t('البريد (اختياري)', 'Email (optional)');
    saveBtn.textContent = t('حفظ', 'Save');
    cancelBtn.textContent = t('إلغاء', 'Cancel');
    msg.className = 'empContactMsg';
    msg.textContent = '';

    if (needsSecretFor(target.id)) {
      secretIn.hidden = false;
      secretIn.value = '';
      secretIn.placeholder = t('الرقم السري', 'Secret code');
    } else {
      secretIn.hidden = true;
      secretIn.value = '';
    }

    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    setTimeout(function () {
      if (focusField === 'email') emailIn.focus();
      else phoneIn.focus();
    }, 40);
  }

  function submitEditSheet() {
    if (!editTarget || !editTarget.id) return;
    var targetId = String(editTarget.id);
    if (!canEditTarget(targetId) || (targetId === ADMIN_ID && getViewerId() !== ADMIN_ID)) {
      showToast(t('ليست لديك صلاحية', 'Not allowed'));
      return;
    }

    var phoneIn = document.getElementById('empContactPhoneInput');
    var emailIn = document.getElementById('empContactEmailInput');
    var secretIn = document.getElementById('empContactSecretInput');
    var msg = document.getElementById('empContactMsg');
    var saveBtn = document.getElementById('empContactSaveBtn');

    if (needsSecretFor(targetId)) {
      if (String(secretIn.value || '') !== ADMIN_SECRET) {
        msg.className = 'empContactMsg err';
        msg.textContent = t('الرقم السري غير صحيح', 'Incorrect secret code');
        return;
      }
    }

    var phoneRaw = String((phoneIn && phoneIn.value) || '').trim();
    var phone = phoneRaw ? normalizeOmanPhone(phoneRaw) : '';
    var email = String((emailIn && emailIn.value) || '').trim();
    var focusField = editTarget.focusField === 'email' ? 'email' : 'phone';
    var existingPhone = phoneById[targetId] || '';

    if (focusField === 'email') {
      if (!email || email.indexOf('@') < 1) {
        msg.className = 'empContactMsg err';
        msg.textContent = t('أدخل بريداً صالحاً', 'Enter a valid email');
        return;
      }
      if (!phone && existingPhone) phone = normalizeOmanPhone(existingPhone);
      if (phone && !isValidOmanMobile(phone)) {
        msg.className = 'empContactMsg err';
        msg.textContent = t('أدخل رقم جوال عماني صحيح (يبدأ بـ 7 أو 9)', 'Enter a valid Oman mobile (starts with 7 or 9)');
        return;
      }
      if (!phone) {
        // Email-only save allowed; keep a placeholder phone key empty in store as prior phone absent.
        phone = existingPhone || '';
      }
    } else {
      if (!isValidOmanMobile(phone)) {
        msg.className = 'empContactMsg err';
        msg.textContent = t('أدخل رقم جوال عماني صحيح (يبدأ بـ 7 أو 9)', 'Enter a valid Oman mobile (starts with 7 or 9)');
        return;
      }
      if (email && email.indexOf('@') < 1) {
        msg.className = 'empContactMsg err';
        msg.textContent = t('البريد غير صالح', 'Invalid email');
        return;
      }
    }

    msg.className = 'empContactMsg';
    msg.textContent = t('جاري الحفظ…', 'Saving…');
    saveBtn.disabled = true;

    var row = {
      id: targetId,
      name: editTarget.name || '',
      phone: phone || existingPhone || '',
      email: email || undefined,
      at: Date.now(),
      by: getViewerId() || ''
    };

    if (!row.phone && !row.email) {
      msg.className = 'empContactMsg err';
      msg.textContent = t('أدخل رقماً أو بريداً', 'Enter a phone or email');
      saveBtn.disabled = false;
      return;
    }

    saveContactToMantle(row)
      .then(function () {
        if (row.phone) phoneById[targetId] = row.phone;
        if (email) emailById[targetId] = email;
        else delete emailById[targetId];
        refreshAllPanels();
        msg.className = 'empContactMsg';
        msg.textContent = t('تم الحفظ بنجاح', 'Saved successfully');
        setTimeout(closeEditSheet, 700);
      })
      .catch(function () {
        msg.className = 'empContactMsg err';
        msg.textContent = t('تعذر الحفظ، حاول مرة أخرى', 'Save failed, try again');
      })
      .then(function () {
        saveBtn.disabled = false;
      });
  }

  function ensureTrail(row) {
    var status = row.querySelector('.empStatus, .empStatusHit');
    if (!status) return null;
    var trail = row.querySelector('.empRowTrail');
    if (trail) {
      if (status.parentElement !== trail) trail.appendChild(status);
      return trail;
    }
    trail = document.createElement('div');
    trail.className = 'empRowTrail';
    status.parentNode.insertBefore(trail, status);
    trail.appendChild(status);
    return trail;
  }

  function ensureMain(row) {
    var name = row.querySelector('.empName');
    if (!name) return null;
    if (name.parentElement && name.parentElement.classList.contains('empMain')) {
      return name.parentElement;
    }
    var main = document.createElement('div');
    main.className = 'empMain';
    name.parentNode.insertBefore(main, name);
    main.appendChild(name);
    return main;
  }

  function ensureBlock(row) {
    if (row.parentElement && row.parentElement.classList.contains('empBlock')) {
      var existing = row.parentElement;
      if (!existing.querySelector('.empTrailHit')) {
        var hit0 = document.createElement('div');
        hit0.className = 'empTrailHit';
        hit0.setAttribute('aria-hidden', 'true');
        existing.appendChild(hit0);
      }
      return existing;
    }
    var block = document.createElement('div');
    block.className = 'empBlock';
    row.parentNode.insertBefore(block, row);
    block.appendChild(row);
    var hit = document.createElement('div');
    hit.className = 'empTrailHit';
    hit.setAttribute('aria-hidden', 'true');
    block.appendChild(hit);
    return block;
  }

  var scheduleCache = Object.create(null);

  function docsRootUrl() {
    try {
      if (typeof getSiteRootUrl === 'function') return getSiteRootUrl();
    } catch (e) {}
    try {
      var m = String(location.pathname || '').match(/^(.*?\/docs)(?:\/|$)/);
      if (m) return location.origin + m[1];
    } catch (e2) {}
    return location.origin;
  }

  function getReferenceIsoDate() {
    var pathMatch = (location.pathname || '').match(/\/date\/(\d{4}-\d{2}-\d{2})\//);
    if (pathMatch) return pathMatch[1];
    var picker = document.getElementById('datePicker');
    if (picker && picker.value) return picker.value;
    var now = new Date();
    var muscat = new Date(now.getTime() + 4 * 60 * 60 * 1000 + now.getTimezoneOffset() * 60 * 1000);
    return (
      muscat.getFullYear() +
      '-' +
      String(muscat.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(muscat.getDate()).padStart(2, '0')
    );
  }

  function flattenFutureShifts(data, fromIso) {
    var out = [];
    if (!data || !data.schedules) return out;
    Object.keys(data.schedules).forEach(function (monthKey) {
      var mk = String(monthKey).match(/^(\d{4})-(\d{2})$/);
      if (!mk) return;
      var y = mk[1];
      var mo = mk[2];
      var rows = data.schedules[monthKey] || [];
      rows.forEach(function (r) {
        if (!r) return;
        var iso = String(r.date || '').trim();
        if (!iso && r.day != null && r.day !== '') {
          iso = y + '-' + mo + '-' + String(r.day).padStart(2, '0');
        }
        if (!iso || iso < fromIso) return;
        out.push({ date: iso, shift_code: String(r.shift_code || r.code || '').trim() });
      });
    });
    out.sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date));
    });
    return out.slice(0, 5);
  }

  function formatShortDateParts(isoDate) {
    var match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return { dayName: '--', dateLabel: String(isoDate || '-') };
    var d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (isNaN(d.getTime())) return { dayName: '--', dateLabel: String(isoDate || '-') };
    var dayName = d.toLocaleDateString(getLang() === 'ar' ? 'ar' : 'en-GB', { weekday: 'short' });
    if (getLang() !== 'ar') dayName = dayName.toUpperCase();
    var dateLabel = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return { dayName: dayName, dateLabel: dateLabel };
  }

  function getScheduleRows(empId, fromIso) {
    if (!empId) return Promise.resolve([]);
    if (scheduleCache[empId]) {
      return Promise.resolve(flattenFutureShifts(scheduleCache[empId], fromIso));
    }
    var url = docsRootUrl() + '/schedules/' + encodeURIComponent(empId) + '.json';
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('missing');
        return res.json();
      })
      .then(function (json) {
        scheduleCache[empId] = json;
        return flattenFutureShifts(json, fromIso);
      })
      .catch(function () {
        return [];
      });
  }

  function renderShiftsInto(block, rows) {
    var box = block.querySelector('.empContactShifts');
    if (!box) return;
    if (!rows || !rows.length) {
      box.innerHTML =
        '<div class="empContactShiftsEmpty">' +
        t('لا توجد مناوبات قادمة', 'No upcoming shifts') +
        '</div>';
      return;
    }
    var todayIso = getReferenceIsoDate();
    var parts = [];
    rows.forEach(function (r, idx) {
      var code = String(r.shift_code || '').trim() || '-';
      var isToday = String(r.date || '') === todayIso;
      if (idx > 0) {
        parts.push('<span class="empContactShiftSep" aria-hidden="true">›</span>');
      }
      parts.push(
        '<span class="empContactShiftCode' +
          (isToday ? ' is-today' : '') +
          '"' +
          (isToday ? ' title="' + t('اليوم', 'Today') + '"' : '') +
          '>' +
          code +
          '</span>'
      );
    });
    box.innerHTML = '<div class="empContactShiftLine" dir="ltr">' + parts.join('') + '</div>';
  }

  function loadShiftsForBlock(block) {
    var row = block && block.querySelector('.empRow');
    if (!row) return;
    var id = empIdFromRow(row);
    var box = block.querySelector('.empContactShifts');
    if (box) {
      box.innerHTML =
        '<div class="empContactShiftsEmpty">' + t('جاري التحميل…', 'Loading…') + '</div>';
    }
    getScheduleRows(id, getReferenceIsoDate()).then(function (rows) {
      if (!block.classList.contains('is-open')) return;
      renderShiftsInto(block, rows);
    });
  }

  function ensureWaButton(acts) {
    if (!acts || acts.querySelector('[data-act="wa"]')) return;
    var call = acts.querySelector('[data-act="call"]');
    var wa = document.createElement('a');
    wa.className = 'empContactAct empContactAct--wa';
    wa.setAttribute('data-act', 'wa');
    wa.setAttribute('tabindex', '0');
    wa.innerHTML = whatsappSvg() + '<span class="empContactLbl">' + t('واتساب', 'WhatsApp') + '</span>';
    if (call && call.nextSibling) acts.insertBefore(wa, call.nextSibling);
    else if (call) acts.appendChild(wa);
    else acts.insertBefore(wa, acts.firstChild);
  }

  function ensurePanelUnderName(row) {
    var block = ensureBlock(row);
    if (!block) return null;
    ensureMain(row);

    // Migrate older shell that lived under the name (too narrow on mobile).
    var main = row.querySelector('.empMain');
    var oldShell = main && main.querySelector('.empContactShell');
    if (oldShell && oldShell.parentElement !== block) {
      var hitMove = block.querySelector('.empTrailHit');
      if (hitMove) block.insertBefore(oldShell, hitMove);
      else block.appendChild(oldShell);
    }

    var shell = null;
    Array.prototype.slice.call(block.children).some(function (ch) {
      if (ch.classList && ch.classList.contains('empContactShell')) {
        shell = ch;
        return true;
      }
      return false;
    });
    if (!shell) shell = block.querySelector('.empContactShell');

    if (shell) {
      if (shell.parentElement !== block) {
        var hit = block.querySelector('.empTrailHit');
        if (hit) block.insertBefore(shell, hit);
        else block.appendChild(shell);
      }
      var actsExisting = shell.querySelector('.empContactActs');
      if (actsExisting) ensureWaButton(actsExisting);
      if (!shell.querySelector('.empContactShifts')) {
        var panel = shell.querySelector('.empContactPanel');
        if (panel && !panel.querySelector('.empContactActs')) {
          var acts = document.createElement('div');
          acts.className = 'empContactActs';
          Array.prototype.slice.call(panel.querySelectorAll('.empContactAct')).forEach(function (a) {
            acts.appendChild(a);
          });
          panel.innerHTML = '';
          panel.appendChild(acts);
          ensureWaButton(acts);
          panel.insertAdjacentHTML(
            'beforeend',
            '<div class="empContactSep" aria-hidden="true"></div>' +
              '<div class="empContactShifts" aria-label="' +
              t('المناوبات القادمة', 'Upcoming shifts') +
              '"></div>'
          );
        }
      }
      return shell;
    }

    shell = document.createElement('div');
    shell.className = 'empContactShell';
    shell.innerHTML =
      '<div class="empContactClip">' +
      '<div class="empContactPanel" role="group" aria-label="Contact">' +
      '<div class="empContactActs">' +
      '<a class="empContactAct empContactAct--call" data-act="call" tabindex="0">' +
      phoneSvg() +
      '<span class="empContactLbl">' +
      t('اتصال', 'Call') +
      '</span></a>' +
      '<a class="empContactAct empContactAct--wa" data-act="wa" tabindex="0">' +
      whatsappSvg() +
      '<span class="empContactLbl">' +
      t('واتساب', 'WhatsApp') +
      '</span></a>' +
      '<a class="empContactAct empContactAct--mail" data-act="mail" tabindex="0">' +
      mailSvg() +
      '<span class="empContactLbl">' +
      t('بريد', 'Email') +
      '</span></a>' +
      '</div>' +
      '<div class="empContactSep" aria-hidden="true"></div>' +
      '<div class="empContactShifts" aria-label="' +
      t('المناوبات القادمة', 'Upcoming shifts') +
      '"></div>' +
      '</div></div>';
    var trailHit = block.querySelector('.empTrailHit');
    if (trailHit) block.insertBefore(shell, trailHit);
    else block.appendChild(shell);
    return shell;
  }

  function fillPanel(block) {
    var row = block.querySelector('.empRow');
    if (!row) return;
    var id = empIdFromRow(row);
    var phone = phoneById[id] || '';
    var email = emailById[id] || '';
    var call = block.querySelector('[data-act="call"]');
    var wa = block.querySelector('[data-act="wa"]');
    var mail = block.querySelector('[data-act="mail"]');
    var editable = canEditTarget(id);

    function fillPhoneAction(el, kind) {
      if (!el) return;
      el.classList.remove('is-muted');
      el.removeAttribute('href');
      el.removeAttribute('target');
      el.removeAttribute('rel');
      var holdHint = t('اضغط مطولاً للإضافة/التعديل', 'Long-press to add/edit');
      if (phone) {
        if (kind === 'wa') {
          el.href = waHref(phone);
          el.target = '_blank';
          el.rel = 'noopener noreferrer';
          el.title = t('واتساب', 'WhatsApp') + ' · ' + phone + ' — ' + holdHint;
          el.dataset.mode = 'wa';
        } else {
          el.href = telHref(phone);
          el.title = t('اتصال', 'Call') + ' · ' + phone + ' — ' + holdHint;
          el.dataset.mode = 'dial';
        }
      } else if (editable) {
        el.title = holdHint;
        el.dataset.mode = 'none';
        el.classList.add('is-muted');
      } else {
        el.title = t('لا يوجد رقم', 'No phone');
        el.dataset.mode = 'none';
        el.classList.add('is-muted');
      }
    }

    fillPhoneAction(call, 'call');
    fillPhoneAction(wa, 'wa');

    if (mail) {
      mail.classList.remove('is-muted');
      mail.removeAttribute('href');
      var mailHold = t('اضغط مطولاً لإضافة/تعديل البريد', 'Long-press to add/edit email');
      if (email) {
        mail.href =
          'mailto:' +
          email +
          '?subject=' +
          encodeURIComponent(t('تواصل بخصوص الروستر', 'Roster contact') + ' — ' + empDisplayName(row));
        mail.title = email + ' — ' + mailHold;
        mail.dataset.mode = 'mail';
      } else if (editable) {
        mail.title = mailHold;
        mail.dataset.mode = 'none';
        mail.classList.add('is-muted');
      } else {
        mail.title = t('لا يوجد بريد', 'No email');
        mail.dataset.mode = 'none';
        mail.classList.add('is-muted');
      }
    }
  }

  function refreshAllPanels() {
    document.querySelectorAll('.empBlock').forEach(fillPanel);
  }

  function setOpen(block, open) {
    if (openBlock && openBlock !== block) {
      openBlock.classList.remove('is-open');
      var prevBtn = openBlock.querySelector('.empContactToggle');
      if (prevBtn) prevBtn.setAttribute('aria-expanded', 'false');
    }
    if (open) {
      block.classList.add('is-open');
      openBlock = block;
      loadShiftsForBlock(block);
    } else {
      block.classList.remove('is-open');
      if (openBlock === block) openBlock = null;
    }
    var btn = block.querySelector('.empContactToggle');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function toggleFrom(el) {
    var block = el && el.closest ? el.closest('.empBlock') : null;
    if (!block) return;
    setOpen(block, !block.classList.contains('is-open'));
  }

  function openEditForAct(act) {
    var block = act.closest('.empBlock');
    var row = block && block.querySelector('.empRow');
    if (!row) return;
    var id = empIdFromRow(row);
    var name = empDisplayName(row);
    var kind = act.getAttribute('data-act') || '';
    if (!canEditTarget(id)) {
      showToast(t('ليست لديك صلاحية التعديل', 'You cannot edit this contact'));
      return;
    }
    openEditSheet({
      id: id,
      name: name,
      focusField: kind === 'mail' ? 'email' : 'phone'
    });
  }

  function onActClick(act) {
    var mode = act.dataset.mode || '';
    var kind = act.getAttribute('data-act') || '';

    if (mode === 'dial' || mode === 'mail' || mode === 'wa') {
      var href = act.getAttribute('href');
      if (!href) return;
      if (mode === 'wa') window.open(href, '_blank', 'noopener,noreferrer');
      else window.location.href = href;
      return;
    }

    // Short tap with no saved value: hint to long-press.
    if (kind === 'mail') {
      showToast(t('اضغط مطولاً على البريد لإضافة الإيميل', 'Long-press email to add an address'));
    } else {
      showToast(t('اضغط مطولاً على الأيقونة لإضافة الرقم', 'Long-press the icon to add a phone'));
    }
  }

  function guardNavigationCapture() {
    if (document.documentElement.dataset.empContactGuard === '1') return;
    document.documentElement.dataset.empContactGuard = '1';

    var LONG_MS = 520;
    var holdTimer = null;
    var holdAct = null;
    var holdMoved = false;
    var holdTriggered = false;
    var startX = 0;
    var startY = 0;

    function clearHold() {
      if (holdTimer) clearTimeout(holdTimer);
      holdTimer = null;
      holdAct = null;
      holdMoved = false;
    }

    function onCapture(ev) {
      // Let the edit dialog receive clicks/focus normally.
      if (ev.target && ev.target.closest && ev.target.closest('.empContactSheet')) {
        return;
      }

      var actEl = ev.target && ev.target.closest ? ev.target.closest('.empContactAct') : null;

      if ((ev.type === 'pointerdown' || ev.type === 'touchstart') && actEl) {
        halt(ev);
        clearHold();
        holdAct = actEl;
        holdMoved = false;
        holdTriggered = false;
        startX = ev.clientX != null ? ev.clientX : (ev.touches && ev.touches[0] ? ev.touches[0].clientX : 0);
        startY = ev.clientY != null ? ev.clientY : (ev.touches && ev.touches[0] ? ev.touches[0].clientY : 0);
        holdTimer = setTimeout(function () {
          if (!holdAct || holdMoved) return;
          holdTriggered = true;
          openEditForAct(holdAct);
          clearHold();
        }, LONG_MS);
        return;
      }

      if (holdAct && (ev.type === 'pointermove' || ev.type === 'touchmove')) {
        var x = ev.clientX != null ? ev.clientX : (ev.touches && ev.touches[0] ? ev.touches[0].clientX : startX);
        var y = ev.clientY != null ? ev.clientY : (ev.touches && ev.touches[0] ? ev.touches[0].clientY : startY);
        if (Math.abs(x - startX) > 10 || Math.abs(y - startY) > 10) {
          holdMoved = true;
          clearHold();
        }
        return;
      }

      if (ev.type === 'pointerup' || ev.type === 'pointercancel' || ev.type === 'touchend' || ev.type === 'touchcancel') {
        if (holdAct) {
          halt(ev);
          // keep holdTriggered for the following click suppression
          if (!holdTriggered) {
            /* click handler will run short action */
          }
          if (holdTimer) clearTimeout(holdTimer);
          holdTimer = null;
          holdAct = null;
        }
      }

      var hit = isContactUi(ev.target);
      if (!hit) return;

      // Important: do NOT preventDefault on pointerdown/touchstart — that cancels the
      // subsequent click, so the chevron/code would appear dead. Only stop bubbling
      // so the row does not navigate to "My Schedule".
      if (ev.type === 'pointerdown' || ev.type === 'touchstart') {
        if (typeof ev.stopPropagation === 'function') ev.stopPropagation();
        if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
        return;
      }

      if (ev.type !== 'click') return;
      halt(ev);

      if (holdTriggered) {
        holdTriggered = false;
        return;
      }

      // Right column hit zone (or code/arrow) opens/closes menu.
      var trailHit = ev.target.closest(
        '.empTrailHit, .empRowTrail, .empContactToggle, .empStatusHit'
      );
      if (trailHit) {
        toggleFrom(trailHit.closest('.empBlock') || trailHit);
        return;
      }

      var act = ev.target.closest('.empContactAct');
      if (act) onActClick(act);
    }

    ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'click'].forEach(function (type) {
      document.addEventListener(type, onCapture, true);
    });
  }

  function enhanceRow(row) {
    if (!row) return;
    if (!row.querySelector('.empStatus, .empStatusHit')) return;

    var first = row.dataset.empContact !== '1';
    row.dataset.empContact = '1';

    var block = ensureBlock(row);
    ensureMain(row);
    ensurePanelUnderName(row);

    var status = row.querySelector('.empStatus, .empStatusHit');
    if (status && !status.classList.contains('empStatusHit')) {
      status.classList.add('empStatusHit');
      status.setAttribute('role', 'button');
      status.setAttribute('tabindex', '0');
      status.title = t('عرض خيارات الاتصال', 'Show contact options');
    }

    var trail = ensureTrail(row);
    if (trail && !trail.querySelector('.empContactToggle')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'empContactToggle';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', t('خيارات الاتصال', 'Contact options'));
      btn.innerHTML = chevronSvg();
      trail.appendChild(btn);
    }

    fillPanel(block);
  }

  function applyAll() {
    injectStyles();
    document.querySelectorAll('.deptCard .empRow, .shiftBody .empRow').forEach(enhanceRow);
  }

  function boot() {
    injectStyles();
    guardNavigationCapture();
    applyAll();
    loadPhones();
    document.addEventListener('rosterLangChanged', function () {
      refreshAllPanels();
      document.querySelectorAll('.empContactToggle').forEach(function (btn) {
        btn.setAttribute('aria-label', t('خيارات الاتصال', 'Contact options'));
      });
    });
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      applyAll();
      if (tries >= 20 || document.querySelector('.empContactToggle')) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
