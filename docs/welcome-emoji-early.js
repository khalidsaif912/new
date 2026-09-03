/**
 * Paint the welcome-chip emoji ASAP from localStorage so the waving-hand
 * SVG never flashes before site-apps.js (often idle-deferred) runs.
 */
(function () {
  'use strict';
  if (window.__rosterWelcomeEmojiEarly) return;
  window.__rosterWelcomeEmojiEarly = true;

  // Hide the default hand SVG before first paint whenever possible.
  try {
    var style = document.createElement('style');
    style.setAttribute('data-welcome-emoji-early', '1');
    style.textContent =
      '.waveHand>svg.chip-icon,#welcomeChip .waveHand>svg,#welcomeEmojiSlot>svg{display:none!important}';
    (document.head || document.documentElement).appendChild(style);
  } catch (e) {}

  var EMOJI_DEFAULTS = { '82437': '1f349' };

  function validCp(cp) {
    return /^[0-9a-f]{2,8}(_[0-9a-f]{2,8})*$/i.test(String(cp || '').trim());
  }

  function resolveCp() {
    var empId = '';
    var cp = '';
    try {
      var isImport = (window.location.pathname || '').indexOf('/import/') !== -1;
      empId = isImport
        ? (localStorage.getItem('importSavedEmpId') || '').trim()
        : (localStorage.getItem('exportSavedEmpId') || localStorage.getItem('savedEmpId') || '').trim();
      var map = JSON.parse(localStorage.getItem('empEmojiChoiceMap') || '{}') || {};
      var legacy = (localStorage.getItem('empEmojiChoice') || '').trim();
      if (legacy && !isImport && !map[empId || 'export']) cp = legacy;
      else cp = map[empId || (isImport ? 'import' : 'export')] || '';
      if (!cp && empId && EMOJI_DEFAULTS[empId]) cp = EMOJI_DEFAULTS[empId];
    } catch (e) {}
    return validCp(cp) ? String(cp).toLowerCase() : '';
  }

  function paint(cp) {
    var chip = document.getElementById('welcomeChip');
    if (!chip || !cp) return false;
    var slot = chip.querySelector('.waveHand') || document.getElementById('welcomeEmojiSlot') || chip.querySelector('.chipVal');
    if (!slot) return false;
    if (slot.getAttribute('data-custom-emoji') === cp && slot.querySelector('img')) return true;

    // Kill the hand immediately — do not wait for image load.
    slot.style.animation = 'none';
    var svg = slot.querySelector('svg');
    if (svg) svg.remove();

    var existing = slot.querySelector('img');
    if (existing && existing.getAttribute('data-cp') === cp) {
      slot.setAttribute('data-custom-emoji', cp);
      return true;
    }

    var img = document.createElement('img');
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.setAttribute('data-cp', cp);
    img.decoding = 'async';
    img.style.cssText = 'display:block;width:30px;height:30px;margin:-3px 0;object-fit:contain;pointer-events:none;';
    img.src = 'https://fonts.gstatic.com/s/e/notoemoji/latest/' + cp + '/512.webp';
    slot.innerHTML = '';
    slot.appendChild(img);
    slot.setAttribute('data-custom-emoji', cp);
    return true;
  }

  function run() {
    var cp = resolveCp();
    if (!cp) return;
    if (paint(cp)) return;
    // Chip may appear later (welcome chip starts hidden).
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (paint(cp) || tries > 40) clearInterval(timer);
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
