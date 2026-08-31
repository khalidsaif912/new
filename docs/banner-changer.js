(function () {
  // My Schedule pages use their own chrome — never apply homepage photo banners there.
  if ((location.pathname || '').indexOf('/my-schedules') !== -1) return;

  const BANNER_KEY = 'roster_banner_choice';
  const ACTIVE_CLASS = 'has-custom-banner';
  const EARLY_CLASS = 'roster-banner-early';
  const TEXT_HALO =
    '0 1px 2px rgba(0,0,0,.42),0 2px 5px rgba(0,0,0,.22)';
  const DATE_TAG_SHADOW =
    '0 1px 2px rgba(0,0,0,.72),0 0 5px rgba(0,0,0,.38),0 0 1px rgba(255,255,255,.5)';
  const DATE_TAG_ICON_FILTER =
    'drop-shadow(0 1px 1px rgba(0,0,0,.7)) drop-shadow(0 0 2px rgba(255,255,255,.45))';
  const BANNER_NAME_RE = /^(banner\d+\.jpg|custom:[a-z0-9]{8,32})$/i;

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
  const BANNER_STORE_VER = '20260831g';
  const MANTLE_BANNERS_URL = 'https://mantledb.sh/v2/roster-site-visits/banners';
  const MANTLE_BANNERS_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  const CATALOG_BUMP_KEY = 'rosterBannerCatalogAt';

  let availableBanners = [];
  let BANNER_LAYOUT = Object.create(null);
  let catalogReady = false;

  function getStore() {
    return typeof window !== 'undefined' ? window.RosterBannerStore : null;
  }

  function loadBannerStoreScript() {
    return new Promise(function (resolve) {
      if (getStore()) return resolve(true);
      var root = getSiteRootPath();
      var src = (location.origin || '') + root + '/banner-store.js?v=' + BANNER_STORE_VER;
      if (document.querySelector('script[data-banner-store="1"]')) {
        var tries = 0;
        var timer = setInterval(function () {
          tries += 1;
          if (getStore() || tries > 50) {
            clearInterval(timer);
            resolve(!!getStore());
          }
        }, 40);
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.setAttribute('data-banner-store', '1');
      s.onload = function () { resolve(!!getStore()); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
  }

  async function fetchOverlayDirect() {
    try {
      var res = await fetch(MANTLE_BANNERS_URL + '?ts=' + Date.now(), {
        headers: { Accept: 'application/json', 'X-Mantle-Key': MANTLE_BANNERS_KEY },
        cache: 'no-store',
      });
      if (res.status === 404) return { removed: [], custom: [] };
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function applyOverlayToManifest(manifest, overlayRaw) {
    var manifestBanners = Array.isArray(manifest && manifest.banners) ? manifest.banners.slice() : [];
    var layouts = manifest && manifest.layouts && typeof manifest.layouts === 'object' ? manifest.layouts : {};
    var removed = overlayRaw && Array.isArray(overlayRaw.removed) ? overlayRaw.removed : [];
    var custom = overlayRaw && Array.isArray(overlayRaw.custom) ? overlayRaw.custom : [];
    var banners = manifestBanners.filter(function (name) {
      return removed.indexOf(name) === -1;
    });
    custom.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var id = String(item.id || '').trim();
      if (!id) return;
      var key = item.key || ('custom:' + id);
      if (banners.indexOf(key) === -1) banners.push(key);
      if (item.layout) layouts[key] = item.layout;
    });
    return { banners: banners, layouts: layouts };
  }

  function syncCatalogFromStore() {
    const store = getStore();
    if (!store) return false;
    availableBanners = store.getBanners();
    BANNER_LAYOUT = store.getLayouts();
    catalogReady = true;
    return true;
  }

  function purgeSavedBannerIfRemoved() {
    var saved = null;
    try {
      saved = localStorage.getItem(BANNER_KEY);
    } catch (e) {}
    if (saved && !bannerIsListed(saved)) {
      try {
        localStorage.removeItem(BANNER_KEY);
      } catch (e) {}
      clearBanner();
    }
  }

  async function ensureCatalog(force) {
    if (getStore() && force) getStore().invalidateCache();
    await loadBannerStoreScript();
    const store = getStore();
    if (store) {
      try {
        await store.loadCatalog(!!force);
        syncCatalogFromStore();
        purgeSavedBannerIfRemoved();
        return true;
      } catch (e) {}
    }
    try {
      const res = await fetch(BANNERS_PATH + 'manifest.json?ts=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const overlayRaw = await fetchOverlayDirect();
        const merged = applyOverlayToManifest(json, overlayRaw);
        availableBanners = merged.banners;
        BANNER_LAYOUT = merged.layouts;
        catalogReady = true;
        purgeSavedBannerIfRemoved();
        return true;
      }
    } catch (e) {}
    return catalogReady;
  }

  function bannerIsListed(name) {
    return availableBanners.indexOf(name) !== -1;
  }

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
    const store = getStore();
    if (store && store.isCustomName && store.isCustomName(name)) return '';
    return BANNERS_PATH + name;
  }

  async function resolveBannerPaintUrl(name) {
    const store = getStore();
    if (store) {
      const url = await store.resolveBannerUrl(name);
      if (url) return withLiveQuery(url, name);
    }
    return withLiveQuery(BANNERS_PATH + name, name);
  }

  function withLiveQuery(url, name) {
    if (!url || String(url).indexOf('data:') === 0) return url;
    if (isIOSDevice()) return url;
    var token = String(name || '')
      .replace(/\.jpg$/i, '')
      .replace(/[^a-z0-9-]+/gi, '-');
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'live=' + encodeURIComponent(token);
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
      '.topbar.' + ACTIVE_CLASS + '::before,.topbar.' + ACTIVE_CLASS + '::after{',
      'content:none!important;opacity:0!important;display:none!important;',
      '}',
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
        'content:""!important;display:block!important;position:absolute!important;',
        'inset:0!important;top:0!important;right:0!important;bottom:0!important;left:0!important;',
        'width:auto!important;height:auto!important;max-width:none!important;max-height:none!important;',
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
    if (!name || !BANNER_NAME_RE.test(name)) return null;
    // Drop deleted/missing choices so iOS doesn't keep requesting a 404 image.
    if (!bannerIsListed(name)) {
      try {
        localStorage.removeItem(BANNER_KEY);
      } catch (_) {}
      return null;
    }
    return name;
  }

  function saveBannerChoice(name) {
    localStorage.setItem(BANNER_KEY, name);
    warmBannerCache(bannerUrl(name));
  }

  function getBannerTargets() {
    return Array.from(document.querySelectorAll('.header, .topbar'));
  }

  function bannerLiveUrl(name, resolvedUrl) {
    var base = resolvedUrl || bannerUrl(name);
    return withLiveQuery(base, name);
  }

  function bannerPaintUrl(name, resolvedUrl) {
    return bannerLiveUrl(name, resolvedUrl);
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

  function removeIosBannerLayers(el) {
    el.querySelectorAll('.roster-banner-ios-img').forEach(function (node) {
      node.remove();
    });
  }

  function ensureIosBannerLayer(el, url, pos) {
    var img = el.querySelector('.roster-banner-ios-img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'roster-banner-ios-img';
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.decoding = 'async';
      img.loading = 'eager';
      if (el.firstChild) el.insertBefore(img, el.firstChild);
      else el.appendChild(img);
    }
    img.style.cssText = [
      'position:absolute',
      'inset:0',
      'width:100%',
      'height:100%',
      'object-fit:cover',
      'object-position:' + pos,
      'z-index:0',
      'pointer-events:none',
      'border-radius:inherit',
      'opacity:0',
      '-webkit-transform:translateZ(0)',
      'transform:translateZ(0)'
    ].join(';');
    if (img.getAttribute('data-src') !== url) {
      img.setAttribute('data-src', url);
      img.style.opacity = '0';
      img.onerror = function () {
        // Retry once, then remove so a broken-image square never stays visible.
        if (img.dataset.retry !== '1') {
          img.dataset.retry = '1';
          img.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'ios=' + Date.now();
          return;
        }
        removeIosBannerLayers(el);
      };
      img.onload = function () {
        img.dataset.retry = '0';
        img.style.opacity = '1';
        img.classList.add('is-ready');
      };
      img.src = url;
    } else if (!img.getAttribute('src')) {
      img.src = url;
    } else if (img.complete && img.naturalWidth > 0) {
      img.style.opacity = '1';
      img.classList.add('is-ready');
    }
    return img;
  }

  function syncEarlyBannerStyle(name, url) {
    if (!name || !url) return;
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
      '")!important;background-size:cover!important;-webkit-background-size:cover!important;background-position:' +
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
      ' .topbar::after{content:none!important;opacity:0!important;display:none!important}' +
      '.roster-banner-ios-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;border-radius:inherit;opacity:0}' +
      '.roster-banner-ios-img.is-ready{opacity:1}' +
      '.header.has-custom-banner > :not(.roster-banner-ios-img),' +
      '.topbar.has-custom-banner > :not(.roster-banner-ios-img){position:relative;z-index:1}';
    document.head.appendChild(early);
    document.documentElement.classList.add(EARLY_CLASS);
    var preload = document.querySelector('link[data-banner-preload="1"]');
    if (preload) preload.href = url;
  }

  function paintBannerOnTargets(targets, name, url) {
    const pos = getBannerPosition(name);
    const ios = isIOSDevice();
    targets.forEach(function (el) {
      el.setAttribute('data-banner', name);
      if (getComputedStyle(el).position === 'static') {
        el.style.position = 'relative';
      }
      el.style.setProperty('background-image', "url('" + url + "')", 'important');
      el.style.setProperty('background-size', 'cover', 'important');
      el.style.setProperty('-webkit-background-size', 'cover', 'important');
      el.style.setProperty('background-position', pos, 'important');
      el.style.setProperty('background-repeat', 'no-repeat', 'important');
      if (ios) {
        ensureIosBannerLayer(el, url, pos);
      } else {
        removeIosBannerLayers(el);
      }
    });
  }

  function applyBanner(name) {
    const targets = getBannerTargets();
    if (!targets.length) return;
    resolveBannerPaintUrl(name).then(function (url) {
      if (!url) return;
      syncEarlyBannerStyle(name, url);
      paintBannerOnTargets(targets, name, url);
      setCustomBannerActive(true);
      var cacheUrl = bannerUrl(name);
      if (cacheUrl) warmBannerCache(cacheUrl);
      requestAnimationFrame(function () {
        forceBannerRepaint(targets);
        if (isIOSDevice()) {
          setTimeout(function () {
            paintBannerOnTargets(targets, name, url);
          }, 120);
        }
      });
    });
  }

  function clearBanner() {
    const targets = getBannerTargets();
    if (!targets.length) return;
    targets.forEach(function (el) {
      el.removeAttribute('data-banner');
      el.style.removeProperty('background-image');
      el.style.removeProperty('background-size');
      el.style.removeProperty('-webkit-background-size');
      el.style.removeProperty('background-position');
      el.style.removeProperty('background-repeat');
      removeIosBannerLayers(el);
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
      'z-index:80',
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
      'pointer-events:auto',
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

  function loadPickerThumb(img, name) {
    if (img.dataset.loaded === '1') return;
    img.dataset.loaded = '1';
    resolveBannerPaintUrl(name).then(function (src) {
      if (src) img.src = src;
    });
  }

  function bannerNumberLabel(name) {
    const store = getStore();
    if (store) return store.bannerLabel(name);
    const m = String(name || '').match(/banner(\d+)\.jpg/i);
    return m ? m[1] : '';
  }

  function showBannerPicker() {
    if (document.getElementById('banner-picker')) return;

    ensureCatalog(true).finally(function () {
      openBannerPickerSheet();
    });
  }

  function injectBannerPickerStyles() {
    var node = document.getElementById('banner-picker-layout-css');
    if (node) node.remove();
    const style = document.createElement('style');
    style.id = 'banner-picker-layout-css';
    style.textContent = [
      '#banner-picker{',
      'display:flex!important;',
      'align-items:center!important;',
      'justify-content:center!important;',
      'padding:max(10px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom))!important;',
      'box-sizing:border-box!important;',
      '}',
      '#banner-picker-sheet{',
      'width:100%!important;',
      'max-width:520px!important;',
      'max-height:min(92vh,920px)!important;',
      'margin:0 auto!important;',
      'border-radius:18px!important;',
      'overflow-y:auto!important;',
      '-webkit-overflow-scrolling:touch!important;',
      'box-shadow:0 18px 48px rgba(0,0,0,.45)!important;',
      'touch-action:pan-y!important;',
      '}',
      '#bannerGrid{',
      'display:grid!important;',
      'grid-template-columns:repeat(3,minmax(0,1fr))!important;',
      'gap:8px!important;',
      '}',
      '#bannerGrid .banner-picker-item{',
      'touch-action:pan-y!important;',
      '-webkit-user-select:none!important;',
      'user-select:none!important;',
      '}',
      '#bannerGrid .banner-picker-item img{',
      'height:78px!important;',
      'pointer-events:none!important;',
      '}',
      '#bannerChromeFadeSettings{',
      'grid-column:1/-1!important;',
      'min-height:0!important;',
      'padding:7px 9px!important;',
      'gap:4px 8px!important;',
      'flex-direction:row!important;',
      'flex-wrap:wrap!important;',
      'align-items:center!important;',
      '}',
      '#bannerChromeFadeSettings > div:first-child{',
      'margin:0 6px 0 0!important;',
      'font-size:10px!important;',
      'white-space:nowrap!important;',
      '}',
      '#bannerChromeFadeSettings label{font-size:9px!important;gap:3px!important;}',
    ].join('');
    document.head.appendChild(style);
  }

  function createBannerPickerGestureGuard(sheet) {
    var state = { moved: false, startX: 0, startY: 0, startScroll: 0 };
    sheet.addEventListener(
      'touchstart',
      function (e) {
        var t = e.changedTouches && e.changedTouches[0];
        if (!t) return;
        state.moved = false;
        state.startX = t.clientX;
        state.startY = t.clientY;
        state.startScroll = sheet.scrollTop;
      },
      { passive: true }
    );
    sheet.addEventListener(
      'touchmove',
      function (e) {
        var t = e.changedTouches && e.changedTouches[0];
        if (!t) return;
        if (Math.abs(t.clientX - state.startX) > 10 || Math.abs(t.clientY - state.startY) > 10) {
          state.moved = true;
        }
        if (Math.abs(sheet.scrollTop - state.startScroll) > 2) {
          state.moved = true;
        }
      },
      { passive: true }
    );
    sheet.addEventListener(
      'scroll',
      function () {
        state.moved = true;
      },
      { passive: true }
    );
    return {
      shouldPick: function () {
        if (state.moved) {
          state.moved = false;
          return false;
        }
        return true;
      },
    };
  }

  function openBannerPickerSheet() {
    if (document.getElementById('banner-picker')) return;

    injectBannerPickerStyles();

    const overlay = document.createElement('div');
    overlay.id = 'banner-picker';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.65)',
      'z-index:10000',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:max(10px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom))',
      'box-sizing:border-box',
      'font-family:system-ui,-apple-system,sans-serif'
    ].join(';');

    const sheet = document.createElement('div');
    sheet.id = 'banner-picker-sheet';
    sheet.style.cssText = [
      'background:#17181d',
      'border-radius:18px',
      'padding:14px 12px 16px',
      'width:100%',
      'max-width:520px',
      'max-height:min(92vh,920px)',
      'margin:0 auto',
      'overflow-y:auto',
      '-webkit-overflow-scrolling:touch',
      'direction:rtl',
      'touch-action:pan-y',
      'box-shadow:0 18px 48px rgba(0,0,0,.45)'
    ].join(';');

    const current = getSavedBanner();
    const gesture = createBannerPickerGestureGuard(sheet);

    sheet.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
        '<span style="color:#f5ead8;font-size:14px;font-weight:700;">اختر خلفية الهيدر</span>' +
        '<button type="button" id="closePicker" style="background:rgba(255,255,255,0.06);border:none;color:#b8a57a;width:28px;height:28px;border-radius:8px;font-size:15px;cursor:pointer;">✕</button>' +
      '</div>' +
      '<div id="bannerGrid" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;"></div>' +
      '<button type="button" id="resetBanner" style="margin-top:10px;width:100%;border:none;border-radius:10px;padding:9px;font-size:12px;font-weight:700;cursor:pointer;color:#b8a57a;background:rgba(255,255,255,0.05);">إعادة الخلفية الافتراضية</button>';

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    const grid = document.getElementById('bannerGrid');
    const lazyImgs = [];

    buildChromeFadeSettingsCell(grid);

    availableBanners.forEach(function (name) {
      const num = bannerNumberLabel(name);
      const wrap = document.createElement('div');
      wrap.className = 'banner-picker-item';
      wrap.style.cssText =
        'position:relative;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid ' +
        (name === current ? '#e0bd63' : 'transparent') +
        ';transition:border .15s;';
      const img = document.createElement('img');
      img.alt = num ? ('بانر ' + num) : '';
      img.dataset.bannerName = name;
      img.style.cssText = 'width:100%;height:78px;object-fit:cover;display:block;background:#2a2b31;';
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
        function pick(e) {
          if (!gesture.shouldPick()) return;
          if (e && e.preventDefault) e.preventDefault();
          if (e && e.stopPropagation) e.stopPropagation();
          chooseBanner(bannerName, overlay);
        }
        wrap.setAttribute('role', 'button');
        wrap.setAttribute('tabindex', '0');
        wrap.setAttribute('aria-label', num ? ('بانر رقم ' + num) : 'بانر');
        wrap.style.touchAction = 'pan-y';
        wrap.style.webkitTapHighlightColor = 'transparent';
        wrap.addEventListener('click', pick);
      })(name);
    });

    lazyImgs.forEach(function (img) {
      loadPickerThumb(img, img.dataset.bannerName);
    });

    document.getElementById('resetBanner').onclick = function (e) {
      if (!gesture.shouldPick()) return;
      localStorage.removeItem(BANNER_KEY);
      clearBanner();
      overlay.remove();
    };

    document.getElementById('closePicker').onclick = function () {
      overlay.remove();
    };
    document.getElementById('closePicker').setAttribute('type', 'button');
    overlay.onclick = function (e) {
      if (e.target === overlay) overlay.remove();
    };
  }

  var CHROME_FADE_MS = 5000;
  var CHROME_DIM_OPACITY = '0.1';
  var CHROME_FADE_KEY = 'roster_banner_chrome_fade';
  var chromeFadeTimer = null;

  /** off | title (keep title) | all */
  function getChromeFadeMode() {
    try {
      var v = localStorage.getItem(CHROME_FADE_KEY) || 'all';
      if (v === 'off' || v === 'title' || v === 'all') return v;
    } catch (e) {}
    return 'all';
  }

  function setChromeFadeMode(mode) {
    if (mode !== 'off' && mode !== 'title' && mode !== 'all') mode = 'all';
    try {
      localStorage.setItem(CHROME_FADE_KEY, mode);
    } catch (e) {}
    injectChromeFadeStyles();
    scheduleHeaderChromeFade();
  }

  function getHeaderChromeEls() {
    return Array.from(
      document.querySelectorAll(
        '#langToggle, .langToggle, #banner-changer-btn, #spotlightEmojiBtn, #dateTag, .header .dateTag, #datePicker'
      )
    );
  }

  function getHeaderTitleEls() {
    return Array.from(
      document.querySelectorAll('#pageTitle, h1.bannerTitle, .header > .bannerTitle, .topbar .page-title')
    );
  }

  function injectChromeFadeStyles() {
    var style = document.getElementById('header-chrome-fade-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'header-chrome-fade-css';
      document.head.appendChild(style);
    }
    var mode = getChromeFadeMode();
    var rules = [
      '#langToggle,#banner-changer-btn,#spotlightEmojiBtn,#dateTag,.header .dateTag,',
      '#pageTitle,.bannerTitle,.bannerTitleEyebrow,.bannerTitleMain,',
      '.page-title,.page-title-eyebrow,.page-title-main{',
      'transition:opacity .55s ease!important;',
      '}'
    ];
    if (mode === 'off') {
      style.textContent = rules.join('');
      return;
    }
    rules.push(
      'html.header-chrome-dim #langToggle,',
      'html.header-chrome-dim #banner-changer-btn,',
      'html.header-chrome-dim #spotlightEmojiBtn,',
      'html.header-chrome-dim #dateTag,',
      'html.header-chrome-dim .header .dateTag{',
      'opacity:' + CHROME_DIM_OPACITY + '!important;',
      'pointer-events:auto!important;',
      '}'
    );
    if (mode === 'all') {
      rules.push(
        'html.header-chrome-dim #pageTitle,',
        'html.header-chrome-dim .bannerTitle,',
        'html.header-chrome-dim .bannerTitleEyebrow,',
        'html.header-chrome-dim .bannerTitleMain,',
        'html.header-chrome-dim .page-title,',
        'html.header-chrome-dim .page-title-eyebrow,',
        'html.header-chrome-dim .page-title-main{',
        'opacity:' + CHROME_DIM_OPACITY + '!important;',
        '}'
      );
    } else {
      // title mode: force title fully visible while controls dim
      rules.push(
        'html.header-chrome-dim #pageTitle,',
        'html.header-chrome-dim .bannerTitle,',
        'html.header-chrome-dim .bannerTitleEyebrow,',
        'html.header-chrome-dim .bannerTitleMain,',
        'html.header-chrome-dim .page-title,',
        'html.header-chrome-dim .page-title-eyebrow,',
        'html.header-chrome-dim .page-title-main{',
        'opacity:1!important;',
        '}'
      );
    }
    rules.push(
      '@media (hover:hover) and (pointer:fine){',
      'html.header-chrome-dim #langToggle:hover,',
      'html.header-chrome-dim #langToggle:focus-visible,',
      'html.header-chrome-dim #banner-changer-btn:hover,',
      'html.header-chrome-dim #banner-changer-btn:focus-visible,',
      'html.header-chrome-dim #spotlightEmojiBtn:hover,',
      'html.header-chrome-dim #spotlightEmojiBtn:focus-visible,',
      'html.header-chrome-dim #dateTag:hover,',
      'html.header-chrome-dim .header .dateTag:hover{',
      'opacity:1!important;',
      '}',
      '}',
      'html.header-chrome-dim #langToggle:focus-visible,',
      'html.header-chrome-dim #banner-changer-btn:focus-visible,',
      'html.header-chrome-dim #spotlightEmojiBtn:focus-visible{',
      'opacity:1!important;',
      '}'
    );
    style.textContent = rules.join('');
  }

  function setHeaderChromeDim(dim) {
    var mode = getChromeFadeMode();
    if (mode === 'off') dim = false;
    document.documentElement.classList.toggle('header-chrome-dim', !!dim);
    getHeaderTitleEls().forEach(function (el) {
      if (dim && mode === 'all') {
        el.style.setProperty('opacity', CHROME_DIM_OPACITY, 'important');
      } else {
        el.style.removeProperty('opacity');
      }
    });
  }

  function scheduleHeaderChromeFade() {
    if (chromeFadeTimer) clearTimeout(chromeFadeTimer);
    setHeaderChromeDim(false);
    if (getChromeFadeMode() === 'off') return;
    chromeFadeTimer = setTimeout(function () {
      setHeaderChromeDim(true);
    }, CHROME_FADE_MS);
  }

  function bindChromeWake(el) {
    if (!el || el.dataset.chromeFadeBound === '1') return;
    el.dataset.chromeFadeBound = '1';
    function wake() {
      scheduleHeaderChromeFade();
    }
    el.addEventListener('pointerdown', wake);
    el.addEventListener('focusin', wake);
    el.addEventListener('mouseenter', wake);
  }

  function bindHeaderChromeFade() {
    injectChromeFadeStyles();
    scheduleHeaderChromeFade();
    getHeaderChromeEls().forEach(bindChromeWake);
    document.querySelectorAll('.header, .topbar').forEach(function (header) {
      if (header.dataset.chromeHeaderWake === '1') return;
      header.dataset.chromeHeaderWake = '1';
      header.addEventListener('pointerdown', function () {
        scheduleHeaderChromeFade();
      });
    });
    setTimeout(function () {
      getHeaderChromeEls().forEach(bindChromeWake);
    }, 400);
  }

  function buildChromeFadeSettingsCell(grid) {
    var mode = getChromeFadeMode();
    var cell = document.createElement('div');
    cell.id = 'bannerChromeFadeSettings';
    cell.style.cssText = [
      'grid-column:1/-1',
      'border-radius:10px',
      'border:1.5px dashed rgba(224,189,99,.45)',
      'background:rgba(255,255,255,.04)',
      'padding:7px 9px',
      'display:flex',
      'flex-direction:row',
      'flex-wrap:wrap',
      'align-items:center',
      'gap:4px 8px',
      'box-sizing:border-box'
    ].join(';');
    cell.innerHTML =
      '<div style="color:#f5ead8;font-size:10px;font-weight:800;line-height:1.2;">إخفاء العناصر</div>' +
      '<label style="display:flex;align-items:center;gap:5px;color:#d6c7a5;font-size:10px;font-weight:700;cursor:pointer;line-height:1.2;">' +
      '<input type="radio" name="bannerChromeFade" value="off" style="accent-color:#e0bd63;margin:0;flex-shrink:0;">بدون إخفاء</label>' +
      '<label style="display:flex;align-items:center;gap:5px;color:#d6c7a5;font-size:10px;font-weight:700;cursor:pointer;line-height:1.2;">' +
      '<input type="radio" name="bannerChromeFade" value="title" style="accent-color:#e0bd63;margin:0;flex-shrink:0;">إبقاء العنوان</label>' +
      '<label style="display:flex;align-items:center;gap:5px;color:#d6c7a5;font-size:10px;font-weight:700;cursor:pointer;line-height:1.2;">' +
      '<input type="radio" name="bannerChromeFade" value="all" style="accent-color:#e0bd63;margin:0;flex-shrink:0;">إخفاء الكل</label>';
    grid.appendChild(cell);
    cell.querySelectorAll('input[name="bannerChromeFade"]').forEach(function (input) {
      if (input.value === mode) input.checked = true;
      input.addEventListener('change', function () {
        if (!input.checked) return;
        setChromeFadeMode(input.value);
      });
      input.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    });
    cell.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  function init() {
    injectReadabilityStyles();
    ensureCatalog(true).then(function () {
      injectReadabilityStyles();
      const saved = getSavedBanner();
      if (saved) {
        applyBanner(saved);
      } else {
        const early = document.getElementById('banner-early-style');
        if (early) early.remove();
        document.documentElement.classList.remove(EARLY_CLASS);
        getBannerTargets().forEach(removeIosBannerLayers);
      }
    });
    createChangerBtn();
    bindHeaderChromeFade();
    try {
      window.addEventListener('storage', function (e) {
        if (!e || e.key !== CATALOG_BUMP_KEY) return;
        ensureCatalog(true).then(function () {
          injectReadabilityStyles();
          var active = getSavedBanner();
          if (active) applyBanner(active);
        });
      });
    } catch (e) {}
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

