/**
 * Ideas / rating popup — DISABLED.
 * The roster no longer auto-shows the suggestions modal or floating button.
 * Standalone page still lives at docs/ideas/.
 */
(function () {
  'use strict';
  if (window.__rosterIdeasPromptBooted) return;
  window.__rosterIdeasPromptBooted = true;

  function removeResidual() {
    try {
      ['ideasPromptSheetInline', 'ideasFab'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      document.documentElement.classList.remove('ideas-sheet-open');
      if (document.body) document.body.style.overflow = '';
      [
        'rosterIdeasPromptCssV10',
        'rosterIdeasPromptCssV9',
        'rosterIdeasPromptCssV8',
        'rosterIdeasPromptCss'
      ].forEach(function (id) {
        var st = document.getElementById(id);
        if (st && st.parentNode) st.parentNode.removeChild(st);
      });
    } catch (e) {}
  }

  removeResidual();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeResidual);
  }
  window.setTimeout(removeResidual, 200);
  window.setTimeout(removeResidual, 1500);

  window.rosterIdeasPrompt = {
    open: function () {},
    close: function () {
      removeResidual();
    }
  };
})();
