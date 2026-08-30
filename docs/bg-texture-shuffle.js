/**
 * Random page background: color + pattern from transparenttextures.com
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'rosterBgTextureV1';
  var PATTERN_BASE = 'https://www.transparenttextures.com/patterns/';
  var patterns = null;
  var patternsPromise = null;

  function isIOSDevice() {
    return (
      /iP(hone|ad|od)/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  var ICON =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="13.5" cy="6.5" r="2.5" fill="#7c3aed" stroke="none"/>' +
    '<circle cx="17.5" cy="10.5" r="2.5" fill="#a78bfa" stroke="none"/>' +
    '<circle cx="8.5" cy="7.5" r="2.5" fill="#c4b5fd" stroke="none"/>' +
    '<circle cx="6.5" cy="12.5" r="2.5" fill="#ddd6fe" stroke="none"/>' +
  '</svg>';

  var UP_ICON =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#5b21b6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 19V6"/><path d="M6 12l6-6 6 6"/>' +
  '</svg>';

  var REFRESH_ICON =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#1d4ed8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/>' +
  '</svg>';

  var I18N = {
    en: {
      btn: 'Shuffle background',
      title: 'New random color and texture',
      top: 'Back to top',
      refresh: 'Refresh site'
    },
    ar: {
      btn: 'خلفية عشوائية',
      title: 'لون ونقش عشوائي جديد',
      top: 'العودة إلى الأعلى',
      refresh: 'تحديث الموقع'
    },
  };

  function lang() {
    var l =
      localStorage.getItem('rosterLang') ||
      document.documentElement.getAttribute('lang') ||
      'en';
    return l === 'ar' ? 'ar' : 'en';
  }

  function t(key) {
    var pack = I18N[lang()] || I18N.en;
    return pack[key] || I18N.en[key] || key;
  }

  function injectStyles() {
    if (document.getElementById('bgTextureShuffleStyles')) return;
    var st = document.createElement('style');
    st.id = 'bgTextureShuffleStyles';
    st.textContent =
      '.bgTextureShuffleWrap{margin-top:8px;display:flex;justify-content:center;align-items:center;gap:6px;direction:ltr;' +
      'position:relative;z-index:100055;pointer-events:auto;isolation:isolate;}' +
      '.bgTextureShuffleWrap .roster-cta-btn{' +
      'min-height:0;padding:5px 12px;font-size:11px;font-weight:600;gap:6px;position:relative;z-index:1;pointer-events:auto;}' +
      '.bgTextureShuffleWrap .roster-cta-icon{width:16px;height:16px;}' +
      '.bgTextureShuffleWrap .roster-cta-icon svg{width:16px;height:16px;}' +
      '.roster-cta-btn--texture{background:#f5f3ff;border-color:#c4b5fd;color:#5b21b6;}' +
      '@media (hover:hover){.roster-cta-btn--texture:hover{background:#ede9fe;}}' +
      '.bgScrollTopBtn,.bgRefreshBtn{display:inline-flex;align-items:center;justify-content:center;' +
      'width:32px;height:32px;padding:0;border-radius:9px;cursor:pointer;flex:none;' +
      'border:1px solid #c4b5fd;background:#f5f3ff;line-height:0;position:relative;z-index:1;pointer-events:auto;' +
      '-webkit-tap-highlight-color:transparent;transition:background .15s ease,transform .15s ease;touch-action:manipulation;}' +
      '.bgScrollTopBtn:active,.bgRefreshBtn:active{transform:scale(.92);}' +
      '.bgScrollTopBtn svg,.bgRefreshBtn svg{width:16px;height:16px;display:block;pointer-events:none;}' +
      '.bgRefreshBtn{border-color:#93c5fd;background:#eff6ff;}' +
      '@media (hover:hover){.bgScrollTopBtn:hover{background:#ede9fe;}.bgRefreshBtn:hover{background:#dbeafe;}}' +
      '.deskLogHotspot{width:28px;height:28px;border:0;padding:0;margin:0;background:transparent;' +
      'flex:none;cursor:default;opacity:0;-webkit-tap-highlight-color:transparent;position:relative;z-index:1;}' +
      'html.roster-bg-textured,body.roster-bg-textured{background-attachment:' +
      (isIOSDevice() ? 'scroll' : 'fixed') +
      ';background-repeat:repeat;}' +
      'body.roster-bg-textured .wrap{background:transparent!important;}' +
      'body.roster-bg-textured .importBottom{background:transparent!important;}' +
      'body.roster-bg-textured .footer{background:rgba(255,255,255,.38)!important;' +
      (isIOSDevice()
        ? ''
        : 'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);') +
      'border-top-color:rgba(148,163,184,.28)!important;position:relative;z-index:1;}' +
      'body.roster-bg-textured [data-bg-texture-mount]{background:transparent!important;' +
      'backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border:0!important;}';
    document.head.appendChild(st);
  }

  function getSiteRootPath() {
    if (location.protocol === 'file:') return '';
    var path = location.pathname || '/';
    if (path.indexOf('/roster-site/') !== -1) return '/roster-site';
    if (location.hostname && location.hostname.endsWith('github.io')) {
      var segs = path.split('/').filter(Boolean);
      if (segs.length >= 2 && segs[1] === 'docs') return '/' + segs[0] + '/docs';
      return segs.length ? '/' + segs[0] : '';
    }
    return '';
  }

  function loadPatterns() {
    if (patterns) return Promise.resolve(patterns);
    if (patternsPromise) return patternsPromise;
    var root = getSiteRootPath();
    var url = (root || '') + '/bg-texture-patterns.json?v=20260524a';
    patternsPromise = fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('patterns fetch');
        return r.json();
      })
      .then(function (list) {
        patterns = Array.isArray(list) ? list : [];
        return patterns;
      })
      .catch(function () {
        patterns = [
          'carbon-fibre',
          'cubes',
          'diagmonds-light',
          'groovepaper',
          'greyzz',
          'hexellence',
          'lined-paper',
          'subtle-grey',
          'white-wall',
        ];
        return patterns;
      });
    return patternsPromise;
  }

  function randomColor() {
    var h = Math.floor(Math.random() * 360);
    var s = 28 + Math.floor(Math.random() * 28);
    var l = 74 + Math.floor(Math.random() * 16);
    return 'hsl(' + h + ',' + s + '%,' + l + '%)';
  }

  function pickPattern(list) {
    if (!list.length) return '';
    return list[Math.floor(Math.random() * list.length)];
  }

  function patternUrl(slug) {
    return PATTERN_BASE + slug + '.png';
  }

  function applyBg(color, slug) {
    var body = document.body;
    var html = document.documentElement;
    if (!body) return;
    var bgImage = slug ? 'url("' + patternUrl(slug) + '")' : 'none';
    html.classList.add('roster-bg-textured');
    body.classList.add('roster-bg-textured');
    // Use !important so early boot styles (e.g. with-me) cannot block live updates.
    html.style.setProperty('background-color', color, 'important');
    body.style.setProperty('background-color', color, 'important');
    html.style.setProperty('background-image', bgImage, 'important');
    body.style.setProperty('background-image', bgImage, 'important');
    html.style.setProperty('background-repeat', 'repeat', 'important');
    body.style.setProperty('background-repeat', 'repeat', 'important');
    var attachment = isIOSDevice() ? 'scroll' : 'fixed';
    html.style.setProperty('background-attachment', attachment, 'important');
    body.style.setProperty('background-attachment', attachment, 'important');
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ color: color, pattern: slug || '' })
      );
    } catch (e) {}
    try {
      document.dispatchEvent(
        new CustomEvent('rosterBgTextureChange', {
          detail: { color: color, pattern: slug || '' },
        })
      );
    } catch (e2) {}
  }

  function shuffle() {
    return loadPatterns().then(function (list) {
      var slug = pickPattern(list);
      applyBg(randomColor(), slug);
    });
  }

  function restore() {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return;
    }
    if (!raw) return;
    try {
      var data = JSON.parse(raw);
      if (data && data.color) applyBg(data.color, data.pattern || '');
    } catch (e2) {}
  }

  function injectButton() {
    if (document.getElementById('bgTextureShuffleBtn')) return;
    var footer =
      document.querySelector('[data-bg-texture-mount]') ||
      document.querySelector('.footer');
    if (!footer) return;

    var wrap = document.createElement('div');
    wrap.className = 'bgTextureShuffleWrap';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'bgTextureShuffleBtn';
    btn.className = 'roster-cta-btn roster-cta-btn--texture';
    btn.title = t('title');
    btn.setAttribute('aria-label', t('title'));
    btn.innerHTML =
      '<span class="roster-cta-icon">' +
      ICON +
      '</span><span class="roster-cta-label"></span>';
    var labelEl = btn.querySelector('.roster-cta-label');
    if (labelEl) labelEl.textContent = t('btn');

    btn.addEventListener('click', function (e) {
      try {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
      } catch (err) {}
      if (btn.dataset.busy === '1') return;
      btn.dataset.busy = '1';
      btn.disabled = true;
      var done = false;
      function unlock() {
        if (done) return;
        done = true;
        btn.dataset.busy = '0';
        btn.disabled = false;
      }
      var failSafe = setTimeout(unlock, 6000);
      Promise.resolve()
        .then(function () {
          return shuffle();
        })
        .then(function () {
          clearTimeout(failSafe);
          unlock();
        })
        .catch(function () {
          clearTimeout(failSafe);
          unlock();
        });
    });

    var topBtn = document.createElement('button');
    topBtn.type = 'button';
    topBtn.id = 'bgScrollTopBtn';
    topBtn.className = 'bgScrollTopBtn';
    topBtn.title = t('top');
    topBtn.setAttribute('aria-label', t('top'));
    topBtn.innerHTML = UP_ICON;
    topBtn.addEventListener('click', function (e) {
      try {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
      } catch (err) {}
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      } catch (err2) {
        window.scrollTo(0, 0);
      }
      try {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch (err3) {}
    });

    var refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.id = 'bgRefreshBtn';
    refreshBtn.className = 'bgRefreshBtn';
    refreshBtn.title = t('refresh');
    refreshBtn.setAttribute('aria-label', t('refresh'));
    refreshBtn.innerHTML = REFRESH_ICON;
    refreshBtn.addEventListener('click', function (e) {
      try {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
      } catch (err) {}
      try {
        location.reload();
      } catch (err2) {
        location.href = location.href;
      }
    });

    var deskHot = document.createElement('button');
    deskHot.type = 'button';
    deskHot.id = 'deskLogHotspot';
    deskHot.className = 'deskLogHotspot';
    deskHot.setAttribute('aria-hidden', 'true');
    deskHot.tabIndex = -1;
    var deskTaps = 0;
    var deskTimer = null;
    deskHot.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      deskTaps += 1;
      if (deskTimer) clearTimeout(deskTimer);
      deskTimer = setTimeout(function () {
        deskTaps = 0;
      }, 1400);
      if (deskTaps >= 5) {
        deskTaps = 0;
        if (deskTimer) clearTimeout(deskTimer);
        var root = getSiteRootPath();
        var base = root || '';
        if (location.protocol === 'file:') base = '..';
        location.href = base.replace(/\/$/, '') + '/desk-log/';
      }
    });

    // Physical LTR order: top · background · refresh · (hidden desk hotspot to the right)
    wrap.appendChild(topBtn);
    wrap.appendChild(btn);
    wrap.appendChild(refreshBtn);
    wrap.appendChild(deskHot);
    footer.appendChild(wrap);
    // Keep visitor stats row above these buttons
    try {
      if (window.rosterSiteVisits && typeof window.rosterSiteVisits.refresh === 'function') {
        window.rosterSiteVisits.refresh();
      }
      if (window.rosterForceHomeUI) window.rosterForceHomeUI();
      var host = document.getElementById('siteVisitsHost');
      if (host && host.parentNode === footer && host.nextSibling !== wrap) {
        footer.insertBefore(host, wrap);
      }
    } catch (ePlace) {}

    document.addEventListener('rosterLangChange', function () {
      if (labelEl) labelEl.textContent = t('btn');
      btn.title = t('title');
      btn.setAttribute('aria-label', t('title'));
      topBtn.title = t('top');
      topBtn.setAttribute('aria-label', t('top'));
      refreshBtn.title = t('refresh');
      refreshBtn.setAttribute('aria-label', t('refresh'));
    });
  }

  function init() {
    injectStyles();
    injectButton();
    restore();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
