/**
 * Site share: QR code + Web Share / WhatsApp / copy link.
 */
(function () {
  'use strict';

  var QR_CDN = 'https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.js';
  var qrLibPromise = null;

  var ICONS = {
    share:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#166534" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v12M8 7l4-4 4 4"/></svg>',
    whatsapp:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><circle cx="12" cy="12" r="9" fill="#22c55e"/><path d="M8.5 9.5c.4 2.2 2.4 4.2 4.8 4.8l1-2.2c.1-.2.3-.3.5-.2l1.8.8c.2.1.4 0 .5-.2.4-.9.9-1.7 1.5-2.4.1-.2 0-.5-.2-.6l-1.6-.9c-.2-.1-.5 0-.6.2-.3.6-.7 1.1-1.1 1.6-.1.2-.4.2-.6.1l-1.4-.7c-.2-.1-.4-.1-.5.1z" fill="#fff"/></svg>',
    link:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5"/><path d="M14 11a5 5 0 0 0-7.07 0L5.52 12.41a5 5 0 0 0 7.07 7.07L14 19"/></svg>',
  };

  function qrImageUrl(url) {
    return (
      'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=' +
      encodeURIComponent(url)
    );
  }

  var I18N = {
    en: {
      btn: 'Share Site',
      title: 'Share this site',
      hint: 'Scan the QR code or share the link',
      share: 'Share',
      whatsapp: 'WhatsApp',
      copy: 'Copy link',
      copied: 'Copied!',
      close: 'Close',
      shareText: 'Duty Roster — daily schedule',
    },
    ar: {
      btn: 'مشاركة الموقع',
      title: 'شارك الموقع',
      hint: 'امسح رمز QR أو شارك الرابط',
      share: 'مشاركة',
      whatsapp: 'واتساب',
      copy: 'نسخ الرابط',
      copied: 'تم النسخ!',
      close: 'إغلاق',
      shareText: 'جدول المناوبات — الجدول اليومي',
    },
  };

  var I18N_TRAINING = {
    en: {
      btn: 'Share page',
      title: 'Share training page',
      hint: 'Scan the QR code or copy the link',
      share: 'Share',
      whatsapp: 'WhatsApp',
      copy: 'Copy link',
      copied: 'Copied!',
      close: 'Close',
      shareText: 'Training Courses — visual schedule',
    },
    ar: {
      btn: 'مشاركة الصفحة',
      title: 'مشاركة صفحة التدريب',
      hint: 'امسح رمز QR أو انسخ الرابط',
      share: 'مشاركة',
      whatsapp: 'واتساب',
      copy: 'نسخ الرابط',
      copied: 'تم النسخ!',
      close: 'إغلاق',
      shareText: 'دورات التدريب — الجدول',
    },
  };

  var I18N_ALUMNI = {
    en: {
      btn: 'Share',
      title: 'Share former colleagues',
      hint: 'Choose what to share, then scan or copy the link',
      share: 'Share',
      whatsapp: 'WhatsApp',
      copy: 'Copy link',
      copied: 'Copied!',
      close: 'Close',
      shareText: 'Former Colleagues — a tribute page',
      shareTextCompose: 'Leave a thank-you note for former colleagues',
      chooseTitle: 'What would you like to share?',
      choosePage: 'Alumni page',
      chooseCompose: 'Write a thank-you message',
      back: 'Back',
    },
    ar: {
      btn: 'مشاركة',
      title: 'مشاركة زملاء سابقون',
      hint: 'اختر ماذا تشارك، ثم امسح الرمز أو انسخ الرابط',
      share: 'مشاركة',
      whatsapp: 'واتساب',
      copy: 'نسخ الرابط',
      copied: 'تم النسخ!',
      close: 'إغلاق',
      shareText: 'زملاء سابقون — صفحة تكريم',
      shareTextCompose: 'اترك كلمة شكر لزميل سابق',
      chooseTitle: 'ماذا تريد أن تشارك؟',
      choosePage: 'صفحة زملاء سابقون',
      chooseCompose: 'كتابة رسالة شكر',
      back: 'رجوع',
    },
  };

  var alumniShareMode = null; // null | 'page' | 'compose'

  function isTrainingPage() {
    return /\/training(\/|$)/.test(location.pathname || '');
  }

  function isAlumniPage() {
    return /\/alumni(\/|$)/.test(location.pathname || '');
  }

  function activeI18n() {
    var pack = isAlumniPage() ? I18N_ALUMNI : isTrainingPage() ? I18N_TRAINING : I18N;
    return pack[lang()] || pack.en;
  }

  function t(key) {
    var pack = activeI18n();
    var fallback = isAlumniPage()
      ? I18N_ALUMNI.en
      : isTrainingPage()
        ? I18N_TRAINING.en
        : I18N.en;
    return pack[key] || fallback[key] || key;
  }

  function lang() {
    var l = localStorage.getItem('rosterLang') || document.documentElement.getAttribute('lang') || 'en';
    return l === 'ar' ? 'ar' : 'en';
  }

  function setModalBtnLabel(id, iconKey, text) {
    var el = document.getElementById(id);
    if (!el) return;
    var lbl = el.querySelector('.roster-cta-label');
    if (lbl) lbl.textContent = text;
    else el.textContent = text;
    if (iconKey && ICONS[iconKey]) {
      var iconWrap = el.querySelector('.roster-cta-icon') || el.querySelector('.trainingShareIcon');
      if (iconWrap) iconWrap.innerHTML = ICONS[iconKey];
    }
  }

  /** Same base path logic as roster pages (GitHub Pages /docs/, local /roster-site/, etc.). */
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

  /** Share Site = section home URL, never the current /date/YYYY-MM-DD/ deep link. */
  function getCanonicalSharePath() {
    var path = location.pathname || '/';
    if (/\/import(\/|$)/.test(path)) return '/import/';
    var archiveMonth = path.match(/(\/training\/archive\/[^/]+\.html)$/);
    if (archiveMonth) return archiveMonth[1];
    if (/\/training\/archive\/?$/.test(path) || /\/training\/archive\/index\.html$/.test(path)) {
      return '/training/archive/';
    }
    if (/\/training(\/|$)/.test(path)) return '/training/';
    if (/\/alumni(\/|$)/.test(path)) return '/alumni/';
    if (/\/roster-diff(\/|$)/.test(path)) return '/roster-diff/';
    if (/\/a-cup-of-book(\/|$)/.test(path)) return '/a-cup-of-book/';
    return '/';
  }

  function getShareUrl() {
    var root = getSiteRootPath();
    var sub = getCanonicalSharePath();
    try {
      var u = new URL((root || '') + (sub || '/'), location.origin);
      u.hash = '';
      u.search = '';
      if (!/\.[a-z0-9]+$/i.test(u.pathname) && !u.pathname.endsWith('/')) {
        u.pathname += '/';
      }
      if (isAlumniPage() && alumniShareMode === 'compose') {
        u.searchParams.set('compose', '1');
      }
      return u.toString();
    } catch (e) {
      var path = (root || '') + (sub || '/');
      if (!path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)) path += '/';
      if (isAlumniPage() && alumniShareMode === 'compose') {
        path += (path.indexOf('?') >= 0 ? '&' : '?') + 'compose=1';
      }
      return (location.origin || '') + path;
    }
  }

  function getShareMessage() {
    if (isAlumniPage() && alumniShareMode === 'compose') {
      return t('shareTextCompose') + '\n' + getShareUrl();
    }
    return t('shareText') + '\n' + getShareUrl();
  }

  function getNativeSharePayload() {
    return { title: t('title'), text: getShareMessage(), url: getShareUrl() };
  }

  function loadQrLib() {
    if (window.QRCode) return Promise.resolve(window.QRCode);
    if (qrLibPromise) return qrLibPromise;
    qrLibPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = QR_CDN;
      s.async = true;
      s.onload = function () {
        resolve(window.QRCode);
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return qrLibPromise;
  }

  function renderQrImage(wrap, url) {
    var img = document.createElement('img');
    img.alt = 'QR code';
    img.width = 220;
    img.height = 220;
    img.style.display = 'block';
    img.style.margin = '0 auto';
    img.src = qrImageUrl(url);
    wrap.appendChild(img);
    wrap.removeAttribute('aria-hidden');
  }

  function applyI18n() {
    var btn = document.getElementById('shareSiteBtn');
    if (btn) {
      var lbl = btn.querySelector('.roster-cta-label');
      if (lbl) lbl.textContent = t('btn');
      else btn.textContent = t('btn');
    }
    var sheet = document.getElementById('siteShareSheet');
    if (!sheet) return;
    var title = document.getElementById('siteShareTitle');
    var hint = document.getElementById('siteShareHint');
    if (title) {
      title.textContent =
        isAlumniPage() && !alumniShareMode ? t('chooseTitle') : t('title');
    }
    if (hint) {
      hint.textContent =
        isAlumniPage() && !alumniShareMode ? t('hint') : t('hint');
    }
    var choosePage = document.getElementById('siteShareChoosePage');
    var chooseCompose = document.getElementById('siteShareChooseCompose');
    if (choosePage) {
      var pl = choosePage.querySelector('.roster-cta-label');
      if (pl) pl.textContent = t('choosePage');
      else choosePage.textContent = t('choosePage');
    }
    if (chooseCompose) {
      var cl = chooseCompose.querySelector('.roster-cta-label');
      if (cl) cl.textContent = t('chooseCompose');
      else chooseCompose.textContent = t('chooseCompose');
    }
    var backBtn = document.getElementById('siteShareBackBtn');
    if (backBtn) {
      var bl = backBtn.querySelector('.roster-cta-label');
      if (bl) bl.textContent = t('back');
      else backBtn.textContent = t('back');
    }
    setModalBtnLabel('siteShareNativeBtn', 'share', t('share'));
    setModalBtnLabel('siteShareWhatsAppBtn', 'whatsapp', t('whatsapp'));
    var copyBtn = document.getElementById('siteShareCopyBtn');
    if (copyBtn && copyBtn.dataset.copied !== '1') {
      setModalBtnLabel('siteShareCopyBtn', 'link', t('copy'));
    }
    setModalBtnLabel('siteShareCloseBtn', null, t('close'));
    sheet.setAttribute('dir', lang() === 'ar' ? 'rtl' : 'ltr');
  }

  function setAlumniShareView(mode) {
    alumniShareMode = mode;
    var choose = document.getElementById('siteShareChoose');
    var tools = document.getElementById('siteShareTools');
    var backBtn = document.getElementById('siteShareBackBtn');
    var title = document.getElementById('siteShareTitle');
    var hint = document.getElementById('siteShareHint');
    if (choose) choose.hidden = !!mode;
    if (tools) tools.hidden = !mode;
    if (backBtn) backBtn.hidden = !mode;
    if (title) title.textContent = mode ? t('title') : t('chooseTitle');
    if (hint) hint.textContent = t('hint');
    if (!mode) return;
    var url = getShareUrl();
    var urlEl = document.getElementById('siteShareUrl');
    if (urlEl) {
      if ('value' in urlEl) urlEl.value = url;
      else urlEl.textContent = url;
      urlEl.setAttribute('title', url);
      urlEl.setAttribute('data-url', url);
    }
    renderQr(url);
    var nativeBtn = document.getElementById('siteShareNativeBtn');
    if (nativeBtn) {
      nativeBtn.style.display =
        navigator.share && typeof navigator.share === 'function' ? '' : 'none';
    }
  }

  function renderQr(url) {
    var wrap = document.getElementById('siteShareQr');
    if (!wrap) return Promise.resolve();
    wrap.innerHTML =
      '<p style="font-size:12px;color:#64748b;padding:12px;margin:0;">Loading QR…</p>';

    return loadQrLib()
      .then(function (QRCode) {
        wrap.innerHTML = '';
        var canvas = document.createElement('canvas');
        canvas.width = 220;
        canvas.height = 220;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'QR code');
        wrap.appendChild(canvas);
        return QRCode.toCanvas(canvas, url, {
          width: 220,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
        }).then(function () {
          wrap.removeAttribute('aria-hidden');
        });
      })
      .catch(function () {
        renderQrImage(wrap, url);
      });
  }

  function closeAppsIfOpen() {
    var apps = document.getElementById('siteAppsSheet');
    if (apps && apps.classList.contains('open')) {
      apps.classList.remove('open');
      apps.setAttribute('aria-hidden', 'true');
      if (window.rosterSiteApps && window.rosterSiteApps.close) {
        window.rosterSiteApps.close();
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  function openModal() {
    var sheet = document.getElementById('siteShareSheet');
    if (!sheet) return;
    closeAppsIfOpen();
    applyI18n();
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    if (isAlumniPage()) {
      setAlumniShareView(null);
      return;
    }
    var url = getShareUrl();
    var urlEl = document.getElementById('siteShareUrl');
    if (urlEl) {
      if ('value' in urlEl) urlEl.value = url;
      else urlEl.textContent = url;
      urlEl.setAttribute('title', url);
      urlEl.setAttribute('data-url', url);
    }
    var choose = document.getElementById('siteShareChoose');
    var tools = document.getElementById('siteShareTools');
    var backBtn = document.getElementById('siteShareBackBtn');
    if (choose) choose.hidden = true;
    if (tools) tools.hidden = false;
    if (backBtn) backBtn.hidden = true;
    renderQr(url);
    var nativeBtn = document.getElementById('siteShareNativeBtn');
    if (nativeBtn) {
      nativeBtn.style.display =
        navigator.share && typeof navigator.share === 'function' ? '' : 'none';
    }
  }

  function closeModal() {
    var sheet = document.getElementById('siteShareSheet');
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    alumniShareMode = null;
  }

  function shareNative() {
    if (!navigator.share) return;
    navigator.share(getNativeSharePayload()).catch(function () {});
  }

  function shareWhatsApp() {
    window.open(
      'https://api.whatsapp.com/send?text=' + encodeURIComponent(getShareMessage()),
      '_blank',
      'noopener'
    );
  }

  function copyLink(e) {
    if (e && e.preventDefault) e.preventDefault();
    var url = getShareUrl();
    var copyBtn = document.getElementById('siteShareCopyBtn');
    var urlEl = document.getElementById('siteShareUrl');

    function done() {
      if (!copyBtn) return;
      copyBtn.dataset.copied = '1';
      var lbl = copyBtn.querySelector('.roster-cta-label');
      if (lbl) lbl.textContent = t('copied');
      else copyBtn.textContent = t('copied');
      setTimeout(function () {
        copyBtn.dataset.copied = '0';
        setModalBtnLabel('siteShareCopyBtn', 'link', t('copy'));
      }, 2000);
    }

    function selectVisibleUrl() {
      if (!urlEl) return;
      try {
        if (urlEl.select) {
          urlEl.focus();
          urlEl.select();
          urlEl.setSelectionRange(0, (urlEl.value || '').length);
        } else if (window.getSelection && document.createRange) {
          var range = document.createRange();
          range.selectNodeContents(urlEl);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch (err) {}
    }

    function copySync() {
      try {
        if (urlEl && urlEl.tagName === 'INPUT') {
          urlEl.value = url;
          urlEl.focus();
          urlEl.select();
          urlEl.setSelectionRange(0, url.length);
          if (document.execCommand('copy')) return true;
        }
      } catch (err1) {}
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.setAttribute('aria-hidden', 'true');
      ta.style.cssText =
        'position:fixed;top:0;left:0;width:2px;height:2px;padding:0;border:0;opacity:0.01;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        ta.setSelectionRange(0, ta.value.length);
      } catch (err2) {}
      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (err3) {}
      document.body.removeChild(ta);
      return !!ok;
    }

    // Sync copy first — keeps the user gesture (critical for iOS after touch polyfills)
    if (copySync()) {
      done();
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(done)
        .catch(function () {
          selectVisibleUrl();
        });
      return;
    }

    selectVisibleUrl();
  }

  function bindUi() {
    var sheet = document.getElementById('siteShareSheet');
    if (!sheet) return;
    document.getElementById('shareSiteBtn')?.addEventListener('click', function (e) {
      e.preventDefault();
      openModal();
    });
    document.getElementById('siteShareChoosePage')?.addEventListener('click', function () {
      setAlumniShareView('page');
    });
    document.getElementById('siteShareChooseCompose')?.addEventListener('click', function () {
      setAlumniShareView('compose');
    });
    document.getElementById('siteShareBackBtn')?.addEventListener('click', function () {
      setAlumniShareView(null);
    });
    document.getElementById('siteShareNativeBtn')?.addEventListener('click', shareNative);
    document.getElementById('siteShareWhatsAppBtn')?.addEventListener('click', shareWhatsApp);
    document.getElementById('siteShareCopyBtn')?.addEventListener('click', copyLink);
    document.getElementById('siteShareCloseBtn')?.addEventListener('click', closeModal);
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.classList.contains('open')) closeModal();
    });
  }

  var STYLE_ID = 'roster-site-share-styles';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.siteShareSheet{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.45);z-index:10001;padding:16px;pointer-events:none;visibility:hidden}',
      '.siteShareSheet.open{display:flex;pointer-events:auto;visibility:visible}',
      '.siteShareCard{width:min(420px,100%);background:#fff;border-radius:20px;padding:18px 16px 14px;box-shadow:0 20px 50px rgba(15,23,42,.28);border:1px solid #e2e8f0}',
      '.siteShareTitle{font-size:17px;font-weight:800;color:#0f172a;margin:0 0 4px}',
      '.siteShareHint{font-size:12px;color:#64748b;margin:0 0 14px;line-height:1.4}',
      '.siteShareQr{display:flex;justify-content:center;align-items:center;min-height:220px;margin:0 0 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px}',
      '.siteShareUrl{width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:10px 12px;font-size:12px;color:#334155;background:#f8fafc;margin:0 0 12px;box-sizing:border-box}',
      '.siteShareActions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}',
      '.siteShareActions .roster-cta-btn,.siteShareChoose .roster-cta-btn,.siteShareCloseWrap .roster-cta-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:42px;border-radius:999px;border:1px solid #cbd5e1;background:#f8fafc;font:inherit;font-size:13px;font-weight:800;color:#0f172a;cursor:pointer;padding:8px 12px;-webkit-tap-highlight-color:transparent}',
      '.siteShareActions .roster-cta-btn--share,.siteShareChoose .roster-cta-btn--share{background:#ecfdf5;border-color:#86efac;color:#166534}',
      '.siteShareActions .roster-cta-btn--compare{background:#fffbeb;border-color:#fcd34d;color:#92400e;grid-column:1/-1}',
      '.siteShareActions .roster-cta-btn--roster{background:#eff6ff;border-color:#93c5fd;color:#1e40af}',
      '.siteShareChoose{display:grid;gap:10px;margin:0 0 12px}',
      '.siteShareChoose .roster-cta-btn--alumni{background:#ecfdf5;border-color:#5eead4;color:#0f766e}',
      '.siteShareChoose .roster-cta-btn--compose{background:#eff6ff;border-color:#93c5fd;color:#1e40af}',
      '.siteShareCloseWrap{display:grid;gap:8px;margin-top:4px}',
      '.siteShareCloseWrap .roster-cta-btn--muted{background:#f1f5f9;border-color:#cbd5e1;color:#475569}',
      '.roster-cta-icon{display:inline-flex;line-height:0}',
    ].join('');
    document.head.appendChild(style);
  }

  function injectModal() {
    if (document.getElementById('siteShareSheet')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div id="siteShareSheet" class="siteShareSheet" aria-hidden="true">' +
        '<div class="siteShareCard" role="dialog" aria-labelledby="siteShareTitle">' +
          '<h2 class="siteShareTitle" id="siteShareTitle">Share this site</h2>' +
          '<p class="siteShareHint" id="siteShareHint">Scan the QR code or share the link</p>' +
          '<div class="siteShareChoose" id="siteShareChoose" hidden>' +
            '<button type="button" class="roster-cta-btn roster-cta-btn--alumni" id="siteShareChoosePage">' +
              '<span class="roster-cta-label">Alumni page</span></button>' +
            '<button type="button" class="roster-cta-btn roster-cta-btn--compose" id="siteShareChooseCompose">' +
              '<span class="roster-cta-label">Write a thank-you message</span></button>' +
          '</div>' +
          '<div id="siteShareTools">' +
            '<div class="siteShareQr" id="siteShareQr"></div>' +
            '<input class="siteShareUrl" id="siteShareUrl" type="text" readonly dir="ltr" inputmode="none" aria-label="Share URL"/>' +
            '<div class="siteShareActions">' +
              '<button type="button" class="roster-cta-btn roster-cta-btn--roster siteShareNativeBtn" id="siteShareNativeBtn">' +
                '<span class="roster-cta-icon">' + ICONS.share + '</span><span class="roster-cta-label">Share</span></button>' +
              '<button type="button" class="roster-cta-btn roster-cta-btn--share siteShareWhatsAppBtn" id="siteShareWhatsAppBtn">' +
                '<span class="roster-cta-icon">' + ICONS.whatsapp + '</span><span class="roster-cta-label">WhatsApp</span></button>' +
              '<button type="button" class="roster-cta-btn roster-cta-btn--compare siteShareCopyBtn" id="siteShareCopyBtn">' +
                '<span class="roster-cta-icon">' + ICONS.link + '</span><span class="roster-cta-label">Copy link</span></button>' +
            '</div>' +
          '</div>' +
          '<div class="siteShareCloseWrap">' +
            '<button type="button" class="roster-cta-btn roster-cta-btn--muted" id="siteShareBackBtn" hidden>' +
              '<span class="roster-cta-label">Back</span></button>' +
            '<button type="button" class="roster-cta-btn roster-cta-btn--muted siteShareCloseBtn" id="siteShareCloseBtn">' +
              '<span class="roster-cta-label">Close</span></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap.firstElementChild);
  }

  function injectButton() {
    if (document.getElementById('shareSiteBtn')) return;
    var actions = document.querySelector('.quickActions.roster-cta');
    if (!actions) return;
  }

  function init() {
    injectStyles();
    injectModal();
    injectButton();
    bindUi();
    applyI18n();
  }

  window.rosterSiteShare = {
    setLang: function () {
      applyI18n();
    },
    open: openModal,
    close: closeModal,
    getUrl: getShareUrl,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
