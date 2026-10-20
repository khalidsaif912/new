/**
 * Animated ideas star — floating control on roster home/landing pages.
 * Sits above the alert button (same left column). Tap opens /ideas/.
 * Visibility: localStorage rosterFabIdeasVisible ('0' hides).
 */
(function () {
  'use strict';
  if (window.__rosterIdeasPromptBooted) return;
  window.__rosterIdeasPromptBooted = true;

  var CSS_ID = 'rosterIdeasStarCssV2';
  var FAB_ID = 'ideasFab';
  var VER = '20261020b';
  var PREF_KEY = 'rosterFabIdeasVisible';
  var ALERT_PREF_KEY = 'rosterFabAlertVisible';

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

  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID;
    /* Stack above #chg-dot on the left (alert ~48–56px + gap). */
    st.textContent =
      '#' +
      FAB_ID +
      '{position:fixed;left:16px;right:auto;bottom:calc(12px + 56px + 10px);width:48px;height:48px;display:flex;align-items:center;justify-content:center;padding:0;margin:0;border:1px solid rgba(15,23,42,.1);border-radius:16px;background:rgba(255,255,255,.92);box-shadow:0 8px 24px rgba(15,23,42,.14);z-index:100031;cursor:pointer;-webkit-tap-highlight-color:transparent;overflow:hidden;text-decoration:none;color:inherit}' +
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
      ':active{transform:scale(.96)}';
    (document.head || document.documentElement).appendChild(st);
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
      '<img alt="" width="30" height="30" decoding="async" src="' + starUrl() + '">';
    a.addEventListener('click', function (ev) {
      if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      try {
        ev.preventDefault();
        location.href = ideasHref();
      } catch (e) {}
    });
    (document.body || document.documentElement).appendChild(a);
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
    var label = isAr() ? 'اقتراحات وأفكار' : 'Ideas & suggestions';
    el.setAttribute('aria-label', label);
    el.title = label;
  });

  window.addEventListener('rosterFabPrefsChange', syncHideClasses);
  window.addEventListener('storage', function (e) {
    if (e.key === PREF_KEY || e.key === ALERT_PREF_KEY) syncHideClasses();
  });

  window.rosterIdeasPrompt = {
    open: function () {
      location.href = ideasHref();
    },
    close: function () {},
    syncPrefs: syncHideClasses
  };
})();
