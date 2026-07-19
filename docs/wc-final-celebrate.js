/**
 * wc-final-celebrate.js
 * Argentina vs Spain World Cup final celebration.
 * Auto-detects winner via ESPN scoreboard (CORS *), caches in MantleDB,
 * shows fireworks + winner banner until 06:00 Muscat next morning.
 *
 * Manual fallback (PIN 912):
 *   rosterWcFinal.force('argentina')  or  rosterWcFinal.force('spain')
 *   or URL ?wcwin=argentina&wcpin=912
 */
(function () {
  'use strict';

  var END_ISO_MUSCAT = '2026-07-20T18:00:00+04:00';
  var MATCH_DATE = '20260719'; // ESPN date key
  var ESPN_URL =
    'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=' +
    MATCH_DATE;
  var ESPN_URL_FALLBACK =
    'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
  var MANTLE_NS = 'roster-wc-final';
  var MANTLE_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  var MANTLE_URL = 'https://mantledb.sh/v2/' + MANTLE_NS + '/index';
  var LOCAL_WINNER_KEY = 'rosterWcFinalWinner_v1';
  var BURST_KEY = 'rosterWcFinalBurst_v1';
  var PIN = '912';
  var BURST_MS = 5000;
  var POLL_MS = 45000;

  var audioCtx = null;
  var audioUnlocked = false;
  var soundEnabled = true;

  var TEAMS = {
    argentina: {
      id: 'argentina',
      labelAr: 'الأرجنتين',
      labelEn: 'Argentina',
      banner: 'banner30.jpg',
      colors: ['#74ACDF', '#FFFFFF', '#F6B40E'],
      abbr: ['ARG', 'ARGENTINA']
    },
    spain: {
      id: 'spain',
      labelAr: 'إسبانيا',
      labelEn: 'Spain',
      banner: 'banner31.jpg',
      colors: ['#AA151B', '#F1BF00', '#FFFFFF'],
      abbr: ['ESP', 'SPAIN']
    }
  };

  var state = {
    winner: null,
    burstDone: false,
    ambientTimer: null,
    pollTimer: null
  };

  function nowMs() {
    return Date.now();
  }

  function endMs() {
    var t = Date.parse(END_ISO_MUSCAT);
    if (!isNaN(t)) return t;
    // Fallback: 2026-07-20 18:00 Muscat = 14:00 UTC
    return Date.UTC(2026, 6, 20, 14, 0, 0);
  }

  function inCelebrateWindow() {
    var end = endMs();
    if (isNaN(end)) return true;
    return nowMs() < end;
  }

  function langIsAr() {
    try {
      var l = localStorage.getItem('rosterLang') || document.documentElement.lang || 'en';
      return l === 'ar';
    } catch (e) {
      return false;
    }
  }

  function getSiteRootPath() {
    var path = location.pathname || '/';
    if (path.indexOf('/roster-site/') !== -1) return '/roster-site';
    if (location.hostname && location.hostname.indexOf('github.io') !== -1) {
      var segs = path.split('/').filter(Boolean);
      if (segs.length >= 2 && segs[1] === 'docs') return '/' + segs[0] + '/docs';
      return segs.length ? '/' + segs[0] : '';
    }
    return '';
  }

  function bannersPath() {
    return (location.origin || '') + getSiteRootPath() + '/assets/banners/';
  }

  function teamFromName(name) {
    var n = String(name || '').toUpperCase();
    if (!n) return null;
    if (n.indexOf('ARG') >= 0 || n.indexOf('ARGENTINA') >= 0) return TEAMS.argentina;
    if (n.indexOf('ESP') >= 0 || n.indexOf('SPAIN') >= 0) return TEAMS.spain;
    return null;
  }

  function readLocalWinner() {
    try {
      var id = localStorage.getItem(LOCAL_WINNER_KEY);
      return id && TEAMS[id] ? TEAMS[id] : null;
    } catch (e) {
      return null;
    }
  }

  function writeLocalWinner(team) {
    try {
      localStorage.setItem(LOCAL_WINNER_KEY, team.id);
    } catch (e) {}
  }

  function mantleHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Mantle-Key': MANTLE_KEY
    };
  }

  function fetchMantleWinner() {
    return fetch(MANTLE_URL + '?ts=' + nowMs(), {
      headers: mantleHeaders(),
      cache: 'no-store'
    })
      .then(function (r) {
        if (!r.ok) throw new Error('mantle');
        return r.json();
      })
      .then(function (data) {
        var id = data && data.winner;
        return id && TEAMS[id] ? TEAMS[id] : null;
      })
      .catch(function () {
        return null;
      });
  }

  function publishMantleWinner(team, meta) {
    var body = {
      winner: team.id,
      at: nowMs(),
      source: (meta && meta.source) || 'espn',
      score: (meta && meta.score) || '',
      match: 'Argentina vs Spain'
    };
    return fetch(MANTLE_URL, {
      method: 'POST',
      headers: mantleHeaders(),
      body: JSON.stringify(body)
    }).catch(function () {});
  }

  function parseEspnWinner(data) {
    var events = (data && data.events) || [];
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      var title = String(ev.name || ev.shortName || '').toUpperCase();
      if (title.indexOf('ARG') < 0 && title.indexOf('ARGENTINA') < 0) continue;
      if (title.indexOf('ESP') < 0 && title.indexOf('SPAIN') < 0) continue;
      var st = (ev.status && ev.status.type) || {};
      if (!st.completed && st.state !== 'post') continue;
      var comps = (ev.competitions && ev.competitions[0] && ev.competitions[0].competitors) || [];
      var winner = null;
      var scores = [];
      for (var j = 0; j < comps.length; j++) {
        var c = comps[j];
        var t = teamFromName((c.team && (c.team.displayName || c.team.abbreviation)) || '');
        var sc = c.score != null ? String(c.score) : '?';
        if (t) scores.push(t.labelEn + ' ' + sc);
        if (c.winner && t) winner = t;
      }
      if (!winner && comps.length === 2) {
        var a = comps[0];
        var b = comps[1];
        var sa = Number(a.score);
        var sb = Number(b.score);
        if (isFinite(sa) && isFinite(sb) && sa !== sb) {
          winner = teamFromName(
            ((sa > sb ? a : b).team || {}).displayName ||
              ((sa > sb ? a : b).team || {}).abbreviation
          );
        }
      }
      if (winner) {
        return { team: winner, score: scores.join(' – '), source: 'espn' };
      }
    }
    return null;
  }

  function fetchEspnWinner() {
    function load(url) {
      return fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + 'ts=' + nowMs(), {
        cache: 'no-store',
        mode: 'cors'
      }).then(function (r) {
        if (!r.ok) throw new Error('espn');
        return r.json();
      });
    }
    return load(ESPN_URL)
      .catch(function () {
        return load(ESPN_URL_FALLBACK);
      })
      .then(parseEspnWinner)
      .catch(function () {
        return null;
      });
  }

  function resolveWinner() {
    if (state.winner) return Promise.resolve(state.winner);
    var local = readLocalWinner();
    if (local) {
      state.winner = local;
      return Promise.resolve(local);
    }
    return fetchMantleWinner().then(function (m) {
      if (m) {
        state.winner = m;
        writeLocalWinner(m);
        return m;
      }
      return fetchEspnWinner().then(function (hit) {
        if (!hit || !hit.team) return null;
        state.winner = hit.team;
        writeLocalWinner(hit.team);
        publishMantleWinner(hit.team, hit);
        return hit.team;
      });
    });
  }

  function applyWinnerBanner(team) {
    if (!team || !team.banner) return;
    try {
      localStorage.setItem('roster_banner_choice', team.banner);
    } catch (e) {}
    var url = bannersPath() + team.banner;
    var targets = document.querySelectorAll('.header, .topbar');
    targets.forEach(function (el) {
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.classList.add('has-custom-banner');
      el.setAttribute('data-banner', team.banner);
      el.style.setProperty('background-image', "url('" + url + "')", 'important');
      el.style.setProperty('background-size', 'cover', 'important');
      el.style.setProperty('background-position', '50% 45%', 'important');
      el.style.setProperty('background-repeat', 'no-repeat', 'important');
      // iOS img layer
      var img = el.querySelector('.roster-banner-ios-img');
      if (!img && /iP(hone|ad|od)/i.test(navigator.userAgent)) {
        img = document.createElement('img');
        img.className = 'roster-banner-ios-img';
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        img.style.cssText =
          'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 45%;z-index:0;pointer-events:none;border-radius:inherit;';
        el.insertBefore(img, el.firstChild);
      }
      if (img) img.src = url;
    });
    document.documentElement.classList.add('roster-banner-early');
  }

  function ensureAudio() {
    if (!soundEnabled) return null;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(function () {});
      }
      return audioCtx;
    } catch (e) {
      return null;
    }
  }

  function unlockAudio() {
    if (audioUnlocked) {
      ensureAudio();
      return;
    }
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      var buf = ctx.createBuffer(1, 1, 22050);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      audioUnlocked = true;
    } catch (e) {}
  }

  function bindAudioUnlock() {
    var once = function () {
      unlockAudio();
      document.removeEventListener('pointerdown', once, true);
      document.removeEventListener('touchstart', once, true);
      document.removeEventListener('keydown', once, true);
    };
    document.addEventListener('pointerdown', once, true);
    document.addEventListener('touchstart', once, true);
    document.addEventListener('keydown', once, true);
  }

  function playCrackle(vol) {
    var ctx = ensureAudio();
    if (!ctx || !audioUnlocked) return;
    vol = vol == null ? 0.28 : vol;
    try {
      var sz = Math.floor(ctx.sampleRate * 0.08);
      var buf = ctx.createBuffer(1, sz, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < sz; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / sz, 3);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var g = ctx.createGain();
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      src.connect(g);
      g.connect(ctx.destination);
      src.start(ctx.currentTime);
    } catch (e) {}
  }

  function playBoom(vol) {
    var ctx = ensureAudio();
    if (!ctx || !audioUnlocked) return;
    vol = vol == null ? 0.55 : vol;
    try {
      var sz = Math.floor(ctx.sampleRate * 0.65);
      var buf = ctx.createBuffer(1, sz, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < sz; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / sz, 2);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(900, ctx.currentTime);
      f.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.55);
      var g = ctx.createGain();
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
      src.connect(f);
      f.connect(g);
      g.connect(ctx.destination);
      src.start(ctx.currentTime);
      setTimeout(function () {
        playCrackle(vol * 0.55);
      }, 50);
      setTimeout(function () {
        playCrackle(vol * 0.4);
      }, 140);
      setTimeout(function () {
        playCrackle(vol * 0.3);
      }, 280);
    } catch (e) {}
  }

  function playLaunch(vol) {
    var ctx = ensureAudio();
    if (!ctx || !audioUnlocked) return;
    vol = vol == null ? 0.14 : vol;
    try {
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'sine';
      osc.connect(g);
      g.connect(ctx.destination);
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(720, ctx.currentTime + 0.28);
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }

  function injectStyles() {
    if (document.getElementById('wc-final-celebrate-css')) return;
    var style = document.createElement('style');
    style.id = 'wc-final-celebrate-css';
    style.textContent = [
      '#wcFinalFx{position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:hidden;}',
      '#wcFinalFx canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}',
      '#wcFinalBadge{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483001;',
      'pointer-events:none;background:rgba(15,23,42,.88);color:#fff;border:1px solid rgba(255,255,255,.35);',
      'border-radius:999px;padding:10px 16px;font:800 14px/1.25 system-ui,-apple-system,sans-serif;',
      'box-shadow:0 10px 32px rgba(0,0,0,.35);opacity:0;transition:opacity .35s ease;max-width:92vw;text-align:center;}',
      '#wcFinalBadge.show{opacity:1;}',
      '#wcFinalHero{position:fixed;inset:0;z-index:2147482990;display:flex;align-items:center;justify-content:center;',
      'pointer-events:auto;background:rgba(2,6,23,.42);opacity:0;transition:opacity .35s ease;cursor:default;}',
      '#wcFinalHero.show{opacity:1;}',
      '#wcFinalHero .wcFinalHeroCard{text-align:center;color:#fff;text-shadow:0 2px 16px rgba(0,0,0,.55);',
      'padding:18px 22px;border-radius:22px;background:rgba(15,23,42,.55);border:1px solid rgba(255,255,255,.22);',
      'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}',
      '#wcFinalHero .wcFinalHeroEmoji{font-size:42px;line-height:1;margin-bottom:8px;}',
      '#wcFinalHero .wcFinalHeroTitle{font:800 18px/1.2 system-ui,-apple-system,sans-serif;margin-bottom:6px;}',
      '#wcFinalHero .wcFinalHeroTeam{font:900 28px/1.15 system-ui,-apple-system,sans-serif;letter-spacing:.01em;}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureFxHost() {
    var host = document.getElementById('wcFinalFx');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'wcFinalFx';
    var canvas = document.createElement('canvas');
    host.appendChild(canvas);
    document.body.appendChild(host);
    return host;
  }

  function showBadge(team, lasting) {
    var badge = document.getElementById('wcFinalBadge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'wcFinalBadge';
      document.body.appendChild(badge);
    }
    var ar = langIsAr();
    var name = ar ? team.labelAr : team.labelEn;
    badge.textContent = ar
      ? '🏆 مبروك ' + name + ' — أبطال العالم'
      : '🏆 Champions: ' + name;
    badge.classList.add('show');
    if (!lasting) {
      setTimeout(function () {
        badge.classList.remove('show');
      }, BURST_MS + 800);
    }
  }

  function runFireworks(durationMs, intensity) {
    injectStyles();
    var host = ensureFxHost();
    var canvas = host.querySelector('canvas');
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    var particles = [];
    var rockets = [];
    var start = nowMs();
    var colors = (state.winner && state.winner.colors) || ['#fff', '#fbbf24', '#38bdf8'];
    intensity = intensity || 1;

    var soundVol = Math.max(0.25, Math.min(1, intensity));

    function boom(x, y) {
      playBoom(0.45 * soundVol);
      var n = Math.floor((28 + Math.random() * 24) * intensity);
      for (var i = 0; i < n; i++) {
        var ang = (Math.PI * 2 * i) / n + Math.random() * 0.2;
        var spd = 1.5 + Math.random() * 3.8 * intensity;
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 1,
          decay: 0.012 + Math.random() * 0.02,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 1.5 + Math.random() * 2.2
        });
      }
    }

    function launch() {
      playLaunch(0.12 * soundVol);
      rockets.push({
        x: 40 + Math.random() * (window.innerWidth - 80),
        y: window.innerHeight + 10,
        vy: -(7 + Math.random() * 4) * (0.85 + intensity * 0.2),
        color: colors[Math.floor(Math.random() * colors.length)],
        fuse: 0.35 + Math.random() * 0.35
      });
    }

    var launchEvery = Math.max(180, 420 / intensity);
    var lastLaunch = 0;
    var raf = 0;

    function frame(ts) {
      var elapsed = nowMs() - start;
      if (elapsed > durationMs) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        cancelAnimationFrame(raf);
        return;
      }
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (ts - lastLaunch > launchEvery) {
        launch();
        if (intensity > 0.8) launch();
        lastLaunch = ts;
      }
      for (var r = rockets.length - 1; r >= 0; r--) {
        var rk = rockets[r];
        rk.y += rk.vy;
        rk.vy += 0.08;
        rk.fuse -= 0.016;
        ctx.beginPath();
        ctx.fillStyle = rk.color;
        ctx.arc(rk.x, rk.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        if (rk.fuse <= 0 || rk.vy >= -0.5) {
          boom(rk.x, rk.y);
          rockets.splice(r, 1);
        }
      }
      for (var p = particles.length - 1; p >= 0; p--) {
        var pt = particles[p];
        pt.vy += 0.04;
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= pt.decay;
        if (pt.life <= 0) {
          particles.splice(p, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(pt.life, 0);
        ctx.beginPath();
        ctx.fillStyle = pt.color;
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', resize, { once: true });
  }

  function startAmbient() {
    if (state.ambientTimer) return;
    state.ambientTimer = setInterval(function () {
      if (!inCelebrateWindow() || !state.winner) {
        clearInterval(state.ambientTimer);
        state.ambientTimer = null;
        return;
      }
      runFireworks(2200, 0.55);
    }, 28000);
  }

  function celebrate(team, opts) {
    opts = opts || {};
    if (!team) return;
    if (!opts.forceBurst && !inCelebrateWindow()) return;
    unlockAudio();
    state.winner = team;
    writeLocalWinner(team);
    applyWinnerBanner(team);
    injectStyles();

    var forceBurst = !!opts.forceBurst;
    var already = false;
    try {
      already = sessionStorage.getItem(BURST_KEY) === '1';
    } catch (e) {}
    if (forceBurst) {
      try {
        sessionStorage.removeItem(BURST_KEY);
      } catch (e0) {}
      already = false;
    }
    if (!already) {
      try {
        sessionStorage.setItem(BURST_KEY, '1');
      } catch (e2) {}
      runFireworks(BURST_MS, 1.35);
      showBadge(team, false);
      showHeroOverlay(team);
    } else {
      showBadge(team, true);
    }
    startAmbient();
  }

  function showHeroOverlay(team) {
    var old = document.getElementById('wcFinalHero');
    if (old) old.remove();
    var ar = langIsAr();
    var name = ar ? team.labelAr : team.labelEn;
    var hero = document.createElement('div');
    hero.id = 'wcFinalHero';
    hero.setAttribute('role', 'status');
    hero.innerHTML =
      '<div class="wcFinalHeroCard">' +
      '<div class="wcFinalHeroEmoji">🏆</div>' +
      '<div class="wcFinalHeroTitle">' +
      (ar ? 'أبطال العالم' : 'World Champions') +
      '</div>' +
      '<div class="wcFinalHeroTeam">' +
      name +
      '</div>' +
      '</div>';
    hero.addEventListener(
      'pointerdown',
      function () {
        unlockAudio();
      },
      { once: true }
    );
    document.body.appendChild(hero);
    requestAnimationFrame(function () {
      hero.classList.add('show');
    });
    setTimeout(function () {
      hero.classList.remove('show');
      setTimeout(function () {
        if (hero.parentNode) hero.remove();
      }, 400);
    }, BURST_MS);
  }

  function checkUrlForce() {
    try {
      var q = new URLSearchParams(location.search || '');
      var win = (q.get('wcwin') || q.get('wcCelebrate') || '').toLowerCase();
      var pin = q.get('wcpin') || '';
      var demo = q.get('wcdemo') === '1';
      // Survive redirects that may drop query once (session stash).
      if (!win) {
        try {
          var pending = sessionStorage.getItem('rosterWcFinalPending_v1');
          if (pending) {
            win = String(pending).toLowerCase();
            pin = PIN;
            sessionStorage.removeItem('rosterWcFinalPending_v1');
          }
        } catch (e0) {}
      } else if ((win === 'argentina' || win === 'spain') && pin === PIN) {
        try {
          sessionStorage.setItem('rosterWcFinalPending_v1', win);
        } catch (e1) {}
      }
      if (demo && (win === 'argentina' || win === 'spain')) {
        celebrate(TEAMS[win], { forceBurst: true });
        return true;
      }
      if ((win === 'argentina' || win === 'spain') && pin === PIN) {
        var team = TEAMS[win];
        publishMantleWinner(team, { source: 'manual-url', score: '' });
        celebrate(team, { forceBurst: true });
        try {
          sessionStorage.removeItem('rosterWcFinalPending_v1');
        } catch (e2) {}
        return true;
      }
    } catch (e) {}
    return false;
  }

  function tick() {
    if (!inCelebrateWindow()) return;
    resolveWinner().then(function (team) {
      if (team) celebrate(team);
    });
  }

  function boot() {
    // URL / manual force must run even if celebrate window parsing fails.
    if (checkUrlForce()) return;
    if (!inCelebrateWindow()) return;
    tick();
    state.pollTimer = setInterval(function () {
      if (!inCelebrateWindow()) {
        clearInterval(state.pollTimer);
        return;
      }
      if (state.winner) {
        clearInterval(state.pollTimer);
        return;
      }
      tick();
    }, POLL_MS);
  }

  window.rosterWcFinal = {
    force: function (teamId, pin) {
      if (String(pin || '') !== PIN) return false;
      unlockAudio();
      var team = TEAMS[String(teamId || '').toLowerCase()];
      if (!team) return false;
      publishMantleWinner(team, { source: 'manual', score: '' });
      celebrate(team, { forceBurst: true });
      return true;
    },
    mute: function (off) {
      if (typeof off === 'boolean') soundEnabled = !off;
      else soundEnabled = !soundEnabled;
      return soundEnabled;
    },
    status: function () {
      return {
        winner: state.winner && state.winner.id,
        until: END_ISO_MUSCAT,
        active: inCelebrateWindow(),
        sound: soundEnabled && audioUnlocked
      };
    }
  };

  bindAudioUnlock();

  // Boot ASAP — do not wait for idle secondary scripts only.
  function startBoot() {
    try {
      boot();
    } catch (err) {
      try {
        console.warn('[wc-final]', err);
      } catch (e) {}
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(startBoot, 200);
    });
  } else {
    setTimeout(startBoot, 200);
  }
})();
