(function () {
  const BANNER_KEY = 'roster_banner_choice';
  const ACTIVE_CLASS = 'has-custom-banner';
  const EARLY_CLASS = 'roster-banner-early';
  const TEXT_HALO =
    '0 0 2px rgba(0,0,0,.95),0 1px 3px rgba(0,0,0,.9),0 2px 10px rgba(0,0,0,.75),0 0 20px rgba(0,0,0,.45)';
  const BANNER_NAME_RE = /^banner\d+\.jpg$/i;

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
    'banner1.jpg',
    'banner2.jpg',
    'banner3.jpg',
    'banner4.jpg',
    'banner5.jpg',
    'banner6.jpg',
    'banner7.jpg',
    'banner8.jpg',
    'banner9.jpg',
    'banner10.jpg',
    'banner11.jpg',
    'banner12.jpg',
    'banner14.jpg',
    'banner15.jpg',
    'banner16.jpg',
    'banner17.jpg',
    'banner19.jpg',
    'banner22.jpg',
    'banner23.jpg',
    'banner24.jpg',
    'banner25.jpg',
    'banner26.jpg'
  ];

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
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'cache-banner', url: url });
      }
    } catch (_) {}
  }

  function injectReadabilityStyles() {
    const styleId = 'banner-changer-readability-css';
    const prev = document.getElementById(styleId);
    if (prev) prev.remove();
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = [
      '.header.' + ACTIVE_CLASS + '::before,.header.' + ACTIVE_CLASS + '::after{opacity:0!important;}',
      '.' + ACTIVE_CLASS + ' .bannerTitle,',
      '.' + ACTIVE_CLASS + ' .bannerTitleEyebrow,',
      '.' + ACTIVE_CLASS + ' .bannerTitleMain,',
      '.' + ACTIVE_CLASS + ' h1,',
      '.' + ACTIVE_CLASS + ' .page-title,',
      '.' + ACTIVE_CLASS + ' .page-title-eyebrow,',
      '.' + ACTIVE_CLASS + ' .page-title-main{',
      'color:#fff!important;',
      'text-shadow:' + TEXT_HALO + ';',
      '-webkit-text-stroke:0.35px rgba(0,0,0,.4);',
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
      'filter:drop-shadow(0 1px 2px rgba(0,0,0,.65))!important;}',
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
      'filter:drop-shadow(0 1px 2px rgba(0,0,0,.65))!important;}',
      'body.ar #banner-changer-btn{left:12px!important;right:auto!important;}',
      '.' + ACTIVE_CLASS + ' .dateTag{',
      'color:#fff!important;text-shadow:' + TEXT_HALO + ';',
      'background:rgba(255,255,255,.2)!important;',
      'border-color:rgba(255,255,255,.28)!important;',
      'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);',
      '}',
      '.topbar.' + ACTIVE_CLASS + ' .page-title,',
      '.topbar.' + ACTIVE_CLASS + ' .page-title-eyebrow,',
      '.topbar.' + ACTIVE_CLASS + ' .page-title-main,',
      '.topbar.' + ACTIVE_CLASS + ' .bannerTitle,',
      '.topbar.' + ACTIVE_CLASS + ' .bannerTitleEyebrow,',
      '.topbar.' + ACTIVE_CLASS + ' .bannerTitleMain{',
      'text-shadow:' + TEXT_HALO + ';',
      '}',
    ].join('');
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

  function applyBanner(name) {
    const targets = getBannerTargets();
    if (!targets.length) return;
    const url = bannerUrl(name);
    targets.forEach(function (el) {
      el.style.backgroundImage = "url('" + url + "')";
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
    });
    setCustomBannerActive(true);
    warmBannerCache(url);
  }

  function clearBanner() {
    const targets = getBannerTargets();
    if (!targets.length) return;
    targets.forEach(function (el) {
      el.style.backgroundImage = '';
      el.style.backgroundSize = '';
      el.style.backgroundPosition = '';
      el.style.backgroundRepeat = '';
    });
    setCustomBannerActive(false);
    const early = document.getElementById('banner-early-style');
    if (early) early.remove();
    document.documentElement.classList.remove(EARLY_CLASS);
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
      const wrap = document.createElement('div');
      wrap.style.cssText =
        'border-radius:10px;overflow:hidden;cursor:pointer;border:2px solid ' +
        (name === current ? '#e0bd63' : 'transparent') +
        ';transition:border .15s;';
      const img = document.createElement('img');
      img.alt = '';
      img.dataset.src = bannerUrl(name);
      img.style.cssText = 'width:100%;height:70px;object-fit:cover;display:block;background:#2a2b31;';
      img.onerror = function () {
        wrap.style.display = 'none';
      };
      wrap.appendChild(img);
      grid.appendChild(wrap);
      lazyImgs.push(img);
      wrap.onclick = function () {
        saveBannerChoice(name);
        applyBanner(name);
        overlay.remove();
      };
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

    document.getElementById('closePicker').onclick = function () {
      overlay.remove();
    };
    overlay.onclick = function (e) {
      if (e.target === overlay) overlay.remove();
    };
  }

  function init() {
    injectReadabilityStyles();
    const saved = getSavedBanner();
    if (saved) {
      applyBanner(saved);
    }
    createChangerBtn();
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

