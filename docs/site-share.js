/**
 * Site share: QR code + Web Share / WhatsApp / copy link.
 */
(function () {
  'use strict';

  var QR_CDN = 'https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.js';
  var qrLibPromise = null;

  function qrImageUrl(url) {
    return (
      'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=' +
      encodeURIComponent(url)
    );
  }

  var I18N = {
    en: {
      btn: '🔗 Share Site',
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
      btn: '🔗 مشاركة الموقع',
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

  function lang() {
    var l = localStorage.getItem('rosterLang') || document.documentElement.getAttribute('lang') || 'en';
    return l === 'ar' ? 'ar' : 'en';
  }

  function t(key) {
    var pack = I18N[lang()] || I18N.en;
    return pack[key] || I18N.en[key] || key;
  }

  function getShareUrl() {
    try {
      var u = new URL(location.href);
      u.hash = '';
      return u.toString();
    } catch (e) {
      return location.href.split('#')[0];
    }
  }

  function getPageDateIso() {
    var path = location.pathname || '/';
    var m = path.match(/\/date\/(\d{4}-\d{2}-\d{2})\//);
    if (m) return m[1];
    m = path.match(/\/import\/date\/(\d{4}-\d{2}-\d{2})\//);
    if (m) return m[1];
    m = path.match(/\/import\/(\d{4}-\d{2}-\d{2})\//);
    if (m) return m[1];
    var picker = document.getElementById('datePicker');
    if (picker && picker.value) return picker.value;
    return '';
  }

  function formatDateFromIso(iso, isAr) {
    var parts = String(iso).split('-');
    if (parts.length !== 3) return iso;
    var y = +parts[0];
    var mo = +parts[1] - 1;
    var d = +parts[2];
    if (isAr) {
      var arMonths = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
      ];
      return d + ' ' + arMonths[mo] + ' ' + y;
    }
    var enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return d + ' ' + enMonths[mo] + ' ' + y;
  }

  function getShareDateLabel() {
    var tag = document.getElementById('dateTag');
    if (tag) {
      var fromTag = tag.textContent.replace(/^\s*📅\s*/, '').trim();
      if (fromTag) return fromTag;
    }
    var iso = getPageDateIso();
    if (!iso) return '';
    return formatDateFromIso(iso, lang() === 'ar');
  }

  /** Message line sent with WhatsApp / system share (includes roster date). */
  function getShareText() {
    var dateLabel = getShareDateLabel();
    if (dateLabel) {
      return lang() === 'ar'
        ? 'جدول المناوبات — ' + dateLabel
        : 'Duty Roster — ' + dateLabel;
    }
    return t('shareText');
  }

  function getSharePayload() {
    var url = getShareUrl();
    var text = getShareText();
    return { title: text, text: text + '\n' + url, url: url };
  }

  function loadQrLib() {
    if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
      return Promise.resolve(window.QRCode);
    }
    if (qrLibPromise) return qrLibPromise;
    qrLibPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = QR_CDN;
      s.async = true;
      s.onload = function () {
        if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
          resolve(window.QRCode);
        } else {
          reject(new Error('QRCode global missing'));
        }
      };
      s.onerror = function () {
        reject(new Error('QR library failed'));
      };
      document.head.appendChild(s);
    });
    return qrLibPromise;
  }

  function renderQrImage(wrap, url) {
    wrap.innerHTML = '';
    var img = document.createElement('img');
    img.alt = 'QR code';
    img.width = 220;
    img.height = 220;
    img.decoding = 'async';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    img.src = qrImageUrl(url);
    wrap.appendChild(img);
    wrap.removeAttribute('aria-hidden');
  }

  function applyI18n() {
    var btn = document.getElementById('shareSiteBtn');
    if (btn) btn.textContent = t('btn');
    var sheet = document.getElementById('siteShareSheet');
    if (!sheet) return;
    var title = document.getElementById('siteShareTitle');
    var hint = document.getElementById('siteShareHint');
    var nativeBtn = document.getElementById('siteShareNativeBtn');
    var waBtn = document.getElementById('siteShareWhatsAppBtn');
    var copyBtn = document.getElementById('siteShareCopyBtn');
    var closeBtn = document.getElementById('siteShareCloseBtn');
    if (title) title.textContent = t('title');
    if (hint) hint.textContent = t('hint');
    if (nativeBtn) nativeBtn.textContent = t('share');
    if (waBtn) waBtn.textContent = t('whatsapp');
    if (copyBtn && copyBtn.dataset.copied !== '1') copyBtn.textContent = t('copy');
    if (closeBtn) closeBtn.textContent = t('close');
    sheet.setAttribute('dir', lang() === 'ar' ? 'rtl' : 'ltr');
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

  function openModal() {
    var sheet = document.getElementById('siteShareSheet');
    if (!sheet) return;
    var url = getShareUrl();
    var urlEl = document.getElementById('siteShareUrl');
    if (urlEl) {
      urlEl.textContent = url;
      urlEl.setAttribute('title', url);
    }
    applyI18n();
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
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
  }

  function shareNative() {
    var payload = getSharePayload();
    if (navigator.share) {
      navigator.share(payload).catch(function () {});
    }
  }

  function shareWhatsApp() {
    var payload = getSharePayload();
    window.open(
      'https://api.whatsapp.com/send?text=' + encodeURIComponent(payload.text),
      '_blank',
      'noopener'
    );
  }

  function copyLink() {
    var url = getShareUrl();
    var copyBtn = document.getElementById('siteShareCopyBtn');
    function done() {
      if (!copyBtn) return;
      copyBtn.dataset.copied = '1';
      copyBtn.textContent = t('copied');
      setTimeout(function () {
        copyBtn.dataset.copied = '0';
        copyBtn.textContent = t('copy');
      }, 2000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(fallback);
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        done();
      } catch (e) {}
      ta.remove();
    }
  }

  function bindUi() {
    var btn = document.getElementById('shareSiteBtn');
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
      });
    }
    var sheet = document.getElementById('siteShareSheet');
    if (!sheet || sheet.dataset.bound) return;
    sheet.dataset.bound = '1';
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
      'button.btn{border:none;cursor:pointer;font-family:inherit;touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
      '.btn.shareSiteBtn{background:linear-gradient(135deg,#0d9488,#14b8a6)!important;box-shadow:0 6px 20px rgba(13,148,136,.28)!important}',
      '.siteShareSheet{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.45);z-index:10001;padding:16px;pointer-events:none;visibility:hidden}',
      '.siteShareSheet.open{display:flex;pointer-events:auto;visibility:visible}',
      '.siteShareCard{width:min(100%,360px);background:#fff;border-radius:18px;padding:18px 16px 14px;border:1px solid rgba(15,23,42,.1);box-shadow:0 20px 48px rgba(15,23,42,.22);text-align:center}',
      '.siteShareTitle{font-size:17px;font-weight:800;color:#0f172a;margin:0 0 4px}',
      '.siteShareHint{font-size:12px;color:#64748b;margin:0 0 14px;line-height:1.4}',
      '.siteShareQr{display:flex;align-items:center;justify-content:center;min-height:220px;margin:0 auto 12px;background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;padding:10px}',
      '.siteShareUrl{font-size:11px;color:#475569;word-break:break-all;line-height:1.45;margin:0 0 14px;padding:8px 10px;background:#f1f5f9;border-radius:10px}',
      '.siteShareActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}',
      '.siteShareBtn{border:none;border-radius:12px;padding:11px 10px;cursor:pointer;font:800 13px/1 "Segoe UI",system-ui,sans-serif;touch-action:manipulation}',
      '.siteShareNativeBtn{background:linear-gradient(135deg,#1e40af,#1976d2);color:#fff}',
      '.siteShareWhatsAppBtn{background:#dcfce7;color:#166534}',
      '.siteShareCopyBtn{grid-column:1/-1;background:#e8eefc;color:#1e40af}',
      '.siteShareCloseBtn{width:100%;background:#f1f5f9;color:#475569;margin-top:4px}',
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
          '<div class="siteShareQr" id="siteShareQr"></div>' +
          '<p class="siteShareUrl" id="siteShareUrl"></p>' +
          '<div class="siteShareActions">' +
            '<button type="button" class="siteShareBtn siteShareNativeBtn" id="siteShareNativeBtn">Share</button>' +
            '<button type="button" class="siteShareBtn siteShareWhatsAppBtn" id="siteShareWhatsAppBtn">WhatsApp</button>' +
            '<button type="button" class="siteShareBtn siteShareCopyBtn" id="siteShareCopyBtn">Copy link</button>' +
          '</div>' +
          '<button type="button" class="siteShareBtn siteShareCloseBtn" id="siteShareCloseBtn">Close</button>' +
        '</div>' +
      '</div>';
    var sheet = wrap.firstElementChild;
    document.body.appendChild(sheet);
  }

  function injectButton() {
    if (document.getElementById('shareSiteBtn')) return;
    var actions = document.querySelector('.quickActions');
    if (!actions) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn shareSiteBtn';
    btn.id = 'shareSiteBtn';
    btn.textContent = t('btn');
    actions.appendChild(btn);
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
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
