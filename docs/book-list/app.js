const fileInput = document.getElementById("fileInput");
const drop = document.getElementById("drop");
const compareBtn = document.getElementById("compareBtn");
const demoBtn = document.getElementById("demoBtn");
const resetBtn = document.getElementById("resetBtn");
const errorEl = document.getElementById("error");
const resultEl = document.getElementById("result");
const tbody = document.getElementById("tbody");
const searchEl = document.getElementById("search");
const trackPreset = document.getElementById("trackPreset");
const trackUrl = document.getElementById("trackUrl");
const langBtn = document.getElementById("langBtn");

const TRACK_KEY = "flightTrackUrl";
const LANG_KEY = "uiLang";
const ACTIVE_KEY = "activeFlightId";
const DB_NAME = "booklistFlights";
const SAMPLE_PLAN = "FligtLoadPlan_V1_WY171_MCTAMS_08Sep2026.pdf";
const SAMPLE_BOOK = "Book List.pdf";
const API_ROOT = (function () {
  var host = location.hostname || "";
  if (host === "book-list.158-220-106-38.sslip.io" || location.port === "8022") return "";
  return "https://book-list.158-220-106-38.sslip.io";
})();
const AWB_PREFIX = "910";
const PRESETS = [
  "https://www.google.com/search?q={flight}+{date}",
  "https://www.flightradar24.com/data/flights/{flight}",
  "https://www.flightaware.com/live/flight/{flight}",
];

const I18N = {
  en: {
    title: "Cargo matching",
    lead: "The Load Plan is the source. Upload both files to see what is booked and what is not.",
    dropStrong: "Drop the Load Plan and Book List",
    dropHint: "or click to choose",
    planFile: "Load Plan",
    bookFile: "Book List",
    compare: "Compare",
    demo: "Try current files",
    reset: "Other files",
    search: "Search by AWB",
    openFlightIn: "Open flight in",
    customUrl: "Custom URL…",
    colStatus: "Status",
    colAwb: "AWB",
    colRoute: "Route",
    colPcs: "Pieces",
    colWgt: "Weight",
    extraTitle: "Not on Load Plan — NOT READY",
    langBtn: "العربية",
    roster: "Roster",
    flights: "Flights",
    addFlight: "Add flight",
    deleteFlight: "Remove",
    noFlights: "No saved flights yet",
    openRail: "Open flights",
    closeRail: "Collapse",
    savedLocally: "Saved on this device",
    all: "All",
    matched: "Matched",
    discrepancy: "Discrepancy",
    unbooked: "Unbooked",
    labels: {
      unbooked: "Unbooked",
      partial: "Partial",
      mismatch: "Discrepancy",
      matched: "Matched",
    },
    notReady: "not ready",
    emptyRows: "No shipments here.",
    trackTitle: "Shipment tracking",
    omanAir: "Oman Air Cargo",
    openSite: "Open website",
    openFlight: "Open flight",
    trackingWait: "Fetching tracking from Oman Air Cargo…",
    noTracking: "No tracking data",
    milestones: {
      Arrived: "Arrived",
      Departed: "Departed",
      Accepted: "Accepted",
      Booked: "Booked",
      Delivered: "Delivered",
      Offloaded: "Offloaded",
    },
    activity: {
      arrivedAt: "Arrived at",
      departedFrom: "Departed from",
      deliveredAt: "Delivered at",
      acceptedAt: "Accepted at",
      booked: "Booked",
    },
    verdictMissing: (n, total) => `${n} of ${total} unbooked`,
    verdictPartial: (booked, total, partial) => `${booked} of ${total} booked — ${partial} partial`,
    verdictDiffs: (booked, total, mismatch) => `${booked} of ${total} booked — ${mismatch} with discrepancy`,
    verdictAll: (total) => `${total} of ${total} booked and matched`,
    notes: {
      in_plan_not_in_book: "On the Load Plan but not on the Book List",
      not_booked: "Not booked",
      partial_pcs: (booked, plan) => `Booked ${booked} of ${plan} pieces`,
      part_not_ready: "Booked, but some pieces are not ready",
      weight_diff: (plan, book) => `Load Plan weight ${plan} vs Book List ${book}`,
      extra_pcs: (pcs) => `+${pcs} extra pieces on the Book List`,
    },
    errors: {
      need_files: "No files were uploaded.",
      need_load_plan: "Upload the Load Plan — it is the source for matching.",
      need_book_list: "Upload the Book List to complete matching.",
      unknown_pdf: "Could not identify the file type.",
      read_failed: "Could not read the file.",
      demo_missing: "Sample files are not in this folder.",
      demo_failed: "Could not run the sample.",
      compare_failed: "Matching failed.",
      invalid_awb: "Invalid AWB number.",
      track_unreachable: "Could not reach Oman Air Cargo tracking.",
      track_failed: "Could not fetch tracking.",
    },
  },
  ar: {
    title: "مطابقة الشحنات",
    lead: "الأساس هو خطة التحميل. ارفع الملفين لمعرفة ما حُجز وما لم يُحجز.",
    dropStrong: "أسقط خطة التحميل وقائمة الحجز",
    dropHint: "أو اضغط للاختيار",
    planFile: "خطة التحميل",
    bookFile: "قائمة الحجز",
    compare: "مطابقة",
    demo: "تجربة الملفين الحاليين",
    reset: "ملفات أخرى",
    search: "بحث برقم البوليصة",
    openFlightIn: "فتح الرحلة في",
    customUrl: "رابط مخصص…",
    colStatus: "الحالة",
    colAwb: "البوليصة",
    colRoute: "المسار",
    colPcs: "القطع",
    colWgt: "الوزن",
    extraTitle: "خارج خطة التحميل — NOT READY",
    langBtn: "English",
    roster: "الوردية",
    flights: "الرحلات",
    addFlight: "إضافة رحلة",
    deleteFlight: "حذف",
    noFlights: "لا توجد رحلات محفوظة",
    openRail: "فتح الرحلات",
    closeRail: "طيّ الشريط",
    savedLocally: "محفوظة على هذا الجهاز",
    all: "الكل",
    matched: "مطابقة",
    discrepancy: "اختلاف",
    unbooked: "غير محجوزة",
    labels: {
      unbooked: "غير محجوزة",
      partial: "حجز جزئي",
      mismatch: "اختلاف",
      matched: "مطابقة",
    },
    notReady: "غير جاهزة",
    emptyRows: "لا توجد شحنات هنا.",
    trackTitle: "تتبع الشحنة",
    omanAir: "الطيران العماني للشحن",
    openSite: "فتح الموقع",
    openFlight: "فتح الرحلة",
    trackingWait: "جاري جلب التتبع من الطيران العماني للشحن…",
    noTracking: "لا توجد بيانات تتبع",
    milestones: {
      Arrived: "وصل",
      Departed: "غادر",
      Accepted: "تم القبول",
      Booked: "محجوزة",
      Delivered: "تم التسليم",
      Offloaded: "تم التفريغ",
    },
    activity: {
      arrivedAt: "وصل إلى",
      departedFrom: "غادر من",
      deliveredAt: "تم التسليم في",
      acceptedAt: "تم القبول في",
      booked: "محجوزة",
    },
    verdictMissing: (n, total) => `${n} من ${total} غير محجوزة`,
    verdictPartial: (booked, total, partial) => `${booked} من ${total} محجوزة — منها ${partial} حجز جزئي`,
    verdictDiffs: (booked, total, mismatch) => `${booked} من ${total} محجوزة — منها ${mismatch} باختلاف`,
    verdictAll: (total) => `${total} من ${total} محجوزة ومطابقة`,
    notes: {
      in_plan_not_in_book: "موجودة في خطة التحميل وغير موجودة في قائمة الحجز",
      not_booked: "لم تُحجز",
      partial_pcs: (booked, plan) => `محجوز ${booked} من ${plan} قطعة`,
      part_not_ready: "محجوزة لكن جزءاً منها غير جاهز",
      weight_diff: (plan, book) => `الوزن في خطة التحميل ${plan} مقابل ${book} في قائمة الحجز`,
      extra_pcs: (pcs) => `+${pcs} قطعة زائدة في قائمة الحجز`,
    },
    errors: {
      need_files: "لم يتم رفع أي ملف.",
      need_load_plan: "ارفع خطة التحميل — هي الأساس للمطابقة.",
      need_book_list: "ارفع قائمة الحجز لإكمال المطابقة.",
      unknown_pdf: "تعذر التعرف على نوع الملف.",
      read_failed: "تعذر قراءة الملف.",
      demo_missing: "ملفات التجربة غير موجودة في المجلد.",
      demo_failed: "تعذر تشغيل التجربة.",
      compare_failed: "تعذر المطابقة.",
      invalid_awb: "رقم البوليصة غير صالح.",
      track_unreachable: "تعذر الاتصال بتتبع الطيران العماني للشحن.",
      track_failed: "تعذر جلب التتبع.",
    },
  },
};

const files = [];
let report = null;
let filter = "all";
let openSerial = null;
let lang = localStorage.getItem(LANG_KEY) === "ar" ? "ar" : "en";
let activeFlightId = localStorage.getItem(ACTIVE_KEY);
let railOpen = true;
let savedFlights = [];
const cargoCache = new Map();

function t() {
  return I18N[lang];
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("flights")) {
        db.createObjectStore("flights", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction("flights", mode);
        const store = tx.objectStore("flights");
        const req = fn(store);
        if (req) {
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        } else {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        }
      })
  );
}

function idbPut(record) {
  return withStore("readwrite", (store) => store.put(record));
}

function idbGet(id) {
  return withStore("readonly", (store) => store.get(id));
}

function idbAll() {
  return withStore("readonly", (store) => store.getAll()).then((rows) => rows || []);
}

function idbDelete(id) {
  return withStore("readwrite", (store) => store.delete(id));
}

function toFile(blob, name) {
  return new File([blob], name, { type: blob.type || "application/pdf" });
}

function pickPlan() {
  return files.find((file) => /load|fligt|flight/i.test(file.name)) || files[0];
}

function pickBook() {
  return files.find((file) => /book/i.test(file.name)) || files[1];
}

function setWorkingFiles(plan, book) {
  files.length = 0;
  if (plan) files.push(plan);
  if (book) files.push(book);
  compareBtn.disabled = files.length === 0;
  setFile("loadplan", plan?.name || "");
  setFile("booklist", book?.name || "");
}

function setRailOpen(open) {
  railOpen = open;
  document.body.classList.toggle("rail-collapsed", !open);
  const edge = document.getElementById("railEdge");
  if (edge) edge.setAttribute("aria-label", open ? t().closeRail : t().openRail);
}

async function refreshSavedFlights() {
  savedFlights = await idbAll();
}

async function persistActiveFlight(data) {
  const plan = pickPlan();
  const book = pickBook();
  if (!plan || !book) return;
  const flight = data.flight || {};
  if (!activeFlightId && flight.no && flight.date) {
    const existing = savedFlights.find((item) => item.flightNo === flight.no && item.date === flight.date);
    if (existing) activeFlightId = existing.id;
  }
  const record = {
    id: activeFlightId || crypto.randomUUID(),
    flightNo: flight.no || "",
    route: flight.route || "",
    date: flight.date || "",
    planName: plan.name,
    bookName: book.name,
    planFile: plan,
    bookFile: book,
    report: data,
    savedAt: Date.now(),
  };
  activeFlightId = record.id;
  localStorage.setItem(ACTIVE_KEY, record.id);
  await idbPut(record);
  await refreshSavedFlights();
  renderFlightList();
}

function renderFlightList() {
  const list = document.getElementById("flightList");
  if (!list) return;
  const ui = t();
  const items = [...savedFlights].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  if (!items.length) {
    list.innerHTML = `<p class="rail-empty">${ui.noFlights}</p>`;
    return;
  }
  list.innerHTML = items
    .map((rec) => {
      const title = rec.flightNo || rec.planName || ui.flights;
      return `<div class="flight-card${rec.id === activeFlightId ? " active" : ""}" data-id="${rec.id}">
        <button type="button" class="flight-del" data-del="${rec.id}" aria-label="${ui.deleteFlight}">×</button>
        <span class="no" dir="ltr">${escapeHtml(title)}</span>
        <div class="meta">
          ${rec.route ? `<span dir="ltr">${escapeHtml(rec.route)}</span>` : ""}
          ${rec.date ? `<span dir="ltr">${escapeHtml(rec.date)}</span>` : ""}
        </div>
      </div>`;
    })
    .join("");
  list.querySelectorAll(".flight-card").forEach((card) => {
    card.addEventListener("click", () => onFlightClick(card.dataset.id));
  });
  list.querySelectorAll(".flight-del").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteFlight(btn.dataset.del);
    });
  });
}

async function onFlightClick(id) {
  if (id === activeFlightId && railOpen && report) {
    setRailOpen(false);
    return;
  }
  await openSavedFlight(id, true);
}

async function openSavedFlight(id, collapse) {
  const rec = savedFlights.find((item) => item.id === id) || (await idbGet(id));
  if (!rec) return;
  activeFlightId = rec.id;
  localStorage.setItem(ACTIVE_KEY, rec.id);
  setWorkingFiles(toFile(rec.planFile, rec.planName), toFile(rec.bookFile, rec.bookName));
  if (rec.report) applyReport(rec.report, { persist: false });
  else await compareNow();
  if (collapse) setRailOpen(false);
  renderFlightList();
}

async function deleteFlight(id) {
  await idbDelete(id);
  await refreshSavedFlights();
  if (activeFlightId === id) startNewFlight();
  else renderFlightList();
}

function startNewFlight() {
  files.length = 0;
  report = null;
  openSerial = null;
  activeFlightId = null;
  localStorage.removeItem(ACTIVE_KEY);
  cargoCache.clear();
  document.body.classList.remove("ready");
  resultEl.hidden = true;
  resetBtn.hidden = true;
  compareBtn.disabled = true;
  setFile("loadplan", "");
  setFile("booklist", "");
  fileInput.value = "";
  const chip = document.getElementById("flightChip");
  if (chip) chip.hidden = true;
  setRailOpen(true);
  renderFlightList();
}

function apiError(code, fallback = "compare_failed") {
  const ui = t();
  return ui.errors[code] || ui.errors[fallback] || code;
}

function showError(msg) {
  errorEl.hidden = !msg;
  errorEl.textContent = msg || "";
}

function setFile(kind, name) {
  const el = document.getElementById(kind === "loadplan" ? "planFile" : "bookFile");
  const ui = t();
  el.textContent = name || (kind === "loadplan" ? ui.planFile : ui.bookFile);
  el.classList.toggle("ok", Boolean(name));
}

function remember(file) {
  const i = files.findIndex((f) => f.name === file.name && f.size === file.size);
  if (i >= 0) files.splice(i, 1);
  files.push(file);
  compareBtn.disabled = files.length === 0;
  const lower = file.name.toLowerCase();
  if (lower.includes("load") || lower.includes("fligt") || lower.includes("flight")) {
    setFile("loadplan", file.name);
  } else if (lower.includes("book")) {
    setFile("booklist", file.name);
  }
}

function trackTemplate() {
  if (trackPreset.value === "custom") return trackUrl.value.trim() || PRESETS[0];
  return trackPreset.value;
}

function loadTrack() {
  const saved = localStorage.getItem(TRACK_KEY) || PRESETS[0];
  if (PRESETS.includes(saved)) {
    trackPreset.value = saved;
    trackUrl.hidden = true;
  } else {
    trackPreset.value = "custom";
    trackUrl.value = saved;
    trackUrl.hidden = false;
  }
}

function saveTrack() {
  localStorage.setItem(TRACK_KEY, trackTemplate());
}

function cargoTrackUrl(serial) {
  return `https://omanair.smartkargo.com/FrmAWBTracking.aspx?AWBPrefix=${AWB_PREFIX}&AWBno=${encodeURIComponent(serial)}`;
}

function fillTrack(leg, row) {
  return trackTemplate().replace(/\{(\w+)\}/g, (_, key) => ({
    flight: leg.flight || "",
    date: leg.date || "",
    eta: leg.eta || "",
    origin: row?.org || "",
    awb: row?.awb || "",
  }[key] ?? ""));
}

function activityText(text) {
  const a = t().activity;
  return (text || "")
    .replace(/\bArrived at\b/i, a.arrivedAt)
    .replace(/\bDeparted from\b/i, a.departedFrom)
    .replace(/\bDelivered at\b/i, a.deliveredAt)
    .replace(/\bAccepted at\b/i, a.acceptedAt)
    .replace(/\bBooked\b/i, a.booked);
}

function milestoneText(text) {
  const raw = (text || "").replace(/\s*\[.*?\]\s*/g, " ").trim();
  const key = raw.split(/\s+/)[0];
  const mapped = t().milestones[key];
  return mapped ? raw.replace(key, mapped) : text;
}

function formatNote(note) {
  const n = t().notes;
  if (typeof note === "string") return note;
  switch (note.code) {
    case "in_plan_not_in_book":
      return n.in_plan_not_in_book;
    case "not_booked":
      return n.not_booked;
    case "partial_pcs":
      return n.partial_pcs(note.booked, note.plan);
    case "part_not_ready":
      return n.part_not_ready;
    case "weight_diff":
      return n.weight_diff(fmtNum(note.plan), fmtNum(note.book));
    case "extra_pcs":
      return n.extra_pcs(note.pcs);
    default:
      return "";
  }
}

function rowNote(row) {
  if (Array.isArray(row.notes) && row.notes.length) {
    return row.notes.map(formatNote).filter(Boolean).join(" · ");
  }
  return row.note || "";
}

function verdictText(data) {
  const s = data.summary;
  const booked = s.booked ?? s.matched + s.mismatch + s.partial;
  if (data.verdict === "missing") return t().verdictMissing(s.unbooked, s.planAwbs);
  if (data.verdict === "partial") return t().verdictPartial(booked, s.planAwbs, s.partial);
  if (data.verdict === "booked_with_diffs") return t().verdictDiffs(booked, s.planAwbs, s.mismatch);
  return t().verdictAll(s.planAwbs);
}

function groupInbound(inbound) {
  const groups = [];
  const index = new Map();
  for (const leg of inbound || []) {
    if (!index.has(leg.flight)) {
      index.set(leg.flight, []);
      groups.push({ flight: leg.flight, legs: index.get(leg.flight) });
    }
    index.get(leg.flight).push(leg);
  }
  return groups;
}

function cargoBodyHtml(serial) {
  const ui = t();
  const cached = cargoCache.get(serial);
  if (!cached || cached.status === "loading") {
    return `<p class="cargo-wait">${ui.trackingWait}</p>`;
  }
  if (cached.status === "error") {
    return `<p class="cargo-err">${apiError(cached.error, "track_failed")}</p>`;
  }
  const data = cached.data;
  if (!data?.found) {
    return `<p class="cargo-err">${ui.noTracking}</p>`;
  }
  const route = data.origin && data.dest ? `${data.origin} → ${data.dest}` : "";
  const meta = [data.pcs, data.weight, route].filter(Boolean).join(" · ");
  const events = (data.history || [])
    .map(
      (ev) => `<div class="cargo-ev">
        <span class="mono">${ev.station}</span>
        <span>${milestoneText(ev.milestone)}</span>
        <span class="dates" dir="ltr">${[ev.flight, ev.date].filter(Boolean).join(" · ")}</span>
        <span class="dates" dir="ltr">${ev.org && ev.dest ? `${ev.org} → ${ev.dest}` : ""}</span>
      </div>`
    )
    .join("");
  return `<div class="cargo-activity">${activityText(data.activity)}</div>
    <div class="cargo-meta" dir="ltr">${meta}</div>
    ${events ? `<div class="cargo-events">${events}</div>` : ""}`;
}

function cargoHtml(serial) {
  const ui = t();
  return `<div class="cargo">
    <div class="leg">
      <div>
        <span class="flight-no">${ui.trackTitle}</span>
        <div class="dates">${ui.omanAir}</div>
      </div>
      <a class="btn link" href="${cargoTrackUrl(serial)}" target="_blank" rel="noopener">${ui.openSite}</a>
    </div>
    ${cargoBodyHtml(serial)}
  </div>`;
}

function inboundHtml(row) {
  const ui = t();
  const flights = groupInbound(row.inbound)
    .map((group) => {
      const last = group.legs[group.legs.length - 1];
      const dates = group.legs
        .map((leg) => `${leg.date.slice(0, 5)}${leg.eta ? ` ${leg.eta}` : ""}`)
        .join(" · ");
      return `<div class="leg">
        <div>
          <span class="flight-no">${group.flight}</span>
          <div class="dates">${dates}</div>
        </div>
        <a class="btn link" href="${fillTrack(last, row)}" target="_blank" rel="noopener">${ui.openFlight}</a>
      </div>`;
    })
    .join("");
  return `<div class="inbound">${cargoHtml(row.serial)}${flights}</div>`;
}

function pair(plan, book, differ) {
  if (plan == null) return fmtNum(book);
  if (book == null || book === 0 && plan) return fmtNum(plan);
  if (!differ) return fmtNum(plan);
  return `<span class="diff">${fmtNum(plan)} → ${fmtNum(book)}</span>`;
}

function fmtNum(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function extras() {
  return (report?.extra || []).filter((item) => !item.inLoadPlan);
}

function bindAwbClicks(root = document) {
  root.querySelectorAll(".awb-btn").forEach((btn) => {
    btn.addEventListener("click", () => toggleOpen(btn.dataset.serial));
  });
}

function toggleOpen(serial) {
  openSerial = openSerial === serial ? null : serial;
  renderTable();
  renderExtras();
  if (openSerial) loadCargo(openSerial);
}

async function loadCargo(serial) {
  const cached = cargoCache.get(serial);
  if (cached?.status === "ok" || cached?.status === "loading") return;
  cargoCache.set(serial, { status: "loading" });
  renderTable();
  renderExtras();
  try {
    const res = await fetch(`${API_ROOT}/api/track?serial=${encodeURIComponent(serial)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "track_failed");
    cargoCache.set(serial, { status: "ok", data });
  } catch (err) {
    cargoCache.set(serial, { status: "error", error: err.message });
  }
  if (openSerial === serial) {
    renderTable();
    renderExtras();
  }
}

function rosterHomeUrl() {
  const host = location.hostname || "";
  if (host === "127.0.0.1" || host === "localhost") {
    if (location.port === "8011") return `${location.origin}/`;
    return "http://127.0.0.1:8011/";
  }
  return "https://khalidsaif912.github.io/new/";
}

function bindRosterLinks() {
  const href = rosterHomeUrl();
  ["rosterBtn", "rosterMini"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.href = href;
  });
}

function applyLang() {
  const ui = t();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.title = ui.title;
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.textContent = btn.id === "langMini" ? (lang === "en" ? "ع" : "EN") : ui.langBtn;
  });
  const rosterMini = document.getElementById("rosterMini");
  if (rosterMini) {
    rosterMini.title = ui.roster;
    rosterMini.setAttribute("aria-label", ui.roster);
  }
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = ui[el.dataset.i18n];
    if (typeof value === "string") el.textContent = value;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const value = ui[el.dataset.i18nPlaceholder];
    if (typeof value === "string") el.placeholder = value;
  });
  const customOpt = trackPreset.querySelector('option[value="custom"]');
  if (customOpt) customOpt.textContent = ui.customUrl;
  if (!document.getElementById("planFile").classList.contains("ok")) setFile("loadplan", "");
  if (!document.getElementById("bookFile").classList.contains("ok")) setFile("booklist", "");
  if (report) {
    paintVerdictAndStats();
    renderTable();
    renderExtras();
  }
  renderFlightList();
  setRailOpen(railOpen);
}

function toggleLang() {
  lang = lang === "en" ? "ar" : "en";
  localStorage.setItem(LANG_KEY, lang);
  applyLang();
}

drop.addEventListener("click", () => fileInput.click());
drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("over");
});
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("over");
  [...e.dataTransfer.files].filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf")).forEach(remember);
  if (files.length >= 2) compareNow();
});
fileInput.addEventListener("change", () => {
  [...fileInput.files].forEach(remember);
  if (files.length >= 2) compareNow();
});

compareBtn.addEventListener("click", compareNow);
demoBtn.addEventListener("click", loadDemo);
document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleLang();
  });
});
document.getElementById("addFlightBtn").addEventListener("click", startNewFlight);
document.getElementById("railEdge").addEventListener("click", (event) => {
  event.stopPropagation();
  setRailOpen(!railOpen);
});
document.getElementById("railCollapsed").addEventListener("click", (event) => {
  if (event.target.closest(".lang-btn")) return;
  setRailOpen(true);
});
resetBtn.addEventListener("click", startNewFlight);
searchEl.addEventListener("input", renderTable);
trackPreset.addEventListener("change", () => {
  trackUrl.hidden = trackPreset.value !== "custom";
  saveTrack();
  renderTable();
});
trackUrl.addEventListener("change", () => {
  saveTrack();
  renderTable();
});

async function compareNow() {
  if (!files.length) return;
  showError("");
  const body = new FormData();
  files.forEach((file, i) => body.append(`file${i}`, file, file.name));
  await postCompare(`${API_ROOT}/api/compare`, body);
}

async function loadDemo() {
  showError("");
  try {
    const [planRes, bookRes] = await Promise.all([
      fetch(encodeURI(SAMPLE_PLAN)),
      fetch(encodeURI(SAMPLE_BOOK)),
    ]);
    if (!planRes.ok || !bookRes.ok) throw new Error("demo_missing");
    const plan = new File([await planRes.blob()], SAMPLE_PLAN, { type: "application/pdf" });
    const book = new File([await bookRes.blob()], SAMPLE_BOOK, { type: "application/pdf" });
    setWorkingFiles(plan, book);
    await compareNow();
  } catch (err) {
    showError(apiError(err.message, "demo_failed"));
  }
}

async function postCompare(url, body) {
  try {
    const res = await fetch(url, { method: "POST", body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "compare_failed");
    applyReport(data);
  } catch (err) {
    showError(apiError(err.message, "compare_failed"));
  }
}

function paintVerdictAndStats() {
  if (!report) return;
  const ui = t();
  const s = report.summary;
  const issues = s.issues ?? s.mismatch + s.partial;
  const verdict = document.getElementById("verdict");
  verdict.className = `verdict ${report.verdict}`;
  document.getElementById("verdictTitle").textContent = verdictText(report);
  document.getElementById("stats").innerHTML = [
    ["all", `${s.planAwbs} ${ui.all}`],
    ["matched", `${s.matched} ${ui.matched}`],
    ["mismatch", `${issues} ${ui.discrepancy}`],
    ["unbooked", `${s.unbooked} ${ui.unbooked}`],
  ]
    .map(
      ([key, label]) =>
        `<button type="button" class="count ${filter === key ? "active" : ""}" data-filter="${key}">${label}</button>`
    )
    .join("");
  document.querySelectorAll(".count").forEach((btn) => {
    btn.addEventListener("click", () => {
      filter = btn.dataset.filter;
      document.querySelectorAll(".count").forEach((b) => b.classList.toggle("active", b === btn));
      renderTable();
    });
  });
}

function applyReport(data, opts = {}) {
  report = data;
  openSerial = null;
  cargoCache.clear();
  document.body.classList.add("ready");
  resultEl.hidden = false;
  resetBtn.hidden = false;
  if (data.files?.loadPlan) setFile("loadplan", data.files.loadPlan);
  if (data.files?.bookList) setFile("booklist", data.files.bookList);

  const chip = document.getElementById("flightChip");
  const f = data.flight || {};
  const bits = [f.no, f.route, f.date].filter(Boolean);
  chip.hidden = bits.length === 0;
  chip.textContent = bits.join(" · ");

  const s = data.summary;
  filter = s.unbooked ? "unbooked" : "all";
  paintVerdictAndStats();
  renderTable();
  renderExtras();
  if (opts.persist !== false) persistActiveFlight(data);
}

function renderExtras() {
  const extraBox = document.getElementById("extraBox");
  const items = extras();
  extraBox.hidden = items.length === 0;
  document.getElementById("extraList").innerHTML = items
    .map((item) => {
      const open = openSerial === item.serial;
      return `<div class="nr-row">
        <button type="button" class="awb-btn" data-serial="${item.serial}">${item.awb}</button>
        <span>${item.org && item.dest ? `${item.org} → ${item.dest}` : "—"}</span>
        <span class="mono">${item.pcs}</span>
      </div>
      ${open ? `<div class="inbound extra-track">${inboundHtml(item)}</div>` : ""}`;
    })
    .join("");
  bindAwbClicks(document.getElementById("extraList"));
}

function renderTable() {
  if (!report) return;
  const ui = t();
  const q = searchEl.value.trim();
  const rows = report.rows.filter((row) => {
    const inFilter =
      filter === "all" ||
      row.result === filter ||
      (filter === "mismatch" && (row.result === "mismatch" || row.result === "partial"));
    const inSearch = !q || row.awb.includes(q) || row.serial.includes(q);
    return inFilter && inSearch;
  });
  tbody.innerHTML = rows
    .map((row) => {
      const pcsDiff = row.planPcs !== row.bookPcs;
      const wgtDiff = Math.abs((row.planWgt || 0) - (row.bookWgt || 0)) > 0.51;
      const open = openSerial === row.serial;
      const nr = row.notReadyPcs
        ? `<span class="nr"> · ${row.notReadyPcs} ${ui.notReady}</span>`
        : "";
      const noteText = row.result === "matched" ? "" : rowNote(row);
      const note = noteText ? `<span class="note">${noteText}</span>` : "";
      const panel = open ? inboundHtml(row) : "";
      return `<tr>
        <td><span class="pill ${row.result}">${ui.labels[row.result]}</span></td>
        <td>
          <button type="button" class="awb-btn" data-serial="${row.serial}">${row.awb}</button>${nr}
          ${note}
        </td>
        <td>${row.org && row.dest ? `${row.org} → ${row.dest}` : "—"}</td>
        <td class="mono">${pair(row.planPcs, row.bookPcs, pcsDiff)}</td>
        <td class="mono">${pair(row.planWgt, row.bookWgt, wgtDiff)}</td>
      </tr>
      ${panel ? `<tr class="inbound-row"><td colspan="5">${panel}</td></tr>` : ""}`;
    })
    .join("");
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5">${ui.emptyRows}</td></tr>`;
  }
  bindAwbClicks(tbody);
}

loadTrack();
bindRosterLinks();
applyLang();
setRailOpen(true);
refreshSavedFlights()
  .then(async () => {
    renderFlightList();
    if (!activeFlightId) return;
    const rec = savedFlights.find((item) => item.id === activeFlightId);
    if (rec) await openSavedFlight(rec.id, false);
  })
  .catch(() => {});
