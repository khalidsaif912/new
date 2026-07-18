(function () {
  const BANNER_KEY = 'roster_banner_choice';
  const ACTIVE_CLASS = 'has-custom-banner';
  const EARLY_CLASS = 'roster-banner-early';
  const TEXT_HALO =
    '0 1px 2px rgba(0,0,0,.42),0 2px 5px rgba(0,0,0,.22)';
  const DATE_TAG_SHADOW =
    '0 1px 2px rgba(0,0,0,.72),0 0 5px rgba(0,0,0,.38),0 0 1px rgba(255,255,255,.5)';
  const DATE_TAG_ICON_FILTER =
    'drop-shadow(0 1px 1px rgba(0,0,0,.7)) drop-shadow(0 0 2px rgba(255,255,255,.45))';
  const BANNER_NAME_RE = /^banner\d+\.jpg$/i;

  function isIOSDevice() {
    return (
      /iP(hone|ad|od)/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  function getSiteRootPath() {
    const path = location.pathname || '/';
    if (path.includes('/roster-site/')) return '/roster-site';
    if (location.hostname && location.hostname.endsWith('github.io')) {
      const segs = path.split('/').filter(Boolean);
      if (segs.length >= 2 && segs[1] === 'docs') return '/' + segs[0] + '/docs';
      return segs.length ? '/' + segs[0] : '';
    }
    return '';
  }
  const BANNERS_PATH = (location.origin || '') + getSiteRootPath() + '/assets/banners/';

  const availableBanners = [
    'banner2.jpg',
    'banner6.jpg',
    'banner7.jpg',
    'banner8.jpg',
    'banner9.jpg',
    'banner11.jpg',
    'banner12.jpg',
    'banner14.jpg',
    'banner15.jpg',
    'banner16.jpg',
    'banner17.jpg',
    'banner19.jpg',
    'banner28.jpg',
    'banner29.jpg',
    'banner30.jpg',
    'banner31.jpg'
  ];

  /** Per-banner crop/scrim tuning (logo-left layouts, etc.). */
  const BANNER_LAYOUT = {
    'banner28.jpg': {
      position: '50% 48%',
      positionMobile: '68% center',
      scrim:
        'linear-gradient(105deg,rgba(8,16,40,.1) 0%,rgba(8,16,40,.35) 42%,rgba(8,16,40,.52) 100%)',
    },
    'banner30.jpg': {
      position: '50% 45%',
      positionMobile: '50% 42%',
      scrim:
        'linear-gradient(to right,rgba(8,16,40,.42) 0%,rgba(8,16,40,.18) 48%,rgba(8,16,40,.28) 100%)',
    },
    'banner31.jpg': {
      position: '50% 48%',
      positionMobile: '50% 45%',
      scrim:
        'linear-gradient(to right,rgba(20,8,12,.45) 0%,rgba(20,8,12,.2) 50%,rgba(20,8,12,.32) 100%)',
    },
  };

  function getBannerPosition(name) {
    const layout = BANNER_LAYOUT[name];
    if (!layout) return '62% center';
    return layout.position || '62% center';
  }

  function getBannerScrim(name) {
    const layout = BANNER_LAYOUT[name];
    return layout && layout.scrim ? layout.scrim : '';
  }

  function bannerUrl(name) {
    return BANNERS_PATH + name;
  }

  function warmBannerCache(url) {
    if (!url) return;
    try {
      if ('caches' in window) {
        caches.open('roster-banners-v1').then(function (cache) {
          cache.match(url).then(function (hit) {
            if (hit) return;
            fetch(url).then(function (res) {
              if (res.ok) cache.put(url, res.clone());
            });
          });
        });
      }
      if (
        !isIOSDevice() &&
        navigator.serviceWorker &&
        navigator.serviceWorker.controller
      ) {
        navigator.serviceWorker.controller.postMessage({ type: 'cache-banner', url: url });
      }
    } catch (_) {}
  }

  function injectReadabilityStyles() {
    const styleId = 'banner-changer-readability-css';
    const prev = document.getElementById(styleId);
    if (prev) prev.remove();
    const bannerName = getSavedBanner() || '';
    const bannerPos = getBannerPosition(bannerName);
    const bannerScrim = getBannerScrim(bannerName);
    const style = document.createElement('style');
    style.id = styleId;
    const rules = [
      '.header.' + ACTIVE_CLASS + ',.topbar.' + ACTIVE_CLASS + '{',
      'background-size:cover!important;',
      'background-repeat:no-repeat!important;',
      'background-position:' + bannerPos + '!important;',
      '}',
      '.header.' + ACTIVE_CLASS + '::before,.header.' + ACTIVE_CLASS + '::after,',
      '.topbar.' + ACTIVE_CLASS + '::before,.topbar.' + ACTIVE_CLASS + '::after{opacity:0!important;}',
      '.' + ACTIVE_CLASS + ' .bannerTitle,',
      '.' + ACTIVE_CLASS + ' .bannerTitleEyebrow,',
      '.' + ACTIVE_CLASS + ' .bannerTitleMain,',
      '.' + ACTIVE_CLASS + ' h1,',
      '.' + ACTIVE_CLASS + ' .page-title,',
      '.' + ACTIVE_CLASS + ' .page-title-eyebrow,',
      '.' + ACTIVE_CLASS + ' .page-title-main{',
      'color:#fff!important;',
      'text-shadow:' + TEXT_HALO + ';',
      '-webkit-text-stroke:0.2px rgba(0,0,0,.22);',
      'paint-order:stroke fill;',
      '}',
      '.' + ACTIVE_CLASS + ' .langToggle,',
      '.' + ACTIVE_CLASS + ' #langToggle{',
      'position:absolute!important;top:12px!important;right:12px!important;left:auto!important;',
      'width:auto!important;height:auto!important;min-width:0!important;min-height:0!important;',
      'padding:4px!important;font-size:0!important;line-height:1!important;z-index:30!important;',
      'color:#fff!important;background:transparent!important;border:none!important;',
      'border-radius:0!important;box-shadow:none!important;',
      'backdrop-filter:none!important;-webkit-backdrop-filter:none!important;',
      'display:inline-flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;',
      'gap:2px!important;',
      '}',
      '.' + ACTIVE_CLASS + ' .langToggle-icon{display:flex!important;line-height:0!important;}',
      '.' + ACTIVE_CLASS + ' .langToggle-icon svg{width:18px!important;height:18px!important;stroke:#fff!important;',
      'filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))!important;}',
      '.' + ACTIVE_CLASS + ' .langToggle-label{display:block!important;font-size:10px!important;font-weight:800!important;',
      'color:#fff!important;text-shadow:' + TEXT_HALO + ';letter-spacing:.02em;}',
      'body.ar .' + ACTIVE_CLASS + ' .langToggle,',
      'body.ar .' + ACTIVE_CLASS + ' #langToggle{right:12px!important;left:auto!important;}',
      '#banner-changer-btn{',
      'position:absolute!important;top:12px!important;left:12px!important;right:auto!important;z-index:30!important;',
      'min-width:0!important;min-height:0!important;padding:4px!important;',
      'background:transparent!important;border:none!important;border-radius:0!important;',
      'box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;',
      'display:inline-flex!important;align-items:center!important;justify-content:center!important;',
      'cursor:pointer;color:#fff!important;',
      '}',
      '#banner-changer-btn .banner-changer-icon svg{display:block;width:20px!important;height:20px!important;stroke:#fff!important;',
      'filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))!important;}',
      'body.ar #banner-changer-btn{left:12px!important;right:auto!important;}',
      '.' + ACTIVE_CLASS + ' .dateTag{',
      'color:#fff!important;',
      isIOSDevice()
        ? 'background:rgba(15,23,42,.45)!important;'
        : 'background:rgba(15,23,42,.28)!important;',
      'border-color:rgba(255,255,255,.32)!important;',
      isIOSDevice()
        ? ''
        : 'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);',
      'text-shadow:' + DATE_TAG_SHADOW + '!important;',
      '}',
      '.' + ACTIVE_CLASS + ' .dateTag-label{',
      'text-shadow:' + DATE_TAG_SHADOW + '!important;',
      '}',
      '.' + ACTIVE_CLASS + ' .dateTag-icon svg{',
      'filter:' + DATE_TAG_ICON_FILTER + '!important;',
      '}',
      '@media (max-width:480px){',
      '.header.' + ACTIVE_CLASS + ',.topbar.' + ACTIVE_CLASS + '{',
      'padding:26px 18px 24px!important;',
      '}',
      '.' + ACTIVE_CLASS + ' .bannerTitleMain{',
      'font-size:28px!important;',
      '}',
      'body.ar .' + ACTIVE_CLASS + ' .bannerTitleMain{',
      'font-size:26px!important;',
      '}',
      '.' + ACTIVE_CLASS + ' .bannerTitleEyebrow{',
      'font-size:11px!important;',
      '}',
      'body.ar .' + ACTIVE_CLASS + ' .bannerTitleEyebrow{',
      'font-size:12px!important;',
      '}',
      '}',
      '.topbar.' + ACTIVE_CLASS + ' .page-title,',
      '.topbar.' + ACTIVE_CLASS + ' .page-title-eyebrow,',
      '.topbar.' + ACTIVE_CLASS + ' .page-title-main,',
      '.topbar.' + ACTIVE_CLASS + ' .bannerTitle,',
      '.topbar.' + ACTIVE_CLASS + ' .bannerTitleEyebrow,',
      '.topbar.' + ACTIVE_CLASS + ' .bannerTitleMain{',
      'text-shadow:' + TEXT_HALO + ';',
      '}',
    ];
    if (bannerScrim && bannerName) {
      rules.push(
        '.header.' + ACTIVE_CLASS + '[data-banner="' + bannerName + '"]::before,',
        '.topbar.' + ACTIVE_CLASS + '[data-banner="' + bannerName + '"]::before{',
        'content:""!important;position:absolute!important;inset:0!important;',
        'opacity:1!important;border-radius:inherit!important;pointer-events:none!important;',
        'background:' + bannerScrim + '!important;',
        '}'
      );
    }
    style.textContent = rules.join('');
    document.head.appendChild(style);
  }

  function setCustomBannerActive(active) {
    injectReadabilityStyles();
    getBannerTargets().forEach(function (el) {
      if (getComputedStyle(el).position === 'static') {
        el.style.position = 'relative';
      }
      el.classList.toggle(ACTIVE_CLASS, active);
      el.querySelectorAll('.banner-readability-scrim').forEach(function (node) {
        node.remove();
      });
    });
    document.documentElement.classList.toggle(EARLY_CLASS, active);
  }

  function getSavedBanner() {
    const name = localStorage.getItem(BANNER_KEY) || null;
    return name && BANNER_NAME_RE.test(name) ? name : null;
  }

  function saveBannerChoice(name) {
    localStorage.setItem(BANNER_KEY, name);
    warmBannerCache(bannerUrl(name));
  }

  function getBannerTargets() {
    return Array.from(document.querySelectorAll('.header, .topbar'));
  }

  function bannerLiveUrl(name) {
    return bannerUrl(name) + '?live=' + encodeURIComponent(name.replace(/\.jpg$/i, ''));
  }

  function forceBannerRepaint(targets) {
    if (isIOSDevice()) return;
    targets.forEach(function (el) {
      var img = el.style.getPropertyValue('background-image');
      el.style.setProperty('background-image', 'none', 'important');
      void el.offsetHeight;
      if (img) el.style.setProperty('background-image', img, 'important');
    });
  }

  function syncEarlyBannerStyle(name) {
    if (!name) return;
    const url = bannerLiveUrl(name);
    const pos = getBannerPosition(name);
    const prev = document.getElementById('banner-early-style');
    if (prev) prev.remove();
    const early = document.createElement('style');
    early.id = 'banner-early-style';
    early.textContent =
      'html.' +
      EARLY_CLASS +
      ' .header,html.' +
      EARLY_CLASS +
      ' .topbar{background-image:url("' +
      url.replace(/"/g, '') +
      '")!important;background-size:cover!important;background-position:' +
      pos +
      '!important;background-repeat:no-repeat!important}' +
      'html.' +
      EARLY_CLASS +
      ' .header::before,html.' +
      EARLY_CLASS +
      ' .topbar::before,html.' +
      EARLY_CLASS +
      ' .header::after,html.' +
      EARLY_CLASS +
      ' .topbar::after{opacity:0!important}';
    document.head.appendChild(early);
    document.documentElement.classList.add(EARLY_CLASS);
    var preload = document.querySelector('link[data-banner-preload="1"]');
    if (preload) preload.href = url;
  }

  function paintBannerOnTargets(targets, name) {
    const url = bannerLiveUrl(name);
    const pos = getBannerPosition(name);
    targets.forEach(function (el) {
      el.setAttribute('data-banner', name);
      el.style.setProperty('background-image', "url('" + url + "')", 'important');
      el.style.setProperty('background-size', 'cover', 'important');
      el.style.setProperty('background-position', pos, 'important');
      el.style.setProperty('background-repeat', 'no-repeat', 'important');
    });
  }

  function applyBanner(name) {
    const targets = getBannerTargets();
    if (!targets.length) return;
    const url = bannerUrl(name);
    syncEarlyBannerStyle(name);
    paintBannerOnTargets(targets, name);
    setCustomBannerActive(true);
    warmBannerCache(url);
    requestAnimationFrame(function () {
      forceBannerRepaint(targets);
    });
  }

  function clearBanner() {
    const targets = getBannerTargets();
    if (!targets.length) return;
    targets.forEach(function (el) {
      el.removeAttribute('data-banner');
      el.style.removeProperty('background-image');
      el.style.removeProperty('background-size');
      el.style.removeProperty('background-position');
      el.style.removeProperty('background-repeat');
    });
    setCustomBannerActive(false);
    const early = document.getElementById('banner-early-style');
    if (early) early.remove();
    document.documentElement.classList.remove(EARLY_CLASS);
    var preload = document.querySelector('link[data-banner-preload="1"]');
    if (preload) preload.remove();
  }

  function chooseBanner(name, overlay) {
    saveBannerChoice(name);
    applyBanner(name);
    if (overlay && overlay.parentNode) overlay.remove();
  }

  function createChangerBtn() {
    if (document.getElementById('banner-changer-btn')) return;
    const targetEl = document.querySelector('.header, .topbar');
    if (!targetEl) return;

    const btn = document.createElement('button');
    btn.id = 'banner-changer-btn';
    btn.type = 'button';
    btn.title = 'تغيير خلفية الهيدر';
    btn.setAttribute('aria-label', 'Change header background');
    btn.innerHTML =
      '<span class="banner-changer-icon" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="5" width="18" height="14" rx="2"/>' +
      '<circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none"/>' +
      '<path d="M21 16l-4.5-4.5a2 2 0 0 0-3 0L3 17"/>' +
      '</svg></span>';
    btn.style.cssText = [
      'position:absolute',
      'top:12px',
      'left:12px',
      'z-index:30',
      'background:transparent',
      'border:none',
      'border-radius:0',
      'color:#fff',
      'padding:4px',
      'cursor:pointer',
      'line-height:0',
      '-webkit-tap-highlight-color:transparent',
      'touch-action:manipulation',
      'min-width:auto',
      'min-height:auto',
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'box-shadow:none',
      'transition:transform .2s ease, opacity .2s ease'
    ].join(';');

    if (getComputedStyle(targetEl).position === 'static') {
      targetEl.style.position = 'relative';
    }

    targetEl.appendChild(btn);
    btn.onclick = function (e) {
      e.stopPropagation();
      showBannerPicker();
    };
  }

  function loadPickerThumb(img, src) {
    if (img.dataset.loaded === '1') return;
    img.dataset.loaded = '1';
    img.src = src;
  }

  function bannerNumberLabel(name) {
    const m = String(name || '').match(/banner(\d+)\.jpg/i);
    return m ? m[1] : '';
  }

  function showBannerPicker() {
    if (document.getElementById('banner-picker')) return;

    const overlay = document.createElement('div');
    overlay.id = 'banner-picker';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.65)',
      'z-index:10000',
      'display:flex',
      'align-items:flex-end',
      'justify-content:center',
      'font-family:system-ui,-apple-system,sans-serif'
    ].join(';');

    const sheet = document.createElement('div');
    sheet.style.cssText = [
      'background:#17181d',
      'border-top-left-radius:20px',
      'border-top-right-radius:20px',
      'padding:18px 16px 28px',
      'width:100%',
      'max-width:480px',
      'direction:rtl'
    ].join(';');

    const current = getSavedBanner();

    sheet.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
        '<span style="color:#f5ead8;font-size:15px;font-weight:700;">اختر خلفية الهيدر</span>' +
        '<button id="closePicker" style="background:rgba(255,255,255,0.06);border:none;color:#b8a57a;width:28px;height:28px;border-radius:8px;font-size:15px;cursor:pointer;">✕</button>' +
      '</div>' +
      '<div id="bannerGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;"></div>' +
      '<button id="resetBanner" style="margin-top:12px;width:100%;border:none;border-radius:12px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;color:#b8a57a;background:rgba(255,255,255,0.05);">إعادة الخلفية الافتراضية</button>';

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    const grid = document.getElementById('bannerGrid');
    const lazyImgs = [];

    availableBanners.forEach(function (name) {
      const num = bannerNumberLabel(name);
      const wrap = document.createElement('div');
      wrap.style.cssText =
        'position:relative;border-radius:10px;overflow:hidden;cursor:pointer;border:2px solid ' +
        (name === current ? '#e0bd63' : 'transparent') +
        ';transition:border .15s;';
      const img = document.createElement('img');
      img.alt = num ? ('بانر ' + num) : '';
      img.dataset.src = bannerUrl(name);
      img.style.cssText = 'width:100%;height:70px;object-fit:cover;display:block;background:#2a2b31;';
      img.onerror = function () {
        wrap.style.display = 'none';
      };
      const badge = document.createElement('span');
      badge.textContent = num || '—';
      badge.setAttribute('aria-hidden', 'true');
      badge.style.cssText = [
        'position:absolute',
        'top:6px',
        'inset-inline-start:6px',
        'z-index:2',
        'min-width:24px',
        'height:24px',
        'padding:0 7px',
        'border-radius:999px',
        'display:inline-flex',
        'align-items:center',
        'justify-content:center',
        'background:rgba(15,23,42,.82)',
        'border:1px solid rgba(255,255,255,.35)',
        'color:#fff',
        'font-size:12px',
        'font-weight:800',
        'line-height:1',
        'letter-spacing:.02em',
        'box-shadow:0 1px 4px rgba(0,0,0,.35)',
        'pointer-events:none'
      ].join(';');
      wrap.appendChild(img);
      wrap.appendChild(badge);
      grid.appendChild(wrap);
      lazyImgs.push(img);
      (function (bannerName) {
        var picked = false;
        function pick(e) {
          if (picked) return;
          picked = true;
          if (e && e.preventDefault) e.preventDefault();
          if (e && e.stopPropagation) e.stopPropagation();
          chooseBanner(bannerName, overlay);
        }
        wrap.setAttribute('role', 'button');
        wrap.setAttribute('tabindex', '0');
        wrap.setAttribute('aria-label', num ? ('بانر رقم ' + num) : 'بانر');
        wrap.style.touchAction = 'manipulation';
        wrap.style.webkitTapHighlightColor = 'transparent';
        wrap.addEventListener('click', pick);
        wrap.addEventListener('touchend', pick, { passive: false });
      })(name);
    });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            loadPickerThumb(el, el.dataset.src);
            io.unobserve(el);
          });
        },
        { root: sheet, rootMargin: '80px', threshold: 0.01 }
      );
      lazyImgs.forEach(function (img) {
        io.observe(img);
      });
    } else {
      lazyImgs.forEach(function (img) {
        loadPickerThumb(img, img.dataset.src);
      });
    }

    document.getElementById('resetBanner').onclick = function () {
      localStorage.removeItem(BANNER_KEY);
      clearBanner();
      overlay.remove();
    };

    document.getElementById('resetBanner').addEventListener('touchend', function (e) {
      e.preventDefault();
      localStorage.removeItem(BANNER_KEY);
      clearBanner();
      overlay.remove();
    }, { passive: false });

    document.getElementById('closePicker').onclick = function () {
      overlay.remove();
    };
    overlay.onclick = function (e) {
      if (e.target === overlay) overlay.remove();
    };
  }

  var CHROME_FADE_MS = 5000;
  var CHROME_DIM_OPACITY = '0.1';
  var chromeFadeTimer = null;

  function getHeaderChromeEls() {
    return Array.from(
      document.querySelectorAll(
        '#langToggle, .langToggle, #banner-changer-btn, #dateTag, .header .dateTag, #datePicker'
      )
    );
  }

  function injectChromeFadeStyles() {
    if (document.getElementById('header-chrome-fade-css')) return;
    var style = document.createElement('style');
    style.id = 'header-chrome-fade-css';
    style.textContent = [
      '#langToggle,#banner-changer-btn,#dateTag,.header .dateTag,#datePicker{',
      'transition:opacity .55s ease!important;',
      '}',
      'html.header-chrome-dim #langToggle,',
      'html.header-chrome-dim #banner-changer-btn,',
      'html.header-chrome-dim #dateTag,',
      'html.header-chrome-dim .header .dateTag,',
      'html.header-chrome-dim #datePicker{',
      'opacity:' + CHROME_DIM_OPACITY + '!important;',
      '}',
      'html.header-chrome-dim #langToggle:hover,',
      'html.header-chrome-dim #langToggle:focus-visible,',
      'html.header-chrome-dim #banner-changer-btn:hover,',
      'html.header-chrome-dim #banner-changer-btn:focus-visible,',
      'html.header-chrome-dim #dateTag:hover,',
      'html.header-chrome-dim .header .dateTag:hover{',
      'opacity:1!important;',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  function setHeaderChromeDim(dim) {
    document.documentElement.classList.toggle('header-chrome-dim', !!dim);
  }

  function scheduleHeaderChromeFade() {
    if (chromeFadeTimer) clearTimeout(chromeFadeTimer);
    setHeaderChromeDim(false);
    chromeFadeTimer = setTimeout(function () {
      setHeaderChromeDim(true);
    }, CHROME_FADE_MS);
  }

  function bindHeaderChromeFade() {
    injectChromeFadeStyles();
    scheduleHeaderChromeFade();
    getHeaderChromeEls().forEach(function (el) {
      if (el.dataset.chromeFadeBound === '1') return;
      el.dataset.chromeFadeBound = '1';
      function wake() {
        scheduleHeaderChromeFade();
      }
      el.addEventListener('pointerdown', wake);
      el.addEventListener('focusin', wake);
      el.addEventListener('mouseenter', wake);
    });
    // Banner button may be created slightly later — rebind once.
    setTimeout(function () {
      getHeaderChromeEls().forEach(function (el) {
        if (el.dataset.chromeFadeBound === '1') return;
        el.dataset.chromeFadeBound = '1';
        function wake() {
          scheduleHeaderChromeFade();
        }
        el.addEventListener('pointerdown', wake);
        el.addEventListener('focusin', wake);
        el.addEventListener('mouseenter', wake);
      });
    }, 400);
  }

  function init() {
    injectReadabilityStyles();
    const saved = getSavedBanner();
    if (saved) {
      applyBanner(saved);
    }
    createChangerBtn();
    bindHeaderChromeFade();
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var active = getSavedBanner();
        if (!active) return;
        var pos = getBannerPosition(active);
        getBannerTargets().forEach(function (el) {
          el.style.backgroundPosition = pos;
        });
        injectReadabilityStyles();
      }, 120);
    });
  }

  function waitForHeader() {
    if (document.querySelector('.header, .topbar')) {
      init();
      return;
    }
    const observer = new MutationObserver(function () {
      if (document.querySelector('.header, .topbar')) {
        observer.disconnect();
        init();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForHeader);
  } else {
    waitForHeader();
  }
})();

