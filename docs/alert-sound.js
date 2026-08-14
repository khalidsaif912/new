/**
 * Short Web Audio cues: send confirmation, roster/absence alert.
 * Browsers block sound until a tap; the first gesture unlocks and plays any queued alert.
 */
(function (w) {
  'use strict';
  if (w.rosterAlertSound) return;

  var ctx = null;
  var unlocked = false;
  var pendingKind = '';
  var pendingHeardKey = '';

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
    g.gain.exponentialRampToValueAtTime(vol, start + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  function markHeard() {
    if (!pendingHeardKey) return;
    try {
      localStorage.setItem(pendingHeardKey, '1');
    } catch (e) {}
    pendingHeardKey = '';
  }

  function playNow(kind) {
    var c = getCtx();
    if (!c) return false;
    var t0 = c.currentTime;
    try {
      if (kind === 'send') {
        tone(c, 880, t0, 0.09, 0.07, 'sine');
        tone(c, 1320, t0 + 0.07, 0.12, 0.06, 'sine');
        if (navigator.vibrate) navigator.vibrate(12);
      } else {
        tone(c, 587, t0, 0.16, 0.09, 'sine');
        tone(c, 880, t0 + 0.15, 0.22, 0.08, 'sine');
        if (navigator.vibrate) navigator.vibrate([18, 40, 18]);
      }
      unlocked = true;
      markHeard();
      return true;
    } catch (e) {
      return false;
    }
  }

  function unlock() {
    var c = getCtx();
    if (!c) return;
    try {
      var buf = c.createBuffer(1, 1, 22050);
      var src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      src.start(0);
      unlocked = true;
    } catch (e) {}
    if (pendingKind) {
      var k = pendingKind;
      pendingKind = '';
      playNow(k);
    }
  }

  function play(kind) {
    kind = kind === 'send' ? 'send' : 'alert';
    var c = getCtx();
    if (!c) return;
    if (!unlocked && c.state !== 'running') {
      pendingKind = kind;
      return;
    }
    playNow(kind);
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
      document.removeEventListener('pointerdown', once, true);
      document.removeEventListener('keydown', once, true);
    };
    document.addEventListener('pointerdown', once, true);
    document.addEventListener('keydown', once, true);
  }

  bindUnlock();
  w.rosterAlertSound = { play: play, playOnce: playOnce, unlock: unlock };
})(window);
