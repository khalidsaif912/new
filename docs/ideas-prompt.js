/**
 * Animated ideas star — floating control on roster home/landing pages.
 * Sits above the alert button (same left column). Tap opens /ideas/.
 * Shows a small count badge when there are ideas newer than last visit.
 * Visibility: localStorage rosterFabIdeasVisible ('0' hides).
 */
(function () {
  'use strict';
  if (window.__rosterIdeasPromptBooted) return;
  window.__rosterIdeasPromptBooted = true;

  var CSS_ID = 'rosterIdeasStarCssV3';
  var FAB_ID = 'ideasFab';
  var BADGE_ID = 'ideasFabBadge';
  var VER = '20261020c';
  var PREF_KEY = 'rosterFabIdeasVisible';
  var ALERT_PREF_KEY = 'rosterFabAlertVisible';
  var SEEN_KEY = 'rosterIdeasSeenAt';
  var CACHE_KEY = 'rosterIdeasNewCountCacheV1';
  var MANTLE_URL = 'https://mantledb.sh/v2/roster-site-visits/ideas';
  var MANTLE_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  var CACHE_TTL_MS = 5 * 60 * 1000;

  function isRosterLanding() {
    var p = (location.pathname || '').toLowerCase();
    if (
      /\/(tools|roster-diff|ticker-board|my-emoji|alumni|calculator|quicklist|ideas|training|book-list|with-me|interview|read-and-sign)\//.test(
        p
      )
    ) {
      return false;
    }
    return (
      /\/date\//.test(p) ||
      /home\.html/.test(p) ||
      /\/now(\/|$)/.test(p) ||
      /\/docs\/?$/.test(p) ||
      /\/new\/?$/.test(p) ||
      /\/roster-site\/?$/.test(p) ||
      /\/import(\/|$)/.test(p) ||
      /\/my-schedules(\/|$)/.test(p) ||
      /(^|\/)index\.html$/.test(p)
    );
  }

  function isAr() {
    try {
      return (
        localStorage.getItem('rosterLang') === 'ar' ||
        (document.documentElement && document.documentElement.lang === 'ar') ||
        (document.body && document.body.classList.contains('ar'))
      );
    } catch (e) {
      return true;
    }
  }

  function prefOn(key) {
    try {
      return localStorage.getItem(key) !== '0';
    } catch (e) {
      return true;
    }
  }

  function syncHideClasses() {
    try {
      document.documentElement.classList.toggle('roster-hide-ideas-fab', !prefOn(PREF_KEY));
      document.documentElement.classList.toggle('roster-hide-alert-fab', !prefOn(ALERT_PREF_KEY));
    } catch (e) {}
  }

  function siteRoot() {
    try {
      if (typeof getSiteRootUrl === 'function') {
        var r = getSiteRootUrl();
        if (r) return String(r).replace(/\/+$/, '');
      }
    } catch (e) {}
    try {
      var path = String(location.pathname || '');
      if (/\/docs\//.test(path)) return path.replace(/\/docs\/.*$/, '/docs');
      if (/\/roster-site\//.test(path)) return path.replace(/\/roster-site\/.*$/, '/roster-site');
      if (/\/new\//.test(path)) return path.replace(/\/new\/.*$/, '/new');
    } catch (e2) {}
    return '';
  }

  function ideasHref() {
    var root = siteRoot();
    if (root) return root + '/ideas/';
    return 'ideas/';
  }

  function starUrl() {
    var root = siteRoot();
    if (root) return root + '/assets/icons/ideas-star.webp?v=' + VER;
    try {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src || '';
        if (/ideas-prompt\.js/i.test(src)) {
          return src.replace(/ideas-prompt\.js(?:\?.*)?$/i, 'assets/icons/ideas-star.webp?v=' + VER);
        }
      }
    } catch (e) {}
    return 'assets/icons/ideas-star.webp?v=' + VER;
  }

  function readSeenAt() {
    try {
      var n = Number(localStorage.getItem(SEEN_KEY) || 0);
      return n > 0 ? n : 0;
    } catch (e) {
      return 0;
    }
  }

  function writeSeenAt(ts) {
    try {
      localStorage.setItem(SEEN_KEY, String(ts || Date.now()));
    } catch (e) {}
  }

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var j = JSON.parse(raw);
      if (!j || typeof j !== 'object') return null;
      if (Date.now() - Number(j.fetchedAt || 0) > CACHE_TTL_MS) return null;
      return j;
    } catch (e) {
      return null;
    }
  }

  function writeCache(count, seenAt) {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          count: Math.max(0, Number(count) || 0),
          seenAt: Number(seenAt) || 0,
          fetchedAt: Date.now()
        })
      );
    } catch (e) {}
  }

  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.textContent =
      '#' +
      FAB_ID +
      '{position:fixed;left:16px;right:auto;bottom:calc(12px + 56px + 10px);width:48px;height:48px;display:flex;align-items:center;justify-content:center;padding:0;margin:0;border:1px solid rgba(15,23,42,.1);border-radius:16px;background:rgba(255,255,255,.92);box-shadow:0 8px 24px rgba(15,23,42,.14);z-index:100031;cursor:pointer;-webkit-tap-highlight-color:transparent;overflow:visible;text-decoration:none;color:inherit}' +
      'html.has-news-ticker #' +
      FAB_ID +
      ',html.has-float-dock #' +
      FAB_ID +
      '{bottom:calc(48px + env(safe-area-inset-bottom,0px) + 56px + 10px)!important;left:16px!important;right:auto!important}' +
      'html.roster-hide-alert-fab #' +
      FAB_ID +
      '{bottom:12px!important}' +
      'html.roster-hide-alert-fab.has-news-ticker #' +
      FAB_ID +
      ',html.roster-hide-alert-fab.has-float-dock #' +
      FAB_ID +
      '{bottom:calc(48px + env(safe-area-inset-bottom,0px))!important}' +
      'html.roster-hide-ideas-fab #' +
      FAB_ID +
      '{display:none!important}' +
      '#' +
      FAB_ID +
      ' img{width:30px;height:30px;display:block;object-fit:contain;pointer-events:none}' +
      '#' +
      FAB_ID +
      ':active{transform:scale(.96)}' +
      '#' +
      BADGE_ID +
      '{position:absolute;top:-5px;inset-inline-end:-5px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;font-weight:800;line-height:18px;text-align:center;letter-spacing:0;box-shadow:0 2px 6px rgba(220,38,38,.35);border:2px solid #fff;pointer-events:none;font-family:system-ui,-apple-system,Segoe UI,sans-serif;box-sizing:border-box;display:none}' +
      '#' +
      BADGE_ID +
      '.is-on{display:inline-block}' +
      '#' +
      FAB_ID +
      '.has-new{box-shadow:0 8px 24px rgba(15,23,42,.14),0 0 0 2px rgba(220,38,38,.18)}';
    (document.head || document.documentElement).appendChild(st);
  }

  function paintBadge(count) {
    var fab = document.getElementById(FAB_ID);
    if (!fab) return;
    var badge = document.getElementById(BADGE_ID);
    if (!badge) {
      badge = document.createElement('span');
      badge.id = BADGE_ID;
      badge.setAttribute('aria-hidden', 'true');
      fab.appendChild(badge);
    }
    var n = Math.max(0, Math.floor(Number(count) || 0));
    if (n <= 0) {
      badge.textContent = '';
      badge.classList.remove('is-on');
      fab.classList.remove('has-new');
      return;
    }
    badge.textContent = n > 9 ? '9+' : String(n);
    badge.classList.add('is-on');
    fab.classList.add('has-new');
    var label = isAr()
      ? 'اقتراحات وأفكار — ' + n + ' جديدة'
      : 'Ideas & suggestions — ' + n + ' new';
    fab.setAttribute('aria-label', label);
    fab.title = label;
  }

  function countNewIdeas(ideas, seenAt) {
    if (!seenAt) return 0;
    var n = 0;
    (ideas || []).forEach(function (idea) {
      var at = Number(idea && idea.at) || 0;
      if (at > seenAt) n += 1;
    });
    return n;
  }

  function fetchIdeasDoc() {
    var url = MANTLE_URL + '?ts=' + Date.now();
    var opts = {
      method: 'GET',
      headers: { Accept: 'application/json', 'X-Mantle-Key': MANTLE_KEY },
      cache: 'no-store'
    };
    if (window.RosterMantle && typeof window.RosterMantle.fetch === 'function') {
      return window.RosterMantle.fetch(url, opts).then(function (res) {
        if (res.status === 404) return { ideas: [] };
        if (!res.ok) throw new Error('ideas ' + res.status);
        return res.json();
      });
    }
    try {
      var until = Number(localStorage.getItem('rosterMantleBackoffUntil') || 0);
      if (until && Date.now() < until) {
        return Promise.reject(new Error('backoff'));
      }
    } catch (e) {}
    return fetch(url, opts).then(function (res) {
      if (res.status === 429) {
        try {
          localStorage.setItem('rosterMantleBackoffUntil', String(Date.now() + 600000));
        } catch (e2) {}
        throw new Error('rate');
      }
      if (res.status === 404) return { ideas: [] };
      if (!res.ok) throw new Error('ideas ' + res.status);
      return res.json();
    });
  }

  function refreshNewCount() {
    var seenAt = readSeenAt();
    var cached = readCache();
    if (cached && cached.seenAt === seenAt) {
      paintBadge(cached.count);
      return Promise.resolve(cached.count);
    }

    return fetchIdeasDoc()
      .then(function (doc) {
        var ideas = Array.isArray(doc && doc.ideas) ? doc.ideas : [];
        if (!seenAt) {
          // First visit: baseline only — don't badge existing archive.
          var maxAt = 0;
          ideas.forEach(function (idea) {
            var at = Number(idea && idea.at) || 0;
            if (at > maxAt) maxAt = at;
          });
          writeSeenAt(maxAt || Date.now());
          writeCache(0, readSeenAt());
          paintBadge(0);
          return 0;
        }
        var count = countNewIdeas(ideas, seenAt);
        writeCache(count, seenAt);
        paintBadge(count);
        return count;
      })
      .catch(function () {
        if (cached) paintBadge(cached.count);
        else paintBadge(0);
        return 0;
      });
  }

  function mount() {
    if (!isRosterLanding()) return;
    syncHideClasses();
    injectCss();
    var existing = document.getElementById(FAB_ID);
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var a = document.createElement('a');
    a.id = FAB_ID;
    a.href = ideasHref();
    a.setAttribute('role', 'link');
    a.setAttribute('aria-label', isAr() ? 'اقتراحات وأفكار' : 'Ideas & suggestions');
    a.title = isAr() ? 'اقتراحات وأفكار' : 'Ideas & suggestions';
    a.innerHTML =
      '<img alt="" width="30" height="30" decoding="async" src="' +
      starUrl() +
      '">' +
      '<span id="' +
      BADGE_ID +
      '" aria-hidden="true"></span>';
    a.addEventListener('click', function (ev) {
      if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      try {
        // Visiting clears the badge baseline; ideas page also marks seen.
        writeSeenAt(Date.now());
        writeCache(0, readSeenAt());
        paintBadge(0);
        ev.preventDefault();
        location.href = ideasHref();
      } catch (e) {}
    });
    (document.body || document.documentElement).appendChild(a);

    var cached = readCache();
    if (cached) paintBadge(cached.count);
    refreshNewCount();
  }

  function boot() {
    mount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('rosterLangChange', function () {
    var el = document.getElementById(FAB_ID);
    if (!el) return;
    var badge = document.getElementById(BADGE_ID);
    var n = badge && badge.classList.contains('is-on') ? badge.textContent : '';
    if (n) {
      var label = isAr()
        ? 'اقتراحات وأفكار — ' + n + ' جديدة'
        : 'Ideas & suggestions — ' + n + ' new';
      el.setAttribute('aria-label', label);
      el.title = label;
    } else {
      var plain = isAr() ? 'اقتراحات وأفكار' : 'Ideas & suggestions';
      el.setAttribute('aria-label', plain);
      el.title = plain;
    }
  });

  window.addEventListener('rosterFabPrefsChange', syncHideClasses);
  window.addEventListener('storage', function (e) {
    if (e.key === PREF_KEY || e.key === ALERT_PREF_KEY) syncHideClasses();
    if (e.key === SEEN_KEY) refreshNewCount();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') refreshNewCount();
  });

  window.rosterIdeasPrompt = {
    open: function () {
      location.href = ideasHref();
    },
    close: function () {},
    syncPrefs: syncHideClasses,
    refreshBadge: refreshNewCount,
    markSeen: function () {
      writeSeenAt(Date.now());
      writeCache(0, readSeenAt());
      paintBadge(0);
    }
  };
})();
