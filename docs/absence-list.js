(function () {
  "use strict";

  var ROOT_ID = "absence-list-root";
  var STYLE_ID = "absence-list-styles";
  var CHIP_ID = "absencesChipBtn";
  var SCRIPT_VER = "20260928a";

  function deployBasePath() {
    if (location.protocol === "file:") return "";
    var path = location.pathname || "/";
    if (path.indexOf("/roster-site/") !== -1) return "/roster-site";
    if (location.hostname && location.hostname.indexOf("github.io") !== -1) {
      var segs = path.split("/").filter(Boolean);
      if (segs.length >= 2 && segs[1] === "docs") return "/" + segs[0] + "/docs";
      return segs.length ? "/" + segs[0] : "";
    }
    return "";
  }

  function siteBase() {
    var origin = location.origin || "";
    var p = deployBasePath();
    if (!p) return origin + "/";
    return origin + p + (p.charAt(p.length - 1) === "/" ? "" : "/");
  }

  function onDedicatedPage() {
    return /\/absences(\/|\/index\.html)?$/.test(location.pathname || "");
  }

  function onExportRosterPage() {
    var path = location.pathname || "";
    if (path.indexOf("/import/") !== -1) return false;
    if (path.indexOf("/my-schedules") !== -1) return false;
    if (path.indexOf("/training") !== -1) return false;
    if (path.indexOf("/roster-diff") !== -1) return false;
    if (path.indexOf("/absences") !== -1) return false;
    if (path.indexOf("/with-me") !== -1) return false;
    if (path.indexOf("/read-and-sign") !== -1) return false;
    if (path.indexOf("/subscribe") !== -1) return false;
    return (
      /\/docs\/?$/.test(path) ||
      /\/docs\/index\.html$/.test(path) ||
      /\/docs\/home\.html$/.test(path) ||
      /\/docs\/now\//.test(path) ||
      /\/docs\/date\//.test(path) ||
      /\/roster-site\/?$/.test(path) ||
      /\/roster-site\/index\.html$/.test(path) ||
      /\/roster-site\/date\//.test(path) ||
      /^\/$/.test(path) ||
      /\/index\.html$/.test(path) ||
      /\/home\.html$/.test(path) ||
      /\/date\//.test(path) ||
      /\/now\//.test(path)
    );
  }

  function getLang() {
    var stored = localStorage.getItem("rosterLang") || localStorage.getItem("appLang");
    return stored === "ar" ? "ar" : "en";
  }

  function t(lang) {
    if (lang === "ar") {
      return {
        absences: "الغيابات",
        security: "الأمن",
        chip: "الغيابات",
        range: "فترة التقرير",
        independent: "ملف الغيابات مستقل عن روستر الشهر الحالي — عادةً للأشهر السابقة.",
        empty: "لا توجد سجلات غياب في الملف الحالي.",
        people: "موظف",
        days: "أيام",
        search: "بحث بالاسم أو الرقم",
        source: "absence-data.json",
        dir: "rtl"
      };
    }
    return {
      absences: "Absences",
      security: "Security",
      chip: "Absences",
      range: "Report period",
      independent: "The absences file is independent of the current roster month — it is usually for previous months.",
      empty: "No absence records in the current file.",
      people: "people",
      days: "days",
      search: "Search name or ID",
      source: "absence-data.json",
      dir: "ltr"
    };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isSecuritySection(section) {
    var raw = String(section || "");
    var low = raw.toLowerCase();
    if (low.indexOf("security") !== -1) return true;
    if (raw.indexOf("الأمن") !== -1) return true;
    return low.replace(/أ/g, "ا").replace(/إ/g, "ا").indexOf("امن") !== -1;
  }

  function buildGroups(absData) {
    if (absData && Array.isArray(absData.groups) && absData.groups.length) {
      return absData.groups;
    }
    var records = (absData && absData.records) || [];
    var buckets = { absences: {}, security: {} };
    records.forEach(function (rec) {
      var date = String((rec && rec.date) || "");
      var names = (rec && rec.names) || [];
      var nos = (rec && rec.empNos) || [];
      var secs = (rec && rec.sections) || [];
      nos.forEach(function (empNo, i) {
        var id = String(empNo || "").trim();
        if (!id) return;
        var section = String(secs[i] || "");
        var gid = isSecuritySection(section) ? "security" : "absences";
        var person = buckets[gid][id];
        if (!person) {
          person = {
            empNo: id,
            name: String(names[i] || "").trim(),
            section: section.trim(),
            dates: []
          };
          buckets[gid][id] = person;
        }
        if (date && person.dates.indexOf(date) === -1) person.dates.push(date);
      });
    });
    var titles = [
      ["absences", "Absences", "الغيابات"],
      ["security", "Security", "الأمن"]
    ];
    var groups = [];
    titles.forEach(function (row) {
      var people = Object.keys(buckets[row[0]]).map(function (k) { return buckets[row[0]][k]; });
      people.forEach(function (p) { p.dates.sort(); });
      people.sort(function (a, b) {
        return String(a.name || "").localeCompare(String(b.name || "")) || String(a.empNo).localeCompare(String(b.empNo));
      });
      if (people.length) {
        groups.push({ id: row[0], title_en: row[1], title_ar: row[2], employees: people });
      }
    });
    return groups;
  }

  function dateRangeText(absData, groups) {
    var range = absData && absData.date_range;
    var from = range && range.from;
    var to = range && range.to;
    if (!from || !to) {
      var dates = [];
      (groups || []).forEach(function (g) {
        (g.employees || []).forEach(function (p) {
          (p.dates || []).forEach(function (d) { dates.push(d); });
        });
      });
      dates.sort();
      from = dates[0] || "";
      to = dates[dates.length - 1] || "";
    }
    if (!from) return "";
    return from === to ? from : from + " → " + to;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent =
      "a.summaryChip.absencesChip .chipVal{color:#991b1b;}" +
      "a.summaryChip.absencesChip:hover{box-shadow:0 8px 20px rgba(153,27,27,.18);}" +
      "#" + ROOT_ID + "{margin-top:18px;display:flex;flex-direction:column;gap:14px;}" +
      "#" + ROOT_ID + "[data-lang='ar']{direction:rtl;text-align:right;}" +
      "#" + ROOT_ID + "[data-lang='en']{direction:ltr;text-align:left;}" +
      ".abs-list-note{font-size:12px;color:#64748b;line-height:1.55;padding:0 4px;}" +
      ".abs-list-search{width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;font-size:14px;}" +
      ".abs-list-card{background:#fff;border-radius:18px;overflow:hidden;border:1px solid rgba(15,23,42,.07);box-shadow:0 4px 18px rgba(15,23,42,.08);}" +
      ".abs-list-head{display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;border-bottom:2px solid #fecaca;}" +
      ".abs-list-card.collapsed .abs-list-head{border-bottom:none;}" +
      ".abs-list-card.collapsed .abs-list-body{display:none;}" +
      ".abs-list-icon{width:40px;height:40px;border-radius:12px;background:#fef2f2;color:#991b1b;display:flex;align-items:center;justify-content:center;flex-shrink:0;}" +
      ".abs-list-title{font-size:18px;font-weight:800;color:#1e293b;flex:1;}" +
      ".abs-list-sub{display:block;font-size:11px;font-weight:600;color:#94a3b8;margin-top:2px;}" +
      ".abs-list-badge{min-width:48px;padding:6px 10px;border-radius:12px;text-align:center;background:#fef2f2;color:#991b1b;border:1px solid #fecaca;}" +
      ".abs-list-badge strong{display:block;font-size:17px;font-weight:900;}" +
      ".abs-list-badge span{font-size:10px;opacity:.7;text-transform:uppercase;letter-spacing:.4px;}" +
      ".abs-list-body{padding:8px 10px 12px;display:flex;flex-direction:column;gap:6px;}" +
      ".abs-list-row{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline;padding:8px 10px;border-radius:10px;background:#f8fafc;}" +
      ".abs-list-row:nth-child(even){background:#fff7f7;}" +
      ".abs-list-name{font-size:13px;font-weight:800;color:#1e293b;flex:1;min-width:140px;}" +
      ".abs-list-id{font-size:11px;font-weight:700;color:#991b1b;background:#fee2e2;border-radius:999px;padding:1px 8px;}" +
      ".abs-list-dates{width:100%;font-size:11px;color:#64748b;line-height:1.45;}" +
      ".abs-list-empty{padding:16px;color:#64748b;font-size:13px;}";
    document.head.appendChild(s);
  }

  function chipSvg() {
    return (
      '<svg class="chip-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#991b1b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>' +
      '<circle cx="9" cy="7" r="4"/>' +
      '<path d="M17 8l5 5M22 8l-5 5"/>' +
      "</svg>"
    );
  }

  function injectChip(lang) {
    if (document.getElementById(CHIP_ID)) {
      var label = document.querySelector("#" + CHIP_ID + " .chipLabel");
      if (label) label.textContent = t(lang).chip;
      return;
    }
    var bar = document.querySelector(".summaryBar");
    if (!bar || onDedicatedPage()) return;
    var dict = t(lang);
    var a = document.createElement("a");
    a.id = CHIP_ID;
    a.className = "summaryChip absencesChip";
    a.style.textDecoration = "none";
    a.href = siteBase() + "absences/";
    a.title = dict.chip;
    a.setAttribute("aria-label", dict.chip);
    a.innerHTML =
      '<div class="chipVal">' + chipSvg() + "</div>" +
      '<div class="chipLabel" data-key="absencesPage">' + escapeHtml(dict.chip) + "</div>";
    var diff = document.getElementById("diffChipBtn");
    var training = document.getElementById("trainingBtn");
    if (diff && diff.parentNode === bar) bar.insertBefore(a, diff);
    else if (training && training.parentNode === bar) bar.insertBefore(a, training.nextSibling);
    else bar.appendChild(a);
  }

  function personMatches(person, q) {
    if (!q) return true;
    var blob = ((person.name || "") + " " + (person.empNo || "") + " " + (person.section || "")).toLowerCase();
    return blob.indexOf(q) !== -1;
  }

  function renderGroupCard(group, lang, query, collapsed) {
    var dict = t(lang);
    var title = lang === "ar" ? group.title_ar : group.title_en;
    var people = (group.employees || []).filter(function (p) { return personMatches(p, query); });
    var dayCount = 0;
    people.forEach(function (p) { dayCount += (p.dates || []).length; });
    var rows = people.map(function (p) {
      return (
        '<div class="abs-list-row">' +
          '<div class="abs-list-name">' + escapeHtml(p.name || p.empNo) + "</div>" +
          '<span class="abs-list-id">' + escapeHtml(p.empNo) + "</span>" +
          '<div class="abs-list-dates">' + escapeHtml((p.dates || []).join(" · ")) + "</div>" +
        "</div>"
      );
    }).join("");
    return (
      '<div class="abs-list-card' + (collapsed ? " collapsed" : "") + '" data-group="' + escapeHtml(group.id) + '">' +
        '<div class="abs-list-head">' +
          '<div class="abs-list-icon">' + chipSvg() + "</div>" +
          '<div class="abs-list-title">' + escapeHtml(title) +
            '<span class="abs-list-sub">' + escapeHtml(dict.people) + " · " + people.length + " · " + dayCount + " " + escapeHtml(dict.days) + "</span>" +
          "</div>" +
          '<div class="abs-list-badge"><span>' + escapeHtml(dict.days) + "</span><strong>" + dayCount + "</strong></div>" +
        "</div>" +
        '<div class="abs-list-body">' + (rows || '<div class="abs-list-empty">' + escapeHtml(dict.empty) + "</div>") + "</div>" +
      "</div>"
    );
  }

  function paint(root, absData, query) {
    var lang = getLang();
    var dict = t(lang);
    root.setAttribute("data-lang", lang);
    root.setAttribute("dir", dict.dir);
    var groups = buildGroups(absData);
    var range = dateRangeText(absData, groups);
    var dedicated = onDedicatedPage();
    var searchHtml = dedicated
      ? '<input class="abs-list-search" id="abs-list-search" type="search" placeholder="' + escapeHtml(dict.search) + '" value="' + escapeHtml(query || "") + '">'
      : "";
    var cards = groups.map(function (g) {
      return renderGroupCard(g, lang, (query || "").trim().toLowerCase(), !dedicated);
    }).join("");
    if (!groups.length) {
      cards = '<div class="abs-list-card"><div class="abs-list-empty">' + escapeHtml(dict.empty) + "</div></div>";
    }
    root.innerHTML =
      '<p class="abs-list-note">' + escapeHtml(dict.independent) +
        (range ? "<br>" + escapeHtml(dict.range) + ": " + escapeHtml(range) : "") +
      "</p>" +
      searchHtml +
      cards;
    root.querySelectorAll(".abs-list-head").forEach(function (head) {
      head.addEventListener("click", function () {
        var card = head.closest(".abs-list-card");
        if (card) card.classList.toggle("collapsed");
      });
    });
    var search = document.getElementById("abs-list-search");
    if (search && search.dataset.wired !== "1") {
      search.dataset.wired = "1";
      search.addEventListener("input", function () {
        paint(root, absData, search.value);
        var again = document.getElementById("abs-list-search");
        if (again) {
          again.focus();
          var val = again.value;
          again.setSelectionRange(val.length, val.length);
        }
      });
    }
  }

  function ensureRoot() {
    var existing = document.getElementById(ROOT_ID);
    if (existing) return existing;
    if (onDedicatedPage()) {
      var host = document.getElementById("absence-list-host") || document.querySelector(".wrap") || document.body;
      var el = document.createElement("div");
      el.id = ROOT_ID;
      host.appendChild(el);
      return el;
    }
    if (!onExportRosterPage()) return null;
    var wrap = document.querySelector(".wrap");
    if (!wrap) return null;
    var el2 = document.createElement("div");
    el2.id = ROOT_ID;
    wrap.appendChild(el2);
    return el2;
  }

  function apply(absData) {
    injectStyles();
    var lang = getLang();
    if (onExportRosterPage()) injectChip(lang);
    var root = ensureRoot();
    if (!root) return;
    paint(root, absData, "");
  }

  function init() {
    if (window.__absenceListBooted) return;
    window.__absenceListBooted = true;
    fetch(siteBase() + "absence-data.json?v=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        apply(data);
      })
      .catch(function (err) {
        console.warn("absence-list failed:", err);
      });
    window.addEventListener("storage", function (e) {
      if (e.key === "rosterLang" || e.key === "appLang") {
        var root = document.getElementById(ROOT_ID);
        if (root && window.__absenceListData) paint(root, window.__absenceListData, (document.getElementById("abs-list-search") || {}).value || "");
        injectChip(getLang());
      }
    });
    document.addEventListener("rosterLangChanged", function () {
      var root = document.getElementById(ROOT_ID);
      if (root && window.__absenceListData) {
        paint(root, window.__absenceListData, (document.getElementById("abs-list-search") || {}).value || "");
      }
      injectChip(getLang());
    });
  }

  var _apply = apply;
  apply = function (absData) {
    window.__absenceListData = absData;
    _apply(absData);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(init, 200); });
  } else {
    setTimeout(init, 200);
  }

  window.__absenceListVer = SCRIPT_VER;
})();
