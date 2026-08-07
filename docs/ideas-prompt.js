/**
 * Ideas/rating modal — creates its own DOM (never relies on static early-body HTML).
 * Early-body nodes on home.html can disappear after other homepage scripts run, so
 * anything that only binds to those nodes will silently never show.
 */
(function () {
  if (window.__rosterIdeasPromptBooted) return;
  window.__rosterIdeasPromptBooted = true;

  var DONE_KEY = 'rosterIdeasDoneV8';
  var SKIP_KEY = 'rosterIdeasSkipSessionV8';
  var MANTLE_URL = 'https://mantledb.sh/v2/roster-site-visits/ideas';
  var MANTLE_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  var CSS_ID = 'rosterIdeasPromptCssV9';
  var score = 0;
  var sheet = null;
  var fab = null;
  var fabRotateTimer = 0;
  var fabRotateIdx = 0;

  function forceParam() {
    try {
      var q = new URLSearchParams(location.search || '');
      return q.get('ideas') === '1' || q.get('ideas') === 'force';
    } catch (e) {
      return false;
    }
  }
  /** Real user landings: /date/* after home redirect, import rows, home shell. */
  function isRosterLanding() {
    var p = (location.pathname || '').toLowerCase();
    if (/\/(tools|roster-diff|ticker-board|my-emoji|alumni|calculator|quicklist|ideas|training)\//.test(p)) {
      return false;
    }
    return (
      /\/date\//.test(p) ||
      /home\.html/.test(p) ||
      /\/now(\/|$)/.test(p) ||
      /\/docs\/?$/.test(p) ||
      /\/import(\/|$)/.test(p) ||
      /\/my-schedules(\/|$)/.test(p)
    );
  }
  function isDone() {
    try {
      return localStorage.getItem(DONE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }
  function isSkipped() {
    try {
      return sessionStorage.getItem(SKIP_KEY) === '1';
    } catch (e) {
      return false;
    }
  }
  function shouldAutoShow() {
    if (!isRosterLanding()) return false;
    if (forceParam()) return true;
    if (isDone()) return false;
    if (isSkipped()) return false;
    return true;
  }
  function isAr() {
    try {
      return (
        localStorage.getItem('rosterLang') === 'ar' ||
        (document.body && document.body.classList.contains('ar'))
      );
    } catch (e) {
      return true;
    }
  }
  function ideasHref() {
    try {
      var path = String(location.pathname || '');
      if (/\/docs\//.test(path)) return path.replace(/\/docs\/.*$/, '/docs/ideas/');
      if (/\/roster-site\//.test(path)) return path.replace(/\/roster-site\/.*$/, '/roster-site/ideas/');
    } catch (e) {}
    return 'ideas/';
  }

  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.textContent =
      '#ideasPromptSheetInline{position:fixed;inset:0;z-index:2147483646!important;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.55);padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px))}' +
      '#ideasPromptSheetInline.is-open{display:flex!important}' +
      'html.ideas-sheet-open #chg-card{display:none!important}' +
      'html.ideas-sheet-open #visitsFloatDock{display:none!important}' +
      '#ideasPromptSheetInline .ipc{width:min(100%,390px);background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 22px 54px rgba(15,23,42,.3);border:1px solid rgba(15,23,42,.1);max-height:min(92dvh,720px);display:flex;flex-direction:column}' +
      '#ideasPromptSheetInline .iph{background:linear-gradient(135deg,#1e40af,#1976d2 50%,#0ea5e9);color:#fff;padding:18px}' +
      '#ideasPromptSheetInline .iph .eye{font-size:11px;font-weight:800;opacity:.9;margin-bottom:4px}' +
      '#ideasPromptSheetInline .iph h2{margin:0;font-size:20px;font-weight:800}' +
      '#ideasPromptSheetInline .iph p{margin:8px 0 0;font-size:13px;font-weight:600;opacity:.93;line-height:1.45}' +
      '#ideasPromptSheetInline .ipb{padding:14px 16px;overflow:auto}' +
      '#ideasPromptSheetInline .ipl{display:block;font-size:12px;font-weight:800;color:#334155;margin:0 0 8px}' +
      '#ideasPromptSheetInline .ips{display:flex;gap:8px;direction:ltr;justify-content:center;background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:10px;margin:0 0 12px}' +
      '#ideasPromptSheetInline .ips button{border:0;background:0;font-size:30px;color:#cbd5e1;cursor:pointer;padding:2px;line-height:1}' +
      '#ideasPromptSheetInline .ips button.on{color:#f59e0b}' +
      '#ideasPromptSheetInline textarea{width:100%;min-height:96px;border:1.5px solid #e2e8f0;border-radius:12px;padding:11px 12px;font:inherit;font-size:14px;background:#f8fafc;resize:vertical;box-sizing:border-box}' +
      '#ideasPromptSheetInline .ipa{display:flex;align-items:center;gap:8px;margin:10px 0 12px;font-size:13px;font-weight:700;color:#334155}' +
      '#ideasPromptSheetInline .ipacts{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
      '#ideasPromptSheetInline .ipbtn{border:0;border-radius:999px;min-height:44px;font:inherit;font-size:13px;font-weight:800;cursor:pointer;padding:0 12px}' +
      '#ideasPromptSheetInline .ipbtn.pri{grid-column:1/-1;background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff}' +
      '#ideasPromptSheetInline .ipbtn.mut{background:#f1f5f9;color:#334155;border:1px solid #e2e8f0}' +
      '#ideasPromptSheetInline .ipbtn.lnk{background:#fff;color:#1d4ed8;border:1px solid #bfdbfe;display:flex;align-items:center;justify-content:center;text-decoration:none}' +
      '#ideasPromptSheetInline .ipm{min-height:18px;margin:10px 0 0;text-align:center;font-size:12px;font-weight:700;color:#64748b}' +
      '#ideasPromptSheetInline .ipm.err{color:#b91c1c}#ideasPromptSheetInline .ipm.ok{color:#15803d}' +
      /* Match #chg-dot (alerts) size + material */
      '#ideasFab{position:fixed;right:16px;bottom:12px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;padding:0;margin:0;border:1px solid rgba(15,23,42,.1);border-radius:16px;background:rgba(255,255,255,.92);box-shadow:0 8px 24px rgba(15,23,42,.14);z-index:100030;cursor:pointer;-webkit-tap-highlight-color:transparent;overflow:hidden;color:#1e40af;font:inherit}' +
      'html.has-news-ticker #ideasFab,html.has-float-dock #ideasFab{bottom:calc(48px + env(safe-area-inset-bottom,0px))!important;right:16px!important}' +
      '#ideasFab .ideasFabSlot{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center}' +
      '#ideasFab .ideasFabFrame{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:2px;box-sizing:border-box;font-size:11px;font-weight:900;line-height:1.05;text-align:center;letter-spacing:-.02em;opacity:0;transform:scale(.86);transition:opacity .32s ease,transform .32s ease;pointer-events:none;color:#1e40af}' +
      '#ideasFab .ideasFabFrame.is-on{opacity:1;transform:scale(1)}' +
      '#ideasFab .ideasFabFrame.is-emoji{font-size:28px;line-height:1}' +
      '#ideasFab .ideasFabFrame img{width:30px;height:30px;display:block;object-fit:contain}' +
      'html.ideas-sheet-open #ideasFab{display:none!important}';
    (document.head || document.documentElement).appendChild(st);
  }

  function starEmojiHtml() {
    return (
      '<img alt="" aria-hidden="true" decoding="async" ' +
      'src="https://fonts.gstatic.com/s/e/notoemoji/latest/2b50/512.gif">'
    );
  }

  function fabFrames() {
    var ar = isAr();
    var star = starEmojiHtml();
    return ar
      ? [
          { kind: 'text', html: 'صندوق' },
          { kind: 'text', html: 'الأفكار' },
          { kind: 'emoji', html: star }
        ]
      : [
          { kind: 'text', html: 'Box' },
          { kind: 'text', html: 'Ideas' },
          { kind: 'emoji', html: star }
        ];
  }

  function ensureFabStructure() {
    if (!fab) return;
    if (!fab.querySelector('.ideasFabSlot')) {
      fab.innerHTML = '<span class="ideasFabSlot" aria-hidden="true"></span>';
    }
    var slot = fab.querySelector('.ideasFabSlot');
    if (!slot) return;
    var frames = fabFrames();
    // Rebuild only when frame content set changes (lang / emoji).
    var key = frames
      .map(function (f) {
        return f.kind + ':' + f.html;
      })
      .join('|');
    if (slot.getAttribute('data-key') === key && slot.children.length === frames.length) return;
    slot.setAttribute('data-key', key);
    slot.innerHTML = frames
      .map(function (f, i) {
        return (
          '<span class="ideasFabFrame' +
          (f.kind === 'emoji' ? ' is-emoji' : '') +
          (i === fabRotateIdx % frames.length ? ' is-on' : '') +
          '" data-i="' +
          i +
          '">' +
          f.html +
          '</span>'
        );
      })
      .join('');
  }

  function paintFabFrame() {
    if (!fab) return;
    ensureFabStructure();
    var frames = fab.querySelectorAll('.ideasFabFrame');
    if (!frames.length) return;
    var n = frames.length;
    fabRotateIdx = ((fabRotateIdx % n) + n) % n;
    for (var i = 0; i < n; i++) {
      if (i === fabRotateIdx) frames[i].classList.add('is-on');
      else frames[i].classList.remove('is-on');
    }
  }

  function startFabRotate() {
    if (fabRotateTimer) return;
    paintFabFrame();
    fabRotateTimer = window.setInterval(function () {
      if (!fab || !fab.isConnected) return;
      // Refresh emoji if employee chose one later.
      ensureFabStructure();
      var n = fab.querySelectorAll('.ideasFabFrame').length || 1;
      fabRotateIdx = (fabRotateIdx + 1) % n;
      paintFabFrame();
    }, 1600);
  }

  function mount() {
    injectCss();
    var host = document.body || document.documentElement;
    if (!host) return false;

    sheet = document.getElementById('ideasPromptSheetInline');
    if (!sheet || !sheet.isConnected) {
      if (sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet);
      sheet = document.createElement('div');
      sheet.id = 'ideasPromptSheetInline';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-hidden', 'true');
      sheet.innerHTML =
        '<div class="ipc">' +
        '<div class="iph"><div class="eye" id="ipiEye"></div><h2 id="ipiTitle"></h2><p id="ipiSub"></p></div>' +
        '<div class="ipb"><span class="ipl" id="ipiRateL"></span>' +
        '<div class="ips" id="ipiStars">' +
        [1, 2, 3, 4, 5]
          .map(function (n) {
            return '<button type="button" data-s="' + n + '" aria-label="' + n + '">★</button>';
          })
          .join('') +
        '</div>' +
        '<label class="ipl" for="ipiText" id="ipiIdeaL"></label>' +
        '<textarea id="ipiText" maxlength="500"></textarea>' +
        '<label class="ipa"><input type="checkbox" id="ipiAnon" checked><span id="ipiAnonL"></span></label>' +
        '<div class="ipacts">' +
        '<button type="button" class="ipbtn pri" id="ipiSend"></button>' +
        '<button type="button" class="ipbtn mut" id="ipiLater"></button>' +
        '<a class="ipbtn lnk" id="ipiBrowse" href="ideas/"></a>' +
        '</div><p class="ipm" id="ipiMsg"></p></div></div>';
      host.appendChild(sheet);
    }

    fab = document.getElementById('ideasFab');
    if (!fab || !fab.isConnected) {
      if (fab && fab.parentNode) fab.parentNode.removeChild(fab);
      fab = document.createElement('button');
      fab.type = 'button';
      fab.id = 'ideasFab';
      fab.setAttribute('aria-label', isAr() ? 'صندوق الأفكار' : 'Ideas box');
      fab.innerHTML = '<span class="ideasFabSlot" aria-hidden="true"></span>';
      host.appendChild(fab);
    }

    bind();
    paintLang();
    startFabRotate();
    return true;
  }

  function setOpen(on) {
    if (!sheet || !sheet.isConnected) mount();
    if (!sheet) return;
    if (on) {
      // Always re-append so a detached node never "opens" invisibly.
      if (!sheet.isConnected) (document.body || document.documentElement).appendChild(sheet);
      sheet.classList.add('is-open');
      sheet.setAttribute('aria-hidden', 'false');
      try {
        document.documentElement.classList.add('ideas-sheet-open');
        document.body.style.overflow = 'hidden';
      } catch (e) {}
    } else {
      sheet.classList.remove('is-open');
      sheet.setAttribute('aria-hidden', 'true');
      try {
        document.documentElement.classList.remove('ideas-sheet-open');
        document.body.style.overflow = '';
      } catch (e2) {}
    }
  }

  function paintLang() {
    var ar = isAr();
    var map = ar
      ? {
          eye: 'صندوق الأفكار',
          title: 'رأيك يهمنا',
          sub: 'قيّم الموقع بالنجوم واكتب مقترحك هنا مباشرة.',
          rate: 'تقييم الموقع',
          idea: 'اكتب اقتراحك',
          ph: 'ما الذي تود تحسينه؟',
          anon: 'إخفاء هويتي',
          send: 'إرسال',
          later: 'لاحقاً',
          browse: 'كل الأفكار',
          fabAria: 'صندوق الأفكار'
        }
      : {
          eye: 'Ideas box',
          title: 'We value your feedback',
          sub: 'Rate with stars and write your idea here.',
          rate: 'Site rating',
          idea: 'Write your idea',
          ph: 'What would you improve?',
          anon: 'Stay anonymous',
          send: 'Send',
          later: 'Later',
          browse: 'All ideas',
          fabAria: 'Ideas box'
        };
    function t(id, v) {
      var el = document.getElementById(id);
      if (el) el.textContent = v;
    }
    t('ipiEye', map.eye);
    t('ipiTitle', map.title);
    t('ipiSub', map.sub);
    t('ipiRateL', map.rate);
    t('ipiIdeaL', map.idea);
    t('ipiAnonL', map.anon);
    t('ipiSend', map.send);
    t('ipiLater', map.later);
    t('ipiBrowse', map.browse);
    if (fab) {
      fab.setAttribute('aria-label', map.fabAria);
      fab.title = map.fabAria;
      ensureFabStructure();
      paintFabFrame();
    }
    var ta = document.getElementById('ipiText');
    if (ta) ta.placeholder = map.ph;
    var br = document.getElementById('ipiBrowse');
    if (br) br.href = ideasHref();
  }

  function close(fromSubmit) {
    setOpen(false);
    try {
      sessionStorage.setItem(SKIP_KEY, '1');
    } catch (e) {}
    if (fromSubmit) {
      try {
        localStorage.setItem(DONE_KEY, '1');
      } catch (e2) {}
    }
  }

  function identity() {
    var empId = '',
      name = '';
    try {
      empId =
        localStorage.getItem('exportSavedEmpId') ||
        localStorage.getItem('savedEmpId') ||
        localStorage.getItem('importSavedEmpId') ||
        '';
      name =
        localStorage.getItem('exportSavedEmpName') ||
        localStorage.getItem('savedEmpName') ||
        localStorage.getItem('importSavedEmpName') ||
        '';
    } catch (e) {}
    return { empId: String(empId || '').trim(), name: String(name || '').trim() };
  }

  function bind() {
    var stars = document.getElementById('ipiStars');
    if (stars && !stars.__ideasBound) {
      stars.__ideasBound = true;
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
    if (later && !later.__ideasBound) {
      later.__ideasBound = true;
      later.onclick = function (ev) {
        if (ev) {
          try {
            ev.preventDefault();
            ev.stopPropagation();
          } catch (e) {}
        }
        close(false);
      };
    }
    var fabEl = document.getElementById('ideasFab');
    if (fabEl && !fabEl.__ideasBound) {
      fabEl.__ideasBound = true;
      fabEl.onclick = function () {
        try {
          sessionStorage.removeItem(SKIP_KEY);
        } catch (e) {}
        setOpen(true);
        paintLang();
      };
    }
    var send = document.getElementById('ipiSend');
    if (send && !send.__ideasBound) {
      send.__ideasBound = true;
      send.onclick = function () {
        var msg = document.getElementById('ipiMsg');
        if (!msg) return;
        if (!score) {
          msg.className = 'ipm err';
          msg.textContent = isAr() ? 'اختر النجوم أولاً' : 'Pick stars first';
          return;
        }
        var text = String((document.getElementById('ipiText') || {}).value || '').trim();
        if (text.length < 4) {
          msg.className = 'ipm err';
          msg.textContent = isAr() ? 'اكتب اقتراحاً (٤ أحرف+)' : 'Write an idea (4+ chars)';
          return;
        }
        var anon = !!(document.getElementById('ipiAnon') && document.getElementById('ipiAnon').checked);
        var idn = identity();
        msg.className = 'ipm';
        msg.textContent = '…';
        fetch(MANTLE_URL + '?ts=' + Date.now(), {
          headers: { Accept: 'application/json', 'X-Mantle-Key': MANTLE_KEY },
          cache: 'no-store'
        })
          .then(function (r) {
            if (r.status === 404) return {};
            if (!r.ok) throw new Error('r');
            return r.json().catch(function () {
              return {};
            });
          })
          .then(function (doc) {
            doc = doc || {};
            if (!Array.isArray(doc.ideas)) doc.ideas = [];
            if (!Array.isArray(doc.siteRatings)) doc.siteRatings = [];
            doc.siteRatings.unshift({
              score: score,
              at: Date.now(),
              anonymous: anon,
              name: anon ? '' : idn.name,
              empId: anon ? '' : idn.empId,
              comment: text.slice(0, 400)
            });
            doc.ideas.unshift({
              id: 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              body: text.slice(0, 800),
              anonymous: anon,
              name: anon ? '' : idn.name,
              empId: anon ? '' : idn.empId,
              at: Date.now(),
              pinned: false,
              ratingSum: 0,
              ratingCount: 0,
              votes: {}
            });
            if (doc.ideas.length > 120) doc.ideas = doc.ideas.slice(0, 120);
            if (doc.siteRatings.length > 400) doc.siteRatings = doc.siteRatings.slice(0, 400);
            return fetch(MANTLE_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Mantle-Key': MANTLE_KEY },
              body: JSON.stringify(doc)
            });
          })
          .then(function (put) {
            if (!put.ok) throw new Error('w');
            msg.className = 'ipm ok';
            msg.textContent = isAr() ? 'شكراً ✦' : 'Thanks ✦';
            setTimeout(function () {
              close(true);
            }, 900);
          })
          .catch(function () {
            msg.className = 'ipm err';
            msg.textContent = isAr() ? 'تعذر الإرسال' : 'Could not send';
          });
      };
    }
  }

  function tryAutoOpen() {
    mount();
    if (!shouldAutoShow()) return;
    setOpen(true);
  }

  function boot() {
    if (!isRosterLanding() && !forceParam()) return;
    mount();
    // Staggered opens: tolerate late removers / late layout scripts.
    [200, 700, 1500, 2800, 5000].forEach(function (ms) {
      setTimeout(tryAutoOpen, ms);
    });
    // Keep nodes alive for a short window if another script cleans early body nodes.
    var n = 0;
    var keep = setInterval(function () {
      n += 1;
      mount();
      if (shouldAutoShow() && sheet && !sheet.classList.contains('is-open') && n < 6) {
        setOpen(true);
      }
      if (n >= 12) clearInterval(keep);
    }, 800);
  }

  window.rosterIdeasPrompt = {
    open: function () {
      try {
        sessionStorage.removeItem(SKIP_KEY);
      } catch (e) {}
      mount();
      setOpen(true);
      paintLang();
    },
    close: function () {
      close(false);
    }
  };

  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('#langToggle')) setTimeout(paintLang, 0);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
