/**
 * Force ideas modal + floating visitor counts on homepage.
 * Loaded by change-alert when present so an old cached index still works
 * after this script is requested with a new ?v=.
 */
(function () {
  'use strict';
  if (window.__homeUiForceBooted) return;
  window.__homeUiForceBooted = true;

  var DONE_KEY = 'rosterIdeasDoneV6';
  var MANTLE_URL = 'https://mantledb.sh/v2/roster-site-visits/ideas';
  var MANTLE_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  var NS = 'khalidsaif912.github.io';
  var score = 0;

  function onHome() {
    try {
      var p = location.pathname || '';
      return /\/docs\/?$/.test(p) || /\/docs\/index\.html$/i.test(p) || /\/docs\/home\.html$/i.test(p);
    } catch (e) {
      return true;
    }
  }

  function ensureCss() {
    if (document.getElementById('ideasStaticCssForce')) return;
    var st = document.createElement('style');
    st.id = 'ideasStaticCssForce';
    st.textContent =
      '#ideasPromptSheetInline{position:fixed;inset:0;z-index:2147483646!important;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.55);padding:16px;pointer-events:auto}' +
      '#ideasPromptSheetInline.is-open{display:flex!important}' +
      'html.ideas-sheet-open #chg-card{display:none!important}' +
      'html.ideas-sheet-open #visitsFloatDock{display:none!important}' +
      '#ideasPromptSheetInline .ipc{width:min(100%,390px);background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 22px 54px rgba(15,23,42,.3);max-height:min(92dvh,720px);display:flex;flex-direction:column}' +
      '#ideasPromptSheetInline .iph{background:linear-gradient(135deg,#1e40af,#1976d2 50%,#0ea5e9);color:#fff;padding:18px}' +
      '#ideasPromptSheetInline .iph h2{margin:0;font-size:20px;font-weight:800}' +
      '#ideasPromptSheetInline .iph p{margin:8px 0 0;font-size:13px;font-weight:600;opacity:.93;line-height:1.45}' +
      '#ideasPromptSheetInline .ipb{padding:14px 16px;overflow:auto}' +
      '#ideasPromptSheetInline .ipl{display:block;font-size:12px;font-weight:800;color:#334155;margin:0 0 8px}' +
      '#ideasPromptSheetInline .ips{display:flex;gap:8px;direction:ltr;justify-content:center;background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:10px;margin:0 0 12px}' +
      '#ideasPromptSheetInline .ips button{border:0;background:0;font-size:30px;color:#cbd5e1;cursor:pointer;line-height:1}' +
      '#ideasPromptSheetInline .ips button.on{color:#f59e0b}' +
      '#ideasPromptSheetInline textarea{width:100%;min-height:96px;border:1.5px solid #e2e8f0;border-radius:12px;padding:11px 12px;font:inherit;font-size:14px;background:#f8fafc;box-sizing:border-box}' +
      '#ideasPromptSheetInline .ipa{display:flex;align-items:center;gap:8px;margin:10px 0 12px;font-size:13px;font-weight:700;color:#334155}' +
      '#ideasPromptSheetInline .ipacts{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
      '#ideasPromptSheetInline .ipbtn{border:0;border-radius:999px;min-height:44px;font:inherit;font-size:13px;font-weight:800;cursor:pointer;padding:0 12px}' +
      '#ideasPromptSheetInline .ipbtn.pri{grid-column:1/-1;background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff}' +
      '#ideasPromptSheetInline .ipbtn.mut{background:#f1f5f9;color:#334155;border:1px solid #e2e8f0}' +
      '#ideasPromptSheetInline .ipbtn.lnk{background:#fff;color:#1d4ed8;border:1px solid #bfdbfe;display:flex;align-items:center;justify-content:center;text-decoration:none}' +
      '#ideasPromptSheetInline .ipm{min-height:18px;margin-top:10px;text-align:center;font-size:12px;font-weight:700;color:#64748b}' +
      '#visitsFloatDock{position:fixed;left:12px;right:12px;bottom:calc(54px + env(safe-area-inset-bottom,0px));z-index:100055;background:rgba(255,255,255,.96);border:1px solid rgba(15,23,42,.12);border-radius:14px;box-shadow:0 8px 22px rgba(15,23,42,.14);padding:8px 12px;text-align:center;font-size:12px;line-height:1.55;color:#334155;font-weight:700;pointer-events:none}' +
      '#visitsFloatDock b{color:#1e40af;font-weight:900}';
    document.head.appendChild(st);
  }

  function ensureFooterVisits() {
    var footer = document.querySelector('.footer');
    if (!footer) return null;
    var host = document.getElementById('siteVisitsHost');
    var textHtml =
      '<span class="svPart"><span class="svLabel" id="siteVisitsDayLabel">زوار اليوم</span><span class="svNum" id="siteVisitsDay">--</span></span>' +
      '<span class="svDot" aria-hidden="true">·</span>' +
      '<span class="svPart"><span class="svLabel" id="siteVisitsMonthLabel">هذا الشهر</span><span class="svNum" id="siteVisitsMonth">--</span></span>' +
      '<span class="svDot" aria-hidden="true">·</span>' +
      '<span class="svPart"><span class="svLabel" id="siteVisitsTotalLabel">الإجمالي</span><span class="svNum" id="siteVisitsTotal">--</span></span>';
    if (!host) {
      host = document.createElement('div');
      host.id = 'siteVisitsHost';
      host.className = 'siteVisitsHost';
      host.setAttribute('dir', 'rtl');
      host.setAttribute('aria-label', 'Visitor stats');
      host.innerHTML = textHtml;
    } else if (!host.querySelector('.svPart') || host.querySelector('.svChip')) {
      host.className = 'siteVisitsHost';
      host.innerHTML = textHtml;
    }
    // Keep above the 3 footer action buttons (↑ · خلفية · ↻)
    host.hidden = false;
    host.style.visibility = 'visible';
    host.style.opacity = '1';
    var buttons = footer.querySelector('.bgTextureShuffleWrap');
    if (host.parentNode !== footer) {
      if (buttons) footer.insertBefore(host, buttons);
      else footer.appendChild(host);
    } else if (buttons && host.nextSibling !== buttons) {
      footer.insertBefore(host, buttons);
    }
    // Ensure label text exists (Arabic default; site-visits may override)
    function ensureLbl(id, ar, en) {
      var el = document.getElementById(id);
      if (!el) return;
      var t = String(el.textContent || '').trim();
      if (!t || t === '...' || t === '—') {
        var isAr = true;
        try {
          var L = localStorage.getItem('rosterLang') || '';
          if (L === 'en') isAr = false;
          else if (document.body && document.body.classList.contains('ar')) isAr = true;
        } catch (e) {}
        el.textContent = isAr ? ar : en;
      }
    }
    ensureLbl('siteVisitsDayLabel', 'زوار اليوم', 'Today');
    ensureLbl('siteVisitsMonthLabel', 'هذا الشهر', 'This month');
    ensureLbl('siteVisitsTotalLabel', 'الإجمالي', 'Total');
    return host;
  }

  function ensureVisitsDock() {
    // Footer host is the primary placement (user expects stats there).
    ensureFooterVisits();
  }

  function fillVisits() {
    ensureFooterVisits();
    function set(id, v) {
      var el = document.getElementById(id);
      if (el && v != null) el.textContent = String(v);
    }
    function ymd() {
      try {
        var parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Muscat', year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(new Date());
        var map = {};
        parts.forEach(function (p) { if (p.type !== 'literal') map[p.type] = p.value; });
        return { day: map.year + '-' + map.month + '-' + map.day, month: map.year + '-' + map.month };
      } catch (e) {
        var d = new Date();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return { day: d.getFullYear() + '-' + m + '-' + day, month: d.getFullYear() + '-' + m };
      }
    }
    function getCount(url) {
      return fetch(url, { cache: 'no-store', mode: 'cors' })
        .then(function (r) { if (!r.ok) throw new Error('n'); return r.json(); })
        .then(function (j) {
          if (j && typeof j.value === 'number') return j.value;
          if (j && typeof j.count === 'number') return j.count;
          return null;
        })
        .catch(function () { return null; });
    }
    var keys = ymd();
    function one(key, hit) {
      var g = 'https://abacus.jasoncameron.dev/get/' + NS + '/' + key;
      var h = 'https://abacus.jasoncameron.dev/hit/' + NS + '/' + key;
      return getCount(g).then(function (v) { return v != null ? v : (hit ? getCount(h) : null); });
    }
    Promise.all([
      one('day-' + keys.day, true),
      one('month-' + keys.month, false),
      one('total-visits', false)
    ]).then(function (vals) {
      if (vals[0] != null) set('siteVisitsDay', vals[0]);
      if (vals[1] != null) set('siteVisitsMonth', vals[1]);
      if (vals[2] != null) set('siteVisitsTotal', vals[2]);
      ensureFooterVisits();
    });
  }

  function run() {
    ensureCss();
    // Always try to restore footer stats when a footer exists (do not gate
    // only on “home” path — short paths / query variants must not skip this).
    try {
      if (document.querySelector('.footer')) {
        ensureFooterVisits();
        fillVisits();
        setTimeout(fillVisits, 800);
        setTimeout(fillVisits, 2200);
        setTimeout(ensureFooterVisits, 3500);
        setTimeout(ensureFooterVisits, 7000);
      }
    } catch (eVisits) {}

    if (!onHome()) return;
    try {
      var force = false;
      try {
        var q = new URLSearchParams(location.search || '');
        force = q.get('ideas') === '1' || q.get('ideas') === 'force';
      } catch (e) {}
      var done = false;
      try { done = localStorage.getItem(DONE_KEY) === '1'; } catch (e2) {}
      ensureIdeas();
      bindIdeas();
      setOpen(force || !done);
    } catch (e3) {}
  }

  function ensureIdeas() {
    if (document.getElementById('ideasPromptSheetInline')) return document.getElementById('ideasPromptSheetInline');
    var sheet = document.createElement('div');
    sheet.id = 'ideasPromptSheetInline';
    sheet.className = 'is-open';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.innerHTML =
      '<div class="ipc"><div class="iph"><div style="font-size:11px;font-weight:800;opacity:.9;margin-bottom:4px">صندوق الأفكار</div>' +
      '<h2>رأيك يهمنا</h2><p>قيّم الموقع بالنجوم واكتب مقترحك هنا مباشرة.</p></div>' +
      '<div class="ipb"><span class="ipl">تقييم الموقع</span>' +
      '<div class="ips" id="ipiStars">' +
      [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-s="' + n + '">★</button>'; }).join('') +
      '</div><label class="ipl" for="ipiText">اكتب اقتراحك</label>' +
      '<textarea id="ipiText" maxlength="500" placeholder="ما الذي تود تحسينه؟"></textarea>' +
      '<label class="ipa"><input type="checkbox" id="ipiAnon" checked><span>إخفاء هويتي</span></label>' +
      '<div class="ipacts">' +
      '<button type="button" class="ipbtn pri" id="ipiSend">إرسال</button>' +
      '<button type="button" class="ipbtn mut" id="ipiLater">لاحقاً</button>' +
      '<a class="ipbtn lnk" href="ideas/">كل الأفكار</a></div>' +
      '<p class="ipm" id="ipiMsg"></p></div></div>';
    document.body.appendChild(sheet);
    return sheet;
  }

  function setOpen(on) {
    var sheet = ensureIdeas();
    if (on) {
      sheet.classList.add('is-open');
      try {
        document.documentElement.classList.add('ideas-sheet-open');
        document.body.style.overflow = 'hidden';
      } catch (e) {}
    } else {
      sheet.classList.remove('is-open');
      try {
        document.documentElement.classList.remove('ideas-sheet-open');
        document.body.style.overflow = '';
      } catch (e2) {}
    }
  }

  function bindIdeas() {
    var sheet = ensureIdeas();
    var stars = document.getElementById('ipiStars');
    if (stars && !stars.__bound) {
      stars.__bound = true;
      stars.onclick = function (ev) {
        var b = ev.target && ev.target.closest && ev.target.closest('button[data-s]');
        if (!b) return;
        score = Number(b.getAttribute('data-s') || 0);
        var btns = stars.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
          if (Number(btns[i].getAttribute('data-s')) <= score) btns[i].classList.add('on');
          else btns[i].classList.remove('on');
        }
      };
    }
    var later = document.getElementById('ipiLater');
    if (later && !later.__bound) {
      later.__bound = true;
      later.onclick = function () { setOpen(false); };
    }
    if (sheet && !sheet.__bound) {
      sheet.__bound = true;
      sheet.onclick = function (ev) { if (ev.target === sheet) setOpen(false); };
    }
    var send = document.getElementById('ipiSend');
    if (send && !send.__bound) {
      send.__bound = true;
      send.onclick = function () {
        var msg = document.getElementById('ipiMsg');
        if (!msg) return;
        if (!score) { msg.textContent = 'اختر النجوم أولاً'; msg.className = 'ipm err'; return; }
        var text = String((document.getElementById('ipiText') || {}).value || '').trim();
        if (text.length < 4) { msg.textContent = 'اكتب اقتراحاً (٤ أحرف+)'; msg.className = 'ipm err'; return; }
        var anon = !!(document.getElementById('ipiAnon') && document.getElementById('ipiAnon').checked);
        msg.className = 'ipm'; msg.textContent = '…';
        fetch(MANTLE_URL + '?ts=' + Date.now(), {
          headers: { Accept: 'application/json', 'X-Mantle-Key': MANTLE_KEY },
          cache: 'no-store'
        })
          .then(function (r) {
            if (r.status === 404) return {};
            if (!r.ok) throw new Error('r');
            return r.json().catch(function () { return {}; });
          })
          .then(function (doc) {
            doc = doc || {};
            if (!Array.isArray(doc.ideas)) doc.ideas = [];
            if (!Array.isArray(doc.siteRatings)) doc.siteRatings = [];
            doc.siteRatings.unshift({ score: score, at: Date.now(), anonymous: anon, comment: text.slice(0, 400) });
            doc.ideas.unshift({
              id: 'i' + Date.now().toString(36),
              body: text.slice(0, 800),
              anonymous: anon,
              at: Date.now(),
              pinned: false,
              ratingSum: 0,
              ratingCount: 0,
              votes: {}
            });
            return fetch(MANTLE_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Mantle-Key': MANTLE_KEY },
              body: JSON.stringify(doc)
            });
          })
          .then(function (put) {
            if (!put.ok) throw new Error('w');
            msg.className = 'ipm ok'; msg.textContent = 'شكراً ✦';
            try { localStorage.setItem(DONE_KEY, '1'); } catch (e) {}
            setTimeout(function () { setOpen(false); }, 900);
          })
          .catch(function () {
            msg.className = 'ipm err'; msg.textContent = 'تعذر الإرسال';
          });
      };
    }
  }

  window.rosterForceHomeUI = run;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  setTimeout(run, 1500);
  setTimeout(run, 4000);
})();
