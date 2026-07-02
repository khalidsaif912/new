/*
 * shift-copy.js — bottom "Copy Shift List" button + modal.
 * Copies the on-duty employees for a chosen shift as WhatsApp-formatted text.
 * Department names are bold ( *Name* ); the Officers department is excluded.
 */
(function () {
  "use strict";

  function t(key, fallback) {
    try {
      var lang = window.LANG || "en";
      var dict = (window.T && window.T[lang]) || {};
      return dict[key] || fallback;
    } catch (e) {
      return fallback;
    }
  }

  // Map each option's data-shift key to its i18n label key.
  var LABEL_KEYS = {
    "Morning": "morning",
    "Afternoon": "afternoon",
    "Night": "night",
    "Annual Leave": "annualLeave",
    "Training": "training"
  };

  function labelFor(shiftKey) {
    return t(LABEL_KEYS[shiftKey] || "", shiftKey);
  }

  function deptEnglishName(card) {
    var el = card.querySelector(".deptTitle");
    if (!el) return "";
    // applyLang stores the original English name in dataset.key.
    var key = el.dataset && el.dataset.key ? el.dataset.key : el.textContent;
    return (key || "").trim();
  }

  function attrEscape(s) {
    return String(s).replace(/"/g, '\\"');
  }

  // Department output order for the copied list.
  var DEPT_ORDER = [
    "Officers",
    "Supervisors",
    "Load Control",
    "Export Checker",
    "Export Operators"
  ];

  function deptRank(dept) {
    var i = DEPT_ORDER.indexOf(dept);
    return i === -1 ? DEPT_ORDER.length : i;
  }

  function collectGroups(shiftKey) {
    var groups = [];
    var cards = document.querySelectorAll(".deptCard");
    Array.prototype.forEach.call(cards, function (card) {
      var dept = deptEnglishName(card);
      if (!dept) return;
      var shift = card.querySelector('.shiftCard[data-shift="' + attrEscape(shiftKey) + '"]');
      if (!shift) return;
      var names = [];
      Array.prototype.forEach.call(shift.querySelectorAll(".empRow"), function (row) {
        var n = (row.getAttribute("data-emp-name") || "").trim();
        if (n) names.push(n);
      });
      if (names.length) groups.push({ dept: dept, names: names });
    });
    groups.sort(function (a, b) {
      return deptRank(a.dept) - deptRank(b.dept);
    });
    return groups;
  }

  function countNames(shiftKey) {
    var total = 0;
    collectGroups(shiftKey).forEach(function (g) {
      total += g.names.length;
    });
    return total;
  }

  function buildText(shiftKey) {
    var groups = collectGroups(shiftKey);
    if (!groups.length) return "";
    var lines = [];
    groups.forEach(function (g, i) {
      // Prefix each line with a Left-to-Right Mark so WhatsApp keeps LTR
      // alignment even when the app UI is Arabic (RTL).
      lines.push("\u200e*" + g.dept + "*");
      g.names.forEach(function (n) {
        lines.push("\u200e" + n);
      });
      if (i < groups.length - 1) lines.push("");
    });
    // Trailing invisible LTR line: gives the WhatsApp timestamp its own line
    // so the last name is no longer shifted to make room for the time.
    return lines.join("\n") + "\n\u200e";
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, text.length);
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error("execCommand failed"));
      } catch (e) {
        reject(e);
      }
    });
  }

  var sheet, statusEl;

  function refs() {
    if (!sheet) sheet = document.getElementById("shiftCopySheet");
    if (!statusEl) statusEl = document.getElementById("shiftCopyStatus");
  }

  function setStatus(msg, ok) {
    refs();
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.classList.toggle("is-ok", ok === true);
    statusEl.classList.toggle("is-err", ok === false);
  }

  function refresh() {
    refs();
    if (!sheet) return;
    var title = document.getElementById("shiftCopyTitle");
    var hint = document.getElementById("shiftCopyHint");
    var closeLbl = document.getElementById("shiftCopyCloseLabel");
    if (title) title.textContent = t("copyTitle", "On-duty list");
    if (hint) hint.textContent = t("copyHint", "Pick a shift — copied as WhatsApp text (Officers excluded)");
    if (closeLbl) closeLbl.textContent = t("copyClose", "Close");
    Array.prototype.forEach.call(sheet.querySelectorAll(".shiftCopyOpt"), function (btn) {
      var key = btn.getAttribute("data-shift");
      var labelEl = btn.querySelector(".shiftCopyOpt-label");
      var countEl = btn.querySelector(".shiftCopyOpt-count");
      if (labelEl) labelEl.textContent = labelFor(key);
      var c = countNames(key);
      if (countEl) countEl.textContent = c;
      btn.classList.toggle("is-empty", c === 0);
    });
  }

  function open() {
    refs();
    if (!sheet) return;
    refresh();
    setStatus("");
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
  }

  function close() {
    refs();
    if (!sheet) return;
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
  }

  function onOption(shiftKey) {
    var text = buildText(shiftKey);
    if (!text) {
      setStatus(t("copyEmpty", "No employees in this shift"), false);
      return;
    }
    var count = countNames(shiftKey);
    copyText(text).then(function () {
      setStatus(t("copyDone", "Copied") + " " + count + " · " + labelFor(shiftKey), true);
    }).catch(function () {
      setStatus(t("copyFail", "Copy failed — long-press to copy"), false);
    });
  }

  function bind() {
    refs();
    var openBtn = document.getElementById("copyShiftBtn");
    if (openBtn && !openBtn.__shiftCopyBound) {
      openBtn.__shiftCopyBound = true;
      openBtn.addEventListener("click", function (e) {
        e.preventDefault();
        open();
      });
    }
    if (!sheet || sheet.__shiftCopyBound) return;
    sheet.__shiftCopyBound = true;
    var closeBtn = document.getElementById("shiftCopyCloseBtn");
    if (closeBtn) closeBtn.addEventListener("click", close);
    sheet.addEventListener("click", function (e) {
      if (e.target === sheet) close();
    });
    Array.prototype.forEach.call(sheet.querySelectorAll(".shiftCopyOpt"), function (btn) {
      btn.addEventListener("click", function () {
        onOption(btn.getAttribute("data-shift"));
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sheet.classList.contains("open")) close();
    });
  }

  window.rosterSiteShiftCopy = {
    open: open,
    close: close,
    setLang: refresh
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
