/**
 * Homepage modal: site rating + suggestion prompt.
 * Matches homepage sheet/card design language.
 */
(function () {
  if (window.__rosterIdeasPromptBooted) return;
  window.__rosterIdeasPromptBooted = true;

  var MANTLE_URL = 'https://mantledb.sh/v2/roster-site-visits/ideas';
  var MANTLE_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  var SEEN_KEY = 'rosterIdeasPromptSeenV1';
  var COOLDOWN_MS = 5 * 24 * 3600 * 1000; // every ~5 days

  function isAr() {
    return document.body && document.body.classList.contains('ar');
  }

  function t(key) {
    var ar = {
      title: 'رأيك يهمنا',
      sub: 'قيّم الموقع واكتب مقترحًا سريعًا — يمكنك إخفاء هويتك.',
      rate: 'تقييم الموقع',
      idea: 'مقترح أو فكرة (اختياري)',
      ph: 'ما الذي تود تحسينه؟',
      anon: 'إخفاء هويتي',
      send: 'إرسال',
      later: 'لاحقًا',
      browse: 'كل الأفكار',
      thanks: 'شكرًا لمشاركتك ✦',
      needStars: 'اختر تقييمًا بالنجوم',
      err: 'تعذر الإرسال. حاول لاحقًا.'
    };
    var en = {
      title: 'We value your feedback',
      sub: 'Rate the site and share a quick idea — identity can stay hidden.',
      rate: 'Site rating',
      idea: 'Suggestion (optional)',
      ph: 'What would you improve?',
      anon: 'Stay anonymous',
      send: 'Send',
      later: 'Later',
      browse: 'All ideas',
      thanks: 'Thanks for sharing ✦',
      needStars: 'Pick a star rating',
      err: 'Could not send. Try later.'
    };
    return (isAr() ? ar : en)[key] || key;
  }

  function ideasHref() {
    try {
      var path = String(location.pathname || '');
      if (/\/docs\//.test(path)) {
        return path.replace(/\/docs\/.*$/, '/docs/ideas/');
      }
      if (/\/roster-site\//.test(path)) {
        return path.replace(/\/roster-site\/.*$/, '/roster-site/ideas/');
      }
    } catch (e) {}
    return 'ideas/';
  }

  function shouldShow() {
    try {
      if (new URLSearchParams(location.search).get('ideas') === '1') return true;
      var raw = localStorage.getItem(SEEN_KEY);
      if (!raw) return true;
      var at = Number(raw) || 0;
      return Date.now() - at > COOLDOWN_MS;
    } catch (e) {
      return true;
    }
  }

  function markSeen() {
    try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch (e) {}
  }

  function identity() {
    var empId = '';
    var name = '';
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

  function ensureCss() {
    if (document.getElementById('rosterIdeasPromptCss')) return;
    var style = document.createElement('style');
    style.id = 'rosterIdeasPromptCss';
    style.textContent =
      '.ideasPromptSheet{position:fixed;inset:0;display:none;align-items:center;justify-content:center;' +
      'background:rgba(15,23,42,.48);z-index:10050;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px))}' +
      '.ideasPromptSheet.open{display:flex}' +
      '.ideasPromptCard{width:min(100%,380px);background:#fff;border-radius:20px;padding:0;overflow:hidden;' +
      'border:1px solid rgba(15,23,42,.1);box-shadow:0 22px 54px rgba(15,23,42,.26);' +
      'animation:ideasPromptIn .28s ease}' +
      '@keyframes ideasPromptIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}' +
      '.ideasPromptHero{background:linear-gradient(135deg,#1e40af 0%,#1976d2 50%,#0ea5e9 100%);' +
      'color:#fff;padding:20px 18px 16px;position:relative;overflow:hidden}' +
      '.ideasPromptHero:before,.ideasPromptHero:after{content:"";position:absolute;border-radius:50%;' +
      'background:rgba(255,255,255,.1)}' +
      '.ideasPromptHero:before{width:100px;height:100px;top:-30px;left:-20px}' +
      '.ideasPromptHero:after{width:120px;height:120px;bottom:-50px;right:-30px}' +
      '.ideasPromptEyebrow{position:relative;z-index:1;display:block;font-size:11px;font-weight:800;' +
      'letter-spacing:.08em;opacity:.9;margin-bottom:4px}' +
      '.ideasPromptTitle{position:relative;z-index:1;margin:0;font-size:20px;font-weight:800}' +
      '.ideasPromptSub{position:relative;z-index:1;margin:8px 0 0;font-size:12.5px;line-height:1.5;' +
      'font-weight:600;opacity:.93}' +
      '.ideasPromptBody{padding:16px 16px 14px}' +
      '.ideasPromptLabel{display:block;font-size:12px;font-weight:800;color:#334155;margin:0 0 8px}' +
      '.ideasPromptStars{display:flex;gap:6px;direction:ltr;margin:0 0 14px;justify-content:center}' +
      '.ideasPromptStars button{border:0;background:transparent;font-size:28px;line-height:1;' +
      'color:#cbd5e1;cursor:pointer;padding:2px;transition:transform .12s ease,color .12s ease}' +
      '.ideasPromptStars button.on{color:#f59e0b}' +
      '.ideasPromptStars button:hover{transform:scale(1.12)}' +
      '.ideasPromptTA{width:100%;min-height:84px;resize:vertical;border:1.5px solid #e2e8f0;' +
      'border-radius:12px;padding:11px 12px;font:inherit;font-size:14px;background:#f8fafc;color:#0f172a;outline:none}' +
      '.ideasPromptTA:focus{border-color:#60a5fa;background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.12)}' +
      '.ideasPromptAnon{display:flex;align-items:center;gap:8px;margin:10px 0 14px;' +
      'font-size:13px;font-weight:700;color:#334155;cursor:pointer;user-select:none}' +
      '.ideasPromptAnon input{width:17px;height:17px;accent-color:#2563eb}' +
      '.ideasPromptActions{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
      '.ideasPromptBtn{border:0;border-radius:999px;min-height:44px;font:inherit;font-size:13px;' +
      'font-weight:800;cursor:pointer;padding:0 12px}' +
      '.ideasPromptBtn--primary{background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff;' +
      'box-shadow:0 8px 18px rgba(37,99,235,.28);grid-column:1/-1}' +
      '.ideasPromptBtn--muted{background:#f1f5f9;color:#334155;border:1px solid #e2e8f0}' +
      '.ideasPromptBtn--link{background:transparent;color:#1d4ed8;border:1px solid #bfdbfe}' +
      '.ideasPromptMsg{min-height:18px;margin:10px 0 0;font-size:12px;font-weight:700;color:#64748b;text-align:center}' +
      '.ideasPromptMsg.ok{color:#15803d}.ideasPromptMsg.err{color:#b91c1c}' +
      'body.ar .ideasPromptCard{font-family:"Segoe UI",Tahoma,Arial,sans-serif}';
    document.head.appendChild(style);
  }

  function inject() {
    if (document.getElementById('ideasPromptSheet')) return;
    ensureCss();
    var sheet = document.createElement('div');
    sheet.id = 'ideasPromptSheet';
    sheet.className = 'ideasPromptSheet';
    sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML =
      '<div class="ideasPromptCard" role="dialog" aria-modal="true" aria-labelledby="ideasPromptTitle">' +
        '<div class="ideasPromptHero">' +
          '<span class="ideasPromptEyebrow" id="ideasPromptEye">✦</span>' +
          '<h2 class="ideasPromptTitle" id="ideasPromptTitle"></h2>' +
          '<p class="ideasPromptSub" id="ideasPromptSub"></p>' +
        '</div>' +
        '<div class="ideasPromptBody">' +
          '<span class="ideasPromptLabel" id="ideasPromptRateLabel"></span>' +
          '<div class="ideasPromptStars" id="ideasPromptStars" role="group">' +
            [1, 2, 3, 4, 5]
              .map(function (n) {
                return '<button type="button" data-score="' + n + '" aria-label="' + n + '">★</button>';
              })
              .join('') +
          '</div>' +
          '<label class="ideasPromptLabel" for="ideasPromptText" id="ideasPromptIdeaLabel"></label>' +
          '<textarea class="ideasPromptTA" id="ideasPromptText" maxlength="500"></textarea>' +
          '<label class="ideasPromptAnon"><input type="checkbox" id="ideasPromptAnon" checked><span id="ideasPromptAnonLabel"></span></label>' +
          '<div class="ideasPromptActions">' +
            '<button type="button" class="ideasPromptBtn ideasPromptBtn--primary" id="ideasPromptSend"></button>' +
            '<button type="button" class="ideasPromptBtn ideasPromptBtn--muted" id="ideasPromptLater"></button>' +
            '<a class="ideasPromptBtn ideasPromptBtn--link" id="ideasPromptBrowse" href="ideas/" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none"></a>' +
          '</div>' +
          '<p class="ideasPromptMsg" id="ideasPromptMsg"></p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(sheet);
  }

  function applyI18n() {
    document.getElementById('ideasPromptTitle').textContent = t('title');
    document.getElementById('ideasPromptSub').textContent = t('sub');
    document.getElementById('ideasPromptRateLabel').textContent = t('rate');
    document.getElementById('ideasPromptIdeaLabel').textContent = t('idea');
    document.getElementById('ideasPromptText').placeholder = t('ph');
    document.getElementById('ideasPromptAnonLabel').textContent = t('anon');
    document.getElementById('ideasPromptSend').textContent = t('send');
    document.getElementById('ideasPromptLater').textContent = t('later');
    var browse = document.getElementById('ideasPromptBrowse');
    browse.textContent = t('browse');
    browse.href = ideasHref();
    document.getElementById('ideasPromptEye').textContent = isAr() ? 'صندوق الأفكار' : 'Ideas box';
  }

  var score = 0;

  function paintStars() {
    document.querySelectorAll('#ideasPromptStars button').forEach(function (b) {
      var n = Number(b.getAttribute('data-score') || 0);
      b.classList.toggle('on', n <= score);
    });
  }

  function open() {
    inject();
    applyI18n();
    score = 0;
    paintStars();
    document.getElementById('ideasPromptText').value = '';
    document.getElementById('ideasPromptMsg').textContent = '';
    document.getElementById('ideasPromptMsg').className = 'ideasPromptMsg';
    var sheet = document.getElementById('ideasPromptSheet');
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
  }

  function close() {
    var sheet = document.getElementById('ideasPromptSheet');
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    markSeen();
  }

  function headers(write) {
    var h = { Accept: 'application/json', 'X-Mantle-Key': MANTLE_KEY };
    if (write) h['Content-Type'] = 'application/json';
    return h;
  }

  async function submit() {
    var msg = document.getElementById('ideasPromptMsg');
    if (!score) {
      msg.className = 'ideasPromptMsg err';
      msg.textContent = t('needStars');
      return;
    }
    var text = String(document.getElementById('ideasPromptText').value || '').trim();
    var anon = !!document.getElementById('ideasPromptAnon').checked;
    var idn = identity();
    msg.className = 'ideasPromptMsg';
    msg.textContent = '…';
    try {
      var res = await fetch(MANTLE_URL + '?ts=' + Date.now(), {
        headers: headers(false),
        cache: 'no-store'
      });
      var doc = { ideas: [], siteRatings: [] };
      if (res.ok) {
        try {
          doc = await res.json();
        } catch (e0) {}
      }
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
      if (doc.siteRatings.length > 400) doc.siteRatings = doc.siteRatings.slice(0, 400);
      if (text.length >= 4) {
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
      }
      var put = await fetch(MANTLE_URL, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify(doc)
      });
      if (!put.ok) throw new Error('write');
      msg.className = 'ideasPromptMsg ok';
      msg.textContent = t('thanks');
      setTimeout(close, 1100);
    } catch (e) {
      msg.className = 'ideasPromptMsg err';
      msg.textContent = t('err');
    }
  }

  function bind() {
    inject();
    applyI18n();
    document.getElementById('ideasPromptStars').addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-score]');
      if (!b) return;
      score = Number(b.getAttribute('data-score') || 0);
      paintStars();
    });
    document.getElementById('ideasPromptSend').addEventListener('click', submit);
    document.getElementById('ideasPromptLater').addEventListener('click', close);
    document.getElementById('ideasPromptSheet').addEventListener('click', function (ev) {
      if (ev.target === document.getElementById('ideasPromptSheet')) close();
    });
  }

  function boot() {
    bind();
    if (!shouldShow()) return;
    // After phone prompt delay so sheets don't stack tightly
    window.setTimeout(open, 4200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.rosterIdeasPrompt = { open: open, close: close };
})();
