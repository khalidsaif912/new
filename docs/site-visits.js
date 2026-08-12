/**
 * Site visitor counts (today + this month).
 * Counts unique visitors from Mantle visit log. Mounted outside `.footer`.
 */
(function () {
  'use strict';

  var NS = 'khalidsaif912.github.io';
  // Legacy Abacus keys kept for optional TOTAL baseline only (read, never hit from here).
  var TOTAL_KEY = 'total-visits';
  var CACHE_KEY = 'rosterVisitCountsV3';
  var TOTAL_FLOOR_KEY = 'rosterVisitTotalFloor';
  var cached = { day: null, month: null, total: null, dayKey: '', monthKey: '' };
  var booted = false;
  var loading = false;
  var loadPromise = null;

  var I18N = {
    en: { day: 'Today', month: 'This month', total: 'Total' },
    ar: { day: 'زوار اليوم', month: 'هذا الشهر', total: 'الإجمالي' }
  };

  var HOST_HTML =
    '<span class="svPart"><span class="svLabel" id="siteVisitsDayLabel"></span><span class="svNum" id="siteVisitsDay">--</span></span>' +
    '<span class="svDot" aria-hidden="true">·</span>' +
    '<span class="svPart"><span class="svLabel" id="siteVisitsMonthLabel"></span><span class="svNum" id="siteVisitsMonth">--</span></span>' +
    '<span class="svDot" aria-hidden="true">·</span>' +
    '<span class="svPart"><span class="svLabel" id="siteVisitsTotalLabel"></span><span class="svNum" id="siteVisitsTotal">--</span></span>';

  function lang() {
    var l = localStorage.getItem('rosterLang') || document.documentElement.getAttribute('lang') || 'en';
    return l === 'ar' ? 'ar' : 'en';
  }

  function muscatYmd() {
    try {
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Muscat',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (p) {
        if (p.type !== 'literal') map[p.type] = p.value;
      });
      return {
        day: map.year + '-' + map.month + '-' + map.day,
        month: map.year + '-' + map.month
      };
    } catch (e) {
      var d = new Date();
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      return { day: y + '-' + m + '-' + day, month: y + '-' + m };
    }
  }

  function formatCount(n) {
    var num = Number(n);
    if (!isFinite(num) || num < 0) return '--';
    num = Math.floor(num);
    try {
      return num.toLocaleString(lang() === 'ar' ? 'ar' : 'en-US');
    } catch (e) {
      return String(num);
    }
  }

  function ensureVisitsFont() {
    if (document.getElementById('siteVisitsFont')) return;
    try {
      var link = document.createElement('link');
      link.id = 'siteVisitsFont';
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    } catch (e) {}
  }

  function injectVisitsStyles() {
    ensureVisitsFont();
    if (document.getElementById('siteVisitsStyles')) return;
    var st = document.createElement('style');
    st.id = 'siteVisitsStyles';
    st.textContent =
      '#siteVisitsHost.siteVisitsHost,.footer #siteVisitsHost{' +
      'display:flex!important;flex-direction:row!important;justify-content:center!important;' +
      'align-items:baseline!important;flex-wrap:nowrap!important;gap:0!important;' +
      'visibility:visible!important;opacity:1!important;position:relative!important;z-index:5!important;' +
      'margin:0!important;padding:0!important;width:auto!important;max-width:100%!important;' +
      'font-family:"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif!important;' +
      'font-size:13px!important;font-weight:400!important;line-height:1.6!important;' +
      'letter-spacing:.01em!important;color:#64748b!important;background:none!important;border:0!important}' +
      '#siteVisitsHost .svPart{display:flex!important;flex-direction:row!important;' +
      'align-items:baseline!important;gap:4px!important;white-space:nowrap!important}' +
      '#siteVisitsHost .svLabel{font-size:11px!important;font-weight:400!important;color:#94a3b8!important;line-height:1.6!important}' +
      '#siteVisitsHost .svNum{font-size:11px!important;font-weight:700!important;color:#1e40af!important;' +
      'font-variant-numeric:tabular-nums!important;line-height:1.6!important}' +
      '#siteVisitsHost .svDot{display:block!important;width:22px!important;text-align:center!important;' +
      'color:#cbd5e1!important;font-size:11px!important;line-height:1.6!important;flex-shrink:0!important}';
    document.head.appendChild(st);
  }

  function readPersisted(keys) {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) raw = localStorage.getItem('rosterVisitCountsV2');
      if (!raw) raw = localStorage.getItem('rosterVisitCountsV1');
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data) return;
      if (data.dayKey === keys.day && data.day != null) cached.day = Number(data.day);
      if (data.monthKey === keys.month && data.month != null) cached.month = Number(data.month);
      if (data.total != null) cached.total = Number(data.total);
      cached.dayKey = keys.day;
      cached.monthKey = keys.month;
    } catch (e) {}
  }

  function persistCounts(keys) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          dayKey: keys.day,
          monthKey: keys.month,
          day: cached.day,
          month: cached.month,
          total: cached.total
        })
      );
    } catch (e) {}
  }

  function xhrJson(url) {
    return new Promise(function (resolve, reject) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.timeout = 8000;
        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error('HTTP ' + xhr.status));
          }
        };
        xhr.onerror = function () { reject(new Error('xhr error')); };
        xhr.ontimeout = function () { reject(new Error('xhr timeout')); };
        xhr.send();
      } catch (e) {
        reject(e);
      }
    });
  }

  function fetchJson(url) {
    if (typeof fetch === 'function') {
      return fetch(url, { cache: 'no-store', mode: 'cors' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .catch(function () {
          return xhrJson(url);
        });
    }
    return xhrJson(url);
  }

  function parseCount(data) {
    if (data == null) return null;
    if (typeof data.value === 'number' && isFinite(data.value)) return Math.max(0, Math.floor(data.value));
    if (typeof data.count === 'number' && isFinite(data.count)) return Math.max(0, Math.floor(data.count));
    return null;
  }

  /** Read-only Abacus/CounterAPI — used only as a lifetime floor when Mantle log is pruned. */
  function getLegacyTotalOnly() {
    var abacusGet = 'https://abacus.jasoncameron.dev/get/' + NS + '/' + TOTAL_KEY;
    var counterGet = 'https://api.counterapi.dev/v1/roster-site-new/' + TOTAL_KEY;
    return fetchJson(abacusGet)
      .then(parseCount)
      .catch(function () {
        return fetchJson(counterGet).then(parseCount);
      })
      .catch(function () {
        return null;
      });
  }

  function removeLegacyFooterRow() {
    var legacy = document.querySelector('.footer #siteVisitsRow');
    if (legacy && legacy.parentNode) legacy.parentNode.removeChild(legacy);
  }

  /**
   * Place stats ABOVE the 3 footer buttons.
   * Prefer inside .footer; if language switch rewrites footer.innerHTML and
   * drops the host, re-insert. Falls back to a sibling after .footer so a full
   * footer wipe cannot orphan counts forever.
   */
  function placeHostInFooter(host, footer) {
    var buttons =
      footer.querySelector('.bgTextureShuffleWrap') ||
      document.querySelector('.bgTextureShuffleWrap');
    if (buttons && buttons.parentNode === footer) {
      footer.insertBefore(host, buttons);
      return;
    }
    if (buttons && buttons.parentNode) {
      buttons.parentNode.insertBefore(host, buttons);
      return;
    }
    footer.appendChild(host);
  }

  function ensureHost() {
    injectVisitsStyles();
    removeLegacyFooterRow();
    var footer = document.querySelector('.footer');
    if (!footer) return null;

    var host = document.getElementById('siteVisitsHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'siteVisitsHost';
      host.className = 'siteVisitsHost';
      host.setAttribute('aria-label', 'Visitor stats');
      host.innerHTML = HOST_HTML;
    } else if (
      !host.querySelector('.svPart') ||
      host.querySelector('.svChip') ||
      !document.getElementById('siteVisitsDay')
    ) {
      // Upgrade legacy chip / single-line markup to pure text layout
      host.className = 'siteVisitsHost';
      host.innerHTML = HOST_HTML;
    }

    placeHostInFooter(host, footer);
    host.hidden = false;
    host.removeAttribute('hidden');
    host.style.display = '';
    host.style.visibility = 'visible';
    host.style.opacity = '1';
    return host;
  }

  function paintLabels() {
    var pack = I18N[lang()] || I18N.en;
    var dayLbl = document.getElementById('siteVisitsDayLabel');
    var monthLbl = document.getElementById('siteVisitsMonthLabel');
    var totalLbl = document.getElementById('siteVisitsTotalLabel');
    if (dayLbl) dayLbl.textContent = pack.day;
    if (monthLbl) monthLbl.textContent = pack.month;
    if (totalLbl) totalLbl.textContent = pack.total;
    var host = document.getElementById('siteVisitsHost');
    if (host) host.setAttribute('dir', lang() === 'ar' ? 'rtl' : 'ltr');
  }

  function paintCounts() {
    var dayEl = document.getElementById('siteVisitsDay');
    var monthEl = document.getElementById('siteVisitsMonth');
    if (dayEl && cached.day != null && !isNaN(Number(cached.day))) {
      dayEl.textContent = formatCount(cached.day);
    }
    if (monthEl && cached.month != null && !isNaN(Number(cached.month))) {
      monthEl.textContent = formatCount(cached.month);
    }
    var totalEl = document.getElementById('siteVisitsTotal');
    if (totalEl && cached.total != null && !isNaN(Number(cached.total))) {
      totalEl.textContent = formatCount(cached.total);
    }
  }

  function paint() {
    if (!ensureHost()) return;
    paintLabels();
    paintCounts();
  }

  /**
   * Authoritative counts from Mantle visit log.
   * One log row = one unique visitor for that calendar day (merged by id+day).
   */
  function countsFromLog(list, keys) {
    var dayN = 0;
    var monthN = 0;
    var totalN = 0;
    var seenDay = Object.create(null);
    var seenMonth = Object.create(null);
    var seenTotal = Object.create(null);
    (Array.isArray(list) ? list : []).forEach(function (row) {
      if (!row) return;
      var id = String(row.id || '').trim();
      var day = String(row.day || '').trim();
      if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
      var stamp = day + ':' + id;
      if (!seenTotal[stamp]) {
        seenTotal[stamp] = 1;
        totalN += 1;
      }
      if (day === keys.day && !seenDay[id]) {
        seenDay[id] = 1;
        dayN += 1;
      }
      if (day.indexOf(keys.month) === 0 && !seenMonth[stamp]) {
        seenMonth[stamp] = 1;
        monthN += 1;
      }
    });
    return { day: dayN, month: monthN, total: totalN };
  }

  function readTotalFloor() {
    try {
      var n = Number(localStorage.getItem(TOTAL_FLOOR_KEY));
      return isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch (e) {
      return 0;
    }
  }

  function raiseTotalFloor(n) {
    n = Number(n);
    if (!isFinite(n) || n < 0) return;
    n = Math.floor(n);
    try {
      var cur = readTotalFloor();
      if (n > cur) localStorage.setItem(TOTAL_FLOOR_KEY, String(n));
    } catch (e) {}
  }

  function applyCountsFromList(list, keys) {
    keys = keys || muscatYmd();
    var c = countsFromLog(list, keys);
    cached.day = c.day;
    cached.month = c.month;
    cached.dayKey = keys.day;
    cached.monthKey = keys.month;
    // Total: never go below log-derived value or a previously observed floor /
    // legacy Abacus total (log is capped ~220 rows by size, so lifetime can be higher).
    var floor = Math.max(c.total, readTotalFloor());
    cached.total = floor;
    raiseTotalFloor(floor);
    persistCounts(keys);
    paint();
    return c;
  }

  function fetchVisitLogList() {
    return fetch(VISIT_LOG_URL + '?ts=' + Date.now(), {
      headers: visitHeaders(),
      cache: 'no-store'
    }).then(function (r) {
      if (!r.ok) throw new Error('read');
      return r.json();
    }).then(function (cur) {
      return Array.isArray(cur && cur.log) ? cur.log.slice() : [];
    });
  }

  function loadCounts() {
    if (loadPromise) return loadPromise;
    loadPromise = doLoadCounts().then(
      function (v) {
        loadPromise = null;
        return v;
      },
      function (err) {
        loadPromise = null;
        throw err;
      }
    );
    return loadPromise;
  }

  function doLoadCounts() {
    if (loading) return Promise.resolve();
    loading = true;
    var keys = muscatYmd();

    return fetchVisitLogList()
      .then(function (list) {
        applyCountsFromList(list, keys);
        // Blend legacy public total so pruning Mantle does not shrink the displayed lifetime total.
        return getLegacyTotalOnly().then(function (legacy) {
          if (legacy != null) {
            var next = Math.max(Number(cached.total || 0), Number(legacy) || 0, countsFromLog(list, keys).total);
            cached.total = next;
            raiseTotalFloor(next);
            persistCounts(keys);
            paint();
          }
        });
      })
      .catch(function () {
        paint();
      })
      .then(function () {
        loading = false;
      });
  }

  function hookLang() {
    if (window.__siteVisitsLangHooked) return;
    window.__siteVisitsLangHooked = true;
    var orig = window.applyLang;
    if (typeof orig === 'function') {
      window.applyLang = function (l) {
        orig(l);
        window.setTimeout(paint, 0);
      };
    }
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('#langToggle')) {
        window.setTimeout(paint, 0);
      }
    });
  }

  function hookFooter() {
    var footer = document.querySelector('.footer');
    if (!footer || footer.__siteVisitsObs) return;
    footer.__siteVisitsObs = true;
    var timer = null;
    var obs = new MutationObserver(function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(paint, 0);
    });
    obs.observe(footer, { childList: true, subtree: false });
  }

  function getRosterIdentity() {
    try {
      var id = (
        localStorage.getItem('exportSavedEmpId') ||
        localStorage.getItem('savedEmpId') ||
        localStorage.getItem('importSavedEmpId') ||
        ''
      ).trim();
      var name = (
        localStorage.getItem('exportSavedEmpName') ||
        localStorage.getItem('savedEmpName') ||
        localStorage.getItem('importSavedEmpName') ||
        ''
      ).trim();
      if (!id || !/^\d+$/.test(id)) return null;
      return { id: id, name: name };
    } catch (e) {
      return null;
    }
  }

  /** Coarse section + optional detail (path), e.g. roster:2026-08-05, tools:whatsapp-text */
  function pageVisitInfo() {
    try {
      var p = String(location.pathname || '/');
      var rel = p;
      var docs = p.match(/\/docs\/(.*)$/);
      if (docs) rel = '/' + docs[1];
      rel = rel.replace(/\/index\.html?$/i, '/').replace(/\/{2,}/g, '/');
      if (rel.length > 1) rel = rel.replace(/\/$/, '');
      if (!rel) rel = '/';

      var section = 'home';
      var detail = '';

      if (/\/ideas(\/|$)/.test(p)) {
        section = 'ideas';
      } else if (/\/read-and-sign(\/|$)/.test(p)) {
        section = 'read-and-sign';
      } else if (/\/desk-log(\/|$)/.test(p)) {
        section = 'desk-log';
      } else if (/\/a-cup-of-book(\/|$)/.test(p)) {
        section = 'a-cup-of-book';
      } else if (/\/calculator(\/|$)/.test(p)) {
        section = 'calculator';
      } else if (/\/ticker-board(\/|$)/.test(p)) {
        section = 'ticker-board';
      } else if (/\/my-emoji(\/|$)/.test(p)) {
        section = 'my-emoji';
      } else if (/\/alumni(\/|$)/.test(p)) {
        section = 'alumni';
      } else if (/\/training(\/|$)/.test(p)) {
        section = 'training';
        var arch = p.match(/\/training\/archive\/([^/]+)/);
        if (arch) {
          detail = String(arch[1] || '').replace(/\.html?$/i, '');
        } else {
          var tsub = p.match(/\/training\/([^/]+)/);
          if (tsub && tsub[1]) detail = String(tsub[1]).replace(/\.html?$/i, '');
        }
      } else if (/\/tools\/([^/]+)/.test(p)) {
        section = 'tools';
        detail = (p.match(/\/tools\/([^/]+)/) || [])[1] || '';
      } else if (/\/import\/my-schedules(\/|$)/.test(p) || /\/my-schedules(\/|$)/.test(p)) {
        section = 'my-schedules';
        if (/\/import\//.test(p)) detail = 'import';
      } else if (/\/import(\/|$)/.test(p)) {
        section = 'import';
        var idate = p.match(/\/import\/date\/(\d{4}-\d{2}-\d{2})/);
        if (idate) detail = idate[1];
        else if (/\/import\/now(\/|$)/.test(p)) detail = 'now';
      } else if (/\/date\/(\d{4}-\d{2}-\d{2})/.test(p)) {
        section = 'roster';
        detail = (p.match(/\/date\/(\d{4}-\d{2}-\d{2})/) || [])[1] || '';
        if (/\/now(\/|$)/.test(p)) detail += detail ? '/now' : 'now';
      } else if (/\/now(\/|$)/.test(p)) {
        section = 'roster';
        detail = 'now';
      } else if (/\/roster-diff(\/|$)/.test(p)) {
        section = 'roster-diff';
      }

      var key = section + (detail ? ':' + detail : '');
      return { section: section, detail: detail, key: key, path: rel.slice(0, 100) };
    } catch (e) {
      return { section: 'site', detail: '', key: 'site', path: '/' };
    }
  }

  function resolveClientGeo() {
    var CACHE = 'rosterVisitGeoV1';
    try {
      var cached = JSON.parse(sessionStorage.getItem(CACHE) || 'null');
      if (cached && (cached.ip || cached.city || cached.country) && Date.now() - Number(cached.at || 0) < 6 * 3600 * 1000) {
        return Promise.resolve(cached);
      }
    } catch (e0) {}

    function pack(partial) {
      var out = {
        ip: String((partial && partial.ip) || '').slice(0, 64),
        city: String((partial && partial.city) || '').slice(0, 48),
        region: String((partial && partial.region) || '').slice(0, 48),
        country: String((partial && partial.country) || '').slice(0, 48),
        countryCode: String((partial && partial.countryCode) || '').slice(0, 8),
        at: Date.now()
      };
      try {
        sessionStorage.setItem(CACHE, JSON.stringify(out));
      } catch (e1) {}
      return out;
    }

    // HTTPS free lookups (works from GitHub Pages without mixed-content issues).
    return fetch('https://ipwho.is/', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('geo');
        return r.json();
      })
      .then(function (j) {
        if (!j || j.success === false) throw new Error('geo');
        return pack({
          ip: j.ip,
          city: j.city,
          region: j.region,
          country: j.country,
          countryCode: j.country_code
        });
      })
      .catch(function () {
        return fetch('https://get.geojs.io/v1/ip/geo.json', { cache: 'no-store' })
          .then(function (r) {
            if (!r.ok) throw new Error('geo2');
            return r.json();
          })
          .then(function (j) {
            return pack({
              ip: j && j.ip,
              city: j && j.city,
              region: j && j.region,
              country: j && j.country,
              countryCode: j && j.country_code
            });
          });
      })
      .catch(function () {
        return pack({});
      });
  }

  // Optional: mirror visits to VPS (needs open CORS; HTTPS recommended later).
  var ROSTER_VISIT_SERVER = 'http://158.220.106.38:3000/api/roster-visits';
  var ROSTER_VISIT_KEY = 'rv_roster_geo_2026';

  function pingVisitServer(row) {
    try {
      if (!ROSTER_VISIT_SERVER || !row) return;
      fetch(ROSTER_VISIT_SERVER, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'X-Roster-Visit-Key': ROSTER_VISIT_KEY
        },
        body: JSON.stringify({
          id: row.id,
          name: row.name || '',
          guest: !!row.guest,
          day: row.day,
          at: row.at || Date.now(),
          page: row.page || '',
          pages: row.pages || [],
          device: row.device || '',
          model: row.model || '',
          ip: row.ip || '',
          city: row.city || '',
          region: row.region || '',
          country: row.country || '',
          countryCode: row.countryCode || '',
          key: ROSTER_VISIT_KEY
        })
      }).catch(function () {});
    } catch (e) {}
  }

  function screenKey() {
    var w = Math.min(Number(screen.width) || 0, Number(screen.height) || 0);
    var h = Math.max(Number(screen.width) || 0, Number(screen.height) || 0);
    var dpr = Math.round((Number(window.devicePixelRatio) || 1) * 10) / 10;
    return { w: w, h: h, dpr: dpr, key: w + 'x' + h + '@' + dpr };
  }

  function guessIphoneModel() {
    // Approximate marketing names — Safari hides the exact model in UA.
    var s = screenKey();
    var map = {
      '320x568@2': 'iPhone SE (1st)',
      '375x667@2': 'iPhone SE / 8',
      '414x736@3': 'iPhone 8 Plus',
      '375x812@3': 'iPhone X / XS / 11 Pro',
      '414x896@2': 'iPhone 11 / XR',
      '414x896@3': 'iPhone 11 Pro Max / XS Max',
      '360x780@3': 'iPhone 12/13 mini',
      '390x844@3': 'iPhone 12 / 13 / 14',
      '393x852@3': 'iPhone 14 Pro / 15 / 16',
      '428x926@3': 'iPhone 12–14 Pro Max / 15 Plus',
      '430x932@3': 'iPhone 16 Plus',
      '402x874@3': 'iPhone 16 Pro',
      '440x956@3': 'iPhone 16 Pro Max',
      '420x912@3': 'iPhone 17',
      '446x970@3': 'iPhone 17 Pro Max'
    };
    if (map[s.key]) return map[s.key];
    var loose = {
      '320x568': 'iPhone SE (1st)',
      '375x667': 'iPhone SE / 8',
      '414x736': 'iPhone 8 Plus',
      '375x812': 'iPhone X–11 Pro',
      '414x896': 'iPhone 11 / XR family',
      '360x780': 'iPhone mini',
      '390x844': 'iPhone 12–14',
      '393x852': 'iPhone 14 Pro / 15 / 16',
      '428x926': 'iPhone Pro Max / Plus',
      '430x932': 'iPhone 16 Plus',
      '402x874': 'iPhone 16 Pro',
      '440x956': 'iPhone 16 Pro Max'
    };
    return loose[s.w + 'x' + s.h] || '';
  }

  function guessIpadModel() {
    var s = screenKey();
    var map = {
      '768x1024@2': 'iPad',
      '810x1080@2': 'iPad 10th',
      '820x1180@2': 'iPad Air',
      '834x1112@2': 'iPad Air / Pro 10.5',
      '834x1194@2': 'iPad Pro 11',
      '1024x1366@2': 'iPad Pro 12.9'
    };
    return map[s.key] || 'iPad';
  }

  function parseAndroidModel(ua) {
    var m = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build|\s*\)|;)/i);
    if (!m) return '';
    var model = String(m[1] || '').trim().replace(/\s+Build.*$/i, '').trim();
    if (!model || /^(wv|Mobile|Linux)$/i.test(model)) return '';
    return model.slice(0, 48);
  }

  function parseWindowsModel(ua) {
    if (/Windows NT 10\.0/i.test(ua)) return 'Windows 10/11';
    if (/Windows NT 6\.3/i.test(ua)) return 'Windows 8.1';
    if (/Windows NT 6\.1/i.test(ua)) return 'Windows 7';
    return 'Windows';
  }

  function detectDeviceInfoSync() {
    var info = { device: 'Other', model: '' };
    try {
      var ua = String(navigator.userAgent || '');
      var touch = Number(navigator.maxTouchPoints || 0);
      var coarse = false;
      try {
        coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      } catch (e1) {}

      if (/iPhone/i.test(ua)) {
        info.device = 'iPhone';
        info.model = guessIphoneModel() || 'iPhone';
        return info;
      }
      if (/iPad/i.test(ua) || (navigator.platform === 'MacIntel' && touch > 1)) {
        info.device = 'iPad';
        info.model = guessIpadModel() || 'iPad';
        return info;
      }
      if (/Android/i.test(ua)) {
        var androidModel = parseAndroidModel(ua);
        if (/Mobile/i.test(ua) || (coarse && touch > 0)) {
          info.device = 'Android';
          info.model = androidModel || 'Android';
        } else {
          info.device = 'Android Tablet';
          info.model = androidModel || 'Android Tablet';
        }
        return info;
      }
      if (/Windows Phone|IEMobile/i.test(ua)) {
        info.device = 'Windows Phone';
        info.model = 'Windows Phone';
        return info;
      }
      if (/Windows NT/i.test(ua)) {
        info.device = 'Windows';
        info.model = parseWindowsModel(ua);
        return info;
      }
      if (/Mac OS X|Macintosh/i.test(ua)) {
        info.device = 'Mac';
        info.model = 'Mac';
        return info;
      }
      if (/CrOS/i.test(ua)) {
        info.device = 'Chromebook';
        info.model = 'Chromebook';
        return info;
      }
      if (/Linux/i.test(ua)) {
        info.device = touch > 0 || coarse ? 'Linux Tablet' : 'Linux';
        info.model = info.device;
        return info;
      }
      if (coarse || touch > 1) {
        info.device = 'Mobile';
        info.model = 'Mobile';
      }
    } catch (e) {}
    return info;
  }

  function detectDeviceInfo() {
    var info = detectDeviceInfoSync();
    try {
      if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
        return navigator.userAgentData
          .getHighEntropyValues(['model', 'platform', 'platformVersion'])
          .then(function (hints) {
            var hintModel = String((hints && hints.model) || '').trim();
            if (hintModel && hintModel !== 'Unknown' && hintModel !== 'K') {
              info.model = hintModel;
            }
            var plat = String((hints && hints.platform) || '').toLowerCase();
            if (plat.indexOf('android') >= 0 && info.device.indexOf('Android') < 0) {
              info.device = 'Android';
            } else if (plat.indexOf('windows') >= 0) {
              info.device = 'Windows';
              if (!info.model || info.model === 'Windows') {
                var ver = String((hints && hints.platformVersion) || '').split('.')[0];
                info.model = ver ? 'Windows ' + ver : info.model;
              }
            } else if (plat === 'macos') {
              info.device = 'Mac';
            }
            return info;
          })
          .catch(function () {
            return info;
          });
      }
    } catch (e) {}
    return Promise.resolve(info);
  }

  var VISIT_LOG_NS = 'roster-site-visits';
  var VISIT_LOG_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  var VISIT_LOG_URL = 'https://mantledb.sh/v2/' + VISIT_LOG_NS + '/index';
  var PHONE_LOG_URL = 'https://mantledb.sh/v2/' + VISIT_LOG_NS + '/phones';
  // v4: also log guests without saved employee id (once/day per device).
  // v5: still one row per visitor/day, but merge every distinct page visited that day.
  var VISIT_LOGGED_KEY = 'rosterVisitLoggedDayV4';
  var VISIT_PAGES_KEY = 'rosterVisitPagesV5';
  var GUEST_ID_KEY = 'rosterVisitGuestId';
  var PHONE_PROMPT_KEY = 'rosterPhonePromptDone';
  var MAX_PAGES_PER_VISIT = 30;

  function docsBasePath() {
    try {
      var m = String(location.pathname || '').match(/^(.*?\/docs\/)/);
      return m ? m[1] : '/docs/';
    } catch (e) {
      return '/docs/';
    }
  }

  function cleanEmployeeName(name) {
    return String(name || '')
      .replace(/\s*[-–—]\s*\d+\s*$/, '')
      .trim();
  }

  function resolveEmployeeName(id, fallbackName) {
    var known = cleanEmployeeName(fallbackName);
    if (known) return Promise.resolve(known);
    var empId = String(id || '').trim();
    if (!empId || !/^\d+$/.test(empId)) return Promise.resolve('');
    var base = docsBasePath();
    var urls = [
      base + 'schedules/' + encodeURIComponent(empId) + '.json',
      base + 'import/schedules/' + encodeURIComponent(empId) + '.json'
    ];
    function tryNext(i) {
      if (i >= urls.length) return Promise.resolve('');
      return fetch(urls[i] + '?ts=' + Date.now(), { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('miss');
          return r.json();
        })
        .then(function (json) {
          var n = cleanEmployeeName(json && json.name);
          if (n) return n;
          return tryNext(i + 1);
        })
        .catch(function () {
          return tryNext(i + 1);
        });
    }
    return tryNext(0);
  }

  function getOrCreateGuestId() {
    try {
      var existing = String(localStorage.getItem(GUEST_ID_KEY) || '').trim();
      if (/^g-[a-z0-9]+$/i.test(existing)) return existing;
    } catch (e) {}
    var id = 'g-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    try { localStorage.setItem(GUEST_ID_KEY, id); } catch (e2) {}
    return id;
  }

  function visitHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Mantle-Key': VISIT_LOG_KEY
    };
  }

  function readLocalPageKeys(stamp) {
    try {
      var raw = localStorage.getItem(VISIT_PAGES_KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      if (!data || data.stamp !== stamp) return [];
      return Array.isArray(data.keys) ? data.keys.map(String) : [];
    } catch (e) {
      return [];
    }
  }

  function writeLocalPageKeys(stamp, pageKeys) {
    try {
      localStorage.setItem(
        VISIT_PAGES_KEY,
        JSON.stringify({ stamp: stamp, keys: (pageKeys || []).slice(0, MAX_PAGES_PER_VISIT) })
      );
    } catch (e) {}
  }

  function normalizePageEntry(item) {
    if (!item) return null;
    if (typeof item === 'string') {
      var k0 = String(item).trim();
      return k0 ? { k: k0, at: 0 } : null;
    }
    var k = String(item.k || item.page || item.key || '').trim();
    if (!k) return null;
    return { k: k, at: Number(item.at) || 0 };
  }

  function mergeVisitPages(existingPages, pageKey, at) {
    var list = [];
    var seen = {};
    (Array.isArray(existingPages) ? existingPages : []).forEach(function (raw) {
      var e = normalizePageEntry(raw);
      if (!e || seen[e.k]) return;
      seen[e.k] = 1;
      list.push(e);
    });
    if (!seen[pageKey]) {
      list.push({ k: pageKey, at: at || Date.now() });
    } else {
      list.forEach(function (e) {
        if (e.k === pageKey && at) e.at = at;
      });
    }
    if (list.length > MAX_PAGES_PER_VISIT) list = list.slice(list.length - MAX_PAGES_PER_VISIT);
    return list;
  }

  function shrinkLogPayload(kept) {
    // Keep well under Mantle free-tier limit (~64KB) so page merges still fit.
    var maxRows = 220;
    var maxBytes = 42000;
    if (kept.length > maxRows) kept.length = maxRows;
    while (kept.length > 1 && JSON.stringify({ log: kept }).length > maxBytes) {
      kept.pop();
    }
    var i = kept.length - 1;
    while (i >= 0 && JSON.stringify({ log: kept }).length > maxBytes) {
      var row = kept[i];
      if (row && Array.isArray(row.pages) && row.pages.length > 3) {
        row.pages = row.pages.slice(-Math.max(3, Math.floor(row.pages.length / 2)));
      } else if (kept.length > 1) {
        kept.pop();
        i = kept.length - 1;
        continue;
      } else {
        break;
      }
      i -= 1;
    }
    return kept;
  }

  function postVisitRow(row, stamp, attempt) {
    attempt = attempt || 0;
    var headers = visitHeaders();
    var pageKey = String((row && row.page) || '').trim() || 'site';
    var at = Number(row && row.at) || Date.now();
    var hints = [];
    try {
      hints = readLocalPageKeys(stamp).slice();
    } catch (e0) {}
    if (Array.isArray(row.localHints)) {
      row.localHints.forEach(function (k) {
        k = String(k || '').trim();
        if (k && hints.indexOf(k) < 0) hints.push(k);
      });
    }
    if (hints.indexOf(pageKey) < 0) hints.push(pageKey);

    return fetch(VISIT_LOG_URL + '?ts=' + Date.now(), { headers: headers, cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('read');
        return r.json();
      })
      .then(function (cur) {
        var list = Array.isArray(cur && cur.log) ? cur.log.slice() : [];
        var prev = null;
        var kept = [];
        list.forEach(function (item) {
          if (item && String(item.id) === String(row.id) && String(item.day) === String(row.day)) {
            prev = item;
          } else {
            kept.push(item);
          }
        });

        var basePages = prev && Array.isArray(prev.pages) ? prev.pages.slice() : [];
        if (!basePages.length && prev && prev.page) {
          basePages = [{ k: String(prev.page), at: Number(prev.at) || 0 }];
        }
        // Always re-merge every known local page so a wipe/race cannot permanently drop history.
        var pages = basePages.slice();
        hints.forEach(function (k) {
          pages = mergeVisitPages(pages, k, at);
        });
        pages = mergeVisitPages(pages, pageKey, at);

        var serverKeys = {};
        (basePages || []).forEach(function (p) {
          var e = normalizePageEntry(p);
          if (e) serverKeys[e.k] = 1;
        });
        var needWrite = false;
        pages.forEach(function (p) {
          if (p && p.k && !serverKeys[p.k]) needWrite = true;
        });
        if (!needWrite && prev && String(prev.page || '') === pageKey) {
          try {
            writeLocalPageKeys(
              stamp,
              pages.map(function (p) {
                return p.k;
              })
            );
            localStorage.setItem(VISIT_LOGGED_KEY, stamp);
          } catch (e1) {}
          try {
            // Still refresh footer from current list (includes prev row).
            var snap = kept.slice();
            snap.unshift(prev);
            applyCountsFromList(snap, muscatYmd());
          } catch (eSnap) {}
          return null;
        }

        var merged = {
          id: row.id,
          name: (row.name || (prev && prev.name) || '') || '',
          guest: !!(row.guest || (prev && prev.guest)),
          day: row.day,
          at: at,
          page: pageKey,
          pages: pages,
          device: (row.device || (prev && prev.device) || 'Other') || 'Other',
          model: (row.model || (prev && prev.model) || '') || '',
          ip: (row.ip || (prev && prev.ip) || '') || '',
          city: (row.city || (prev && prev.city) || '') || '',
          region: (row.region || (prev && prev.region) || '') || '',
          country: (row.country || (prev && prev.country) || '') || '',
          countryCode: (row.countryCode || (prev && prev.countryCode) || '') || '',
          v: 5
        };
        kept.unshift(merged);
        kept = shrinkLogPayload(kept);
        var body = JSON.stringify({ log: kept });

        return fetch(VISIT_LOG_URL, {
          method: 'POST',
          headers: headers,
          body: body
        }).then(function (r) {
          if (!r.ok) throw new Error('write ' + r.status);
          try {
            localStorage.setItem(VISIT_LOGGED_KEY, stamp);
            writeLocalPageKeys(
              stamp,
              pages.map(function (p) {
                return p.k;
              })
            );
          } catch (e2) {}
          try {
            applyCountsFromList(kept, muscatYmd());
          } catch (eCount) {}
          try {
            pingVisitServer(merged);
          } catch (e3) {}
        });
      })
      .catch(function (err) {
        if (attempt >= 2) throw err;
        return new Promise(function (resolve) {
          setTimeout(resolve, 400 * (attempt + 1));
        }).then(function () {
          return postVisitRow(row, stamp, attempt + 1);
        });
      });
  }

  function logSiteVisit() {
    var ident = getRosterIdentity();
    var keys = muscatYmd();
    var isGuest = !ident;
    var visitId = isGuest ? getOrCreateGuestId() : ident.id;
    var stamp = keys.day + ':' + visitId;
    var info = pageVisitInfo();
    var pageKey = info.key || pagePathLabel() || 'site';
    // Remember intent immediately (even if network fails).
    try {
      var known = readLocalPageKeys(stamp);
      if (known.indexOf(pageKey) < 0) {
        known.push(pageKey);
        writeLocalPageKeys(stamp, known);
      }
    } catch (eLocal) {}

    var namePromise = isGuest
      ? Promise.resolve('')
      : resolveEmployeeName(ident.id, ident.name);

    Promise.all([detectDeviceInfo(), namePromise, resolveClientGeo()])
      .then(function (pair) {
        var dev = pair[0];
        var resolvedName = pair[1] || '';
        var geo = pair[2] || {};
        if (!isGuest && resolvedName) {
          try {
            if (!localStorage.getItem('exportSavedEmpName') && !localStorage.getItem('savedEmpName') && !localStorage.getItem('importSavedEmpName')) {
              localStorage.setItem('exportSavedEmpName', resolvedName);
              localStorage.setItem('savedEmpName', resolvedName);
            }
          } catch (e3) {}
        }
        var at = Date.now();
        return postVisitRow(
          {
            id: visitId,
            name: resolvedName || '',
            guest: !!isGuest,
            day: keys.day,
            at: at,
            page: pageKey,
            localHints: readLocalPageKeys(stamp),
            pages: [{ k: pageKey, at: at }],
            device: (dev && dev.device) || 'Other',
            model: (dev && dev.model) || '',
            ip: (geo && geo.ip) || '',
            city: (geo && geo.city) || '',
            region: (geo && geo.region) || '',
            country: (geo && geo.country) || '',
            countryCode: (geo && geo.countryCode) || ''
          },
          stamp
        );
      })
      .catch(function () {});
  }

  /** Log an extra page key for the current visitor (e.g. schedule view). */
  function logPageKey(pageKey) {
    pageKey = String(pageKey || '')
      .trim()
      .replace(/\s+/g, '')
      .slice(0, 96);
    if (!pageKey) return Promise.resolve();

    var ident = getRosterIdentity();
    var keys = muscatYmd();
    var isGuest = !ident;
    var visitId = isGuest ? getOrCreateGuestId() : ident.id;
    var stamp = keys.day + ':' + visitId;
    try {
      var known = readLocalPageKeys(stamp);
      if (known.indexOf(pageKey) < 0) {
        known.push(pageKey);
        writeLocalPageKeys(stamp, known);
      }
    } catch (eLocal) {}

    var namePromise = isGuest ? Promise.resolve('') : resolveEmployeeName(ident.id, ident.name || '');

    return Promise.all([detectDeviceInfo(), namePromise, resolveClientGeo()])
      .then(function (pair) {
        var dev = pair[0];
        var resolvedName = pair[1] || '';
        var geo = pair[2] || {};
        var at = Date.now();
        return postVisitRow(
          {
            id: visitId,
            name: resolvedName || '',
            guest: !!isGuest,
            day: keys.day,
            at: at,
            page: pageKey,
            localHints: readLocalPageKeys(stamp),
            pages: [{ k: pageKey, at: at }],
            device: (dev && dev.device) || 'Other',
            model: (dev && dev.model) || '',
            ip: (geo && geo.ip) || '',
            city: (geo && geo.city) || '',
            region: (geo && geo.region) || '',
            country: (geo && geo.country) || '',
            countryCode: (geo && geo.countryCode) || ''
          },
          stamp
        );
      })
      .catch(function () {});
  }

  function logScheduleView(empId) {
    var id = String(empId || '')
      .replace(/[^\d]/g, '')
      .slice(0, 12);
    if (!id) return Promise.resolve();
    return logPageKey('my-schedules:emp:' + id);
  }

  function phonePromptDoneFor(empId) {
    try {
      var raw = String(localStorage.getItem(PHONE_PROMPT_KEY) || '');
      var list = raw ? raw.split(',').map(function (x) { return x.trim(); }) : [];
      return list.indexOf(String(empId)) >= 0;
    } catch (e) {
      return false;
    }
  }

  function markPhonePromptDone(empId) {
    try {
      var id = String(empId || '').trim();
      if (!id) return;
      var raw = String(localStorage.getItem(PHONE_PROMPT_KEY) || '');
      var list = raw ? raw.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : [];
      if (list.indexOf(id) < 0) list.push(id);
      localStorage.setItem(PHONE_PROMPT_KEY, list.join(','));
    } catch (e) {}
  }

  function normalizeOmanPhone(raw) {
    var p = String(raw || '').replace(/\D/g, '');
    if (p.startsWith('00')) p = p.slice(2);
    if (p.length === 8) p = '968' + p;
    return p;
  }

  function isValidOmanMobile(raw) {
    return /^968[79]\d{7}$/.test(normalizeOmanPhone(raw));
  }

  function ensurePhonePromptCss() {
    if (document.getElementById('rosterPhonePromptCss')) return;
    var style = document.createElement('style');
    style.id = 'rosterPhonePromptCss';
    style.textContent = [
      '.rosterPhoneSheet{position:fixed;inset:0;z-index:100130;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}',
      '.rosterPhoneSheet.open{display:flex;}',
      '.rosterPhoneCard{width:min(100%,400px);background:linear-gradient(180deg,#fff,#f8fbff);border:1px solid rgba(148,163,184,.28);border-radius:20px;padding:18px 16px 14px;box-shadow:0 24px 60px rgba(15,23,42,.28);text-align:center;}',
      '.rosterPhoneCard h2{margin:0 0 8px;font-size:17px;font-weight:900;color:#0f172a;}',
      '.rosterPhoneCard p{margin:0 0 14px;font-size:13px;line-height:1.55;color:#475569;font-weight:600;}',
      '.rosterPhoneActions{display:grid;grid-template-columns:1fr 1fr;gap:10px;}',
      '.rosterPhoneActions button,.rosterPhoneForm button{min-height:44px;border:0;border-radius:14px;font:inherit;font-weight:800;cursor:pointer;}',
      '.rosterPhoneYes{background:#2563eb;color:#fff;}',
      '.rosterPhoneNo{background:#e2e8f0;color:#334155;}',
      '.rosterPhoneForm{display:none;text-align:center;margin-top:4px;}',
      '.rosterPhoneForm.open{display:block;}',
      '.rosterPhoneForm h2{text-align:center;}',
      '.rosterPhoneForm input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:12px;padding:12px;font:inherit;font-size:16px;direction:ltr;text-align:center;margin:0 0 14px;}',
      '.rosterPhoneFormActions{display:grid;grid-template-columns:1fr 1fr;gap:10px;}',
      '.rosterPhoneSave{width:100%;background:#0f766e;color:#fff;margin:0;}',
      '.rosterPhoneCancel{width:100%;background:#e2e8f0;color:#334155;margin:0;}',
      '.rosterPhoneMsg{min-height:18px;margin-top:10px;font-size:12px;font-weight:800;color:#0f766e;text-align:center;}',
      '.rosterPhoneMsg.err{color:#dc2626;}'
    ].join('');
    document.head.appendChild(style);
  }

  function savePhoneToMantle(row) {
    var headers = visitHeaders();
    return fetch(PHONE_LOG_URL + '?ts=' + Date.now(), { headers: headers, cache: 'no-store' })
      .then(function (r) {
        // First save: document may not exist yet (404) — treat as empty list.
        if (r.status === 404) return {};
        if (!r.ok) throw new Error('read');
        return r.json().catch(function () { return {}; });
      })
      .then(function (cur) {
        var list = Array.isArray(cur && cur.phones) ? cur.phones.slice() : [];
        var kept = list.filter(function (item) {
          return !(item && String(item.id) === String(row.id));
        });
        kept.unshift(row);
        if (kept.length > 800) kept.length = 800;
        return fetch(PHONE_LOG_URL, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ phones: kept })
        }).then(function (r) {
          if (!r.ok) throw new Error('write');
        });
      });
  }

  function openPhonePrompt() {
    var ident = getRosterIdentity();
    if (!ident) return;
    if (phonePromptDoneFor(ident.id)) return;
    try {
      if (/\/desk-log(\/|$)/.test(location.pathname || '')) return;
    } catch (e0) {}

    ensurePhonePromptCss();
    var sheet = document.getElementById('rosterPhoneSheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'rosterPhoneSheet';
      sheet.className = 'rosterPhoneSheet';
      sheet.setAttribute('aria-hidden', 'true');
      sheet.innerHTML =
        '<div class="rosterPhoneCard" role="dialog" aria-labelledby="rosterPhoneTitle">' +
        '<div id="rosterPhoneAsk">' +
        '<h2 id="rosterPhoneTitle">إضافة رقم الهاتف</h2>' +
        '<p>رقم هاتفك موجود في هاتف المشرف، هل ترغب في إضافته في الموقع؟</p>' +
        '<div class="rosterPhoneActions">' +
        '<button type="button" class="rosterPhoneYes" id="rosterPhoneYes">نعم</button>' +
        '<button type="button" class="rosterPhoneNo" id="rosterPhoneNo">لا</button>' +
        '</div></div>' +
        '<div class="rosterPhoneForm" id="rosterPhoneForm">' +
        '<h2>أدخل رقم هاتفك النقال</h2>' +
        '<input id="rosterPhoneInput" type="text" inputmode="numeric" autocomplete="off" maxlength="15" placeholder="9XXXXXXX" dir="ltr">' +
        '<div class="rosterPhoneFormActions">' +
        '<button type="button" class="rosterPhoneSave" id="rosterPhoneSave">حفظ الرقم</button>' +
        '<button type="button" class="rosterPhoneCancel" id="rosterPhoneCancel">إلغاء</button>' +
        '</div>' +
        '<div class="rosterPhoneMsg" id="rosterPhoneMsg"></div>' +
        '</div></div>';
      document.body.appendChild(sheet);

      document.getElementById('rosterPhoneNo').addEventListener('click', function () {
        var cur = getRosterIdentity();
        if (cur) markPhonePromptDone(cur.id);
        closePhonePrompt();
      });
      document.getElementById('rosterPhoneYes').addEventListener('click', function () {
        document.getElementById('rosterPhoneAsk').style.display = 'none';
        document.getElementById('rosterPhoneForm').classList.add('open');
        setTimeout(function () {
          var inp = document.getElementById('rosterPhoneInput');
          if (inp) inp.focus();
        }, 40);
      });
      document.getElementById('rosterPhoneCancel').addEventListener('click', function () {
        closePhonePrompt();
      });
      document.getElementById('rosterPhoneSave').addEventListener('click', function () {
        var cur = getRosterIdentity();
        if (!cur) return;
        var msg = document.getElementById('rosterPhoneMsg');
        var input = document.getElementById('rosterPhoneInput');
        var phone = normalizeOmanPhone(input && input.value);
        if (!isValidOmanMobile(phone)) {
          if (msg) {
            msg.className = 'rosterPhoneMsg err';
            msg.textContent = 'أدخل رقم جوال عماني صحيح (يبدأ بـ 7 أو 9).';
          }
          return;
        }
        if (msg) {
          msg.className = 'rosterPhoneMsg';
          msg.textContent = 'جاري الحفظ…';
        }
        var saveBtn = document.getElementById('rosterPhoneSave');
        if (saveBtn) saveBtn.disabled = true;
        resolveEmployeeName(cur.id, cur.name).then(function (name) {
          return savePhoneToMantle({
            id: cur.id,
            name: name || cur.name || '',
            phone: phone,
            at: Date.now()
          });
        }).then(function () {
          markPhonePromptDone(cur.id);
          try { localStorage.setItem('exportSavedPhone', phone); } catch (e) {}
          if (msg) {
            msg.className = 'rosterPhoneMsg';
            msg.textContent = 'تم حفظ رقمك بنجاح ✅';
          }
          setTimeout(closePhonePrompt, 900);
        }).catch(function () {
          if (saveBtn) saveBtn.disabled = false;
          if (msg) {
            msg.className = 'rosterPhoneMsg err';
            msg.textContent = 'تعذر الحفظ، حاول مرة أخرى.';
          }
        });
      });
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet) closePhonePrompt();
      });
    }

    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    var ask = document.getElementById('rosterPhoneAsk');
    var form = document.getElementById('rosterPhoneForm');
    var msg = document.getElementById('rosterPhoneMsg');
    var input = document.getElementById('rosterPhoneInput');
    var saveBtn = document.getElementById('rosterPhoneSave');
    if (ask) ask.style.display = '';
    if (form) form.classList.remove('open');
    if (msg) { msg.textContent = ''; msg.className = 'rosterPhoneMsg'; }
    if (input) input.value = '';
    if (saveBtn) saveBtn.disabled = false;
  }

  function closePhonePrompt() {
    var sheet = document.getElementById('rosterPhoneSheet');
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
  }

  function maybeAskPhone() {
    var ident = getRosterIdentity();
    if (!ident) return;
    if (phonePromptDoneFor(ident.id)) return;
    openPhonePrompt();
  }

  function boot() {
    if (window.__rosterSiteVisitsBooted) return;
    window.__rosterSiteVisitsBooted = true;
    if (booted) return;
    booted = true;
    // Skip counter UI mounting on pages without a footer, but always log visits.
    try {
      if (document.querySelector('.footer')) {
        var keys = muscatYmd();
        readPersisted(keys);
        hookLang();
        hookFooter();
        paint();
        // Single load path — re-paint host later, but do not re-hit (loadCounts serializes + claim).
        loadCounts();
        window.setTimeout(paint, 250);
        window.setTimeout(paint, 900);
        window.setTimeout(function () {
          // Re-GET if numbers still missing (never hit).
          if (cached.day == null || cached.month == null) loadCounts();
        }, 2200);
        // Re-assert host for ~30s (lang switch / texture buttons / alerts).
        var guardN = 0;
        var guard = window.setInterval(function () {
          guardN += 1;
          paint();
          if (guardN >= 30) window.clearInterval(guard);
        }, 1000);
      }
    } catch (eBoot) {}
    // Visit log first, then recount so "زوار اليوم" matches real unique visitors.
    window.setTimeout(function () {
      logSiteVisit();
      window.setTimeout(function () {
        loadCounts();
      }, 900);
    }, 120);
    window.setTimeout(function () {
      logSiteVisit();
      loadCounts();
    }, 2000);
    window.setTimeout(maybeAskPhone, 2200);
  }

  window.rosterSiteVisits = {
    refresh: function () {
      paint();
      return loadCounts();
    },
    setLang: paint,
    logPage: logPageKey,
    logScheduleView: logScheduleView
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
