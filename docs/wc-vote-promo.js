/**
 * wc-vote-promo.js — World Cup fan voting promo (match-accb0)
 * Floating mini-podium beside change-alert bell; opens vote site on tap (no auto popup).
 */
(function () {
  'use strict';

  var VOTE_BASE = 'https://match-accb0.web.app/?utm_source=roster-site&utm_medium=popup';
  var FIXTURES_BASE = 'https://match-accb0.web.app/fixtures.html?utm_source=roster-site&utm_medium=popup';
  var RESULTS_BASE = 'https://match-accb0.web.app/results.html?utm_source=roster-site&utm_medium=popup';

  function buildMatchUrl(base) {
    var url = base;
    try {
      var emp = (
        localStorage.getItem('exportSavedEmpId') ||
        localStorage.getItem('savedEmpId') ||
        ''
      ).trim();
      if (emp) url += (url.indexOf('?') >= 0 ? '&' : '?') + 'emp=' + encodeURIComponent(emp);
    } catch (e) {}
    return url;
  }

  function buildVoteUrl() {
    return buildMatchUrl(VOTE_BASE);
  }
  var STORAGE_KEY = 'wcVotePromoDismissed_v1';
  var PROMO_LANG_KEY = 'wcVotePromoLang';
  var STYLE_ID = 'wc-vote-promo-styles';
  var SHEET_ID = 'wcVotePromoSheet';
  var DOT_ID = 'wc-vote-dot';
  var FIRESTORE_KEY = 'AIzaSyCK8yLoaa7q_tTobuMiG33h9576AFg253M';
  var TEAMS_POLL_MS = 45000;
  var lastTop3 = null;
  var podiumPollTimer = null;

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseFirestoreValue(v) {
    if (!v) return null;
    if (v.stringValue !== undefined) return v.stringValue;
    if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
    if (v.doubleValue !== undefined) return v.doubleValue;
    if (v.booleanValue !== undefined) return v.booleanValue;
    return null;
  }

  function docToTeam(doc) {
    var f = (doc && doc.fields) || {};
    return {
      id: (doc.name || '').split('/').pop(),
      name: parseFirestoreValue(f.name) || '',
      flag: parseFirestoreValue(f.flag) || '🏳️',
      votes: Number(parseFirestoreValue(f.votes)) || 0,
    };
  }

  function fetchTop3Teams() {
    return fetch(
      'https://firestore.googleapis.com/v1/projects/match-accb0/databases/(default)/documents:runQuery?key=' +
        FIRESTORE_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'teams' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'active' },
                op: 'EQUAL',
                value: { booleanValue: true },
              },
            },
            orderBy: [{ field: { fieldPath: 'votes' }, direction: 'DESCENDING' }],
            limit: 3,
          },
        }),
      }
    )
      .then(function (r) {
        if (!r.ok) throw new Error('query failed');
        return r.json();
      })
      .then(function (rows) {
        return (rows || [])
          .filter(function (row) {
            return row && row.document;
          })
          .map(function (row) {
            return docToTeam(row.document);
          });
      })
      .catch(function () {
        return fetch(
          'https://firestore.googleapis.com/v1/projects/match-accb0/databases/(default)/documents/teams?key=' +
            FIRESTORE_KEY +
            '&pageSize=100'
        )
          .then(function (r) {
            return r.ok ? r.json() : { documents: [] };
          })
          .then(function (data) {
            return (data.documents || [])
              .map(docToTeam)
              .sort(function (a, b) {
                return b.votes - a.votes;
              })
              .slice(0, 3);
          });
      });
  }

  function shortTeamName(name) {
    var n = String(name || '').trim();
    if (n.length <= 8) return n;
    return n.slice(0, 7) + '…';
  }

  function miniPodiumHtml(teams, variant) {
    variant = variant || 'dot';
    if (!teams || !teams.length) {
      return (
        '<div class="wc-mini-podium wc-mini-podium--' +
        variant +
        ' wc-mini-podium--loading" dir="ltr"><span class="wc-mini-fallback">🏆</span></div>'
      );
    }
    var cols = [
      { team: teams[1], rank: 2, place: 'wc-mini-p2' },
      { team: teams[0], rank: 1, place: 'wc-mini-p1' },
      { team: teams[2], rank: 3, place: 'wc-mini-p3' },
    ];
    var html =
      '<div class="wc-mini-podium wc-mini-podium--' + variant + '" dir="ltr" role="img" aria-label="Top 3">';
    cols.forEach(function (col) {
      if (!col.team) {
        html += '<div class="wc-mini-col ' + col.place + ' is-empty"></div>';
        return;
      }
      html +=
        '<div class="wc-mini-col ' +
        col.place +
        '">' +
        '<div class="wc-mini-card">' +
        '<span class="wc-mini-flag">' +
        col.team.flag +
        '</span>' +
        (variant === 'hero'
          ? '<span class="wc-mini-name">' + escapeHtml(shortTeamName(col.team.name)) + '</span>'
          : '') +
        '</div>' +
        '<div class="wc-mini-block"><span>' +
        col.rank +
        '</span></div>' +
        '</div>';
    });
    html += '<span class="wc-mini-live" title="Live"></span></div>';
    return html;
  }

  function updatePodiumWidgets(teams) {
    var dotWrap = document.querySelector('#' + DOT_ID + ' .wc-vote-dot-podium');
    if (dotWrap) dotWrap.innerHTML = miniPodiumHtml(teams, 'dot');
    var heroPod = document.getElementById('wcVotePromoMiniPodium');
    if (heroPod) heroPod.innerHTML = miniPodiumHtml(teams, 'hero');
  }

  function refreshMiniPodium() {
    fetchTop3Teams()
      .then(function (teams) {
        if (!teams || !teams.length) return;
        lastTop3 = teams;
        updatePodiumWidgets(teams);
      })
      .catch(function () {});
  }

  function startPodiumPolling() {
    refreshMiniPodium();
    if (podiumPollTimer) clearInterval(podiumPollTimer);
    podiumPollTimer = setInterval(refreshMiniPodium, TEAMS_POLL_MS);
  }

  var I18N = {
    en: {
      trial: 'Trial',
      badge: 'World Cup 2026',
      title: 'Vote for your team!',
      sub: 'Join the global fan ranking — one vote every 24 hours. Live results.',
      cta: 'Vote now',
      btnFixtures: 'Match schedule',
      btnResults: 'Results',
      later: 'Maybe later',
      close: 'Close',
      langBtn: 'ع',
      langAria: 'Arabic',
      dotAria: 'World Cup 2026 — vote, schedule & results',
    },
    ar: {
      trial: 'تجربة',
      badge: 'كأس العالم 2026',
      title: 'ترتيب جماهير',
      sub: 'صوّت لمنتخبك المفضل وساعده على الوصول إلى المركز الأول في التصنيف الجماهيري العالمي',
      cta: 'صوّت الآن',
      btnFixtures: 'جدول المباريات',
      btnResults: 'النتائج',
      later: 'لاحقاً',
      close: 'إغلاق',
      langBtn: 'EN',
      langAria: 'English',
      dotAria: 'كأس العالم 2026 — تصويت وجدول ونتائج',
    },
  };

  function lang() {
    try {
      var pl = localStorage.getItem(PROMO_LANG_KEY);
      if (pl === 'ar' || pl === 'en') return pl;
    } catch (e) {}
    return 'ar';
  }

  function t(key) {
    var pack = I18N[lang()] || I18N.ar;
    return pack[key] || I18N.ar[key] || key;
  }

  function isDismissed() {
    try {
      if ((new URLSearchParams(location.search).get('wcvote') || '') === '1') return false;
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function shouldAutoOpen() {
    try {
      if ((new URLSearchParams(location.search).get('wcvote') || '') === '1') return true;
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return false;
    } catch (e) {}
    return true;
  }

  function dismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {}
    closeSheet();
    showFloatingDot();
  }

  function togglePromoLang() {
    var next = lang() === 'ar' ? 'en' : 'ar';
    try {
      localStorage.setItem(PROMO_LANG_KEY, next);
    } catch (e) {}
    applyI18n();
  }

  function injectStyles() {
    var css =
      '#' +
      SHEET_ID +
      '.wcVotePromoSheet{' +
      'position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;' +
      'padding:16px;background:rgba(15,23,42,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
      'opacity:0;visibility:hidden;pointer-events:none;transition:opacity .35s ease,visibility .35s;' +
      '}' +
      '#' +
      SHEET_ID +
      '.wcVotePromoSheet.is-open{opacity:1;visibility:visible;pointer-events:auto;}' +
      '.wcVotePromoCard{' +
      'width:min(100%,380px);border-radius:22px;overflow:hidden;' +
      'background:linear-gradient(165deg,#0a1520 0%,#111e2e 55%,#0f1e2e 100%);' +
      'border:1px solid rgba(255,215,0,.35);box-shadow:0 24px 60px rgba(0,0,0,.45),0 0 40px rgba(255,215,0,.12);' +
      'color:#e8f4f8;text-align:center;transform:translateY(12px) scale(.96);' +
      'transition:transform .4s cubic-bezier(.34,1.56,.64,1);' +
      '}' +
      '#' +
      SHEET_ID +
      '.is-open .wcVotePromoCard{transform:translateY(0) scale(1);}' +
      '.wcVotePromoHero{padding:22px 18px 14px;position:relative;}' +
      '.wcVotePromoClose,.wcVotePromoLangToggle{position:absolute;top:10px;width:36px;height:36px;border-radius:50%;' +
      'border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#8ab4cc;' +
      'font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
      '-webkit-tap-highlight-color:transparent;letter-spacing:.02em;}' +
      '.wcVotePromoClose{left:10px;font-size:18px;}' +
      '.wcVotePromoLangToggle{right:10px;}' +
      '[dir="rtl"] .wcVotePromoClose{left:auto;right:10px;}' +
      '[dir="rtl"] .wcVotePromoLangToggle{right:auto;left:10px;}' +
      '.wcVotePromoTrial{display:inline-block;margin:0 0 6px;padding:4px 14px;border-radius:999px;' +
      'font-size:13px;font-weight:900;letter-spacing:.06em;color:#0a1520;' +
      'background:linear-gradient(135deg,#FFD700,#f59e0b);box-shadow:0 4px 14px rgba(255,215,0,.35);}' +
      '.wcVotePromoBadge{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.12em;' +
      'text-transform:uppercase;color:#00d4ff;margin-bottom:8px;}' +
      '[dir="rtl"] .wcVotePromoBadge{letter-spacing:.04em;text-transform:none;font-size:12px;}' +
      '.wcVotePromoTrophy{display:flex;justify-content:center;margin:6px 0 8px;line-height:0;}' +
      '.wcVotePromoMiniPodium{display:flex;justify-content:center;margin:8px 0 10px;}' +
      '.wc-mini-podium{position:relative;display:flex;align-items:flex-end;justify-content:center;gap:3px;' +
      'padding:6px 8px 5px;background:linear-gradient(165deg,#0a0a0a 0%,#111 55%,#0d0d0d 100%);' +
      'border:1px solid rgba(255,215,0,.22);border-radius:14px;' +
      'box-shadow:0 4px 16px rgba(0,0,0,.45),0 1px 4px rgba(0,0,0,.3);filter:none;}' +
      '.wc-mini-podium--dot{min-width:86px;transform-origin:center bottom;padding:5px 7px 4px;border-radius:12px;}' +
      '.wc-mini-podium--hero{min-width:220px;gap:5px;padding:10px 12px 8px;}' +
      '.wc-mini-podium--loading{min-width:52px;min-height:44px;align-items:center;justify-content:center;}' +
      '.wc-mini-fallback{font-size:28px;line-height:1;}' +
      '.wc-mini-col{display:flex;flex-direction:column;align-items:stretch;flex:1 1 0;min-width:0;max-width:34px;}' +
      '.wc-mini-podium--hero .wc-mini-col{max-width:68px;}' +
      '.wc-mini-col.is-empty{visibility:hidden;}' +
      '.wc-mini-podium--dot .wc-mini-card{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);padding:3px 2px 4px;}' +
      '.wc-mini-card{text-align:center;padding:3px 2px 4px;border-radius:8px 8px 0 0;' +
      'border:1px solid rgba(255,255,255,.08);border-bottom:none;' +
      'background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,0));}' +
      '.wc-mini-p1 .wc-mini-card{border-color:rgba(255,215,0,.35);background:linear-gradient(180deg,rgba(255,215,0,.14),rgba(255,215,0,.02));}' +
      '.wc-mini-p2 .wc-mini-card{border-color:rgba(192,192,192,.25);background:linear-gradient(180deg,rgba(192,192,192,.1),rgba(192,192,192,.01));}' +
      '.wc-mini-p3 .wc-mini-card{border-color:rgba(205,127,50,.25);background:linear-gradient(180deg,rgba(205,127,50,.1),rgba(205,127,50,.01));}' +
      '.wc-mini-flag{display:block;font-size:15px;line-height:1;margin-bottom:1px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5));}' +
      '.wc-mini-podium--hero .wc-mini-flag{font-size:22px;margin-bottom:2px;}' +
      '.wc-mini-p1 .wc-mini-flag{font-size:17px;}' +
      '.wc-mini-podium--hero .wc-mini-p1 .wc-mini-flag{font-size:26px;}' +
      '.wc-mini-name{display:block;font-size:8px;font-weight:700;color:#e8f4f8;line-height:1.1;margin-bottom:1px;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;direction:rtl;}' +
      '.wc-mini-p1 .wc-mini-name{color:#FFD700;}' +
      '.wc-mini-block{display:flex;align-items:center;justify-content:center;border-radius:0 0 6px 6px;' +
      'font-size:10px;font-weight:900;color:rgba(255,255,255,.45);font-family:system-ui,sans-serif;}' +
      '.wc-mini-p1 .wc-mini-block{height:20px;background:linear-gradient(180deg,rgba(255,215,0,.22),rgba(255,215,0,.06));color:rgba(255,215,0,.55);}' +
      '.wc-mini-p2 .wc-mini-block{height:14px;background:linear-gradient(180deg,rgba(192,192,192,.18),rgba(192,192,192,.04));color:rgba(192,192,192,.55);}' +
      '.wc-mini-p3 .wc-mini-block{height:10px;background:linear-gradient(180deg,rgba(205,127,50,.18),rgba(205,127,50,.04));color:rgba(205,127,50,.65);}' +
      '.wc-mini-podium--hero .wc-mini-p1 .wc-mini-block{height:28px;font-size:13px;}' +
      '.wc-mini-podium--hero .wc-mini-p2 .wc-mini-block{height:20px;font-size:12px;}' +
      '.wc-mini-podium--hero .wc-mini-p3 .wc-mini-block{height:14px;font-size:11px;}' +
      '.wc-mini-live{position:absolute;top:5px;right:5px;width:5px;height:5px;border-radius:50%;background:#00e676;' +
      'box-shadow:0 0 4px #00e676;animation:wcMiniLive 2s ease-in-out infinite;}' +
      '@keyframes wcMiniLive{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.55;transform:scale(.85);}}' +
      '.wcVotePromoTitle{margin:0 0 8px;font-size:22px;font-weight:900;color:#FFD700;line-height:1.2;}' +
      '.wcVotePromoSub{margin:0 0 14px;font-size:13px;line-height:1.55;color:#8ab4cc;padding:0 8px;}' +
      '.wcVotePromoActions{display:flex;flex-direction:column;gap:10px;padding:0 18px 20px;}' +
      '.wcVotePromoBtn{display:flex;align-items:center;justify-content:center;gap:10px;min-height:48px;' +
      'padding:12px 18px;border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;text-decoration:none;' +
      '-webkit-tap-highlight-color:transparent;border:1px solid transparent;transition:transform .15s ease,box-shadow .15s ease;}' +
      '.wcVotePromoBtn:active{transform:scale(.98);}' +
      '.wcVotePromoBtn--vote{' +
      'background:linear-gradient(135deg,#FFD700,#B8860B);color:#0a1520;' +
      'box-shadow:0 6px 20px rgba(255,215,0,.35);border-color:rgba(255,215,0,.45);}' +
      '.wcVotePromoBtn--fixtures{' +
      'background:linear-gradient(135deg,rgba(168,85,247,.22),rgba(124,58,237,.12));color:#e9d5ff;' +
      'border-color:rgba(168,85,247,.35);box-shadow:0 4px 16px rgba(124,58,237,.2);}' +
      '.wcVotePromoBtn--results{' +
      'background:linear-gradient(135deg,rgba(37,211,102,.18),rgba(22,163,74,.1));color:#bbf7d0;' +
      'border-color:rgba(37,211,102,.35);box-shadow:0 4px 16px rgba(37,211,102,.15);}' +
      '.wcVotePromoBtn-icon{font-size:20px;line-height:1;flex-shrink:0;}' +
      '#' +
      DOT_ID +
      '{position:fixed;left:16px;bottom:26px;width:auto;height:auto;display:none;align-items:center;' +
      'justify-content:center;background:transparent;border:none;border-radius:0;box-shadow:none;' +
      'z-index:100019;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent;}' +
      '#' +
      DOT_ID +
      '.is-on{display:flex;}' +
      'body:has(#chg-dot:not([hidden])) #' +
      DOT_ID +
      '.is-on{left:72px;}' +
      '#' +
      DOT_ID +
      '.is-on{animation:wcDotIn .45s cubic-bezier(.34,1.4,.64,1) forwards;}' +
      '@keyframes wcDotIn{from{opacity:0;transform:translateY(8px) scale(.92);}to{opacity:1;transform:translateY(0) scale(1);}}' +
      '#' +
      DOT_ID +
      ' .wc-vote-dot-podium{display:block;line-height:0;transition:transform .25s ease;}' +
      '#' +
      DOT_ID +
      ':hover .wc-vote-dot-podium{transform:translateY(-2px);}' +
      '#' +
      DOT_ID +
      ':active .wc-vote-dot-podium{transform:scale(.97);}';
    var el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = css;
  }

  function buildSheet() {
    if (document.getElementById(SHEET_ID)) return document.getElementById(SHEET_ID);

    var voteUrl = buildVoteUrl();
    var fixturesUrl = buildMatchUrl(FIXTURES_BASE);
    var resultsUrl = buildMatchUrl(RESULTS_BASE);

    var sheet = document.createElement('div');
    sheet.id = SHEET_ID;
    sheet.className = 'wcVotePromoSheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML =
      '<div class="wcVotePromoCard">' +
      '  <div class="wcVotePromoHero">' +
      '    <button type="button" class="wcVotePromoClose" id="wcVotePromoClose" aria-label="">✕</button>' +
      '    <button type="button" class="wcVotePromoLangToggle" id="wcVotePromoLangToggle" aria-label=""></button>' +
      '    <div class="wcVotePromoTrial" id="wcVotePromoTrial"></div>' +
      '    <span class="wcVotePromoBadge" id="wcVotePromoBadge"></span>' +
      '    <div class="wcVotePromoMiniPodium" id="wcVotePromoMiniPodium" aria-hidden="true"></div>' +
      '    <h2 class="wcVotePromoTitle" id="wcVotePromoTitle"></h2>' +
      '    <p class="wcVotePromoSub" id="wcVotePromoSub"></p>' +
      '  </div>' +
      '  <div class="wcVotePromoActions">' +
      '    <a class="wcVotePromoBtn wcVotePromoBtn--vote" id="wcVotePromoCta" href="' +
      voteUrl +
      '" target="_blank" rel="noopener noreferrer">' +
      '      <span class="wcVotePromoBtn-icon" aria-hidden="true">🗳️</span>' +
      '      <span id="wcVotePromoCtaLbl"></span>' +
      '    </a>' +
      '    <a class="wcVotePromoBtn wcVotePromoBtn--fixtures" id="wcVotePromoFixtures" href="' +
      fixturesUrl +
      '" target="_blank" rel="noopener noreferrer">' +
      '      <span class="wcVotePromoBtn-icon" aria-hidden="true">📅</span>' +
      '      <span id="wcVotePromoFixturesLbl"></span>' +
      '    </a>' +
      '    <a class="wcVotePromoBtn wcVotePromoBtn--results" id="wcVotePromoResults" href="' +
      resultsUrl +
      '" target="_blank" rel="noopener noreferrer">' +
      '      <span class="wcVotePromoBtn-icon" aria-hidden="true">🏁</span>' +
      '      <span id="wcVotePromoResultsLbl"></span>' +
      '    </a>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(sheet);

    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) dismiss();
    });

    document.getElementById('wcVotePromoClose').addEventListener('click', dismiss);
    document.getElementById('wcVotePromoLangToggle').addEventListener('click', togglePromoLang);

    updatePodiumWidgets(lastTop3);
    return sheet;
  }

  function buildFloatingDot() {
    if (document.getElementById(DOT_ID)) return document.getElementById(DOT_ID);
    var btn = document.createElement('button');
    btn.id = DOT_ID;
    btn.type = 'button';
    btn.className = 'wc-vote-dot';
    btn.innerHTML =
      '<span class="wc-vote-dot-podium" aria-hidden="true">' + miniPodiumHtml(lastTop3, 'dot') + '</span>';
    btn.addEventListener('click', function () {
      openSheet();
    });
    document.body.appendChild(btn);
    return btn;
  }

  function showFloatingDot() {
    injectStyles();
    var dot = buildFloatingDot();
    if (lastTop3) updatePodiumWidgets(lastTop3);
    dot.classList.add('is-on');
    dot.setAttribute('aria-label', t('dotAria'));
  }

  function hideFloatingDot() {
    var dot = document.getElementById(DOT_ID);
    if (dot) dot.classList.remove('is-on');
  }

  function applyI18n() {
    var isAr = lang() === 'ar';
    var sheet = document.getElementById(SHEET_ID);
    if (sheet) sheet.setAttribute('dir', isAr ? 'rtl' : 'ltr');
    var trial = document.getElementById('wcVotePromoTrial');
    var badge = document.getElementById('wcVotePromoBadge');
    var title = document.getElementById('wcVotePromoTitle');
    var sub = document.getElementById('wcVotePromoSub');
    var ctaLbl = document.getElementById('wcVotePromoCtaLbl');
    var fixturesLbl = document.getElementById('wcVotePromoFixturesLbl');
    var resultsLbl = document.getElementById('wcVotePromoResultsLbl');
    var closeBtn = document.getElementById('wcVotePromoClose');
    var langBtn = document.getElementById('wcVotePromoLangToggle');
    var cta = document.getElementById('wcVotePromoCta');
    var fixtures = document.getElementById('wcVotePromoFixtures');
    var results = document.getElementById('wcVotePromoResults');
    var dot = document.getElementById(DOT_ID);
    if (trial) trial.textContent = t('trial');
    if (badge) badge.textContent = t('badge');
    if (title) title.textContent = t('title');
    if (sub) sub.textContent = t('sub');
    if (ctaLbl) ctaLbl.textContent = t('cta');
    if (fixturesLbl) fixturesLbl.textContent = t('btnFixtures');
    if (resultsLbl) resultsLbl.textContent = t('btnResults');
    if (closeBtn) closeBtn.setAttribute('aria-label', t('close'));
    if (langBtn) {
      langBtn.textContent = t('langBtn');
      langBtn.setAttribute('aria-label', t('langAria'));
    }
    var voteUrl = buildVoteUrl();
    if (cta) cta.href = voteUrl;
    if (fixtures) fixtures.href = buildMatchUrl(FIXTURES_BASE);
    if (results) results.href = buildMatchUrl(RESULTS_BASE);
    if (dot && dot.classList.contains('is-on')) dot.setAttribute('aria-label', t('dotAria'));
  }

  function openSheet() {
    injectStyles();
    var sheet = buildSheet();
    applyI18n();
    if (lastTop3) updatePodiumWidgets(lastTop3);
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    var sheet = document.getElementById(SHEET_ID);
    if (!sheet) return;
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (isDismissed()) showFloatingDot();
  }

  function init() {
    injectStyles();
    // Defer Firestore polling so it does not compete with first paint on mobile.
    window.setTimeout(startPodiumPolling, 12000);
    showFloatingDot();
    try {
      if ((new URLSearchParams(location.search).get('wcvote') || '') === '1') {
        window.open(buildVoteUrl(), '_blank', 'noopener,noreferrer');
      }
    } catch (e) {}
  }

  window.wcVotePromo = {
    open: openSheet,
    close: dismiss,
    setLang: applyI18n,
    toggleLang: togglePromoLang,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
