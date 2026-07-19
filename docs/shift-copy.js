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

  var MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  // The reference date for the current page (date pages, picker, or today Muscat).
  function refIsoDate() {
    var m = (location.pathname || "").match(/\/date\/(\d{4}-\d{2}-\d{2})\//);
    if (m) return m[1];
    var picker = document.getElementById("datePicker");
    if (picker && picker.value) return picker.value;
    var now = new Date();
    var muscat = new Date(now.getTime() + (4 * 3600 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return muscat.getFullYear() + "-" + pad2(muscat.getMonth() + 1) + "-" + pad2(muscat.getDate());
  }

  function formatDate(iso) {
    var parts = (iso || "").split("-");
    if (parts.length !== 3) return iso || "";
    var d = parseInt(parts[2], 10);
    var mo = parseInt(parts[1], 10);
    var y = parts[0];
    var months = (window.LANG === "ar") ? MONTHS_AR : MONTHS_EN;
    var name = months[mo - 1] || String(mo);
    return d + " " + name + " " + y;
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
    // Header: shift name + date, so the recipient knows what the list is.
    lines.push("\u200e*" + labelFor(shiftKey) + " — " + formatDate(refIsoDate()) + "*");
    lines.push("");
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
    if (hint) hint.textContent = t("copyHint", "Copy or share a shift as WhatsApp text");
    if (closeLbl) closeLbl.textContent = t("copyClose", "Close");
    var copyLabel = t("copyAction", "Copy");
    var shareLabel = t("shareAction", "Share");
    Array.prototype.forEach.call(sheet.querySelectorAll(".shiftCopyOpt"), function (row) {
      var key = row.getAttribute("data-shift");
      var labelEl = row.querySelector(".shiftCopyOpt-label");
      var countEl = row.querySelector(".shiftCopyOpt-count");
      if (labelEl) labelEl.textContent = labelFor(key);
      var c = countNames(key);
      if (countEl) countEl.textContent = c;
      row.classList.toggle("is-empty", c === 0);
      var copyBtn = row.querySelector(".shiftCopyAct--copy");
      var shareBtn = row.querySelector(".shiftCopyAct--share");
      if (copyBtn) { copyBtn.title = copyLabel; copyBtn.setAttribute("aria-label", copyLabel + " " + labelFor(key)); }
      if (shareBtn) { shareBtn.title = shareLabel; shareBtn.setAttribute("aria-label", shareLabel + " " + labelFor(key)); }
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

  function openWhatsApp(text) {
    var url = "https://wa.me/?text=" + encodeURIComponent(text);
    window.open(url, "_blank", "noopener");
  }

  function doCopy(shiftKey) {
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

  function doShare(shiftKey) {
    var text = buildText(shiftKey);
    if (!text) {
      setStatus(t("copyEmpty", "No employees in this shift"), false);
      return;
    }
    if (navigator.share) {
      navigator.share({ text: text }).then(function () {
        setStatus(t("shareDone", "Shared") + " · " + labelFor(shiftKey), true);
      }).catch(function (err) {
        // Ignore user-cancelled share; otherwise fall back to WhatsApp.
        if (err && (err.name === "AbortError" || err.name === "NotAllowedError")) return;
        openWhatsApp(text);
      });
    } else {
      openWhatsApp(text);
    }
  }

  function onAction(act, shiftKey) {
    if (act === "share") doShare(shiftKey);
    else doCopy(shiftKey);
  }

  function injectShiftCopyStyles() {
    if (document.getElementById("shift-copy-hide-css")) return;
    var style = document.createElement("style");
    style.id = "shift-copy-hide-css";
    style.textContent = [
      ".shiftCopySheet{",
      "position:fixed!important;inset:0!important;display:none!important;",
      "align-items:center!important;justify-content:center!important;",
      "background:rgba(15,23,42,.45)!important;z-index:10003!important;padding:16px!important;",
      "pointer-events:none!important;visibility:hidden!important;",
      "}",
      ".shiftCopySheet.open{",
      "display:flex!important;pointer-events:auto!important;visibility:visible!important;",
      "}",
      ".shiftCopyCard{",
      "width:min(100%,380px);background:#fff;border-radius:18px;padding:18px 16px 14px;",
      "border:1px solid rgba(15,23,42,.1);box-shadow:0 20px 48px rgba(15,23,42,.22);text-align:center;",
      "}",
      ".shiftCopyTitle{font-size:17px;font-weight:800;color:#0f172a;margin:0 0 4px;}",
      ".shiftCopyHint{font-size:12px;color:#64748b;margin:0 0 14px;line-height:1.4;}",
      ".shiftCopyGrid{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:6px;}",
      ".shiftCopyOpt{display:flex;align-items:center;gap:12px;min-height:52px;padding:8px 10px 8px 14px;",
      "border-radius:14px;border:1.5px solid #e2e8f0;background:#f8fafc;font:inherit;text-align:start;}",
      ".shiftCopyOpt-icon{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;",
      "border-radius:12px;background:#fff;border:1px solid #e2e8f0;flex-shrink:0;}",
      ".shiftCopyOpt-main{flex:1;display:flex;align-items:center;gap:8px;min-width:0;}",
      ".shiftCopyOpt-label{font-size:14px;font-weight:800;color:#1e293b;}",
      ".shiftCopyOpt-count{min-width:26px;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:800;",
      "color:#475569;background:#eef2f7;border:1px solid #e2e8f0;text-align:center;}",
      ".shiftCopyOpt-actions{display:flex;align-items:center;gap:6px;flex-shrink:0;}",
      ".shiftCopyAct{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;",
      "border-radius:12px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;padding:0;}",
      ".shiftCopyStatus{min-height:18px;font-size:12px;font-weight:700;color:#166534;margin:4px 0 8px;}",
      ".shiftCopyCloseWrap .roster-cta-btn{width:100%;}",
      ".shiftCopyOpt.is-empty{opacity:.5;}"
    ].join("");
    document.head.appendChild(style);
  }

  function bind() {
    injectShiftCopyStyles();
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
    Array.prototype.forEach.call(sheet.querySelectorAll(".shiftCopyAct"), function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        onAction(btn.getAttribute("data-act"), btn.getAttribute("data-shift"));
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
