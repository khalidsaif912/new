/**
 * News ticker — shows admin-approved employee messages (+ optional holidays).
 * The emoji opens a compose modal to submit a ticker message.
 */
(function () {
  'use strict';

  var PREVIEW_HOLIDAYS = true; // also scroll upcoming holidays while empty/previewing
  var TICKER_ID = 'holidayTicker';
  var STYLE_ID = 'holidayTickerCss';
  var MODAL_ID = 'htComposeModal';
  var MANTLE_URL = 'https://mantledb.sh/v2/roster-site-visits/ticker-messages';
  var MANTLE_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  var EMOJI_DEFAULTS = { '82437': '1f349' };
  var holidaysCache = null;
  var messagesCache = null;
  var showModeCache = 'both';
  var staffById = null;
  var emojiListCache = null;
  var composeBound = false;

  function normalizeMode(m) {
    m = String(m || '').trim();
    if (m === 'official' || m === 'staff' || m === 'both') return m;
    return 'both';
  }

  function lang() {
    try {
      var l = localStorage.getItem('rosterLang') || document.documentElement.getAttribute('lang') || 'en';
      return l === 'ar' ? 'ar' : 'en';
    } catch (e) {
      return 'en';
    }
  }

  function docsBase() {
    try {
      if (typeof getSiteRootUrl === 'function') {
        var r = getSiteRootUrl();
        if (r) return r.replace(/\/?$/, '/');
      }
    } catch (e) {}
    try {
      var m = String(location.pathname || '').match(/^(.*?\/docs\/)/);
      if (m) return m[1];
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return '/';
    } catch (e2) {}
    return '/docs/';
  }

  function boardUrl() {
    return docsBase() + 'ticker-board/';
  }

  function mantleHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Mantle-Key': MANTLE_KEY
    };
  }

  function digitsOnly(v) {
    return String(v || '').replace(/\D+/g, '').slice(0, 12);
  }

  function readSavedIdentity() {
    try {
      return {
        id: String(
          localStorage.getItem('exportSavedEmpId') ||
            localStorage.getItem('importSavedEmpId') ||
            localStorage.getItem('savedEmpId') ||
            ''
        ).trim(),
        name: String(
          localStorage.getItem('exportSavedEmpName') ||
            localStorage.getItem('importSavedEmpName') ||
            localStorage.getItem('savedEmpName') ||
            ''
        ).trim()
      };
    } catch (e) {
      return { id: '', name: '' };
    }
  }

  function saveIdentity(id, name) {
    try {
      localStorage.setItem('exportSavedEmpId', id);
      localStorage.setItem('savedEmpId', id);
      if (name) {
        localStorage.setItem('exportSavedEmpName', name);
        localStorage.setItem('savedEmpName', name);
      }
    } catch (e) {}
  }

  function validEmojiCp(cp) {
    return /^[0-9a-f]{2,8}(_[0-9a-f]{2,8})*$/i.test(String(cp || '').trim());
  }

  function emojiHash(s) {
    var h = 0;
    for (var i = 0; i < String(s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  function readLocalEmoji(empId) {
    try {
      var map = JSON.parse(localStorage.getItem('empEmojiChoiceMap') || '{}') || {};
      var cp = String(map[empId] || map.export || '').trim();
      if (!cp) cp = String(localStorage.getItem('empEmojiChoice') || '').trim();
      if (validEmojiCp(cp)) return cp.toLowerCase();
    } catch (e) {}
    if (EMOJI_DEFAULTS[empId]) return EMOJI_DEFAULTS[empId];
    return '';
  }

  async function resolveEmoji(empId) {
    var local = readLocalEmoji(empId);
    if (local) return local;
    try {
      if (!emojiListCache) {
        var res = await fetch(docsBase() + 'my-emoji/emojis.json', { cache: 'force-cache' });
        emojiListCache = res.ok ? await res.json() : [];
      }
      if (emojiListCache && emojiListCache.length) {
        var item = emojiListCache[emojiHash(empId) % emojiListCache.length];
        if (item && validEmojiCp(item.cp)) return String(item.cp).toLowerCase();
      }
    } catch (e) {}
    return '';
  }

  async function loadStaff() {
    if (staffById) return staffById;
    staffById = Object.create(null);
    try {
      var res = await fetch(docsBase() + 'schedules/index.json?ts=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('staff');
      var json = await res.json();
      (json.employees || []).forEach(function (e) {
        if (!e || !e.id) return;
        staffById[String(e.id)] = String(e.name || '').trim();
      });
    } catch (e) {}
    return staffById;
  }

  async function resolveEmp(rawId) {
    var id = digitsOnly(rawId);
    if (!id) return { id: '', name: '', ok: false, reason: 'empty' };
    var map = await loadStaff();
    if (map[id]) return { id: id, name: map[id], ok: true };
    if (!Object.keys(map).length && id.length >= 4) {
      return { id: id, name: '', ok: true, unverified: true };
    }
    return { id: id, name: '', ok: false, reason: 'unknown' };
  }

  async function readFullStore() {
    var res = await fetch(MANTLE_URL + '?ts=' + Date.now(), {
      headers: mantleHeaders(),
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('read');
    var json = await res.json();
    return {
      pending: Array.isArray(json.pending) ? json.pending : [],
      approved: Array.isArray(json.approved) ? json.approved : [],
      showMode: normalizeMode(json.showMode),
      hidden: !!json.hidden,
      requireApproval: json.requireApproval !== false
    };
  }

  async function writeFullStore(store) {
    var payload = {
      pending: (store.pending || []).slice(0, 80),
      approved: (store.approved || []).slice(0, 40),
      showMode: normalizeMode(store.showMode),
      hidden: !!store.hidden,
      requireApproval: store.requireApproval !== false
    };
    while (JSON.stringify(payload).length > 50000 && payload.pending.length > 1) payload.pending.pop();
    while (JSON.stringify(payload).length > 50000 && payload.approved.length > 1) payload.approved.pop();
    var res = await fetch(MANTLE_URL, {
      method: 'POST',
      headers: mantleHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('write');
  }

  function muscatToday() {
    try {
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Muscat',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (p) {
        if (p.type !== 'literal') map[p.type] = p.value;
      });
      return map.year + '-' + map.month + '-' + map.day;
    } catch (e) {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
  }

  function weekBounds(ymd) {
    var p = ymd.split('-').map(Number);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2], 8, 0, 0));
    var dow = dt.getUTCDay();
    var start = new Date(dt);
    start.setUTCDate(start.getUTCDate() - dow);
    var end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    function fmt(d) {
      return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
    }
    return { start: fmt(start), end: fmt(end) };
  }

  function formatDay(ymd, ar) {
    try {
      var p = ymd.split('-').map(Number);
      var d = new Date(Date.UTC(p[0], p[1] - 1, p[2], 8, 0, 0));
      return d.toLocaleDateString(ar ? 'ar-OM' : 'en-GB', {
        timeZone: 'UTC',
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    } catch (e) {
      return ymd;
    }
  }

  function activeDate() {
    try {
      var m = String(location.pathname || '').match(/\/date\/(\d{4}-\d{2}-\d{2})(?:\/|$)/);
      if (m) return m[1];
    } catch (e) {}
    return muscatToday();
  }

  function holidaysForTicker(list, today) {
    var w = weekBounds(today);
    var inWeek = (list || []).filter(function (h) {
      return h && h.date >= w.start && h.date <= w.end;
    });
    if (inWeek.length) return inWeek;
    if (!PREVIEW_HOLIDAYS) return [];
    var out = [];
    var seen = Object.create(null);
    (list || []).forEach(function (h) {
      if (!h || h.date < muscatToday()) return;
      var key = String(h.name_ar || h.name_en || '');
      if (!key || seen[key]) return;
      seen[key] = 1;
      out.push(h);
    });
    return out.slice(0, 3);
  }

  function injectStyles() {
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = [
      '#' + TICKER_ID + '{',
      'position:fixed;bottom:24px;left:72px;right:16px;',
      'z-index:100015;display:none;align-items:center;gap:8px;',
      'min-height:52px;width:auto;max-width:none;',
      'padding:0 14px 0 8px;border-radius:16px;',
      'background:#ffffff;',
      'border:1px solid rgba(15,23,42,.14);',
      'box-shadow:0 8px 24px rgba(15,23,42,.16);',
      'overflow:hidden;font-family:Tajawal,system-ui,sans-serif;',
      '-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;',
      'letter-spacing:0;text-transform:none;box-sizing:border-box;',
      'pointer-events:none;',
      '}',
      '#' + TICKER_ID + '.on{display:flex}',
      '#' + TICKER_ID + '.solo{left:16px;right:16px}',
      '#' + TICKER_ID + '.above-dock{bottom:84px;left:16px;right:16px}',
      'html[dir="rtl"] #' + TICKER_ID + ',body.ar #' + TICKER_ID + '{left:72px;right:16px}',
      'html[dir="rtl"] #' + TICKER_ID + '.solo,body.ar #' + TICKER_ID + '.solo,',
      'html[dir="rtl"] #' + TICKER_ID + '.above-dock,body.ar #' + TICKER_ID + '.above-dock{left:16px;right:16px}',
      '#' + TICKER_ID + ' .ht-ico{',
      'flex:0 0 auto;width:36px;height:36px;border-radius:12px;border:0;',
      'display:grid;place-items:center;font-size:18px;cursor:pointer;',
      'background:linear-gradient(135deg,#fff7ed,#ffedd5);',
      'box-shadow:0 2px 8px rgba(234,88,12,.18);',
      '-webkit-tap-highlight-color:transparent;',
      'pointer-events:auto;',
      '}',
      '#' + TICKER_ID + ' .ht-ico:active{transform:scale(.96)}',
      '#' + TICKER_ID + ' .ht-track{',
      'flex:1 1 auto;min-width:0;width:100%;overflow:hidden;',
      'mask-image:linear-gradient(90deg,transparent 0,#000 12px,#000 100%);',
      '-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 12px,#000 100%);',
      '}',
      'html[dir="rtl"] #' + TICKER_ID + ' .ht-track,body.ar #' + TICKER_ID + ' .ht-track{',
      'mask-image:linear-gradient(270deg,transparent 0,#000 12px,#000 100%);',
      '-webkit-mask-image:linear-gradient(270deg,transparent 0,#000 12px,#000 100%);',
      '}',
      '#' + TICKER_ID + ' .ht-marquee{',
      'display:inline-block;white-space:nowrap;padding-inline:8px;',
      'font-size:15px;font-weight:800;color:#1c1917;line-height:1.45;',
      'letter-spacing:0;animation:htScroll 28s linear infinite;',
      '}',
      '#' + TICKER_ID + ' .ht-msg{color:#111827;font-weight:900}',
      '#' + TICKER_ID + ' .ht-from{color:#075985;font-weight:800;display:inline-flex;align-items:center;gap:4px;vertical-align:middle}',
      '#' + TICKER_ID + ' .ht-emoji{width:18px;height:18px;object-fit:contain;flex:0 0 auto;display:inline-block;vertical-align:-3px}',
      '#' + TICKER_ID + ' .ht-sep{color:#78716c;opacity:.9;margin:0 .4em}',
      '#' + TICKER_ID + ' .ht-hol{color:#9a3412;font-weight:800}',
      'html[dir="rtl"] #' + TICKER_ID + ' .ht-marquee,body.ar #' + TICKER_ID + ' .ht-marquee{animation-name:htScrollRtl}',
      '#' + TICKER_ID + ' .ht-label{color:#9a3412;font-weight:900;margin-inline-end:6px}',
      '@keyframes htScroll{0%{transform:translateX(0)}100%{transform:translateX(-33.333%)}}',
      '@keyframes htScrollRtl{0%{transform:translateX(0)}100%{transform:translateX(33.333%)}}',
      '@media (prefers-reduced-motion:reduce){#' + TICKER_ID + ' .ht-marquee{animation:none;transform:none}}',
      'html.has-float-dock .wrap{padding-bottom:calc(120px + env(safe-area-inset-bottom,0px))!important}',
      'html.has-float-dock .footer{margin-bottom:calc(72px + env(safe-area-inset-bottom,0px))!important}',
      '#' + MODAL_ID + '{',
      'position:fixed;inset:0;z-index:100120;display:none;align-items:flex-end;justify-content:center;',
      'padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px));',
      'background:rgba(15,23,42,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);',
      'font-family:Tajawal,system-ui,sans-serif;letter-spacing:0;',
      '}',
      '#' + MODAL_ID + '.on{display:flex}',
      '#' + MODAL_ID + ' .htc-sheet{',
      'width:min(440px,100%);background:#fff;border-radius:20px;padding:16px;',
      'box-shadow:0 20px 50px rgba(15,23,42,.28);color:#0f172a;',
      '}',
      '#' + MODAL_ID + ' .htc-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}',
      '#' + MODAL_ID + ' .htc-top h2{margin:0;font-size:17px;font-weight:900}',
      '#' + MODAL_ID + ' .htc-close{',
      'width:36px;height:36px;border:0;border-radius:12px;background:#f1f5f9;color:#334155;',
      'font-size:18px;font-weight:900;cursor:pointer;',
      '}',
      '#' + MODAL_ID + ' .htc-sub{margin:0 0 12px;font-size:12px;font-weight:700;color:#64748b;line-height:1.45}',
      '#' + MODAL_ID + ' label{display:block;font-size:12px;font-weight:800;color:#475569;margin:0 0 6px}',
      '#' + MODAL_ID + ' input,#' + MODAL_ID + ' textarea{',
      'width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:12px;',
      'padding:11px 12px;font:inherit;font-size:15px;font-weight:700;color:#0f172a;outline:none;',
      '}',
      '#' + MODAL_ID + ' textarea{min-height:96px;resize:vertical;line-height:1.45}',
      '#' + MODAL_ID + ' input:focus,#' + MODAL_ID + ' textarea:focus{border-color:#f59e0b}',
      '#' + MODAL_ID + ' .htc-hint{margin:6px 0 0;font-size:11px;font-weight:700;color:#94a3b8}',
      '#' + MODAL_ID + ' .htc-who{margin:10px 0 0;font-size:12px;font-weight:800;color:#0369a1}',
      '#' + MODAL_ID + ' .htc-field{margin-bottom:12px}',
      '#' + MODAL_ID + ' .htc-send{',
      'width:100%;margin-top:4px;border:0;border-radius:12px;min-height:46px;',
      'background:linear-gradient(135deg,#f59e0b,#ea580c);color:#111;font:inherit;font-weight:900;cursor:pointer;',
      '}',
      '#' + MODAL_ID + ' .htc-send:disabled{opacity:.55;cursor:wait}',
      '#' + MODAL_ID + ' .htc-status{min-height:20px;margin-top:8px;font-size:12px;font-weight:800;color:#15803d}',
      '#' + MODAL_ID + ' .htc-status.err{color:#b91c1c}',
      '@media (min-width:640px){#' + MODAL_ID + '{align-items:center}}'
    ].join('');
    if (!document.getElementById('htTajawalFont')) {
      var fontLink = document.createElement('link');
      fontLink.id = 'htTajawalFont';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@700;800;900&display=swap';
      document.head.appendChild(fontLink);
    }
    document.documentElement.classList.add('has-float-dock');
  }

  function fabVisible() {
    var fab = document.getElementById('featureNotesFab');
    return !!(fab && !fab.hidden && getComputedStyle(fab).display !== 'none');
  }

  function alertIconVisible() {
    var chg = document.getElementById('chg-dot');
    var abs = document.getElementById('abs-dot');
    var chgOn = chg && !chg.hidden && getComputedStyle(chg).display !== 'none';
    var absOn = abs && abs.classList.contains('abs-on') && getComputedStyle(abs).display !== 'none';
    return !!(chgOn || absOn);
  }

  function layoutTicker(el) {
    if (!el) return;
    var fabOn = fabVisible();
    var alertOn = alertIconVisible();
    el.classList.toggle('above-dock', fabOn);
    el.classList.toggle('solo', !fabOn && !alertOn);
    // Keep bar pinned — never lift on scroll.
    el.style.bottom = '';
    el.classList.remove('lifted');
  }

  function ensureTicker() {
    var el = document.getElementById(TICKER_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = TICKER_ID;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
    return el;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function closeCompose() {
    var modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  function ensureCompose() {
    injectStyles();
    var modal = document.getElementById(MODAL_ID);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML =
      '<div class="htc-sheet" role="dialog" aria-modal="true" aria-labelledby="htcTitle">' +
        '<div class="htc-top">' +
          '<h2 id="htcTitle">رسالة للشريط</h2>' +
          '<button type="button" class="htc-close" id="htcClose" aria-label="إغلاق">×</button>' +
        '</div>' +
        '<p class="htc-sub" id="htcSub">اكتب رسالة قصيرة. قد تحتاج اعتماد المشرف قبل الظهور.</p>' +
        '<div class="htc-field">' +
          '<label for="htcEmpId">الرقم الوظيفي</label>' +
          '<input id="htcEmpId" type="text" inputmode="numeric" maxlength="12" autocomplete="off" placeholder="مثال: 8715">' +
          '<p class="htc-who" id="htcWho"></p>' +
        '</div>' +
        '<div class="htc-field">' +
          '<label for="htcMsg">رسالتك</label>' +
          '<textarea id="htcMsg" maxlength="120" placeholder="مثال: كل عام وأنتم بخير…"></textarea>' +
          '<p class="htc-hint"><span id="htcCount">0</span>/120</p>' +
        '</div>' +
        '<button type="button" class="htc-send" id="htcSend">إرسال</button>' +
        '<div class="htc-status" id="htcStatus" aria-live="polite"></div>' +
      '</div>';
    document.body.appendChild(modal);

    if (!composeBound) {
      composeBound = true;
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeCompose();
      });
      document.getElementById('htcClose').addEventListener('click', closeCompose);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('on')) closeCompose();
      });
      var empInput = document.getElementById('htcEmpId');
      var msgInput = document.getElementById('htcMsg');
      var whoEl = document.getElementById('htcWho');
      var countEl = document.getElementById('htcCount');
      var statusEl = document.getElementById('htcStatus');
      var sendBtn = document.getElementById('htcSend');
      var subEl = document.getElementById('htcSub');

      function paintWho(r) {
        if (r && r.ok && r.id) {
          whoEl.textContent = 'المرسل: ' + (r.name || 'موظف') + ' · #' + r.id;
        } else {
          whoEl.textContent = 'أدخل رقمك الوظيفي أولاً';
        }
      }

      async function syncEmp() {
        var r = await resolveEmp(empInput.value);
        if (r.ok) {
          saveIdentity(r.id, r.name);
          if (empInput.value !== r.id) empInput.value = r.id;
        }
        paintWho(r);
        return r;
      }

      empInput.addEventListener('input', function () {
        var d = digitsOnly(empInput.value);
        if (empInput.value !== d) empInput.value = d;
        clearTimeout(empInput._t);
        empInput._t = setTimeout(function () { syncEmp(); }, 280);
      });
      empInput.addEventListener('blur', function () { syncEmp(); });
      msgInput.addEventListener('input', function () {
        countEl.textContent = String(msgInput.value.length);
      });

      sendBtn.addEventListener('click', async function () {
        statusEl.className = 'htc-status';
        statusEl.textContent = '';
        var emp = await syncEmp();
        var text = String(msgInput.value || '').replace(/\s+/g, ' ').trim().slice(0, 120);
        if (!emp.ok || !emp.id) {
          statusEl.className = 'htc-status err';
          statusEl.textContent =
            emp.reason === 'unknown'
              ? 'الرقم الوظيفي غير موجود في الروستر.'
              : 'أدخل رقمك الوظيفي قبل الإرسال.';
          empInput.focus();
          return;
        }
        if (text.length < 3) {
          statusEl.className = 'htc-status err';
          statusEl.textContent = 'اكتب رسالة أوضح (٣ أحرف على الأقل).';
          msgInput.focus();
          return;
        }
        sendBtn.disabled = true;
        statusEl.textContent = 'جاري الإرسال…';
        try {
          var store = await readFullStore();
          var needApproval = store.requireApproval !== false;
          subEl.textContent = needApproval
            ? 'اكتب رسالة قصيرة. تظهر بعد اعتماد المشرف.'
            : 'اكتب رسالة قصيرة. تظهر مباشرة في الشريط.';
          sendBtn.textContent = needApproval ? 'إرسال للمراجعة' : 'نشر في الشريط';
          var emoji = await resolveEmoji(emp.id);
          var row = {
            id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            text: text,
            name: emp.name || '',
            empId: emp.id,
            emoji: emoji || '',
            at: Date.now(),
            status: needApproval ? 'pending' : 'approved'
          };
          if (needApproval) {
            store.pending = [row].concat(store.pending || []).slice(0, 80);
          } else {
            row.approvedAt = Date.now();
            store.approved = [row].concat(store.approved || []).slice(0, 40);
          }
          await writeFullStore(store);
          msgInput.value = '';
          countEl.textContent = '0';
          statusEl.textContent = needApproval
            ? 'تم الإرسال. بانتظار اعتماد المشرف.'
            : 'تم النشر في الشريط.';
          messagesCache = null;
          refresh();
          setTimeout(closeCompose, needApproval ? 900 : 700);
        } catch (e) {
          statusEl.className = 'htc-status err';
          statusEl.textContent = 'تعذر الإرسال. حاول مرة أخرى.';
        } finally {
          sendBtn.disabled = false;
        }
      });
    }
    return modal;
  }

  function openCompose() {
    var ar = lang() === 'ar';
    var modal = ensureCompose();
    modal.setAttribute('dir', ar ? 'rtl' : 'ltr');
    var empInput = document.getElementById('htcEmpId');
    var msgInput = document.getElementById('htcMsg');
    var statusEl = document.getElementById('htcStatus');
    var whoEl = document.getElementById('htcWho');
    var sendBtn = document.getElementById('htcSend');
    var subEl = document.getElementById('htcSub');
    statusEl.className = 'htc-status';
    statusEl.textContent = '';
    var saved = readSavedIdentity();
    if (saved.id && !empInput.value) empInput.value = saved.id;
    whoEl.textContent = saved.id
      ? 'المرسل: ' + (saved.name || 'موظف') + ' · #' + saved.id
      : 'أدخل رقمك الوظيفي أولاً';
    resolveEmp(empInput.value || saved.id).then(function (r) {
      if (r.ok) {
        saveIdentity(r.id, r.name || saved.name);
        empInput.value = r.id;
        whoEl.textContent = 'المرسل: ' + (r.name || saved.name || 'موظف') + ' · #' + r.id;
      }
    });
    readFullStore()
      .then(function (store) {
        var need = store.requireApproval !== false;
        subEl.textContent = need
          ? (ar ? 'اكتب رسالة قصيرة. تظهر بعد اعتماد المشرف.' : 'Short message. Shown after admin approval.')
          : (ar ? 'اكتب رسالة قصيرة. تظهر مباشرة في الشريط.' : 'Short message. Publishes immediately.');
        sendBtn.textContent = need
          ? (ar ? 'إرسال للمراجعة' : 'Send for review')
          : (ar ? 'نشر في الشريط' : 'Publish');
      })
      .catch(function () {});
    modal.classList.add('on');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(function () {
      (msgInput.value || !empInput.value ? msgInput : empInput).focus();
      if (!empInput.value) empInput.focus();
      else msgInput.focus();
    }, 40);
  }

  function paintParts(parts, ar) {
    injectStyles();
    var el = ensureTicker();
    if (!parts || !parts.length) {
      el.classList.remove('on');
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    var joinedHtml = parts.join('<span class="ht-sep">•</span>');
    var plain = parts.map(function (p) {
      return String(p).replace(/<[^>]+>/g, '');
    }).join('  •  ');
    var strip =
      joinedHtml +
      '<span class="ht-sep">•</span>' +
      joinedHtml +
      '<span class="ht-sep">•</span>' +
      joinedHtml;
    el.innerHTML =
      '<button type="button" class="ht-ico" id="htOpenBoard" title="' +
      (ar ? 'اكتب رسالة للشريط' : 'Write a ticker message') +
      '" aria-label="' +
      (ar ? 'كتابة رسالة للشريط' : 'Write a ticker message') +
      '">🎉</button>' +
      '<div class="ht-track"><div class="ht-marquee">' + strip + '</div></div>';
    el.title = plain;
    el.hidden = false;
    el.classList.add('on');
    layoutTicker(el);
    el.setAttribute('dir', ar ? 'rtl' : 'ltr');
    var btn = document.getElementById('htOpenBoard');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openCompose();
      });
    }
  }

  function emojiImgHtml(cp) {
    cp = String(cp || '').trim().toLowerCase();
    if (!validEmojiCp(cp)) return '';
    return (
      '<img class="ht-emoji" alt="" aria-hidden="true" decoding="async" ' +
      'src="https://fonts.gstatic.com/s/e/notoemoji/latest/' +
      escapeHtml(cp) +
      '/512.webp">'
    );
  }

  function buildParts(approved, holidays) {
    var ar = lang() === 'ar';
    var parts = [];
    (approved || []).forEach(function (m) {
      if (!m || !m.text) return;
      var bit = '<span class="ht-msg">' + escapeHtml(m.text) + '</span>';
      if (m.name) {
        bit +=
          '<span class="ht-sep">—</span><span class="ht-from">' +
          emojiImgHtml(m.emoji) +
          escapeHtml(String(m.name)) +
          '</span>';
      }
      parts.push(bit);
    });
    (holidays || []).forEach(function (h) {
      var name = ar ? (h.name_ar || h.name_en) : (h.name_en || h.name_ar);
      parts.push(
        '<span class="ht-hol">' +
          escapeHtml((ar ? 'إجازة رسمية: ' : 'Holiday: ') + name + ' · ' + formatDay(h.date, ar)) +
          '</span>'
      );
    });
    if (!parts.length) {
      parts.push(
        '<span class="ht-msg">' +
          escapeHtml(
            ar
              ? 'اضغط 🎉 لكتابة رسالة للشريط الإخباري — تظهر بعد اعتماد المشرف'
              : 'Tap 🎉 to write a ticker message — shown after admin approval'
          ) +
          '</span>'
      );
    }
    return parts;
  }

  function loadHolidays() {
    if (holidaysCache) return holidaysCache;
    var url = docsBase() + 'data/oman-holidays.json?v=20260802b';
    holidaysCache = fetch(url, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('holidays');
        return r.json();
      })
      .then(function (json) {
        return Array.isArray(json && json.holidays) ? json.holidays : [];
      })
      .catch(function () {
        return [];
      });
    return holidaysCache;
  }

  function loadTickerStore() {
    if (messagesCache) return messagesCache;
    messagesCache = fetch(MANTLE_URL + '?ts=' + Date.now(), {
      headers: { 'X-Mantle-Key': MANTLE_KEY },
      cache: 'no-store'
    })
      .then(function (r) {
        if (!r.ok) throw new Error('msgs');
        return r.json();
      })
      .then(function (json) {
        showModeCache = normalizeMode(json && json.showMode);
        return {
          approved: Array.isArray(json && json.approved) ? json.approved : [],
          showMode: showModeCache,
          hidden: !!(json && json.hidden)
        };
      })
      .catch(function () {
        showModeCache = 'both';
        return { approved: [], showMode: 'both', hidden: false };
      });
    return messagesCache;
  }

  function refresh() {
    messagesCache = null; // always re-check approved list + mode
    Promise.all([loadTickerStore(), loadHolidays()]).then(function (pair) {
      var store = pair[0] || { approved: [], showMode: 'both', hidden: false };
      if (store.hidden) {
        paintParts([], lang() === 'ar');
        return;
      }
      var mode = normalizeMode(store.showMode);
      var approved = mode === 'official' ? [] : (store.approved || []);
      var holidays =
        mode === 'staff' ? [] : holidaysForTicker(pair[1] || [], activeDate());
      paintParts(buildParts(approved, holidays), lang() === 'ar');
    });
  }

  function boot() {
    refresh();
    setInterval(function () {
      var el = document.getElementById(TICKER_ID);
      if (el && el.classList.contains('on')) layoutTicker(el);
    }, 1500);
    // Refresh approved messages periodically
    setInterval(function () {
      messagesCache = null;
      refresh();
    }, 60000);
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('#langToggle, #langBtn')) {
        setTimeout(refresh, 50);
      }
    });
    window.addEventListener('storage', function (e) {
      if (e.key === 'rosterLang' || e.key === 'prefLang') setTimeout(refresh, 30);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.rosterHolidayTicker = { refresh: refresh, openCompose: openCompose };
})();
