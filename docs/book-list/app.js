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
const DB_VERSION = 2;
const MISSION_MAX = 10;
const API_ROOT = (function () {
  var host = location.hostname || "";
  if (host === "127.0.0.1" || host === "localhost" || host === "book-list.158-220-106-38.sslip.io") return "";
  if (/\.(netlify\.app|web\.app|firebaseapp\.com)$/i.test(host)) return "";
  // GitHub Pages — cargo API uses VPS when reachable.
  return "https://book-list.158-220-106-38.sslip.io";
})();
const SAMPLE_PLAN = "FligtLoadPlan_V1_WY171_MCTAMS_08Sep2026.pdf";
const SAMPLE_BOOK = "Book List.pdf";
const MISSION_KEEP = ["Dep Flt", "Airline Name", "Status", "Nature", "Dest.", "STD", "Dep Stand"];
const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const EXCELJS_CDN = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
const MISSION_PLANE_SRC = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAABvKAAAbygEeqZAXAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAABwJJREFUeJzt3HmMXVUZAPDflFKLUBBppGjRBtJYKypL1ERwi1VUROOCuAQ1blHEhZTgmohGozFoxIJKjEjUUZDEpcUloW7RaIpW0AQkFrUqFKJtbWmplOl0/ON7k5k+Zua9e999986b+X7Jl3S955t77na+c+4lpZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWU0iw11HQCffJwvBnnYAF+hKvxQJNJpf47HG/H3RhrizvFAZHmoAU4T3Rye8e3xwasaCTLVLkh0fF36Nzxk2MfLsPDas84VeZF+KNiHd8ed+D5dSeeevd+vXV8e1yP5bX+BANmCV6Il+DYhnNZjgdVewCMYQ8uEQ+S80Y3w8BzcS0e2fr9XlyIb/Qpp07Ox3V93P5tuAi/6GMbxFD1VKzEiThq0t8twUJxUO7EdtyFv7eituHsCtzvoWfLKF5TVxJtXj5FPlXHQXwTJ1SY9wI8FR/BrzFSMrcDuB3DeDdWVZjjQ3xohkT2Y00/G5/G0dgxQ15Vxm68V5yNZSzDG/Et/KdPOd6Lp7XaO6xkntP6bIfG78PpVTfahbPFZbCOg2AMt+LMLvJahOfi07hFXEn6mddGcZDBadiC77d+XYnXdZHEvTi5qgYLOFuM5+s4ALZgHY6bIo+TxTPRenHPriOf/fiwuK0Q1c//Tfr7UXxGBVeEI8VlsFNCd+L4Xhsr4VniKlT1Dr4fN4nh5uq2No8SD8ZXigOjjg6fHDfjlFYuS8TD+HT/drjY7pzaV7pMbHMrobqdqbuDtFP8FVeI55rJFcIhPAWX4qfi7Ku708fwX1xs4qxeg61d/L9XF92h7Z5RIMmN4j5YtzMUfzDcju+Iy2d7EWipGOVci20Ft1t17BdXm6Wt3I7Gl3T3fHEQzyu2K6f25wIJf9vEvalOp5n5SfsAfi8e0NY49Ml+obiSfBybxD20yU4fwy58QdQIiH36FtxTYBtXl9mRU7m0YPJXVNVwQasdesbeg6+LCaP2CuaJeCtuEJfXpjt8TBzAN+BVWNzKc0hUYDcX3NY/xdWiEicoXrj4QFWNF7Ra3Cuf0PbnR+AFYmh7m+Y7uz3+YqLTiUrhG8Rwsui29otbd6XWF0ziIN5UdRIFrcL78GP1DRnLxm68UqxkGha3gLLbelsVO69dmRLsiHpX4RyDV4h739YS+c6FuKrXnTidhYo9gIzHPt1V0cp6ohiv36S5IdpsieuVL1t3pVNpeLrYjidXlMMycW8cxr9L5jMX4zp9mAtod0oPCe5QbvXNIjwHn8If9L++XjRG8QPNjiSu0eczf7JNPSQ6iq/ipA5tnIR3iomNuurrZWNtK+dPNND2qLj9lVbmvYB3iEpUL8bwGzEvvlU8JxyLJ4n6/soet1+XL4sD9ThxYtQ5KbZLjBi+V2ObiCftqRaJzLf4ibjsLsLPam57o4kKYSOGp0hqPsWfRJVtqOZ9sQvvMQve6Fqj+U5oKrbhsa398LGa2hwRtY0mptyntEAsTmy6M+qOvWLmkRiK9ntE8oB4aO7rur+yPqr5DqkzRvGy1s/+bP0tOm1t7d9HddUTDVlhdkybjseDYiVvv4aNF7d+7sfrz6LULbgcTzcL7vHd2qj5jh+P8dnHa/qw7fH6+lLdvYDaKfaIIfA6sfDk0d3v8tmlm0WjdcTdYvr0CPECRZXb/qEosS4WnVb0/+/EL/FFUTNYpZkFM32xWPNLpsZEcYriC1c6xa1ineOQWOk007/di9+JK9BasfbgMSX360BZq9nO/5soxhyj2nvzNhPFlsll3hGxgHSDeMX8PDEjOWfO6qKOxD80dwC8tpXHJyvc5h4TL7ysFAfA+WIybF69PNqts8Siy7o7/xZx5i0Tl+AqtnlArMFLBV2i/gPgxa22r6xwmxdVulfmmToPgl+12lyhuqLM56vdHfPTBap5U6dTjC8zm+nVqCKxXg0rauaLx+FG1dTKR8VT93rxUscF4sMKxDKzKqqRmx36gYZUkVPFGbpTuY4+QxR4prOhi+12in8Z4Epcr+qqOR8mPmJwupjSPF4MtXaIDrhdfLFrX4FtnmXiOaCsPXim+NpYGjA/19uZfwAvrT3rVIlz9H7pz+HegFoglof30vmfqz3rVJnX663zb5TDvYF1uN7m4zeLuYs0oC5UvvPvkp+DHWi9LPa4T3znJw2wDyo/3Du3gXxThR6h/GKPdzWQb6rYZcp1/uUN5Jr6oMw3fb5rHi/TmmuKLjm72cyTSGnAfE33nb/JLHqHLlVjuemvAiPiA5DrxNN+VvkKGJhXkMRZvVZ8EXS3WIP/W9H5RaaRU0oppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaVB8H84lhm1XtuvzgAAAABJRU5ErkJggg==";
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
    tabCargo: "Cargo matching",
    tabMission: "Flight table",
    tabTrack: "Track shipments",
    installApp: "Install",
    installAppDone: "Done",
    installAppHint: "Use the browser menu: Install app / Add to Home Screen",
    missionTitle: "Flight table",
    missionLead: "Upload the raw flight table. It formats first, then print becomes available.",
    missionDropStrong: "Drop the unformatted flight table",
    missionDropHint: "Excel (.xlsx) — or click to choose",
    missionFileIdle: "No file yet",
    missionPrint: "Print",
    missionFormat: "Format & download",
    missionClear: "Clear",
    missionHint: "Keeps: Dep Flt, Airline Name, Status, Nature, Dest., STD, Dep Stand — yellow header and borders.",
    missionBusy: "Formatting…",
    missionPrinting: "Preparing print…",
    missionPreviewTitle: "Formatted preview",
    missionPreviewCount: (n) => `${n} flights`,
    missionFormatReady: "Formatted — print is ready",
    missionPrintDateLabel: "Printed",
    trackPageTitle: "Track shipments",
    trackLead: "Upload the Book List only, then click an AWB to fetch cargo tracking.",
    trackDropStrong: "Drop the Book List",
    trackDropHint: "PDF — or click to choose",
    trackFileIdle: "No Book List yet",
    trackClear: "Clear",
    trackBusy: "Reading Book List…",
    trackCount: (n) => `${n} shipments`,
    trackReady: "READY",
    trackNotReady: "NOT READY",
    trackMixed: "Part not ready",
    headersFound: "Headers in row 1",
    headersMissing: "Missing columns",
    failureServer: "Server",
    failureBrowser: "Browser",
    missionRecentTitle: "Last 10 tables",
    missionRecentNote: "Saved globally on the server",
    missionRecentEmpty: "No saved tables yet",
    missionRecentOpen: "Open",
    missionSaving: "Saving…",
    missionSaved: "Saved globally",
    missionSaveLocalOnly: "Saved on this device only (server unreachable)",
    missionBadgeGlobal: "Global",
    missionBadgeLocal: "This device",
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
    colSn: "S/N",
    colAwb: "AWB",
    colRoute: "ORG-DES",
    colPcs: "PCS",
    colWgt: "WGT",
    colNote: "Note",
    bookedHead: "BOOKED/ASSIGNED",
    printReport: "Print",
    extraTitle: "NOT ON LOAD PLAN",
    unbookedTitle: "On the Load Plan — not booked",
    diffTitle: "Difference in pieces or weight",
    notOnPlan: "Not on the Load Plan",
    langBtn: "العربية",
    roster: "Roster",
    flights: "Flights",
    addFlight: "Add flight",
    deleteFlight: "Remove",
    deleteSaved: "Delete saved table",
    deleteSavedConfirm: "Delete this saved table?",
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
      notReady: "Not ready",
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
      need_xlsx: "Upload an Excel file (.xlsx).",
      missing_columns: "Required columns are missing from the sheet.",
      unknown_pdf: "Could not identify the file type.",
      read_failed: "Could not read the file.",
      demo_missing: "Sample files are not in this folder.",
      demo_failed: "Could not run the sample.",
      compare_failed: "Matching failed.",
      need_pdf: "Upload a PDF Book List.",
      empty_book_list: "No shipments were found in this Book List.",
      server_unreachable: "Could not reach the parser server.",
      exceljs_load_failed: "Could not load the Excel reader.",
      format_failed: "Formatting failed.",
      save_failed: "Could not save the table.",
      not_found: "Saved table not found.",
      delete_failed: "Could not delete the saved table.",
      file_too_large: "File is too large.",
      invalid_awb: "Invalid AWB number.",
      track_unreachable: "Could not reach Oman Air Cargo tracking.",
      track_failed: "Could not fetch tracking.",
    },
  },
  ar: {
    title: "مطابقة الشحنات",
    lead: "الأساس هو خطة التحميل. ارفع الملفين لمعرفة ما حُجز وما لم يُحجز.",
    tabCargo: "مطابقة الشحنات",
    tabMission: "جدول الرحلات",
    tabTrack: "تتبع الشحنات",
    installApp: "تثبيت",
    installAppDone: "مثبّت",
    installAppHint: "من قائمة المتصفح: تثبيت التطبيق / إضافة إلى الشاشة الرئيسية",
    missionTitle: "جدول الرحلات",
    missionLead: "ارفع جدول الرحلات غير المنسّق. يُنسَّق أولاً ثم يصبح زر الطباعة فعالاً.",
    missionDropStrong: "أسقط جدول الرحلات غير المنسّق",
    missionDropHint: "ملف Excel (.xlsx) — أو اضغط للاختيار",
    missionFileIdle: "لا يوجد ملف بعد",
    missionPrint: "طباعة",
    missionFormat: "تنسيق وتنزيل",
    missionClear: "مسح",
    missionHint: "الأعمدة: Dep Flt، Airline Name، Status، Nature، Dest.، STD، Dep Stand — ترويسة صفراء وحدود.",
    missionBusy: "جاري التنسيق…",
    missionPrinting: "جاري تحضير الطباعة…",
    missionPreviewTitle: "معاينة منسّقة",
    missionPreviewCount: (n) => `${n} رحلة`,
    missionFormatReady: "تم التنسيق — الطباعة جاهزة",
    missionPrintDateLabel: "تاريخ الطباعة",
    trackPageTitle: "تتبع الشحنات",
    trackLead: "ارفع قائمة الحجز فقط، ثم اضغط رقم البوليصة لجلب التتبع.",
    trackDropStrong: "أسقط قائمة الحجز",
    trackDropHint: "ملف PDF — أو اضغط للاختيار",
    trackFileIdle: "لا توجد قائمة حجز بعد",
    trackClear: "مسح",
    trackBusy: "جاري قراءة قائمة الحجز…",
    trackCount: (n) => `${n} شحنة`,
    trackReady: "جاهزة",
    trackNotReady: "غير جاهزة",
    trackMixed: "جزء غير جاهز",
    headersFound: "عناوين الصف الأول",
    headersMissing: "أعمدة ناقصة",
    failureServer: "السيرفر",
    failureBrowser: "المتصفح",
    missionRecentTitle: "آخر 10 جداول",
    missionRecentNote: "محفوظة عالمياً على السيرفر",
    missionRecentEmpty: "لا توجد جداول محفوظة بعد",
    missionRecentOpen: "فتح",
    missionSaving: "جاري الحفظ…",
    missionSaved: "حُفظ عالمياً",
    missionSaveLocalOnly: "حُفظ على هذا الجهاز فقط (السيرفر غير متاح)",
    missionBadgeGlobal: "عالمي",
    missionBadgeLocal: "هذا الجهاز",
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
    colSn: "S/N",
    colAwb: "AWB",
    colRoute: "ORG-DES",
    colPcs: "PCS",
    colWgt: "WGT",
    colNote: "Note",
    bookedHead: "BOOKED/ASSIGNED",
    printReport: "طباعة",
    extraTitle: "غير موجودة في خطة التحميل",
    unbookedTitle: "موجودة في خطة التحميل وغير محجوزة",
    diffTitle: "اختلاف في العدد أو الوزن",
    notOnPlan: "ليست في خطة التحميل",
    langBtn: "English",
    roster: "الوردية",
    flights: "الرحلات",
    addFlight: "إضافة رحلة",
    deleteFlight: "حذف",
    deleteSaved: "حذف الجدول المحفوظ",
    deleteSavedConfirm: "حذف هذا الجدول المحفوظ؟",
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
      notReady: "غير جاهزة",
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
      need_xlsx: "ارفع ملف Excel (.xlsx).",
      missing_columns: "أعمدة مطلوبة ناقصة في الجدول.",
      unknown_pdf: "تعذر التعرف على نوع الملف.",
      read_failed: "تعذر قراءة الملف.",
      demo_missing: "ملفات التجربة غير موجودة في المجلد.",
      demo_failed: "تعذر تشغيل التجربة.",
      compare_failed: "تعذر المطابقة.",
      need_pdf: "ارفع قائمة الحجز بصيغة PDF.",
      empty_book_list: "لم يُعثر على شحنات في قائمة الحجز.",
      server_unreachable: "تعذر الاتصال بسيرفر القراءة.",
      exceljs_load_failed: "تعذر تحميل قارئ Excel.",
      format_failed: "تعذر التنسيق.",
      save_failed: "تعذر حفظ الجدول.",
      not_found: "الجدول المحفوظ غير موجود.",
      delete_failed: "تعذر حذف الجدول المحفوظ.",
      file_too_large: "حجم الملف كبير جداً.",
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
let activeView = (function () {
  const saved = localStorage.getItem("uiView");
  return saved === "mission" || saved === "track" ? saved : "cargo";
})();
let missionFile = null;
let missionParsed = null;
let activeMissionId = null;
let missionRecent = [];
let missionStatusTimer = null;
let trackFile = null;
let trackReport = null;
let trackOpenSerial = null;
let trackBusy = false;

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
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("flights")) {
        db.createObjectStore("flights", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("missionTables")) {
        db.createObjectStore("missionTables", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore(mode, fn, storeName = "flights") {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains(storeName)) {
          reject(new Error("store_missing"));
          return;
        }
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
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

function paintRailHead() {
  const head = document.querySelector(".rail-head h2");
  const sub = document.querySelector(".rail-sub");
  const add = document.getElementById("addFlightBtn");
  const ui = t();
  if (activeView === "mission") {
    if (head) head.textContent = ui.missionRecentTitle;
    if (sub) sub.textContent = ui.missionRecentNote;
    if (add) add.hidden = true;
    return;
  }
  if (head) head.textContent = ui.flights;
  if (sub) sub.textContent = ui.savedLocally;
  if (add) add.hidden = false;
}

function renderFlightList() {
  paintRailHead();
  const list = document.getElementById("flightList");
  if (!list) return;
  if (activeView === "mission") {
    renderMissionRail(list);
    return;
  }
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

function showError(msg, detail) {
  const text = detail ? `${msg}\n${detail}` : msg;
  errorEl.hidden = !text;
  errorEl.textContent = text || "";
  errorEl.classList.toggle("error-detail", !!(detail && String(detail).trim()));
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
  if (trackOpenSerial === serial) renderTrackTable();
}

function rosterHomeUrl() {
  const host = location.hostname || "";
  if (host === "127.0.0.1" || host === "localhost") {
    if (location.port === "8011") return `${location.origin}/`;
    return "http://127.0.0.1:8011/";
  }
  if (/\.(netlify\.app|web\.app|firebaseapp\.com)$/i.test(host)) {
    return `${location.origin}/`;
  }
  if (host.endsWith("github.io")) {
    if ((location.pathname || "").indexOf("/roster-site/") !== -1) {
      return `${location.origin}/roster-site/`;
    }
    return "https://khalidsaif912.github.io/new/";
  }
  return "https://new-roster.netlify.app/";
}

function bindRosterLinks() {
  const href = rosterHomeUrl();
  ["rosterBtn", "rosterMini"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.href = href;
  });
}

function viewTitle(view) {
  const ui = t();
  if (view === "mission") return ui.missionTitle;
  if (view === "track") return ui.trackPageTitle;
  return ui.title;
}

function applyLang() {
  const ui = t();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.title = viewTitle(activeView);
  if (typeof paintInstallAppBtn === "function") paintInstallAppBtn();
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
  paintMissionFile();
  if (missionParsed) renderMissionPreview(missionParsed.rows);
  renderMissionRecent();
  paintTrackFile();
  if (trackReport) renderTrackTable();
  if (report) {
    paintVerdictAndStats();
    renderTable();
    renderExtras();
  }
  renderFlightList();
  setRailOpen(railOpen);
}

function setView(view) {
  activeView = view === "mission" || view === "track" ? view : "cargo";
  localStorage.setItem("uiView", activeView);
  document.body.classList.toggle("view-mission", activeView === "mission");
  document.body.classList.toggle("view-track", activeView === "track");
  document.getElementById("viewCargo").hidden = activeView !== "cargo";
  document.getElementById("viewMission").hidden = activeView !== "mission";
  const trackView = document.getElementById("viewTrack");
  if (trackView) trackView.hidden = activeView !== "track";
  document.querySelectorAll(".view-tab").forEach((btn) => {
    const on = btn.dataset.view === activeView;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.title = viewTitle(activeView);
  renderFlightList();
  if (activeView === "mission") refreshMissionRecent();
  try {
    const want = `#${activeView}`;
    if (location.hash !== want) history.replaceState(null, "", want);
  } catch (_) {}
}

function applyHashView() {
  const h = (location.hash || "").replace(/^#/, "").toLowerCase();
  if (h === "mission" || h === "cargo" || h === "track") setView(h);
}

function paintMissionFile() {
  const el = document.getElementById("missionFileName");
  const clearBtn = document.getElementById("missionClearBtn");
  const formatBtn = document.getElementById("missionFormatBtn");
  const printBtn = document.getElementById("missionPrintBtn");
  if (!el) return;
  const ready = !!(missionParsed && missionParsed.rows && missionParsed.rows.length > 1);
  if (missionFile) {
    el.textContent = missionFile.name;
    el.classList.add("ok");
  } else {
    el.textContent = t().missionFileIdle;
    el.classList.remove("ok");
  }
  clearBtn.hidden = !(missionFile || ready);
  formatBtn.disabled = !ready;
  printBtn.disabled = !ready;
}

function formatMissionPrintStamp(when) {
  const d = when instanceof Date ? when : new Date();
  const locale = lang === "ar" ? "ar-OM" : "en-GB";
  try {
    const datePart = d.toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart}  ·  ${timePart}`;
  } catch (_) {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}

function missionPrintMastheadHtml(cols) {
  const label = escapeHtml(t().missionPrintDateLabel);
  const stamp = escapeHtml(formatMissionPrintStamp(new Date()));
  const n = Math.max(1, cols | 0);
  return `<tr class="mission-print-date"><td colspan="${n}"><span class="mission-print-date-label">${label}</span><img class="mission-print-plane" src="${MISSION_PLANE_SRC}" alt="" width="22" height="22" /><span class="mission-print-date-stamp">${stamp}</span></td></tr>`;
}

function clearMissionPreview() {
  missionParsed = null;
  const box = document.getElementById("missionPreview");
  const table = document.getElementById("missionPreviewTable");
  const count = document.getElementById("missionPreviewCount");
  if (box) box.hidden = true;
  if (table) table.innerHTML = "";
  if (count) count.textContent = "";
}

function renderMissionPreview(rows) {
  const box = document.getElementById("missionPreview");
  const table = document.getElementById("missionPreviewTable");
  const count = document.getElementById("missionPreviewCount");
  if (!box || !table) return;
  const esc = escapeHtml;
  const cols = rows[0] ? rows[0].length : 1;
  const dateRow = missionPrintMastheadHtml(cols);
  const thead = `<thead>${dateRow}<tr>${rows[0].map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows
    .slice(1)
    .map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;
  table.innerHTML = thead + tbody;
  const flights = Math.max(0, rows.length - 1);
  if (count) {
    const label = t().missionPreviewCount;
    count.textContent = typeof label === "function" ? label(flights) : `${flights}`;
  }
  box.hidden = false;
}

async function prepareMissionFormat() {
  if (!missionFile) return;
  clearMissionPreview();
  paintMissionFile();
  setMissionBusy(true, "format");
  showMissionError(null);
  try {
    const parsed = await parseMissionTable(missionFile);
    if (!parsed.rows || parsed.rows.length < 2) {
      showMissionError("format_failed");
      return;
    }
    missionParsed = parsed;
    renderMissionPreview(parsed.rows);
    showMissionStatus(t().missionFormatReady, false);
  } catch (err) {
    missionParsed = null;
    showMissionError(err && (err.code || err.detail) ? err : "format_failed");
  } finally {
    setMissionBusy(false);
    paintMissionFile();
  }
}

function formatFailure(err, fallbackCode) {
  const ui = t();
  const code = (err && err.code) || (typeof err === "string" ? err : "") || fallbackCode;
  const headline = (ui.errors && ui.errors[code]) || (ui.errors && ui.errors[fallbackCode]) || String(code || fallbackCode);
  const parts = [headline];
  if (err && err.columns) parts.push(`${ui.headersMissing}: ${err.columns}`);
  if (err && err.found) parts.push(`${ui.headersFound}: ${err.found}`);
  if (err && err.detail) parts.push(String(err.detail));
  else if (err && err.message && err.message !== code && !(ui.errors && ui.errors[err.message])) {
    parts.push(String(err.message));
  }
  if (err && err.stack && !(err.detail && String(err.detail).includes(err.message || "\0"))) {
    const stack = String(err.stack).split("\n").slice(0, 8).join("\n");
    if (stack && !parts.includes(stack)) parts.push(stack);
  }
  return parts.filter(Boolean).join("\n");
}

function showMissionError(code, detail) {
  const el = document.getElementById("missionError");
  if (!code) {
    showMissionStatus(null);
    if (el) el.classList.remove("error-detail");
    return;
  }
  let text;
  if (typeof code === "object") text = formatFailure(code, "format_failed");
  else if (code === "missing_columns") text = formatFailure({ code, columns: detail }, "format_failed");
  else text = formatFailure({ code, detail: typeof detail === "string" ? detail : "" }, "format_failed");
  showMissionStatus(text, true);
}

function isXlsxFile(file) {
  const name = (file && file.name) || "";
  return /\.(xlsx|xlsm)$/i.test(name);
}

function missionIdLocal() {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatMissionWhen(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString(lang === "ar" ? "ar-OM" : "en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (_) {
    return "";
  }
}

function showMissionStatus(text, isError) {
  const el = document.getElementById("missionError");
  if (!el) return;
  if (missionStatusTimer) clearTimeout(missionStatusTimer);
  if (!text) {
    el.hidden = true;
    el.textContent = "";
    el.classList.remove("ok-msg");
    return;
  }
  el.textContent = text;
  el.hidden = false;
  el.classList.toggle("ok-msg", !isError);
  el.classList.toggle("error-detail", !!isError && String(text).includes("\n"));
  if (!isError) {
    missionStatusTimer = setTimeout(() => {
      if (el.classList.contains("ok-msg")) showMissionStatus(null);
    }, 3500);
  }
}

async function idbMissionAll() {
  try {
    const rows = await withStore("readonly", (store) => store.getAll(), "missionTables");
    return (rows || []).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  } catch (_) {
    return [];
  }
}

async function idbMissionPut(record) {
  await withStore("readwrite", (store) => store.put(record), "missionTables");
  const all = await idbMissionAll();
  const keep = new Set(all.slice(0, MISSION_MAX).map((r) => r.id));
  await Promise.all(
    all.filter((r) => !keep.has(r.id)).map((r) => withStore("readwrite", (store) => store.delete(r.id), "missionTables"))
  );
}

async function idbMissionGet(id) {
  return withStore("readonly", (store) => store.get(id), "missionTables");
}

async function idbMissionDelete(id) {
  await withStore("readwrite", (store) => store.delete(id), "missionTables");
}

async function deleteMissionSaved(id, source) {
  const ui = t();
  if (!confirm(ui.deleteSavedConfirm)) return;
  try {
    if (source !== "local") {
      const res = await fetch(`${API_ROOT}/api/mission/tables/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete_failed");
    }
    const local = await idbMissionAll();
    for (const rec of local) {
      if (rec.id === id || rec.remoteId === id) await idbMissionDelete(rec.id);
    }
    if (activeMissionId === id) {
      activeMissionId = null;
      missionFile = null;
      clearMissionPreview();
      paintMissionFile();
    }
    await refreshMissionRecent();
  } catch (_) {
    showMissionError("delete_failed");
  }
}

function renderMissionRail(list) {
  const ui = t();
  const items = missionRecent.slice(0, MISSION_MAX);
  if (!items.length) {
    list.innerHTML = `<p class="rail-empty">${escapeHtml(ui.missionRecentEmpty)}</p>`;
    return;
  }
  list.innerHTML = items
    .map((item) => {
      const where = item.source === "local" ? "local" : "global";
      const badge = where === "global" ? ui.missionBadgeGlobal : ui.missionBadgeLocal;
      const on = item.id === activeMissionId ? " active" : "";
      return `<div class="flight-card${on}" data-id="${escapeHtml(item.id)}" data-source="${where}">
        <button type="button" class="flight-del" data-del="${escapeHtml(item.id)}" data-source="${where}" aria-label="${escapeHtml(ui.deleteSaved)}">×</button>
        <span class="no" dir="ltr">${escapeHtml(item.name)}</span>
        <div class="meta">
          <span>${escapeHtml(formatMissionWhen(item.savedAt))}</span>
          <span>${escapeHtml(badge)}</span>
        </div>
      </div>`;
    })
    .join("");
  list.querySelectorAll(".flight-card").forEach((card) => {
    card.addEventListener("click", () => {
      if (card.dataset.id === activeMissionId && railOpen && missionParsed) {
        setRailOpen(false);
        return;
      }
      openMissionSaved(card.dataset.id, card.dataset.source);
    });
  });
  list.querySelectorAll(".flight-del").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteMissionSaved(btn.dataset.del, btn.dataset.source);
    });
  });
}

function renderMissionRecent() {
  if (activeView === "mission") renderFlightList();
}

async function refreshMissionRecent() {
  let remote = [];
  try {
    const res = await fetch(`${API_ROOT}/api/mission/tables`);
    if (res.ok) {
      const data = await res.json();
      remote = (data.tables || []).map((item) => ({ ...item, source: "global" }));
    }
  } catch (_) {}

  const local = (await idbMissionAll()).map((item) => ({
    id: item.id,
    name: item.name,
    savedAt: item.savedAt,
    size: item.size,
    source: item.remoteId ? "global" : "local",
    remoteId: item.remoteId || null,
  }));

  // Prefer server list; fill remaining slots from local-only entries not already present by name+time rough match.
  const merged = [...remote];
  const remoteNames = new Set(remote.map((r) => `${r.name}|${r.savedAt}`));
  for (const item of local) {
    if (merged.length >= MISSION_MAX) break;
    if (item.remoteId && remote.some((r) => r.id === item.remoteId)) continue;
    const key = `${item.name}|${item.savedAt}`;
    if (remoteNames.has(key)) continue;
    if (item.source === "local" || !remote.length) merged.push(item);
  }
  missionRecent = merged.slice(0, MISSION_MAX);
  renderMissionRecent();
}

async function saveMissionLocalCopy(file, remoteMeta) {
  const buf = await file.arrayBuffer();
  const record = {
    id: (remoteMeta && remoteMeta.id) || missionIdLocal(),
    name: file.name,
    savedAt: (remoteMeta && remoteMeta.savedAt) || Date.now(),
    size: file.size,
    remoteId: remoteMeta ? remoteMeta.id : null,
    blob: new Blob([buf], { type: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  };
  await idbMissionPut(record);
  return record;
}

async function saveMissionUpload(file) {
  const ui = t();
  showMissionStatus(ui.missionSaving, false);
  let remoteMeta = null;
  try {
    const body = new FormData();
    body.append("file", file, file.name);
    const res = await fetch(`${API_ROOT}/api/mission/tables`, { method: "POST", body });
    if (res.ok) {
      remoteMeta = await res.json();
    }
  } catch (_) {}

  try {
    await saveMissionLocalCopy(file, remoteMeta);
  } catch (_) {}

  if (remoteMeta && remoteMeta.id) {
    showMissionStatus(ui.missionSaved, false);
  } else {
    showMissionStatus(ui.missionSaveLocalOnly, true);
  }
  await refreshMissionRecent();
}

async function openMissionSaved(id, source) {
  showMissionError(null);
  try {
    if (source === "global") {
      const res = await fetch(`${API_ROOT}/api/mission/tables/${encodeURIComponent(id)}`);
      if (!res.ok) {
        let code = "not_found";
        try {
          const data = await res.json();
          code = data.error || code;
        } catch (_) {}
        showMissionError(code);
        return;
      }
      const blob = await res.blob();
      const dispo = res.headers.get("Content-Disposition") || "";
      const match = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(dispo);
      const name = match ? decodeURIComponent(match[1].replace(/"/g, "")) : `${id}.xlsx`;
      missionFile = new File([blob], name, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      activeMissionId = id;
      await prepareMissionFormat();
      setRailOpen(false);
      renderMissionRecent();
      return;
    }
    const rec = await idbMissionGet(id);
    if (!rec || !rec.blob) {
      showMissionError("not_found");
      return;
    }
    missionFile = new File([rec.blob], rec.name || "table.xlsx", {
      type: rec.blob.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    activeMissionId = id;
    await prepareMissionFormat();
    setRailOpen(false);
    renderMissionRecent();
  } catch (_) {
    showMissionError("read_failed");
  }
}

function rememberMissionFile(file) {
  if (!file || !isXlsxFile(file)) {
    showMissionError("need_xlsx");
    return;
  }
  missionFile = file;
  clearMissionPreview();
  showMissionError(null);
  paintMissionFile();
  saveMissionUpload(file);
  prepareMissionFormat();
}

function clearMissionFile() {
  missionFile = null;
  clearMissionPreview();
  document.getElementById("missionFileInput").value = "";
  showMissionError(null);
  paintMissionFile();
}

function loadExcelJS() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = EXCELJS_CDN;
    s.async = true;
    s.onload = () => (window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error("exceljs_load_failed")));
    s.onerror = () => reject(new Error("exceljs_load_failed"));
    document.head.appendChild(s);
  });
}

function missionCellValue(raw) {
  if (raw == null) return null;
  if (typeof raw === "object") {
    if (raw.result != null) return raw.result;
    if (raw.text != null) return raw.text;
    if (raw.richText) return raw.richText.map((p) => p.text || "").join("");
  }
  return raw;
}

async function parseMissionTable(file) {
  let wsIn;
  try {
    const ExcelJS = await loadExcelJS();
    const src = new ExcelJS.Workbook();
    await src.xlsx.load(await file.arrayBuffer());
    wsIn = src.worksheets[0];
  } catch (cause) {
    const err = new Error("read_failed");
    err.code = cause && cause.message === "exceljs_load_failed" ? "exceljs_load_failed" : "read_failed";
    err.detail = [
      `File: ${file && file.name ? file.name : "(unknown)"}`,
      cause && cause.message ? `${cause.name || "Error"}: ${cause.message}` : "Excel reader failed before a sheet was opened.",
      cause && cause.stack ? String(cause.stack).split("\n").slice(0, 6).join("\n") : "",
    ].filter(Boolean).join("\n");
    throw err;
  }
  if (!wsIn) {
    const err = new Error("read_failed");
    err.code = "read_failed";
    err.detail = `File: ${file.name}\nThe workbook has no worksheets.`;
    throw err;
  }

  const headerMap = {};
  wsIn.getRow(1).eachCell((cell, col) => {
    const name = String(cell.value == null ? "" : cell.value).trim();
    if (name && headerMap[name] == null) headerMap[name] = col;
  });
  const found = Object.keys(headerMap);
  const missing = MISSION_KEEP.filter((h) => headerMap[h] == null);
  if (missing.length) {
    const err = new Error("missing_columns");
    err.code = "missing_columns";
    err.columns = missing.join(", ");
    err.found = found.join(", ") || "(row 1 is empty)";
    err.detail = `File: ${file.name}\nSheet: ${wsIn.name || "(unnamed)"}\nRequired: ${MISSION_KEEP.join(", ")}`;
    throw err;
  }

  const rows = [MISSION_KEEP.slice()];
  for (let r = 2; r <= wsIn.rowCount; r++) {
    const row = wsIn.getRow(r);
    const values = MISSION_KEEP.map((h) => missionCellValue(row.getCell(headerMap[h]).value));
    if (values.every((v) => v == null || String(v).trim() === "")) continue;
    rows.push(values.map((v) => (v == null ? "" : v)));
  }
  if (rows.length < 2) {
    const err = new Error("format_failed");
    err.code = "format_failed";
    err.detail = `File: ${file.name}\nSheet: ${wsIn.name || "(unnamed)"} (${wsIn.rowCount} rows)\nThe header matched, but every data row was empty.`;
    throw err;
  }
  return { sheetName: (wsIn.name || "TrackingGrid").slice(0, 31), rows };
}

async function buildMissionWorkbook(sheetName, rows) {
  const ExcelJS = await loadExcelJS();
  const out = new ExcelJS.Workbook();
  const ws = out.addWorksheet(sheetName);
  const thin = { style: "thin", color: { argb: "FF000000" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
  const headerFont = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
  const dataFont = { name: "Calibri", size: 11, color: { argb: "FF000000" } };

  rows.forEach((values, idx) => {
    const outRow = ws.addRow(values);
    outRow.eachCell((cell) => {
      cell.border = border;
      if (idx === 0) {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.font = dataFont;
      }
    });
  });

  MISSION_KEEP.forEach((h, i) => {
    let widest = h.length;
    rows.forEach((row) => {
      if (row[i] != null) widest = Math.max(widest, String(row[i]).length);
    });
    ws.getColumn(i + 1).width = Math.min(Math.max(widest + 2, 10), 42);
  });

  const outBuf = await out.xlsx.writeBuffer();
  return new Blob([outBuf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

async function formatMissionLocal(file) {
  const parsed = await parseMissionTable(file);
  return buildMissionWorkbook(parsed.sheetName, parsed.rows);
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function printMissionRows(rows) {
  const esc = escapeHtml;
  const cols = rows[0] ? rows[0].length : 1;
  const dateRow = missionPrintMastheadHtml(cols);
  const thead = `${dateRow}<tr>${rows[0].map((h) => `<th>${esc(h)}</th>`).join("")}</tr>`;
  const tbody = rows
    .slice(1)
    .map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("");
  const html = `<!DOCTYPE html>
<html lang="${lang === "ar" ? "ar" : "en"}" dir="${lang === "ar" ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8" />
<title>Mission</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  html, body { margin: 0; padding: 0; background: #fff; color: #111; }
  body { font-family: "Segoe UI", Calibri, Arial, sans-serif; font-size: 11pt; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #111; padding: 3px 6px; text-align: start; vertical-align: middle; }
  th { background: #ffff00; font-weight: bold; text-align: center; }
  tr.mission-print-date td {
    border: 1px solid #111;
    border-bottom: 2px solid #111;
    background: linear-gradient(180deg, #f7f4ef 0%, #efe8dc 100%);
    padding: 10px 14px;
    text-align: center;
  }
  .mission-print-date-label {
    display: inline-block;
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #5c5346;
    margin-inline-end: 0.85rem;
    padding-inline-end: 0.85rem;
    border-inline-end: 1px solid #c4b8a5;
  }
  .mission-print-plane {
    display: inline-block;
    width: 18px;
    height: 18px;
    margin-inline-end: 0.55rem;
    vertical-align: -3px;
    object-fit: contain;
  }
  .mission-print-date-stamp {
    display: inline-block;
    font-size: 12pt;
    font-weight: 600;
    color: #1c1915;
    letter-spacing: 0.02em;
  }
</style>
</head>
<body>
<table>
<thead>${thead}</thead>
<tbody>${tbody}</tbody>
</table>
</body>
</html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(frame);
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  const win = frame.contentWindow;
  const cleanup = () => {
    setTimeout(() => frame.remove(), 500);
  };
  win.focus();
  setTimeout(() => {
    win.onafterprint = cleanup;
    win.print();
    setTimeout(cleanup, 2000);
  }, 50);
}

function setMissionBusy(busy, label) {
  const formatBtn = document.getElementById("missionFormatBtn");
  const printBtn = document.getElementById("missionPrintBtn");
  const ui = t();
  const ready = !!(missionParsed && missionParsed.rows && missionParsed.rows.length > 1);
  if (busy) {
    formatBtn.disabled = true;
    printBtn.disabled = true;
    if (label === "print") printBtn.textContent = ui.missionPrinting;
    else {
      formatBtn.textContent = ui.missionBusy;
      printBtn.textContent = ui.missionBusy;
    }
  } else {
    formatBtn.textContent = ui.missionFormat;
    printBtn.textContent = ui.missionPrint;
    formatBtn.disabled = !ready;
    printBtn.disabled = !ready;
  }
}

async function formatMissionNow() {
  if (!missionParsed || !missionParsed.rows) {
    if (!missionFile) {
      showMissionError("need_files");
      return;
    }
  }
  setMissionBusy(true, "download");
  showMissionError(null);
  try {
    if (!missionParsed && missionFile) {
      await prepareMissionFormat();
    }
    if (!missionParsed) return;
    const blob = await buildMissionWorkbook(missionParsed.sheetName, missionParsed.rows);
    const base = missionFile
      ? missionFile.name.replace(/\.(xlsx|xlsm)$/i, "")
      : `Mission_${new Date().toISOString().slice(0, 10)}`;
    downloadBlob(blob, `${base}_formatted.xlsx`);
  } catch (err) {
    showMissionError(err && (err.code || err.detail) ? err : "format_failed");
  } finally {
    setMissionBusy(false);
  }
}

async function printMissionNow() {
  if (!missionParsed || !missionParsed.rows || missionParsed.rows.length < 2) {
    showMissionError("need_files");
    return;
  }
  printMissionRows(missionParsed.rows);
}

function toggleLang() {
  lang = lang === "en" ? "ar" : "en";
  localStorage.setItem(LANG_KEY, lang);
  applyLang();
}

function loadPdfJs() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return Promise.resolve(window.pdfjsLib);
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = PDFJS_CDN;
    s.async = true;
    s.onload = () => {
      if (!window.pdfjsLib) {
        reject(Object.assign(new Error("read_failed"), { code: "read_failed", detail: "pdf.js loaded but pdfjsLib is missing." }));
        return;
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(window.pdfjsLib);
    };
    s.onerror = () => reject(Object.assign(new Error("read_failed"), {
      code: "read_failed",
      detail: `Could not load pdf.js from ${PDFJS_CDN}`,
    }));
    document.head.appendChild(s);
  });
}

async function pdfVisualLines(pdf) {
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageRows = [];
    for (const item of content.items) {
      const str = String(item.str || "").trim();
      if (!str || !item.transform) continue;
      const y = item.transform[5];
      const x = item.transform[4];
      let row = pageRows.find((r) => Math.abs(r.y - y) <= 2.5);
      if (!row) {
        row = { y, parts: [] };
        pageRows.push(row);
      }
      row.parts.push({ x, str });
    }
    pageRows.sort((a, b) => b.y - a.y);
    for (const row of pageRows) {
      lines.push(row.parts.sort((a, b) => a.x - b.x).map((part) => part.str).join(" ").replace(/\s+/g, " ").trim());
    }
  }
  return lines.filter(Boolean);
}

function parseBookListLines(lines) {
  const text = lines.join("\n");
  const flight = {};
  const fm = text.match(/WY0?(\d{3,4})/);
  if (fm) flight.no = `WY${String(Number(fm[1]))}`;
  const dm = text.match(/(\d{2}[A-Z]{3}\d{4})/);
  if (dm) flight.date = dm[1];
  const agg = new Map();
  let section = null;
  for (const line of lines) {
    if (/NOT READY TOTAL|FLIGHT TOTAL|SUB TOTAL|READY TOTAL/i.test(line)) continue;
    if (/^NOT READY\b/i.test(line)) {
      section = "NOT_READY";
      continue;
    }
    if (/\bREADY\b/i.test(line) && !/910\s+\d{8}/.test(line)) {
      section = "READY";
      continue;
    }
    const match = line.match(/910\s+(\d{8})\s+(\d+)\s+([\d.]+)/);
    if (!match || !section) continue;
    const serial = match[1];
    const pcs = Number(match[2]);
    const wgt = Number(match[3]);
    const route = line.match(/\b([A-Z]{3})-([A-Z]{3})\b/);
    if (!agg.has(serial)) {
      agg.set(serial, { readyPcs: 0, readyWgt: 0, notReadyPcs: 0, notReadyWgt: 0, org: "", dest: "" });
    }
    const item = agg.get(serial);
    if (section === "NOT_READY") {
      item.notReadyPcs += pcs;
      item.notReadyWgt += wgt;
    } else {
      item.readyPcs += pcs;
      item.readyWgt += wgt;
    }
    if (route && !item.org) {
      item.org = route[1];
      item.dest = route[2];
    }
  }
  const shipments = [...agg.entries()].map(([serial, item]) => ({
    serial,
    awb: `910-${serial}`,
    readyPcs: item.readyPcs,
    readyWgt: Math.round(item.readyWgt * 100) / 100,
    notReadyPcs: item.notReadyPcs,
    notReadyWgt: Math.round(item.notReadyWgt * 100) / 100,
    pcs: item.readyPcs + item.notReadyPcs,
    wgt: Math.round((item.readyWgt + item.notReadyWgt) * 100) / 100,
    org: item.org,
    dest: item.dest,
  })).sort((a, b) => a.serial.localeCompare(b.serial));
  return { flight, shipments, lines };
}

async function parseBookListLocal(file) {
  const pdfjsLib = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch (cause) {
    const err = new Error("read_failed");
    err.code = "read_failed";
    err.detail = `File: ${file.name}\n${cause && cause.message ? cause.message : cause}`;
    throw err;
  }
  const lines = await pdfVisualLines(pdf);
  const parsed = parseBookListLines(lines);
  if (!parsed.shipments.length) {
    const err = new Error("empty_book_list");
    err.code = "empty_book_list";
    err.detail = [
      `File: ${file.name}`,
      `Pages: ${pdf.numPages}`,
      `Lines: ${lines.length}`,
      "No row matched AWB + pieces + weight (example: 910 18366106 41 702.00).",
      "First lines:",
      ...lines.slice(0, 25).map((ln, idx) => `${idx + 1}. ${ln}`),
    ].join("\n");
    throw err;
  }
  const shipments = parsed.shipments;
  return {
    kind: "booklist",
    flight: parsed.flight,
    shipments,
    fileName: file.name,
    source: "browser",
    totals: {
      awbs: shipments.length,
      pcs: shipments.reduce((s, row) => s + row.pcs, 0),
      wgt: Math.round(shipments.reduce((s, row) => s + row.wgt, 0) * 100) / 100,
      readyPcs: shipments.reduce((s, row) => s + row.readyPcs, 0),
      notReadyPcs: shipments.reduce((s, row) => s + row.notReadyPcs, 0),
    },
  };
}

async function postBookList(file) {
  let res;
  try {
    const body = new FormData();
    body.append("file", file, file.name);
    res = await fetch(`${API_ROOT}/api/booklist`, { method: "POST", body });
  } catch (cause) {
    const err = new Error("server_unreachable");
    err.code = "server_unreachable";
    err.detail = cause && cause.message ? String(cause.message) : String(cause);
    throw err;
  }
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (_) {
    const err = new Error("read_failed");
    err.code = "read_failed";
    err.detail = `HTTP ${res.status} from ${API_ROOT || location.origin}/api/booklist\n${raw.slice(0, 600)}`;
    throw err;
  }
  if (!res.ok || !data.shipments) {
    const err = new Error(data.error || "read_failed");
    err.code = data.error || "read_failed";
    err.detail = data.detail || raw.slice(0, 600);
    throw err;
  }
  return data;
}

async function readBookListFile(file) {
  let serverErr = null;
  try {
    const data = await postBookList(file);
    if (data.shipments && data.shipments.length) return data;
    serverErr = Object.assign(new Error("empty_book_list"), {
      code: "empty_book_list",
      detail: data.detail || "Server returned an empty shipment list.",
    });
  } catch (err) {
    serverErr = err;
  }
  try {
    return await parseBookListLocal(file);
  } catch (localErr) {
    const err = localErr && localErr.code ? localErr : Object.assign(new Error("read_failed"), { code: "read_failed" });
    const ui = t();
    err.detail = [
      `— ${ui.failureServer} —`,
      formatFailure(serverErr || { code: "server_unreachable" }, "read_failed"),
      `— ${ui.failureBrowser} —`,
      localErr && localErr.detail ? localErr.detail : (localErr && localErr.message) || "",
    ].filter(Boolean).join("\n");
    throw err;
  }
}

function showTrackError(err) {
  const el = document.getElementById("trackError");
  if (!el) return;
  if (!err) {
    el.hidden = true;
    el.textContent = "";
    el.classList.remove("error-detail");
    return;
  }
  el.textContent = formatFailure(err, "read_failed");
  el.hidden = false;
  el.classList.add("error-detail");
}

function paintTrackFile() {
  const el = document.getElementById("trackFileName");
  const clearBtn = document.getElementById("trackClearBtn");
  if (!el) return;
  if (trackBusy) {
    el.textContent = t().trackBusy;
    el.classList.add("ok");
  } else if (trackFile) {
    el.textContent = trackFile.name;
    el.classList.add("ok");
  } else {
    el.textContent = t().trackFileIdle;
    el.classList.remove("ok");
  }
  if (clearBtn) clearBtn.hidden = !(trackFile || trackReport);
}

function trackStatusLabel(item) {
  const ui = t();
  if (item.notReadyPcs && item.readyPcs) return ui.trackMixed;
  if (item.notReadyPcs) return ui.trackNotReady;
  return ui.trackReady;
}

function renderTrackTable() {
  const box = document.getElementById("trackResult");
  const body = document.getElementById("trackBody");
  const count = document.getElementById("trackCount");
  const head = document.getElementById("trackHead");
  if (!box || !body || !trackReport) return;
  const ui = t();
  const q = (document.getElementById("trackSearch")?.value || "").replace(/\s+/g, "");
  const flight = trackReport.flight || {};
  const titleBits = [bookListFlightNo(flight.no || ""), flight.date || ""].filter(Boolean);
  if (head) head.textContent = titleBits.join(" / ") || trackReport.fileName || ui.trackTitle;
  const rows = (trackReport.shipments || []).filter((item) => {
    if (!q) return true;
    return `${item.serial}${item.awb}`.replace(/\s+/g, "").includes(q);
  });
  body.innerHTML = rows.map((item, idx) => {
    const open = trackOpenSerial === item.serial;
    const panel = open ? `<tr class="inbound-row"><td colspan="8">${cargoHtml(item.serial)}</td></tr>` : "";
    return `<tr>
      <td>${idx + 1}</td>
      <td><button type="button" class="awb-btn" data-serial="${item.serial}">${bookListAwb(item.serial)}</button></td>
      <td>${fmtNum(item.pcs)}</td>
      <td>${fmtNum(item.wgt)}</td>
      <td>${fmtNum(item.readyPcs)}</td>
      <td>${fmtNum(item.notReadyPcs)}</td>
      <td>${trackStatusLabel(item)}</td>
      <td dir="ltr">${bookListRoute(item.org, item.dest)}</td>
    </tr>${panel}`;
  }).join("") || `<tr><td colspan="8">${escapeHtml(ui.emptyRows)}</td></tr>`;
  if (count) {
    const label = ui.trackCount;
    const n = (trackReport.shipments || []).length;
    count.textContent = typeof label === "function" ? label(n) : String(n);
  }
  box.hidden = false;
  body.querySelectorAll(".awb-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const serial = btn.dataset.serial;
      trackOpenSerial = trackOpenSerial === serial ? null : serial;
      renderTrackTable();
      if (trackOpenSerial) loadCargo(trackOpenSerial);
    });
  });
}

function clearTrack() {
  trackFile = null;
  trackReport = null;
  trackOpenSerial = null;
  const input = document.getElementById("trackFileInput");
  const box = document.getElementById("trackResult");
  const body = document.getElementById("trackBody");
  if (input) input.value = "";
  if (box) box.hidden = true;
  if (body) body.innerHTML = "";
  showTrackError(null);
  paintTrackFile();
}

async function openTrackFile(file) {
  if (!file) return;
  trackFile = file;
  trackReport = null;
  trackOpenSerial = null;
  trackBusy = true;
  paintTrackFile();
  showTrackError(null);
  const box = document.getElementById("trackResult");
  if (box) box.hidden = true;
  try {
    trackReport = await readBookListFile(file);
    renderTrackTable();
  } catch (err) {
    trackReport = null;
    showTrackError(err);
  } finally {
    trackBusy = false;
    paintTrackFile();
  }
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

const missionDrop = document.getElementById("missionDrop");
const missionFileInput = document.getElementById("missionFileInput");
document.querySelectorAll(".view-tab").forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});
missionDrop.addEventListener("click", () => missionFileInput.click());
missionDrop.addEventListener("dragover", (e) => {
  e.preventDefault();
  missionDrop.classList.add("over");
});
missionDrop.addEventListener("dragleave", () => missionDrop.classList.remove("over"));
missionDrop.addEventListener("drop", (e) => {
  e.preventDefault();
  missionDrop.classList.remove("over");
  const file = [...e.dataTransfer.files].find(isXlsxFile);
  if (file) rememberMissionFile(file);
  else showMissionError("need_xlsx");
});
missionFileInput.addEventListener("change", () => {
  const file = missionFileInput.files && missionFileInput.files[0];
  if (file) rememberMissionFile(file);
});
document.getElementById("missionFormatBtn").addEventListener("click", formatMissionNow);
document.getElementById("missionPrintBtn").addEventListener("click", printMissionNow);
document.getElementById("cargoPrintBtn").addEventListener("click", printCargoNow);
document.getElementById("missionClearBtn").addEventListener("click", clearMissionFile);

const trackDrop = document.getElementById("trackDrop");
const trackFileInput = document.getElementById("trackFileInput");
if (trackDrop && trackFileInput) {
  const takeTrackFile = (file) => {
    if (!file) return;
    const name = file.name || "";
    if (!/\.pdf$/i.test(name) && file.type !== "application/pdf") {
      showTrackError({ code: "need_pdf", detail: `File: ${name || "(unnamed)"}\nExpected a PDF Book List.` });
      return;
    }
    openTrackFile(file);
  };
  trackDrop.addEventListener("click", () => trackFileInput.click());
  trackDrop.addEventListener("dragover", (e) => {
    e.preventDefault();
    trackDrop.classList.add("over");
  });
  trackDrop.addEventListener("dragleave", () => trackDrop.classList.remove("over"));
  trackDrop.addEventListener("drop", (e) => {
    e.preventDefault();
    trackDrop.classList.remove("over");
    takeTrackFile(e.dataTransfer.files && e.dataTransfer.files[0]);
  });
  trackFileInput.addEventListener("change", () => takeTrackFile(trackFileInput.files && trackFileInput.files[0]));
}
const trackClearBtn = document.getElementById("trackClearBtn");
if (trackClearBtn) trackClearBtn.addEventListener("click", clearTrack);
const trackSearch = document.getElementById("trackSearch");
if (trackSearch) trackSearch.addEventListener("input", () => { if (trackReport) renderTrackTable(); });


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
searchEl.addEventListener("input", () => {
  renderTable();
  renderExtras();
});
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
    if (!res.ok) {
      const err = new Error(data.error || "compare_failed");
      err.detail = data.detail || "";
      throw err;
    }
    applyReport(data);
  } catch (err) {
    showError(apiError(err.message, "compare_failed"), err.detail || (err.stack ? String(err.stack).split("\n").slice(0, 6).join("\n") : ""));
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
  paintBookListHead(data);

  const s = data.summary;
  filter = "all";
  paintVerdictAndStats();
  renderTable();
  renderExtras();
  if (opts.persist !== false) persistActiveFlight(data);
}

function bookListAwb(serial) {
  return `910 ${serial}`;
}

function bookListRoute(org, dest) {
  return org && dest ? `${org}-${dest}` : "";
}

function bookListFlightNo(no) {
  const match = String(no || "").match(/^WY(\d+)$/i);
  if (!match) return no || "";
  return `WY${match[1].padStart(4, "0")}`;
}

function bookListDate(date) {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const slash = String(date || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slash) return `${slash[1]}${months[Number(slash[2]) - 1] || ""}${slash[3]}`;
  return date || "";
}

function paintBookListHead(data) {
  const f = (data && data.flight) || {};
  const date = bookListDate(f.date || "");
  const flight = bookListFlightNo(f.no || "");
  const joined = [flight, date].filter(Boolean).join("/");
  const title = document.getElementById("blTitle");
  const stamp = document.getElementById("blStamp");
  const station = document.getElementById("blStation");
  if (title) title.textContent = `Display Book List For Flight  : ${joined}`;
  if (stamp) stamp.textContent = date;
  if (station) station.textContent = f.route || "";
}

function subtotalRow(label, pcs, wgt) {
  return `<tr class="bl-total"><td></td><td>${label}</td><td class="num">${fmtNum(pcs)}</td><td class="num">${fmtNum(wgt)}</td><td></td><td></td></tr>`;
}

function fitPrintToTwoPages() {
  const sheet = document.getElementById("printSheet");
  if (!sheet) return;
  sheet.style.zoom = "1";
  const pagePx = Math.round((297 / 25.4) * 96) - Math.round((16 / 25.4) * 96);
  const target = pagePx * 2;
  const height = sheet.getBoundingClientRect().height;
  if (height > target) {
    sheet.style.zoom = String(Math.max(0.58, target / height));
  }
}

function clearPrintFit() {
  const sheet = document.getElementById("printSheet");
  if (sheet) sheet.style.zoom = "";
}

function printCargoNow() {
  if (!report) return;
  window.print();
}

window.addEventListener("beforeprint", fitPrintToTwoPages);
window.addEventListener("afterprint", clearPrintFit);

function renderExtras() {
  const extraBox = document.getElementById("extraBox");
  const show = filter === "all";
  const items = extras();
  const ui = t();
  const q = searchEl.value.trim();
  const rows = items.filter((item) => !q || item.awb.includes(q) || bookListAwb(item.serial).includes(q) || String(item.serial).includes(q));
  extraBox.hidden = !show || items.length === 0;
  const body = rows
    .map((item, index) => {
      const open = openSerial === item.serial;
      const note = `<span class="note">${ui.notOnPlan}</span>`;
      const panel = open ? inboundHtml(item) : "";
      return `<tr class="bl-diff">
        <td class="sn">${index + 1}</td>
        <td>
          <button type="button" class="awb-btn" data-serial="${item.serial}">${bookListAwb(item.serial)}</button>
        </td>
        <td class="num">${fmtNum(item.pcs)}</td>
        <td class="num">${fmtNum(item.wgt)}</td>
        <td>${bookListRoute(item.org, item.dest)}</td>
        <td class="bl-note">${note}</td>
      </tr>
      ${panel ? `<tr class="inbound-row"><td colspan="6">${panel}</td></tr>` : ""}`;
    })
    .join("");
  const pcs = rows.reduce((n, item) => n + (Number(item.pcs) || 0), 0);
  const wgt = rows.reduce((n, item) => n + (Number(item.wgt) || 0), 0);
  document.getElementById("extraList").innerHTML = body
    ? body + subtotalRow("SUB TOTAL :", pcs, wgt)
    : `<tr><td colspan="6">${ui.emptyRows}</td></tr>`;
  bindAwbClicks(document.getElementById("extraList"));
}

function qtyOrWeightDiff(row) {
  if (row.result === "unbooked") return false;
  if (row.result === "partial" || row.result === "mismatch") return true;
  const pcsDiff = Number(row.planPcs) !== Number(row.bookPcs);
  const wgtDiff = Math.abs((Number(row.planWgt) || 0) - (Number(row.bookWgt) || 0)) > 0.51;
  return pcsDiff || wgtDiff;
}

function shipmentRowHtml(row, ui, sn) {
  const pcsDiff = row.planPcs !== row.bookPcs;
  const wgtDiff = Math.abs((row.planWgt || 0) - (row.bookWgt || 0)) > 0.51;
  const open = openSerial === row.serial;
  const nr = row.notReadyPcs ? `<span class="nr"> · ${row.notReadyPcs} ${ui.notReady}</span>` : "";
  const noteText = row.result === "matched" ? "" : rowNote(row);
  const note = noteText ? `${noteText}${nr}` : nr;
  const panel = open ? inboundHtml(row) : "";
  const mark = row.result === "matched" ? "" : " bl-diff";
  return `<tr class="${mark.trim()}">
        <td class="sn">${sn}</td>
        <td>
          <button type="button" class="awb-btn" data-serial="${row.serial}">${bookListAwb(row.serial)}</button>
        </td>
        <td class="num">${pair(row.planPcs, row.bookPcs, pcsDiff)}</td>
        <td class="num">${pair(row.planWgt, row.bookWgt, wgtDiff)}</td>
        <td>${bookListRoute(row.org, row.dest)}</td>
        <td class="bl-note">${note}</td>
      </tr>
      ${panel ? `<tr class="inbound-row"><td colspan="6">${panel}</td></tr>` : ""}`;
}

function renderTable() {
  if (!report) return;
  const ui = t();
  const q = searchEl.value.trim();
  const matched = [];
  const diff = [];
  const unbooked = [];
  report.rows.forEach((row) => {
    const inSearch = !q || row.awb.includes(q) || bookListAwb(row.serial).includes(q) || row.serial.includes(q);
    if (!inSearch) return;
    if (row.result === "unbooked") unbooked.push(row);
    else if (qtyOrWeightDiff(row)) diff.push(row);
    else matched.push(row);
  });

  const showMatched = filter === "all" || filter === "matched";
  const showDiff = filter === "all" || filter === "mismatch";
  const showUnbooked = filter === "all" || filter === "unbooked";
  const main = [];
  let sn = 1;
  if (showMatched) matched.forEach((row) => main.push(shipmentRowHtml(row, ui, sn++)));
  if (showDiff) diff.forEach((row) => main.push(shipmentRowHtml(row, ui, sn++)));
  const bookedShown = [...(showMatched ? matched : []), ...(showDiff ? diff : [])];
  if (bookedShown.length) {
    const pcs = bookedShown.reduce((n, row) => n + (Number(row.bookPcs) || Number(row.planPcs) || 0), 0);
    const wgt = bookedShown.reduce((n, row) => n + (Number(row.bookWgt) || Number(row.planWgt) || 0), 0);
    main.push(subtotalRow("SUB TOTAL :", pcs, wgt));
  }

  const mainTable = document.getElementById("mainTable");
  const bookedHead = document.getElementById("bookedHeadEl");
  mainTable.hidden = filter === "unbooked";
  if (bookedHead) bookedHead.hidden = mainTable.hidden;
  tbody.innerHTML = main.join("") || (mainTable.hidden ? "" : `<tr><td colspan="6">${ui.emptyRows}</td></tr>`);
  bindAwbClicks(tbody);

  const unbookedBox = document.getElementById("unbookedBox");
  const unbookedRows = showUnbooked ? unbooked : [];
  const unbookedSource = report.rows.some((row) => row.result === "unbooked");
  unbookedBox.hidden = !showUnbooked || !unbookedSource;
  const unbookedPcs = unbookedRows.reduce((n, row) => n + (Number(row.planPcs) || 0), 0);
  const unbookedWgt = unbookedRows.reduce((n, row) => n + (Number(row.planWgt) || 0), 0);
  document.getElementById("unbookedList").innerHTML = unbookedRows.length
    ? unbookedRows.map((row, index) => shipmentRowHtml(row, ui, index + 1)).join("") +
      subtotalRow("SUB TOTAL :", unbookedPcs, unbookedWgt)
    : `<tr><td colspan="6">${ui.emptyRows}</td></tr>`;
  bindAwbClicks(document.getElementById("unbookedList"));
  renderExtras();
}

loadTrack();
bindRosterLinks();

let deferredInstallPrompt = null;

function isAppInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function paintInstallAppBtn() {
  const btn = document.getElementById("installAppBtn");
  const mini = document.getElementById("installAppMini");
  const ui = t();
  const installed = isAppInstalled();
  const label = installed ? ui.installAppDone : ui.installApp;
  if (btn) {
    btn.hidden = false;
    btn.classList.toggle("is-installed", installed);
    btn.disabled = installed;
    btn.title = label;
    btn.setAttribute("aria-label", label);
    const text = btn.querySelector("[data-i18n='installApp']") || btn.querySelector("span");
    if (text) text.textContent = label;
  }
  if (mini) {
    mini.hidden = false;
    mini.classList.toggle("is-installed", installed);
    mini.disabled = installed;
    mini.title = label;
    mini.setAttribute("aria-label", label);
  }
}

async function installAppNow() {
  const ui = t();
  if (isAppInstalled()) {
    paintInstallAppBtn();
    return;
  }
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    try {
      await deferredInstallPrompt.userChoice;
    } catch (_) {}
    deferredInstallPrompt = null;
    paintInstallAppBtn();
    return;
  }
  alert(ui.installAppHint);
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  paintInstallAppBtn();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  paintInstallAppBtn();
});

const installAppBtn = document.getElementById("installAppBtn");
if (installAppBtn) installAppBtn.addEventListener("click", installAppNow);
const installAppMini = document.getElementById("installAppMini");
if (installAppMini) installAppMini.addEventListener("click", installAppNow);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

const bootHash = (location.hash || "").replace(/^#/, "").toLowerCase();
if (bootHash === "mission" || bootHash === "cargo" || bootHash === "track") setView(bootHash);
else setView(activeView);
window.addEventListener("hashchange", applyHashView);
applyLang();
paintInstallAppBtn();
setRailOpen(true);
refreshSavedFlights()
  .then(async () => {
    renderFlightList();
    if (!activeFlightId) return;
    const rec = savedFlights.find((item) => item.id === activeFlightId);
    if (rec) await openSavedFlight(rec.id, false);
  })
  .catch(() => {});
