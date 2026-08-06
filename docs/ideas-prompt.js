/**
 * Homepage modal: site rating + suggestion prompt (3-day campaign).
 * Stars + text writing are both in the same window.
 */
(function () {
  if (window.__rosterIdeasPromptBooted) return;
  window.__rosterIdeasPromptBooted = true;

  var MANTLE_URL = 'https://mantledb.sh/v2/roster-site-visits/ideas';
  var MANTLE_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  var CAMPAIGN_KEY = 'rosterIdeasCampaignV2';
  var WINDOW_MS = 3 * 24 * 3600 * 1000;

  function isAr() {
    return document.body && document.body.classList.contains('ar');
  }

  function muscatDay() {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Muscat',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function t(key) {
    var ar = {
      title: 'رأيك يهمنا',
      sub: 'لمدة 3 أيام: قيّم الموقع بالنجوم واكتب مقترحك هنا في نفس النافذة.',
      rate: 'تقييم الموقع (نجوم)',
      idea: 'اكتب اقتراحك أو فكرتك',
      ph: 'مثال: أريد تنبيهاً قبل بداية الوردية…',
      anon: 'إخفاء هويتي',
      send: 'إرسال',
      later: 'لاحقاً',
      browse: 'كل الأفكار',
      thanks: 'شكرًا لمشاركتك ✦',
      needStars: 'اختر تقييماً بالنجوم أولاً',
      needIdea: 'اكتب اقتراحاً (٤ أحرف على الأقل)',
      err: 'تعذر الإرسال. حاول لاحقاً.',
      daysLeft: 'متبقي من الحملة'
    };
    var en = {
      title: 'We value your feedback',
      sub: 'For 3 days: rate the site with stars and write your idea in this same window.',
      rate: 'Rate the site (stars)',
      idea: 'Write your suggestion or idea',
      ph: 'e.g. I’d like a reminder before my shift…',
      anon: 'Stay anonymous',
      send: 'Send',
      later: 'Later',
      browse: 'All ideas',
      thanks: 'Thanks for sharing ✦',
      needStars: 'Pick a star rating first',
      needIdea: 'Write a suggestion (at least 4 characters)',
      err: 'Could not send. Try later.',
      daysLeft: 'Campaign days left'
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

  function readCampaign() {
    try {
      var j = JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || 'null');
      if (j && Number(j.start) > 0) return j;
    } catch (e) {}
    return null;
  }

  function writeCampaign(j) {
    try {
      localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(j));
    } catch (e) {}
  }

  function ensureCampaign() {
    var j = readCampaign();
    if (j) return j;
    j = { start: Date.now(), done: false, lastDay: '' };
    writeCampaign(j);
    return j;
  }

  function daysLeft() {
    var j = ensureCampaign();
    var left = Math.ceil((Number(j.start) + WINDOW_MS - Date.now()) / (24 * 3600 * 1000));
    return Math.max(0, left);
  }

  function shouldShow() {
    try {
      if (new URLSearchParams(location.search).get('ideas') === '1') return true;
      var j = ensureCampaign();
      if (j.done) return false;
      if (Date.now() - Number(j.start) > WINDOW_MS) return false;
      if (j.lastDay && j.lastDay === muscatDay()) return false;
      return true;
    } catch (e) {
      return true;
    }
  }

  function markDismissedToday() {
    var j = ensureCampaign();
    j.lastDay = muscatDay();
    writeCampaign(j);
  }

  function markCampaignDone() {
    var j = ensureCampaign();
    j.done = true;
    j.lastDay = muscatDay();
    writeCampaign(j);
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
      '.ideasPromptCard{width:min(100%,390px);background:#fff;border-radius:20px;padding:0;overflow:hidden;' +
      'border:1px solid rgba(15,23,42,.1);box-shadow:0 22px 54px rgba(15,23,42,.26);' +
      'animation:ideasPromptIn .28s ease;max-height:min(92dvh,720px);display:flex;flex-direction:column}' +
      '@keyframes ideasPromptIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}' +
      '.ideasPromptHero{background:linear-gradient(135deg,#1e40af 0%,#1976d2 50%,#0ea5e9 100%);' +
      'color:#fff;padding:18px 18px 14px;position:relative;overflow:hidden;flex:none}' +
      '.ideasPromptHero:before,.ideasPromptHero:after{content:"";position:absolute;border-radius:50%;' +
      'background:rgba(255,255,255,.1)}' +
      '.ideasPromptHero:before{width:100px;height:100px;top:-30px;left:-20px}' +
      '.ideasPromptHero:after{width:120px;height:120px;bottom:-50px;right:-30px}' +
      '.ideasPromptEyebrow{position:relative;z-index:1;display:block;font-size:11px;font-weight:800;' +
      'letter-spacing:.08em;opacity:.9;margin-bottom:4px}' +
      '.ideasPromptTitle{position:relative;z-index:1;margin:0;font-size:20px;font-weight:800}' +
      '.ideasPromptSub{position:relative;z-index:1;margin:8px 0 0;font-size:12.5px;line-height:1.5;' +
      'font-weight:600;opacity:.93}' +
      '.ideasPromptDays{position:relative;z-index:1;display:inline-flex;margin-top:10px;font-size:11px;font-weight:800;' +
      'background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:4px 10px}' +
      '.ideasPromptBody{padding:14px 16px 14px;overflow:auto;-webkit-overflow-scrolling:touch}' +
      '.ideasPromptLabel{display:block;font-size:12px;font-weight:800;color:#334155;margin:0 0 8px}' +
      '.ideasPromptStars{display:flex;gap:8px;direction:ltr;margin:0 0 14px;justify-content:center;' +
      'background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:10px 8px}' +
      '.ideasPromptStars button{border:0;background:transparent;font-size:30px;line-height:1;' +
      'color:#cbd5e1;cursor:pointer;padding:2px;transition:transform .12s ease,color .12s ease}' +
      '.ideasPromptStars button.on{color:#f59e0b}' +
      '.ideasPromptStars button:hover{transform:scale(1.12)}' +
      '.ideasPromptTA{width:100%;min-height:100px;resize:vertical;border:1.5px solid #e2e8f0;' +
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
          '<span class="ideasPromptDays" id="ideasPromptDays"></span>' +
        '</div>' +
        '<div class="ideasPromptBody">' +
          '<span class="ideasPromptLabel" id="ideasPromptRateLabel"></span>' +
          '<div class="ideasPromptStars" id="ideasPromptStars" role="group" aria-label="rating">' +
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
    var left = daysLeft();
    document.getElementById('ideasPromptDays').textContent =
      t('daysLeft') + ': ' + left + (isAr() ? ' يوم' : left === 1 ? ' day' : ' days');
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

  function close(fromSubmit) {
    var sheet = document.getElementById('ideasPromptSheet');
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    if (fromSubmit) markCampaignDone();
    else markDismissedToday();
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
    if (text.length < 4) {
      msg.className = 'ideasPromptMsg err';
      msg.textContent = t('needIdea');
      return;
    }
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
      var put = await fetch(MANTLE_URL, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify(doc)
      });
      if (!put.ok) throw new Error('write');
      msg.className = 'ideasPromptMsg ok';
      msg.textContent = t('thanks');
      setTimeout(function () {
        close(true);
      }, 1100);
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
    document.getElementById('ideasPromptLater').addEventListener('click', function () {
      close(false);
    });
    document.getElementById('ideasPromptSheet').addEventListener('click', function (ev) {
      if (ev.target === document.getElementById('ideasPromptSheet')) close(false);
    });
  }

  function boot() {
    bind();
    if (!shouldShow()) return;
    window.setTimeout(open, 2800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.rosterIdeasPrompt = {
    open: open,
    close: function () {
      close(false);
    }
  };
})();
