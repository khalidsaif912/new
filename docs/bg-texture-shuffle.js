/**
 * Random page background: color + pattern from transparenttextures.com
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'rosterBgTextureV1';
  var PATTERN_BASE = 'https://www.transparenttextures.com/patterns/';
  var patterns = null;
  var patternsPromise = null;

  var ICON =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="13.5" cy="6.5" r="2.5" fill="#7c3aed" stroke="none"/>' +
    '<circle cx="17.5" cy="10.5" r="2.5" fill="#a78bfa" stroke="none"/>' +
    '<circle cx="8.5" cy="7.5" r="2.5" fill="#c4b5fd" stroke="none"/>' +
    '<circle cx="6.5" cy="12.5" r="2.5" fill="#ddd6fe" stroke="none"/>' +
  '</svg>';

  var I18N = {
    en: { btn: 'Shuffle background', title: 'New random color and texture' },
    ar: { btn: 'خلفية عشوائية', title: 'لون ونقش عشوائي جديد' },
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
      '.bgTextureShuffleWrap{margin-top:8px;display:flex;justify-content:center;}' +
      '.bgTextureShuffleWrap .roster-cta-btn{' +
      'min-height:0;padding:5px 12px;font-size:11px;font-weight:600;gap:6px;}' +
      '.bgTextureShuffleWrap .roster-cta-icon{width:16px;height:16px;}' +
      '.bgTextureShuffleWrap .roster-cta-icon svg{width:16px;height:16px;}' +
      '.roster-cta-btn--texture{background:#f5f3ff;border-color:#c4b5fd;color:#5b21b6;}' +
      '@media (hover:hover){.roster-cta-btn--texture:hover{background:#ede9fe;}}' +
      'html.roster-bg-textured,body.roster-bg-textured{background-attachment:fixed;background-repeat:repeat;}' +
      'body.roster-bg-textured .wrap{background:transparent!important;}' +
      'body.roster-bg-textured .importBottom{background:transparent!important;}' +
      'body.roster-bg-textured .footer{background:rgba(255,255,255,.38)!important;' +
      'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
      'border-top-color:rgba(148,163,184,.28)!important;}';
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
    var bgImage = slug ? 'url("' + patternUrl(slug) + '")' : '';
    html.classList.add('roster-bg-textured');
    body.classList.add('roster-bg-textured');
    html.style.backgroundColor = color;
    body.style.backgroundColor = color;
    html.style.backgroundImage = bgImage;
    body.style.backgroundImage = bgImage;
    html.style.backgroundRepeat = 'repeat';
    body.style.backgroundRepeat = 'repeat';
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ color: color, pattern: slug || '' })
      );
    } catch (e) {}
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
    var footer = document.querySelector('.footer');
    if (!footer || document.getElementById('bgTextureShuffleBtn')) return;

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

    btn.addEventListener('click', function () {
      btn.disabled = true;
      shuffle().finally(function () {
        btn.disabled = false;
      });
    });

    wrap.appendChild(btn);
    footer.appendChild(wrap);

    document.addEventListener('rosterLangChange', function () {
      if (labelEl) labelEl.textContent = t('btn');
      btn.title = t('title');
      btn.setAttribute('aria-label', t('title'));
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
