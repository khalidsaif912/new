/**
 * Short Web Audio cues: send confirmation, roster/absence alert.
 * Plays from the speaker of the device currently using the roster
 * (browser tab or installed PWA) while the page is open.
 */
(function (w) {
  'use strict';
  if (w.rosterAlertSound) return;

  var ctx = null;
  var pendingKind = '';
  var pendingHeardKey = '';
  var lastPlayAt = 0;

  function getCtx() {
    try {
      var AC = w.AudioContext || w.webkitAudioContext;
      if (!AC) return null;
      if (!ctx) ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume().catch(function () {});
      return ctx;
    } catch (e) {
      return null;
    }
  }

  function tone(c, freq, start, dur, vol, type) {
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(start);
    o.stop(start + dur + 0.03);
  }

  function markHeard() {
    if (!pendingHeardKey) return;
    try {
      localStorage.setItem(pendingHeardKey, '1');
    } catch (e) {}
    pendingHeardKey = '';
  }

  function emit(c, kind) {
    var now = Date.now();
    if (now - lastPlayAt < 280) return;
    lastPlayAt = now;
    var t0 = c.currentTime;
    if (kind === 'send') {
      tone(c, 880, t0, 0.12, 0.22, 'sine');
      tone(c, 1320, t0 + 0.09, 0.16, 0.18, 'sine');
      if (navigator.vibrate) navigator.vibrate(18);
    } else {
      tone(c, 523, t0, 0.2, 0.24, 'sine');
      tone(c, 784, t0 + 0.16, 0.28, 0.2, 'sine');
      if (navigator.vibrate) navigator.vibrate([22, 40, 22]);
    }
    markHeard();
  }

  function playNow(kind) {
    var c = getCtx();
    if (!c) return;
    try {
      var buf = c.createBuffer(1, 1, 22050);
      var src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      src.start(0);
    } catch (e) {}
    if (c.state === 'running') {
      try {
        emit(c, kind);
      } catch (e) {}
      return;
    }
    pendingKind = kind;
    c.resume().then(function () {
      var k = pendingKind || kind;
      pendingKind = '';
      try {
        emit(c, k);
      } catch (err) {}
    }).catch(function () {});
  }

  function unlock() {
    var c = getCtx();
    if (!c) return;
    c.resume().then(function () {
      if (!pendingKind) return;
      var k = pendingKind;
      pendingKind = '';
      playNow(k);
    }).catch(function () {});
  }

  function play(kind) {
    playNow(kind === 'send' ? 'send' : 'alert');
  }

  function playOnce(kind, hash) {
    if (!hash) return;
    var key = 'rosterHeard_' + (kind === 'send' ? 'send' : 'alert') + '_' + String(hash);
    try {
      if (localStorage.getItem(key) === '1') return;
    } catch (e) {}
    pendingHeardKey = key;
    play(kind);
  }

  function bindUnlock() {
    var once = function () {
      unlock();
    };
    document.addEventListener('pointerdown', once, true);
    document.addEventListener('touchstart', once, true);
    w.addEventListener('focus', unlock);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) unlock();
    });
    w.addEventListener('pageshow', unlock);
  }

  bindUnlock();
  w.rosterAlertSound = { play: play, playOnce: playOnce, unlock: unlock };
})(window);
