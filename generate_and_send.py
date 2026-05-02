import os
import re
import json
import calendar
import argparse
from datetime import datetime
from io import BytesIO

from openpyxl import load_workbook
from roster_app.cache_io import (
    add_months,
    cache_paths,
    cached_source_name,
    download_excel,
    get_source_name,
    infer_pages_base_url,
    month_key_from_filename,
    try_load_cached_workbook,
    write_bytes,
    write_json,
)
from roster_app.email_service import send_email
from roster_app.settings import (
    AUTO_OPEN_ACTIVE_SHIFT_IN_FULL,
    DAYS,
    DEPARTMENTS,
    EXCEL_URL,
    GROUP_ORDER,
    PAGES_BASE_URL,
    SHIFT_MAP,
    TZ,
)
from roster_app.text_utils import (
    clean,
    current_shift_key,
    looks_like_employee_name,
    looks_like_shift_code,
    looks_like_time,
    map_shift,
    norm,
    to_western_digits,
)


# =========================
# Detect rows/cols (Days row + Date numbers row)
# =========================
def _row_values(ws, r: int):
    return [norm(ws.cell(row=r, column=c).value) for c in range(1, ws.max_column + 1)]

def _count_day_tokens(vals) -> int:
    ups = [v.upper() for v in vals if v]
    count = 0
    for d in DAYS:
        if any(d in x for x in ups):
            count += 1
    return count

def _is_date_number(v: str) -> bool:
    v = norm(v)
    if not v:
        return False
    if re.match(r"^\d{1,2}(\.0)?$", v):
        n = int(float(v))
        return 1 <= n <= 31
    return False

def find_days_and_dates_rows(ws, scan_rows: int = 80):
    """
    يبحث عن صف فيه SUN..SAT بكثرة ثم صف تحته فيه أرقام 1..31
    """
    max_r = min(ws.max_row, scan_rows)
    days_row = None

    for r in range(1, max_r + 1):
        vals = _row_values(ws, r)
        if _count_day_tokens(vals) >= 3:
            days_row = r
            break

    if not days_row:
        return None, None

    date_row = None
    for r in range(days_row + 1, min(days_row + 4, ws.max_row) + 1):
        vals = _row_values(ws, r)
        nums = sum(1 for v in vals if _is_date_number(v))
        if nums >= 5:
            date_row = r
            break

    return days_row, date_row

def find_day_col(ws, days_row: int, date_row: int, today_dow: int, today_day: int):
    """
    يثبت العمود الصحيح باستخدام اليوم + رقم التاريخ
    """
    if not days_row or not date_row:
        return None

    day_key = DAYS[today_dow]
    # Prefer (day + date) match
    for c in range(1, ws.max_column + 1):
        top = norm(ws.cell(row=days_row, column=c).value).upper()
        bot = norm(ws.cell(row=date_row, column=c).value)
        if day_key in top and _is_date_number(bot) and int(float(bot)) == today_day:
            return c

    # Fallback: date-only
    for c in range(1, ws.max_column + 1):
        bot = norm(ws.cell(row=date_row, column=c).value)
        if _is_date_number(bot) and int(float(bot)) == today_day:
            return c

    return None


def get_daynum_to_col(ws, date_row: int):
    m = {}
    for c in range(1, ws.max_column + 1):
        v = norm(ws.cell(row=date_row, column=c).value)
        if _is_date_number(v):
            m[int(float(v))] = c
    return m

def find_employee_col(ws, start_row: int):
    for c in range(1, min(ws.max_column, 15) + 1):
        found = 0
        for r in range(start_row, min(start_row + 20, ws.max_row) + 1):
            v = norm(ws.cell(row=r, column=c).value)
            if looks_like_employee_name(v):
                found += 1
        if found >= 3:
            return c
    return None

def range_suffix_for_day(day: int, daynum_to_raw: dict, code_key: str):
    """
    إذا كان يوم (day) جزء من block متصل من نفس code_key، يرجع (من X إلى Y)
    """
    sorted_days = sorted(daynum_to_raw.keys())
    if day not in sorted_days:
        return ""

    up_key = code_key.upper()

    # تحديد الأكواد المقبولة لهذا النوع من الإجازة/التدريب
    acceptable_codes = []
    if up_key in ["AL", "LV"] or "ANNUAL" in up_key:
        # الإجازة السنوية
        acceptable_codes = ["AL", "LV", "ANNUAL LEAVE"]
    elif up_key == "SL" or "SICK" in up_key:
        # الإجازة المرضية
        acceptable_codes = ["SL", "SICK LEAVE"]
    elif up_key == "TR" or "TRAINING" in up_key:
        # التدريب
        acceptable_codes = ["TR", "TRAINING"]
    else:
        # أي كود آخر - يجب أن يكون مطابق تماماً
        acceptable_codes = [up_key]

    def is_same_type(val: str) -> bool:
        """تحقق إذا كان الكود من نفس النوع"""
        if not val:
            return False
        val_upper = val.upper()
        for code in acceptable_codes:
            if code in val_upper or val_upper == code:
                return True
        return False

    # إيجاد بداية ونهاية النطاق المتصل
    start = day
    end = day
    
    # البحث للخلف لإيجاد بداية النطاق
    current = day - 1
    while current in sorted_days:
        val = norm(daynum_to_raw.get(current, ""))
        if is_same_type(val):
            start = current
            current -= 1
        else:
            break
    
    # البحث للأمام لإيجاد نهاية النطاق
    current = day + 1
    while current in sorted_days:
        val = norm(daynum_to_raw.get(current, ""))
        if is_same_type(val):
            end = current
            current += 1
        else:
            break

    if start == end:
        return ""
    return f"(<span style='font-size:0.75em;opacity:0.8;'>FROM</span> {start} <span style='font-size:0.75em;opacity:0.8;'>TO</span> {end})"




# =========================
# Department card colors
# =========================
DEPT_COLORS = [
    {"name": "blue",   "base": "#2563eb", "light": "#2563eb15", "border": "#2563eb18", "grad_from": "#2563eb", "grad_to": "#2563ebcc"},
    {"name": "cyan",   "base": "#0891b2", "light": "#0891b215", "border": "#0891b218", "grad_from": "#0891b2", "grad_to": "#0891b2cc"},
    {"name": "green",  "base": "#059669", "light": "#05966915", "border": "#05966918", "grad_from": "#059669", "grad_to": "#059669cc"},
    {"name": "red",    "base": "#dc2626", "light": "#dc262615", "border": "#dc262618", "grad_from": "#dc2626", "grad_to": "#dc2626cc"},
    {"name": "purple", "base": "#7c3aed", "light": "#7c3aed15", "border": "#7c3aed18", "grad_from": "#7c3aed", "grad_to": "#7c3aedcc"},
    {"name": "orange", "base": "#ea580c", "light": "#ea580c15", "border": "#ea580c18", "grad_from": "#ea580c", "grad_to": "#ea580ccc"},
]

# قسم Unassigned يأخذ لون برتقالي/رمادي
UNASSIGNED_COLOR = {"name": "gray", "base": "#6b7280", "light": "#6b728015", "border": "#6b728018", "grad_from": "#6b7280", "grad_to": "#6b7280cc"}

# =========================
# Shift group colors (Morning/Afternoon/Night/etc.)
# =========================
SHIFT_COLORS = {
    "Morning": {
        "border": "#f59e0b44",
        "bg": "#fef3c7",
        "summary_bg": "#fef3c7",
        "summary_border": "#f59e0b33",
        "label_color": "#92400e",
        "count_bg": "#f59e0b22",
        "count_color": "#92400e",
        "status_color": "#92400e",
        "icon": "☀️",
    },
    "Afternoon": {
        "border": "#f9731644",
        "bg": "#ffedd5",
        "summary_bg": "#ffedd5",
        "summary_border": "#f9731633",
        "label_color": "#9a3412",
        "count_bg": "#f9731622",
        "count_color": "#9a3412",
        "status_color": "#9a3412",
        "icon": "🌤️",
    },
    "Night": {
        "border": "#8b5cf644",
        "bg": "#ede9fe",
        "summary_bg": "#ede9fe",
        "summary_border": "#8b5cf633",
        "label_color": "#5b21b6",
        "count_bg": "#8b5cf622",
        "count_color": "#5b21b6",
        "status_color": "#5b21b6",
        "icon": "🌙",
    },
    "Off Day": {
        "border": "#6366f144",
        "bg": "#e0e7ff",
        "summary_bg": "#e0e7ff",
        "summary_border": "#6366f133",
        "label_color": "#3730a3",
        "count_bg": "#6366f122",
        "count_color": "#3730a3",
        "status_color": "#3730a3",
        "icon": "🛋️",
    },
    "Annual Leave": {
        "border": "#10b98144",
        "bg": "#d1fae5",
        "summary_bg": "#d1fae5",
        "summary_border": "#10b98133",
        "label_color": "#065f46",
        "count_bg": "#10b98122",
        "count_color": "#065f46",
        "status_color": "#065f46",
        "icon": "✈️",
    },
    "Training": {
        "border": "#0ea5e944",
        "bg": "#e0f2fe",
        "summary_bg": "#e0f2fe",
        "summary_border": "#0ea5e933",
        "label_color": "#075985",
        "count_bg": "#0ea5e922",
        "count_color": "#075985",
        "status_color": "#075985",
        "icon": "📚",
    },
    "Standby": {
        "border": "#9e9e9e44",
        "bg": "#f0f0f0",
        "summary_bg": "#f0f0f0",
        "summary_border": "#9e9e9e33",
        "label_color": "#555555",
        "count_bg": "#cccccc22",
        "count_color": "#555555",
        "status_color": "#555555",
        "icon": "🧍"
    }, 
    "Sick Leave": {
    "border": "#ef444444",
    "bg": "#fee2e2",
    "summary_bg": "#fee2e2",
    "summary_border": "#ef444433",
    "label_color": "#991b1b",
    "count_bg": "#ef444422",
    "count_color": "#991b1b",
    "status_color": "#991b1b",
    "icon": "🤒",
   },
    "Other": {
        "border": "#94a3b844",
        "bg": "#f1f5f9",
        "summary_bg": "#f1f5f9",
        "summary_border": "#94a3b833",
        "label_color": "#475569",
        "count_bg": "#94a3b822",
        "count_color": "#475569",
        "status_color": "#475569",
        "icon": "❓",
    },
}


# =========================
# HTML Builders
# =========================
def dept_card_html(dept_name: str, dept_color: dict, buckets: dict, open_group: str = None) -> str:
    # buckets = {group_key: [{"name": ..., "shift": ...}, ...], ...}
    total = sum(len(buckets.get(k, [])) for k in GROUP_ORDER)
    if total == 0:
        return ""

    shifts_html = ""
    for group_key in GROUP_ORDER:
        emps = buckets.get(group_key, [])
        if not emps:
            continue

        # Determine shift display name (use English directly)
        if group_key == "Morning":
            display_name = "Morning"
        elif group_key == "Afternoon":
            display_name = "Afternoon"
        elif group_key == "Night":
            display_name = "Night"
        elif group_key == "Off Day":
            display_name = "Off Day"
        elif group_key == "Annual Leave":
            display_name = "Annual Leave"
        elif group_key == "Sick Leave":
           display_name = "Sick Leave"
        elif group_key == "Training":
            display_name = "Training"
        elif group_key == "Standby":
            display_name = "Standby"
        else:
            display_name = "Other"

        colors = SHIFT_COLORS.get(group_key, SHIFT_COLORS["Other"])
        count = len(emps)
        open_attr = ' open' if (group_key == open_group) else ''

        rows_html = ""
        for i, e in enumerate(emps):
            alt = " empRowAlt" if i % 2 == 1 else ""
            rows_html += f"""<div class="empRow{alt}">
      <span class="empName" style="cursor:pointer;" onclick='goToEmployeeSchedule({json.dumps(e["name"])})'>{e['name']}</span>
       <span class="empStatus" style="color:{colors['status_color']};">{e['shift']}</span>
     </div>"""

        shifts_html += f"""
    <details class="shiftCard" data-shift="{group_key}" style="border:1px solid {colors['border']}; background:{colors['bg']}"{open_attr}>
      <summary class="shiftSummary" style="background:{colors['summary_bg']}; border-bottom:1px solid {colors['summary_border']};">
        <span class="shiftIcon">{colors['icon']}</span>
        <span class="shiftLabel" style="color:{colors['label_color']};">{display_name}</span>
        <span class="shiftCount" style="background:{colors['count_bg']}; color:{colors['count_color']};">{count}</span>
      </summary>
      <div class="shiftBody">
        {rows_html}
      </div>
    </details>
            """

    icon_svg = """
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 21h18M3 10h18M5 21V10l7-6 7 6v11"/>
  <rect x="9" y="14" width="2" height="3"/>
  <rect x="13" y="14" width="2" height="3"/>
</svg>
"""

    return f"""
    <div class="deptCard">
      <div style="height:5px; background:linear-gradient(to right, {dept_color['grad_from']}, {dept_color['grad_to']});"></div>

      <div class="deptHead" style="border-bottom:2px solid {dept_color['border']};">
        <div class="deptIcon" style="background:{dept_color['light']}; color:{dept_color['base']};">
          {icon_svg}
        </div>
        <div class="deptTitle">{dept_name}</div>
        <div class="deptBadge" style="background:{dept_color['light']}; color:{dept_color['base']}; border:1px solid {dept_color['border']};">
          <span style="font-size:10px;opacity:.7;display:block;margin-bottom:1px;text-transform:uppercase;letter-spacing:.5px;">Total</span>
          <span style="font-size:17px;font-weight:900;">{total}</span>
        </div>
      </div>

      <div class="shiftStack">
{shifts_html}
      </div>
    </div>
    """

def page_shell_html(date_label: str, iso_date: str, employees_total: int, departments_total: int,
                     dept_cards_html: str, cta_url: str, sent_time: str, source_name: str = "", last_updated: str = "", is_now_page: bool = False,
                     min_date: str = "", max_date: str = "", notice_html: str = "") -> str:

    pages_base = (PAGES_BASE_URL or infer_pages_base_url()).rstrip("/")
    min_attr = f'min="{min_date}"' if min_date else ""
    max_attr = f'max="{max_date}"' if max_date else ""

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="x-apple-disable-message-reformatting">
  <title>Duty Roster</title>
  <style>
    /* ═══════ RESET ═══════ */
    :root {{
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
    }}
    html, body {{
      width:100%;
      overflow-x:hidden;
    }}
    body {{
      margin:0; padding:0;
      min-height:100dvh;
      background:#eef1f7;
      font-family:'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      color:#0f172a;
      -webkit-font-smoothing:antialiased;
    }}
    * {{ box-sizing:border-box; }}

    /* ═══════ WRAP ═══════ */
    .wrap {{ max-width:680px; margin:0 auto; padding:calc(16px + var(--safe-top)) 14px calc(28px + var(--safe-bottom)); }}

    /* ═══════ HEADER ═══════ */
    .header {{
      background:linear-gradient(135deg, #1e40af 0%, #1976d2 50%, #0ea5e9 100%);
      color:#fff;
      padding:26px 18px 24px;
      border-radius:20px;
      text-align:center;
      box-shadow:0 8px 28px rgba(30,64,175,.25);
      position:relative;
      overflow:hidden;
    }}
    .header::before {{
      content:''; position:absolute;
      top:-30px; right:-40px;
      width:140px; height:140px;
      border-radius:50%;
      background:rgba(255,255,255,.08);
    }}
    .header::after {{
      content:''; position:absolute;
      bottom:-50px; left:-30px;
      width:160px; height:160px;
      border-radius:50%;
      background:rgba(255,255,255,.06);
    }}
    .header h1 {{ margin:0; font-size:24px; font-weight:800; position:relative; z-index:1; letter-spacing:-.3px; }}

    /* زر اللغة */
    .langToggle {{
      position:absolute; top:14px; right:16px; z-index:10;
      background:rgba(255,255,255,.18); border:2px solid rgba(255,255,255,.25);
      border-radius:50%; width:26px; height:26px;
      display:flex; align-items:center; justify-content:center;
      color:#fff; font-size:10px; font-weight:800; cursor:pointer;
      transition:all .25s; -webkit-tap-highlight-color:transparent; padding:0;
    }}
    .langToggle:hover {{ background:rgba(255,255,255,.30); transform:scale(1.08); }}
    body.ar {{ direction:rtl; font-family:'Segoe UI',Tahoma,Arial,sans-serif; }}
    .empRow, .empName, .empStatus {{ direction:ltr !important; unicode-bidi:embed; text-align:left !important; }}

    .welcomeChip {{
      display:none;
      text-decoration:none;
      cursor:pointer;
    }}
    .welcomeChip.visible {{
      display:flex;
    }}
    .welcomeChip .chipLabel {{
      max-width:88px;
      overflow:hidden;
      text-overflow:ellipsis;
    }}
    .waveHand {{
      display:inline-block;
      transform-origin:70% 70%;
      animation:waveHand 1.8s ease-in-out infinite;
    }}
    @keyframes waveHand {{
      0%, 50%, 100% {{ transform:rotate(0deg); }}
      10% {{ transform:rotate(16deg); }}
      20% {{ transform:rotate(-10deg); }}
      30% {{ transform:rotate(16deg); }}
      40% {{ transform:rotate(-6deg); }}
    }}

    /* Date Picker Wrapper */
    .datePickerWrapper {{
      position:relative;
      display:inline-block;
      margin-top:14px;
      z-index:1;
    }}
    .header .dateTag {{
      display:inline-block;
      background:rgba(255,255,255,.18);
      padding:5px 18px;
      border-radius:10px;
      font-size:13px;
      font-weight:600;
      letter-spacing:.3px;
      cursor:pointer;
      transition:all .3s;
      border:2px solid rgba(255,255,255,.2);
      -webkit-tap-highlight-color:transparent;
      user-select:none;
      -webkit-user-select:none;
      direction:ltr;
    }}
    .header .dateTag:hover {{
      background:rgba(255,255,255,.25);
      transform:translateY(-1px);
    }}
    /* الـ input مخفي تماماً - لا يُرى ولا يُضغط عليه */
#datePicker {{
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  font-size: 16px;   /* مهم جداً لمنع zoom على iOS */
  border: none;
  /* ← أضف هذا: */
  -webkit-appearance: none;
}}


    /* ═══════ SUMMARY BAR ═══════ */
    .summaryBar {{ 
      display:flex; 
      justify-content:center; 
      align-items:stretch;
      gap:12px; 
      margin-top:14px;
      flex-wrap:wrap;
    }}
    a.summaryChip:hover {{
      transform:translateY(-3px);
      box-shadow:0 8px 20px rgba(15,23,42,.12);
    }}
    a.summaryChip.importChip .chipVal {{ color:#0ea5e9; }}
    a.summaryChip.importChip:hover {{ box-shadow:0 8px 20px rgba(14,165,233,.18); }}
    a.summaryChip.trainingChip .chipVal {{ color:#7c3aed; }}
    a.summaryChip.trainingChip:hover {{ box-shadow:0 8px 20px rgba(124,58,237,.18); }}
    a.summaryChip.diffChip .chipVal {{ color:#ef4444; }}
    a.summaryChip.diffChip:hover {{ box-shadow:0 8px 20px rgba(239,68,68,.18); }}
    .summaryChip {{
      background:#fff;
      border:1px solid rgba(15,23,42,.1);
      border-radius:14px;
      padding:10px 12px;
      text-align:center;
      box-shadow:0 2px 8px rgba(15,23,42,.06);
      transition:all .25s ease;
      min-width:72px;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:flex-start;
    }}
    .summaryChip .chipVal {{ font-size:22px; font-weight:900; color:#1e40af; height:26px; display:flex; align-items:center; justify-content:center; line-height:1; }}
    .summaryChip .chipIcon {{ width:26px; height:26px; object-fit:contain; display:block; margin:0 auto; }}
    .summaryChip .chipIcon.diffIcon {{ width:35px; height:35px; }}
    #summarySwitchChip .chipVal {{ transition:opacity .2s ease; }}
    #summarySwitchChip .chipLabel {{ transition:opacity .2s ease; }}
    .summaryChip .chipLabel {{ 
      font-size:9.5px;
      font-weight:600; 
      color:#64748b; 
      text-transform:uppercase; 
      letter-spacing:.4px; 
      margin-top:4px;
      line-height:1.1;
      white-space:nowrap;
    }}

    /* ═══════ SHIFT FILTER BUTTONS AS CHIPS ═══════ */
    button.summaryChip.shiftFilterBtn {{
      border:2px solid transparent;
      position:relative;
      overflow:hidden;
      padding:10px 14px; /* padding أصغر للأزرار */
    }}
    button.summaryChip.shiftFilterBtn:hover {{
      transform:translateY(-3px);
      box-shadow:0 8px 20px rgba(15,23,42,.12);
    }}
    button.summaryChip.shiftFilterBtn.active {{
      border-color:currentColor;
      box-shadow:0 6px 16px rgba(15,23,42,.18);
    }}
    button.summaryChip.shiftFilterBtn.active::before {{
      content:'';
      position:absolute;
      top:0;left:0;right:0;bottom:0;
      background:currentColor;
      opacity:.06;
    }}
    
    /* ألوان الورديات */
    button.shiftFilterBtn.morning {{
      color:#f59e0b;
    }}
    button.shiftFilterBtn.morning .chipVal {{ color:#f59e0b; }}
    button.shiftFilterBtn.morning .chipLabel {{ color:#92400e; }}
    
    button.shiftFilterBtn.afternoon {{
      color:#f97316;
    }}
    button.shiftFilterBtn.afternoon .chipVal {{ color:#f97316; }}
    button.shiftFilterBtn.afternoon .chipLabel {{ color:#9a3412; }}
    
    button.shiftFilterBtn.night {{
      color:#8b5cf6;
    }}
    button.shiftFilterBtn.night .chipVal {{ color:#8b5cf6; }}
    button.shiftFilterBtn.night .chipLabel {{ color:#5b21b6; }}
    
    button.shiftFilterBtn.all {{
      color:#1e40af;
    }}
    button.shiftFilterBtn.all .chipVal {{ color:#1e40af; }}
    button.shiftFilterBtn.all .chipLabel {{ color:#1e40af; }}
    
    /* للشاشات المتوسطة */
    @media (max-width:900px){{
      .summaryBar {{ flex-wrap:wrap; }} /* السماح بالانتقال للصف الثاني */
    }}
    
    /* للموبايل */
    @media (max-width:600px){{
      .summaryBar {{ gap:6px; }}
      .summaryChip {{ padding:8px 8px; min-width:60px; }}
      .summaryChip .chipVal {{ font-size:18px; }}
      .summaryChip .chipLabel {{ font-size:8.5px; letter-spacing:.2px; }}
    }}


    /* ═══════ DEPARTMENT CARD ═══════ */
    .deptCard {{
      margin-top:18px;
      background:#fff;
      border-radius:18px;
      overflow:hidden;
      border:1px solid rgba(15,23,42,.07);
      box-shadow:0 4px 18px rgba(15,23,42,.08);
    }}
    .deptHead {{
      display:flex;
      align-items:center;
      gap:12px;
      padding:14px 16px;
      background:#fff;
    }}
    .deptIcon {{
      width:40px; height:40px;
      border-radius:12px;
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0;
    }}
    .deptTitle {{ font-size:18px; font-weight:800; color:#1e293b; flex:1; letter-spacing:-.2px; }}
    .deptBadge {{ min-width:48px; padding:6px 10px; border-radius:12px; text-align:center; }}

    /* ═══════ SHIFT STACK ═══════ */
    .shiftStack {{ padding:10px; display:flex; flex-direction:column; gap:8px; }}

    /* ═══════ SHIFT CARD — <details> ═══════ */
    .shiftCard {{
      border-radius:14px;
      overflow:hidden;
    }}

    .shiftSummary {{
      display:flex;
      align-items:center;
      gap:10px;
      padding:11px 14px;
      cursor:pointer;
      list-style:none;
      -webkit-appearance:none;
      appearance:none;
      user-select:none;
    }}
    .shiftSummary::-webkit-details-marker {{ display:none; }}
    .shiftSummary::marker              {{ display:none; }}

    .shiftIcon  {{ font-size:20px; line-height:1; flex-shrink:0; }}
    .shiftLabel {{ font-size:15px; font-weight:800; flex:1; letter-spacing:-.1px; }}
    .shiftCount {{
      font-size:13px; font-weight:800;
      padding:3px 10px; border-radius:20px;
      flex-shrink:0;
    }}

    /* chevron يدور لما يفتح */
    .shiftSummary::after {{
      content:'▾';
      font-size:14px;
      color:#94a3b8;
      transition:transform .2s;
      flex-shrink:0;
    }}
    .shiftCard[open] .shiftSummary::after {{
      transform:rotate(180deg);
    }}

    .shiftBody {{ background:rgba(255,255,255,.7); }}

    /* ── employee row ── */
    .empRow {{
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:9px 16px;
      border-top:1px solid rgba(15,23,42,.06);
    }}
    .empRowAlt {{ background:rgba(15,23,42,.02); }}
    .empName  {{ font-size:15px; font-weight:700; color:#1e293b; }}
    .empStatus {{ font-size:13px; font-weight:600; }}

    /* ═══════ QUICK ACTIONS ═══════ */
    .quickActions {{
      margin-top:20px;
      display:flex;
      justify-content:center;
      gap:10px;
      flex-wrap:wrap;
    }}
    .btn {{
      display:inline-block;
      padding:11px 18px;
      border-radius:16px;
      background:linear-gradient(135deg, #1e40af, #1976d2);
      color:#fff !important;
      text-decoration:none;
      font-weight:800;
      font-size:14px;
      box-shadow:0 6px 20px rgba(30,64,175,.3);
      min-width:170px;
      text-align:center;
      white-space:nowrap;
    }}

    /* ═══════ FOOTER ═══════ */
    .footer {{ margin-top:18px; text-align:center; font-size:12px; color:#94a3b8; padding:12px 0; line-height:1.9; }}
    .footer strong {{ color:#64748b; }}

    /* ═══════ MOBILE ═══════ */
    @media (max-width:480px){{
      .wrap            {{ padding:12px 10px 22px; }}
      .header h1       {{ font-size:21px; }}
      .deptTitle       {{ font-size:16px; }}
      .empName         {{ font-size:14px; }}
      .empStatus       {{ font-size:12px; }}
      .shiftLabel      {{ font-size:14px; }}
      .summaryBar      {{ gap:8px; }}
      .summaryChip     {{ padding:8px 14px; }}
      .summaryChip .chipVal {{ font-size:19px; }}
    }}

  </style>
</head>
<body>
<div class="wrap">

  <!-- ════ HEADER ════ -->
  <div class="header">
    <button class="langToggle" id="langToggle" onclick="toggleLang()">ع</button>
    <h1 id="pageTitle">Export Duty Roster</h1>
    <div class="datePickerWrapper">
      <button class="dateTag" id="dateTag" onclick="openDatePicker()" type="button">📅 {date_label}</button>
      <input id="datePicker" type="date" value="{iso_date}" {min_attr} {max_attr} tabindex="-1" aria-hidden="true" />
    </div>
  </div>

  {notice_html if notice_html else ""}

  <!-- ════ SUMMARY CHIPS ════ -->
  <div class="summaryBar">
    <div class="summaryChip" id="summarySwitchChip">
      <div class="chipVal" id="summarySwitchVal">{employees_total}</div>
      <div class="chipLabel" id="summarySwitchLabel" data-key="employees">Employees</div>
    </div>
    <a href="#" id="myScheduleBtn" class="summaryChip" style="cursor:pointer;text-decoration:none;" onclick="goToMySchedule(event)">
      <div class="chipVal">🗓️</div>
      <div class="chipLabel" data-key="mySchedule">My Schedule</div>
    </a>
    <a href="#" id="importBtn" class="summaryChip importChip" style="cursor:pointer;text-decoration:none;" onclick="goToImport(event)">
      <div class="chipVal"><img class="chipIcon flightSwitchIcon" alt="Import" src="" /></div>
      <div class="chipLabel" data-key="importRoster">Import</div>
    </a>
    <a href="#" id="welcomeChip" class="summaryChip welcomeChip" onclick="goToMySchedule(event)" title="Go to your schedule">
      <div class="chipVal"><span class="waveHand">👋</span></div>
      <div class="chipLabel" id="welcomeName"></div>
    </a>
    <a href="#" id="trainingBtn" class="summaryChip trainingChip" style="cursor:pointer;text-decoration:none;" onclick="goToTraining(event)">
      <div class="chipVal">📚</div>
      <div class="chipLabel" data-key="trainingPage">Training</div>
    </a>
    <a href="#" id="diffChipBtn" class="summaryChip diffChip" style="cursor:pointer;text-decoration:none;" onclick="goToRosterDiff(event)">
      <div class="chipVal"><img class="chipIcon diffIcon" id="diffChipIcon" alt="Diff" src="" /></div>
      <div class="chipLabel" data-key="diffPage">Diff</div>
    </a>
    {"" if not is_now_page else '''
    <button class="summaryChip shiftFilterBtn morning" data-shift="Morning" style="cursor:pointer;">
      <div class="chipVal">☀️</div>
      <div class="chipLabel" data-key="morning">Morning</div>
    </button>
    <button class="summaryChip shiftFilterBtn afternoon" data-shift="Afternoon" style="cursor:pointer;">
      <div class="chipVal">🌤️</div>
      <div class="chipLabel" data-key="afternoon">Afternoon</div>
    </button>
    <button class="summaryChip shiftFilterBtn night" data-shift="Night" style="cursor:pointer;">
      <div class="chipVal">🌙</div>
      <div class="chipLabel" data-key="night">Night</div>
    </button>
    <button class="summaryChip shiftFilterBtn all active" data-shift="All" style="cursor:pointer;">
      <div class="chipVal">📋</div>
      <div class="chipLabel" data-key="allShifts">All Shifts</div>
    </button>
    '''}
  </div>

  <!-- ════ DEPARTMENT CARDS ════ -->
  {dept_cards_html}

  <!-- ════ CTA ════ -->
<div class="quickActions">
  <a class="btn" id="ctaBtn" href="#">📋 Full Roster</a>
  <a href="#" class="btn" id="subscribeBtn">📩 Subscribe</a>
  <a href="#" class="btn" id="compareBtn" onclick="goToRosterDiff(event)">📊 Compare</a>
</div>

  <!-- ════ FOOTER ════ -->
  <div class="footer">
    <strong style="color:#475569;font-size:13px;">Last Updated:</strong> <strong style="color:#1e40af;">{last_updated}</strong>
    <br>Total: <strong>{employees_total} employees</strong>
     &nbsp;·&nbsp; Source: <strong>{source_name}</strong>
  </div>

</div>

<script>
function getSiteRootPath() {{
  if (location.protocol === 'file:') return '';
  var path = location.pathname || '/';
  if (path.includes('/roster-site/')) return '/roster-site';
  if (location.hostname && location.hostname.endsWith('github.io')) {{
    var segs = path.split('/').filter(Boolean);
    if (segs.length >= 2 && segs[1] === 'docs') return '/' + segs[0] + '/docs';
    return segs.length ? '/' + segs[0] : '';
  }}
  return '';
}}

function getSiteRootUrl() {{
  return location.origin + getSiteRootPath();
}}

function goToEmployeeSchedule(empName) {{
  var match = empName.match(/-\s*(\d{{3,}})/);
  var base = getSiteRootUrl() + '/my-schedules/index.html';

  if (match) {{
    location.href = base + '?emp=' + encodeURIComponent(match[1]);
  }} else {{
    location.href = base + '?name=' + encodeURIComponent(empName);
  }}
}}

(function(){{
  var picker = document.getElementById('datePicker');
  if(!picker) return;

  function getMuscatTodayIso() {{
    var now = new Date();
    var muscatTime = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return muscatTime.getFullYear() + '-' +
      String(muscatTime.getMonth() + 1).padStart(2, '0') + '-' +
      String(muscatTime.getDate()).padStart(2, '0');
  }}

  function formatIsoLabel(iso) {{
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', {{ day: 'numeric', month: 'long', year: 'numeric' }});
  }}

  function syncHeaderDate(iso) {{
    var tag = document.getElementById('dateTag');
    if (tag) tag.textContent = '📅 ' + formatIsoLabel(iso);
  }}

  var path = window.location.pathname || '/';
  var pageDateMatch = path.match(/\/date\/(\d{{4}})-(\d{{2}})-(\d{{2}})\//);
  var effectiveIso = pageDateMatch
    ? (pageDateMatch[1] + '-' + pageDateMatch[2] + '-' + pageDateMatch[3])
    : getMuscatTodayIso();
  picker.value = effectiveIso;
  syncHeaderDate(effectiveIso);

  // ═══════════════════════════════════════════════════
  // فتح الـ date picker - يعمل على Desktop + iOS + Android
  // ═══════════════════════════════════════════════════
window.openDatePicker = function() {{
  var picker = document.getElementById('datePicker');
  if (!picker) return;

  // احسب موقع زر التاريخ وضع العنصر المخفي تحته مباشرة
  var btn = document.getElementById('dateTag');
  if (btn) {{
    var rect = btn.getBoundingClientRect();
    var btnCenterX = rect.left + rect.width / 2;
    var btnBottom  = rect.bottom + 6; // 6px تحت الزر

    // تأكد أن النافذة لن تخرج من يمين الشاشة
    var pickerWidth = 280; // تقدير عرض نافذة التقويم
    var leftPos = Math.min(btnCenterX - pickerWidth / 2, window.innerWidth - pickerWidth - 10);
    leftPos = Math.max(leftPos, 10);

    picker.style.position = 'fixed';
    picker.style.top  = btnBottom + 'px';
    picker.style.left = (btnCenterX) + 'px';
    picker.style.transform = 'translateX(-50%)';
  }} else {{
    // fallback: وسط الشاشة
    picker.style.position = 'fixed';
    picker.style.top = '50%';
    picker.style.left = '50%';
    picker.style.transform = 'translate(-50%, -50%)';
  }}

  picker.style.width = '1px';
  picker.style.height = '1px';
  picker.style.opacity = '0';
  picker.style.pointerEvents = 'auto';
  picker.style.zIndex = '9999';

  picker.focus();

  if (typeof picker.showPicker === 'function') {{
    try {{ picker.showPicker(); }} catch(e) {{}}
  }} else {{
    picker.click();
  }}

  function restore() {{
    picker.style.position = 'absolute';
    picker.style.top = '100%';
    picker.style.left = '50%';
    picker.style.transform = '';
    picker.style.width = '1px';
    picker.style.height = '1px';
    picker.style.opacity = '0';
    picker.style.pointerEvents = 'none';
    picker.style.zIndex = '';
    picker.removeEventListener('change', restore);
    picker.removeEventListener('blur', restore);
  }}

  picker.addEventListener('change', restore);
  picker.addEventListener('blur', restore);
}};

  // ═══════════════════════════════════════════════════
  // التحقق من التاريخ وإعادة التوجيه للـ today
  // ═══════════════════════════════════════════════════
  function checkAndRedirectToToday() {{
    var isNowPage = path.includes('/now');
    var isReload = false;
    try {{
      if (performance && performance.getEntriesByType) {{
        var navEntries = performance.getEntriesByType('navigation');
        if (navEntries && navEntries.length) {{
          isReload = navEntries[0].type === 'reload';
        }}
      }}
    }} catch(e) {{}}

    // Root pages should always jump to today's (or nearest available) date page.
    var isRootLike = !path.includes('/date/');
    if (isRootLike) {{
      var baseRoot = path
        .replace(/\/now\/?$/, '/')
        .replace(/\/+$/, '');
      window.location.href = baseRoot + '/date/' + effectiveIso + '/' + (isNowPage ? 'now/' : '');
      return true;
    }}

    // On explicit refresh of a date page, go back to today's page.
    var dateMatch = path.match(/\/date\/(\\d{{4}})-(\\d{{2}})-(\\d{{2}})\//);
    if (dateMatch && isReload) {{
      var pageIso = dateMatch[1] + '-' + dateMatch[2] + '-' + dateMatch[3];
      var todayIso = getMuscatTodayIso();
      if (pageIso !== todayIso) {{
        var basePath = path
          .replace(/\/date\/\\d{{4}}-\\d{{2}}-\\d{{2}}\\/.*$/, '/')
          .replace(/\/now\/.*$/, '/')
          .replace(/\/+$/, '');
        window.location.href = basePath + '/date/' + todayIso + '/' + (isNowPage ? 'now/' : '');
        return true;
      }}
    }}

    return false;
  }}

  if (checkAndRedirectToToday()) return;

  // ═══════════════════════════════════════════════════
  // عند تغيير التاريخ → انتقل للصفحة المناسبة
  // ═══════════════════════════════════════════════════
  picker.addEventListener('change', function() {{
    if (!picker.value) return;

    sessionStorage.removeItem('pageLoaded');

    var path = window.location.pathname || '/';
    var isNowPage = path.includes('/now');
    var base = path
      .replace(/\/date\/\\d{{4}}-\\d{{2}}-\\d{{2}}\\/.*$/, '/')
      .replace(/\/now\/.*$/, '/')
      .replace(/\/+$/, '');

    var target = base + '/date/' + picker.value + '/';
    if (isNowPage) target += 'now/';

    window.location.href = target;
  }});

}})();

// ═══════════════════════════════════════════════════
// Shift Filter (NOW PAGE ONLY)
// ═══════════════════════════════════════════════════
(function(){{
  var filterBtns = document.querySelectorAll('.shiftFilterBtn');
  if(!filterBtns.length) return; // Not a /now/ page
  
  var allShiftCards = document.querySelectorAll('.shiftCard');
  
  // Group shift cards by shift type
  var shiftGroups = {{}};
  allShiftCards.forEach(function(card){{
    var shiftType = card.dataset.shift;
    if(!shiftType) return;
    if(!shiftGroups[shiftType]) shiftGroups[shiftType] = [];
    shiftGroups[shiftType].push(card);
  }});
  
  // Determine current shift based on time
  function getCurrentShift(){{
    var now = new Date();
    var muscatTime = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    var hour = muscatTime.getHours();
    var minute = muscatTime.getMinutes();
    var t = hour * 60 + minute;
    
    if(t >= 21 * 60 || t < 5 * 60) return 'Night';
    if(t >= 13 * 60) return 'Afternoon';
    return 'Morning';
  }}
  
  // Set active shift on load - default to current shift
  var currentShift = getCurrentShift();
  filterBtns.forEach(function(btn){{
    if(btn.dataset.shift === currentShift){{
      btn.classList.add('active');
    }} else {{
      btn.classList.remove('active');
    }}
  }});
  
  // Filter function
  function filterShifts(selectedShift){{
    var totalEmployees = 0;
    
    if(selectedShift === 'All'){{
      // Show all shifts
      allShiftCards.forEach(function(card){{
        card.style.display = '';
        var count = card.querySelector('.shiftCount');
        if(count) totalEmployees += parseInt(count.textContent) || 0;
      }});
    }} else {{
      // Hide all cards first
      allShiftCards.forEach(function(card){{ card.style.display = 'none'; }});
      
      // Show only selected shift cards and count employees
      if(shiftGroups[selectedShift]){{
        shiftGroups[selectedShift].forEach(function(card){{
          card.style.display = '';
          // Auto-open the selected shift
          card.setAttribute('open', '');
          // Count employees in this card
          var count = card.querySelector('.shiftCount');
          if(count) totalEmployees += parseInt(count.textContent) || 0;
        }});
      }}
      
      // Also show Off Day, Leave, Training, Standby in all shifts
      var alwaysShow = ['Off Day', 'Annual Leave', 'Sick Leave', 'Training', 'Standby', 'Other'];
      alwaysShow.forEach(function(type){{
        if(shiftGroups[type]){{
          shiftGroups[type].forEach(function(card){{
            card.style.display = '';
            // لا تحسب Off Day/Leave في عداد الفترة المختارة
          }});
        }}
      }});
    }}
    
    // Update employee count in summary
    window.__summaryCounts = window.__summaryCounts || {{}};
    window.__summaryCounts.employees = totalEmployees;
    if(window.updateSummarySwitchChip) window.updateSummarySwitchChip();
    
    // Update button states
    filterBtns.forEach(function(btn){{
      if(btn.dataset.shift === selectedShift){{
        btn.classList.add('active');
      }} else {{
        btn.classList.remove('active');
      }}
    }});
  }}
  
  // Add click handlers
  filterBtns.forEach(function(btn){{
    btn.addEventListener('click', function(){{
      filterShifts(this.dataset.shift);
    }});
  }});
  
  // Auto-filter on page load - show current shift
  filterShifts(currentShift);
}})();

// ══════════════════════════════════════════════════
// Language Toggle
// ══════════════════════════════════════════════════
var LANG = localStorage.getItem('rosterLang') || 'en';
window.__summaryCounts = window.__summaryCounts || {{ employees: {employees_total}, departments: {departments_total} }};
window.__summarySwitchMode = 'employees';
var T = {{
  en: {{
    title:'Export Duty Roster', langBtn:'ع',
    employees:'Emp.', departments:'Depts.', total:'Total',
    morning:'Morning', afternoon:'Afternoon', night:'Night',
    offday:'Off Day', annualLeave:'Annual Leave', sickLeave:'Sick Leave',
    training:'Training', standby:'Standby', other:'Other',
    from:'FROM', to:'TO',
    viewFull:'📋 Full Roster', subscribe:'📩 Subscribe', compare:'📊 Compare',
    officers:'Officers', supervisors:'Supervisors', loadControl:'Load Control',
    exportChecker:'Export Checker', exportOps:'Export Operators', unassigned:'Unassigned',
    morning2:'Morning', afternoon2:'Afternoon', night2:'Night', allShifts:'All Shifts', mySchedule:'Schedule', importRoster:'Import', trainingPage:'Training', diffPage:'Diff',
  }},
  ar: {{
    title:'جدول الصادر', langBtn:'EN',
    employees:'الموظفون', departments:'الأقسام', total:'المجموع',
    morning:'صباح', afternoon:'ظهر', night:'ليل',
    offday:'إجازة', annualLeave:'إجازة سنوية', sickLeave:'إجازة مرضية',
    training:'تدريب', standby:'احتياط', other:'أخرى',
    from:'من', to:'إلى',
    viewFull:'📋 الجدول الكامل', subscribe:'📩 اشتراك', compare:'📊 مقارنة',
    officers:'الضباط', supervisors:'المشرفون', loadControl:'مراقبة الحمولة',
    exportChecker:'مدقق الصادرات', exportOps:'مشغلو الصادرات', unassigned:'غير مُعيَّن',
    morning2:'صباح', afternoon2:'ظهر', night2:'ليل', allShifts:'الكل', mySchedule:'جدولي', importRoster:'الوارد', trainingPage:'تدريب', diffPage:'فروقات',
  }}
}};

function updateSummarySwitchChip() {{
  var val = document.getElementById('summarySwitchVal');
  var lbl = document.getElementById('summarySwitchLabel');
  if(!val || !lbl) return;
  var t = T[LANG] || T.en;
  var mode = window.__summarySwitchMode || 'employees';
  var counts = window.__summaryCounts || {{}};
  if(mode === 'departments') {{
    val.style.color = '#059669';
    val.textContent = counts.departments != null ? counts.departments : {departments_total};
    lbl.textContent = t.departments;
    lbl.dataset.key = 'departments';
  }} else {{
    val.style.color = '';
    val.textContent = counts.employees != null ? counts.employees : {employees_total};
    lbl.textContent = t.employees;
    lbl.dataset.key = 'employees';
  }}
}}

function startSummarySwitchLoop() {{
  if(window.__summarySwitchTimer) return;
  window.__summarySwitchTimer = setInterval(function(){{
    window.__summarySwitchMode = (window.__summarySwitchMode === 'employees') ? 'departments' : 'employees';
    updateSummarySwitchChip();
  }}, 2200);
}}

function applyLang(lang) {{
  var t=T[lang], isAr=lang==='ar';
  document.body.classList.toggle('ar',isAr);
  document.documentElement.setAttribute('lang',lang);
  var el=document.getElementById('pageTitle'); if(el) el.textContent=t.title;
  var btn=document.getElementById('langToggle'); if(btn) btn.textContent=t.langBtn;
  document.querySelectorAll('.chipLabel').forEach(function(el) {{
    var k=el.dataset.key;
    if(k==='employees') el.textContent=t.employees;
    else if(k==='departments') el.textContent=t.departments;
    else if(k==='morning') el.textContent=t.morning2;
    else if(k==='afternoon') el.textContent=t.afternoon2;
    else if(k==='night') el.textContent=t.night2;
    else if(k==='allShifts') el.textContent=t.allShifts;
    else if(k==='mySchedule') el.textContent=t.mySchedule;
    else if(k==='importRoster') el.textContent=t.importRoster;
    else if(k==='trainingPage') el.textContent=t.trainingPage;
    else if(k==='diffPage') el.textContent=t.diffPage;
  }});
  document.querySelectorAll('.deptBadge span:first-child').forEach(function(el) {{ el.textContent=t.total; }});
  var deptMap={{'Officers':t.officers,'Supervisors':t.supervisors,'Load Control':t.loadControl,
    'Export Checker':t.exportChecker,'Export Operators':t.exportOps,'Unassigned':t.unassigned}};
  document.querySelectorAll('.deptTitle').forEach(function(el) {{
    if(!el.dataset.key) el.dataset.key=el.textContent.trim();
    if(deptMap[el.dataset.key]) el.textContent=deptMap[el.dataset.key];
  }});
  var shiftMap={{'Morning':t.morning,'Afternoon':t.afternoon,'Night':t.night,
    'Off Day':t.offday,'Annual Leave':t.annualLeave,'Sick Leave':t.sickLeave,
    'Training':t.training,'Standby':t.standby,'Other':t.other}};
  document.querySelectorAll('.shiftLabel').forEach(function(el) {{
    if(!el.dataset.key) el.dataset.key=el.textContent.trim();
    if(shiftMap[el.dataset.key]) el.textContent=shiftMap[el.dataset.key];
  }});
  document.querySelectorAll('.empStatus span').forEach(function(el) {{
    var txt=el.textContent.trim();
    if(txt==='FROM'||txt==='من') el.textContent=t.from;
    if(txt==='TO'||txt==='إلى') el.textContent=t.to;
  }});
  var c1=document.getElementById('ctaBtn'); if(c1) c1.textContent=t.viewFull;
  var c2=document.getElementById('subscribeBtn'); if(c2) c2.textContent=t.subscribe;
  var c3=document.getElementById('compareBtn'); if(c3) c3.textContent=t.compare;
  var footer=document.querySelector('.footer');
  if(footer) {{
    var h=footer.innerHTML;
    if(isAr) {{
      h=h.replace('Last Updated','آخر تحديث'); h=h.replace('Total:','المجموع:');
      h=h.replace(' employees',' موظف'); h=h.replace('Source:','المصدر:');
    }} else {{
      h=h.replace('آخر تحديث','Last Updated'); h=h.replace('المجموع:','Total:');
      h=h.replace(' موظف',' employees'); h=h.replace('المصدر:','Source:');
    }}
    footer.innerHTML=h;
  }}
  localStorage.setItem('rosterLang',lang);
  LANG=lang;
  updateSummarySwitchChip();
}}
function toggleLang() {{ applyLang(LANG==='en'?'ar':'en'); }}

function setLocalCtaLinks() {{
  var root = getSiteRootPath();
  var c1 = document.getElementById('ctaBtn');
  var c2 = document.getElementById('subscribeBtn');
  if (c1) c1.href = root + '/now/';
  if (c2) c2.href = root + '/subscribe/';
}}
function goToTraining(e) {{
  if (e) e.preventDefault();
  var root = getSiteRootPath();
  location.href = root + '/training/';
}}
function setDiffChipIcon() {{
  var icon = document.getElementById('diffChipIcon');
  if(!icon) return;
  var root = getSiteRootPath();
  icon.src = root + '/assets/icons/diff-calendar.png?v=20260428d';
}}
setLocalCtaLinks();
setDiffChipIcon();
applyLang(LANG);
startSummarySwitchLoop();

// ═══════════════════════════════════════════════════
// رسالة الترحيب — تقرأ اسم الموظف من schedules JSON
// ═══════════════════════════════════════════════════
(function() {{
  function getExportEmpId() {{
    var id = localStorage.getItem('exportSavedEmpId');
    if (id) return id;
    var legacy = localStorage.getItem('savedEmpId');
    if (legacy) {{
      localStorage.setItem('exportSavedEmpId', legacy);
      return legacy;
    }}
    return '';
  }}
  var empId = getExportEmpId();
  if (!empId) return;
  var chip = document.getElementById('welcomeChip');
  var nameEl = document.getElementById('welcomeName');
  // استخدام مسار مطلق يعمل من أي صفحة
  var base = getSiteRootUrl() + '/';
  fetch(base + 'schedules/' + empId + '.json')
    .then(function(r) {{ return r.ok ? r.json() : null; }})
    .then(function(d) {{
      if (!d || !d.name) return;
      var firstName = d.name.split(' ')[0];
      if (chip && nameEl) {{
        nameEl.textContent = firstName;
        chip.classList.add('visible');
      }}
    }}).catch(function() {{}});
}})();

function goToMySchedule(event) {{
  if (event) event.preventDefault();
  var id = localStorage.getItem('exportSavedEmpId') || localStorage.getItem('savedEmpId');
  var base = getSiteRootUrl() + '/my-schedules/index.html';
  location.href = id ? base + '?emp=' + encodeURIComponent(id) : base;
}}

function goToImport(event) {{
  if (event) event.preventDefault();
  var target = getSiteRootUrl() + '/import/';
  location.href = target;
}}

function goToRosterDiff(event) {{
  if (event) event.preventDefault();
  var target = getSiteRootUrl() + '/roster-diff/index.html';
  location.href = target;
}}

(function bindFlightSwitchIcons() {{
  var root = getSiteRootUrl();
  var iconUrl = root + '/assets/icons/flight.png?v=20260428d';
  document.querySelectorAll('.flightSwitchIcon').forEach(function(img) {{
    img.src = iconUrl;
  }});
}})();

(function loadLocalEnhancements() {{
  var root = getSiteRootUrl();
  function addScript(src) {{
    if (document.querySelector('script[data-local-src="' + src + '"]')) return;
    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.setAttribute('data-local-src', src);
    document.body.appendChild(s);
  }}
  var ver = '20260427b';
  addScript(root + '/change-alert.js?v=' + ver);
  addScript(root + '/banner-changer.js?v=' + ver);
  var eidDays = ['2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'];
  var m = (location.pathname || '').match(/\/date\/(\d{{4}}-\d{{2}}-\d{{2}})\//);
  var activeIso = m ? m[1] : (new Date()).toISOString().slice(0, 10);
  if (eidDays.indexOf(activeIso) !== -1) {{
    addScript(root + '/eid-overlayxx.js');
  }}
}})();
</script>

</body>
</html>"""


def generate_date_pages_for_month(wb, year: int, month: int, pages_base: str, source_name: str = "", min_date: str = "", max_date: str = ""):
    """
    Generate static pages for each day of the given month.
    Used by the date picker to navigate to different dates.

    If wb is None, it still generates pages but shows a 'no roster' notice.
    """
    import calendar
    from datetime import datetime as dt

    days_in_month = calendar.monthrange(year, month)[1]

    for day in range(1, days_in_month + 1):
        try:
            date_obj = dt(year, month, day, tzinfo=TZ)
            dow = (date_obj.weekday() + 1) % 7  # Sun=0
            active_group = current_shift_key(dt.now(TZ))

            dept_cards_all = []
            dept_cards_now = []
            employees_total_all = 0
            employees_total_now = 0
            depts_count = 0

            notice_html = ""
            if wb is None:
                notice_html = (
                    "<div class='deptCard' style='padding:14px;border:1px dashed rgba(15,23,42,.20);background:#fff;'>"
                    "⚠️ لا يوجد روستر لهذا الشهر بعد.</div>"
                )
            else:
                for idx, (sheet_name, dept_name) in enumerate(DEPARTMENTS):
                    if sheet_name not in wb.sheetnames:
                        continue

                    ws = wb[sheet_name]
                    days_row, date_row = find_days_and_dates_rows(ws)
                    day_col = find_day_col(ws, days_row, date_row, dow, day)

                    if not (days_row and date_row and day_col):
                        continue

                    start_row = date_row + 1
                    emp_col = find_employee_col(ws, start_row=start_row)
                    daynum_to_col = get_daynum_to_col(ws, date_row)
                    if not emp_col:
                        continue

                    buckets = {k: [] for k in GROUP_ORDER}
                    buckets_now = {k: [] for k in GROUP_ORDER}

                    for r in range(start_row, ws.max_row + 1):
                        name = norm(ws.cell(row=r, column=emp_col).value)
                        if not looks_like_employee_name(name):
                            continue

                        daynum_to_raw = {dn: norm(ws.cell(row=r, column=col).value) for dn, col in daynum_to_col.items()}
                        raw = daynum_to_raw.get(day, "")
                        if not looks_like_shift_code(raw):
                            continue

                        label, grp = map_shift(raw)

                        up = norm(raw).upper()
                        if grp == "Annual Leave":
                            if up == "AL" or "ANNUAL LEAVE" in up or up == "LV":
                                suf = range_suffix_for_day(day, daynum_to_raw, "AL")
                                if suf:
                                    label = suf
                        elif grp == "Sick Leave":
                            if up == "SL" or "SICK LEAVE" in up:
                                suf = range_suffix_for_day(day, daynum_to_raw, "SL")
                                if suf:
                                    label = suf
                        elif grp == "Training":
                            if up == "TR" or "TRAINING" in up:
                                suf = range_suffix_for_day(day, daynum_to_raw, "TR")
                                if suf:
                                    label = suf

                        buckets.setdefault(grp, []).append({"name": name, "shift": label})

                        # /now page: include ALL groups so the shift filter buttons work for any date
                        buckets_now.setdefault(grp, []).append({"name": name, "shift": label})
                    dept_color = UNASSIGNED_COLOR if dept_name == "Unassigned" else DEPT_COLORS[idx % len(DEPT_COLORS)]
                    open_group_full = active_group if AUTO_OPEN_ACTIVE_SHIFT_IN_FULL else None

                    dept_cards_all.append(dept_card_html(dept_name, dept_color, buckets, open_group=open_group_full))
                    dept_cards_now.append(dept_card_html(dept_name, dept_color, buckets_now, open_group=active_group))

                    employees_total_all += sum(len(buckets.get(g, [])) for g in GROUP_ORDER)
                    employees_total_now += sum(len(buckets_now.get(g, [])) for g in GROUP_ORDER)
                    depts_count += 1

                if employees_total_all == 0:
                    notice_html = (
                        "<div class='deptCard' style='padding:14px;border:1px dashed rgba(15,23,42,.20);background:#fff;'>"
                        "ℹ️ لا توجد بيانات لهذا التاريخ في الروستر.</div>"
                    )

            try:
                date_label = date_obj.strftime("%-d %B %Y")
            except Exception:
                date_label = date_obj.strftime("%d %B %Y")

            iso_date = date_obj.strftime("%Y-%m-%d")
            sent_time = date_obj.strftime("%H:%M")
            last_updated = date_obj.strftime("%d%b%Y / %H:%M").upper()

            full_url = f"{pages_base}/"
            now_url = f"{pages_base}/now/"

            html_full = page_shell_html(
                date_label=date_label,
                iso_date=iso_date,
                employees_total=employees_total_all,
                departments_total=depts_count,
                dept_cards_html="\n".join(dept_cards_all),
                cta_url=now_url,
                sent_time=sent_time,
                source_name=source_name,
                last_updated=last_updated,
                is_now_page=False,
                min_date=min_date,
                max_date=max_date,
                notice_html=notice_html,
            )

            html_now = page_shell_html(
                date_label=date_label,
                iso_date=iso_date,
                employees_total=employees_total_now,
                departments_total=depts_count,
                dept_cards_html="\n".join(dept_cards_now),
                cta_url=full_url,
                sent_time=sent_time,
                source_name=source_name,
                last_updated=last_updated,
                is_now_page=True,
                min_date=min_date,
                max_date=max_date,
                notice_html=notice_html,
            )

            date_dir = f"docs/date/{iso_date}"
            os.makedirs(date_dir, exist_ok=True)
            os.makedirs(f"{date_dir}/now", exist_ok=True)

            with open(f"{date_dir}/index.html", "w", encoding="utf-8") as f:
                f.write(html_full)

            with open(f"{date_dir}/now/index.html", "w", encoding="utf-8") as f:
                f.write(html_now)

        except Exception as e:
            print(f"Skipping {year}-{month:02d}-{day:02d}: {e}")
            continue


def build_pretty_email_html(active_shift_key: str, now: datetime, all_shifts_by_dept: list, pages_base: str) -> str:
    """
    Builds a beautifully formatted HTML email showing ONLY the active shift plus Standby for the same shift.
    all_shifts_by_dept = [{"dept": ..., "shifts": {"Morning": [...], "Afternoon": [...], ...}}, ...]
    """
    # Show only: active shift + Standby entries that match the active shift
    include_groups = [active_shift_key, "Standby"]

    def standby_matches_active(shift_text: str) -> bool:
        up = (shift_text or "").upper()
        if active_shift_key == "Morning":
            return bool(re.search(r"(MN|ME)\d{1,2}", up))
        if active_shift_key == "Afternoon":
            return bool(re.search(r"(AN|AE)\d{1,2}", up))
        if active_shift_key == "Night":
            return bool(re.search(r"(NN|NE|NT)\d{1,2}", up))
        return False

    def get_group_employees(shifts_data: dict, group_key: str):
        if group_key != "Standby":
            return shifts_data.get(group_key, []) or []
        # Standby: keep only those that match the active shift (e.g., STME06 for Morning)
        emps = shifts_data.get("Standby", []) or []
        return [e for e in emps if standby_matches_active(e.get("shift", ""))]

    # Calculate totals across included groups only
    total_employees = 0
    depts_with_employees = 0

    for d in all_shifts_by_dept:
        shifts_data = d.get("shifts", {})
        dept_total = 0
        for g in include_groups:
            dept_total += len(get_group_employees(shifts_data, g))
        if dept_total > 0:
            depts_with_employees += 1
            total_employees += dept_total

    # Determine current shift colors for header
    shift_colors = SHIFT_COLORS.get(active_shift_key, SHIFT_COLORS["Other"])
    shift_icon = shift_colors.get("icon", "⏰")

    # Build department cards with ALL shifts
    dept_cards = []
    for idx, d in enumerate(all_shifts_by_dept):
        dept_name = d["dept"]
        shifts_data = d["shifts"]
        # Skip if department has no employees for the included groups
        dept_total = 0
        for g in include_groups:
            dept_total += len(get_group_employees(shifts_data, g))
        if dept_total == 0:
            continue
        # Determine department color
        if dept_name == "Unassigned":
            dept_color = UNASSIGNED_COLOR
        else:
            dept_color = DEPT_COLORS[idx % len(DEPT_COLORS)]
        # Build shift sections (only active shift + matching Standby)
        shift_sections = ""
        for group_key in GROUP_ORDER:
            if group_key not in include_groups:
                continue
            employees = get_group_employees(shifts_data, group_key)
            if not employees:
                continue

            # Get shift display name
            shift_display_names = {
                "Morning": "Morning",
                "Afternoon": "Afternoon",
                "Night": "Night",
                "Off Day": "Off Day",
                "Leave": "Annual Leave",
                "Training": "Training",
                "Standby": "Standby",
                "Other": "Other"
            }
            display_name = shift_display_names.get(group_key, group_key)
            
            colors = SHIFT_COLORS.get(group_key, SHIFT_COLORS["Other"])
            count = len(employees)

            # Highlight active shift
            is_active = (group_key == active_shift_key)
            active_border = f"border:2px solid {colors['border']};" if is_active else f"border:1px solid {colors['border']};"
            active_badge = "⚡" if is_active else ""

            # Build employee rows
            rows_html = ""
            for i, e in enumerate(employees):
                bg_color = "rgba(15,23,42,.03)" if i % 2 == 1 else "transparent"
                rows_html += f"""
                    <tr>
                      <td style="padding:10px 14px;border-top:1px solid rgba(15,23,42,.06);background:{bg_color};">
                        <span style="font-size:14px;font-weight:700;color:#1e293b;">{e['name']}</span>
                      </td>
                      <td style="padding:10px 14px;border-top:1px solid rgba(15,23,42,.06);text-align:right;background:{bg_color};">
                        <span style="font-size:13px;font-weight:600;color:{colors['status_color']};white-space:nowrap;">{e['shift']}</span>
                      </td>
                    </tr>"""

            shift_sections += f"""
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:10px;background:{colors['bg']};border-radius:12px;overflow:hidden;{active_border}">
                <!-- Shift Header -->
                <tr>
                  <td colspan="2" style="padding:10px 14px;background:{colors['summary_bg']};border-bottom:1px solid {colors['summary_border']};">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr>
                        <td style="padding:0;">
                          <span style="font-size:18px;margin-right:8px;">{colors['icon']}</span>
                          <span style="font-size:15px;font-weight:800;color:{colors['label_color']};letter-spacing:-.1px;">{display_name} {active_badge}</span>
                        </td>
                        <td style="text-align:right;padding:0;">
                          <span style="display:inline-block;padding:4px 12px;border-radius:20px;background:{colors['count_bg']};color:{colors['count_color']};font-size:13px;font-weight:800;">{count}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Employees -->
                {rows_html}
              </table>"""

        # Department icon SVG
        icon_svg = """<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 21h18M3 10h18M5 21V10l7-6 7 6v11"/>
  <rect x="9" y="14" width="2" height="3"/>
  <rect x="13" y="14" width="2" height="3"/>
</svg>"""

        dept_cards.append(f"""
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:18px;background:#fff;border-radius:18px;overflow:hidden;border:1px solid rgba(15,23,42,.07);box-shadow:0 4px 18px rgba(15,23,42,.08);">
            <!-- Colored top gradient bar -->
            <tr>
              <td colspan="2" style="height:5px;background:linear-gradient(to right,{dept_color['grad_from']},{dept_color['grad_to']});padding:0;"></td>
            </tr>
            
            <!-- Department Header -->
            <tr>
              <td colspan="2" style="padding:14px 16px;border-bottom:2px solid {dept_color['border']};background:#fff;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                  <tr>
                    <td style="width:46px;padding:0;">
                      <div style="width:44px;height:44px;border-radius:12px;background:{dept_color['light']};color:{dept_color['base']};display:flex;align-items:center;justify-content:center;">
                        {icon_svg}
                      </div>
                    </td>
                    <td style="padding:0 0 0 12px;">
                      <span style="font-size:18px;font-weight:800;color:#1e293b;letter-spacing:-.2px;display:block;">{dept_name}</span>
                    </td>
                    <td style="text-align:right;padding:0;">
                      <div style="display:inline-block;min-width:52px;padding:8px 12px;border-radius:12px;background:{dept_color['light']};border:1px solid {dept_color['border']};text-align:center;">
                        <span style="font-size:10px;opacity:.7;display:block;text-transform:uppercase;letter-spacing:.5px;color:{dept_color['base']};margin-bottom:1px;">Total</span>
                        <span style="font-size:17px;font-weight:900;color:{dept_color['base']};display:block;">{dept_total}</span>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Included Shifts -->
            <tr>
              <td colspan="2" style="padding:10px;">
                {shift_sections}
              </td>
            </tr>
          </table>
        """)

    dept_html = "".join(dept_cards)
    sent_time = now.strftime("%H:%M")
    date_str = now.strftime("%d %B %Y")
    last_updated = now.strftime("%d%b%Y / %H:%M").upper()

    # Translate active_shift_key display
    shift_display_map = {
        "Morning": "Morning Shift",
        "Afternoon": "Afternoon Shift", 
        "Night": "Night Shift"
    }
    shift_display = shift_display_map.get(active_shift_key, active_shift_key)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Duty Roster - {date_str}</title>
  <style>
    @media only screen and (max-width: 600px) {{
      .mobile-padding {{ padding: 12px !important; }}
      .mobile-font {{ font-size: 13px !important; }}
      .header-icon {{ font-size: 56px !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;background:#eef1f7;font-family:'Segoe UI',system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#eef1f7;">
    <tr>
      <td align="center" style="padding:20px 14px;">
        
        <!-- Main Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;width:100%;margin:0 auto;">
          
          <!-- Large Header with Gradient -->
          <tr>
<!-- Compact Header with Gradient -->
<tr>
  <td style="padding:0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
      style="width:100%;
             background:linear-gradient(135deg,#1e40af 0%,#1976d2 50%,#0ea5e9 100%);
             border-radius:20px 20px 0 0;
             overflow:hidden;
             box-shadow:0 8px 26px rgba(30,64,175,.25);
             position:relative;">
      <tr>
        <td style="padding:18px 18px;text-align:center;position:relative;">

          <!-- Decorative circles -->
          <div style="position:absolute;top:-50px;right:-60px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.08);"></div>
          <div style="position:absolute;bottom:-70px;left:-50px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.06);"></div>

          <!-- Icon -->
          <div class="header-icon"
               style="font-size:40px;margin-bottom:6px;position:relative;z-index:1;">📋</div>

          <!-- Title -->
          <h1 style="margin:0;
                     font-size:22px;
                     font-weight:800;
                     color:#ffffff;
                     letter-spacing:-.4px;
                     position:relative;
                     z-index:1;">
            Duty Roster
          </h1>

          <!-- Active Shift -->
          <div style="margin-top:8px;
                      display:inline-block;
                      background:rgba(255,255,255,.22);
                      padding:6px 16px;
                      border-radius:18px;
                      font-size:13px;
                      font-weight:700;
                      color:#ffffff;
                      letter-spacing:.3px;
                      position:relative;
                      z-index:1;">
            {shift_icon} {shift_display}
          </div>

          <!-- Date -->
          <div style="margin-top:6px;
                      display:inline-block;
                      background:rgba(255,255,255,.16);
                      padding:5px 14px;
                      border-radius:16px;
                      font-size:12px;
                      font-weight:600;
                      color:#ffffff;
                      letter-spacing:.2px;
                      position:relative;
                      z-index:1;">
            📅 {date_str}
          </div>

        </td>
      </tr>
    </table>
  </td>
</tr>

          <!-- Summary Stats -->
          <tr>
            <td style="padding:0 14px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:18px;">
                <tr>
                  <td style="width:50%;padding-right:6px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#fff;border:1px solid rgba(15,23,42,.10);border-radius:16px;box-shadow:0 3px 12px rgba(15,23,42,.07);">
                      <tr>
                        <td style="padding:16px;text-align:center;">
                          <div style="font-size:28px;font-weight:900;color:#1e40af;margin-bottom:4px;">{total_employees}</div>
                          <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px;">Employees</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="width:50%;padding-left:6px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#fff;border:1px solid rgba(15,23,42,.10);border-radius:16px;box-shadow:0 3px 12px rgba(15,23,42,.07);">
                      <tr>
                        <td style="padding:16px;text-align:center;">
                          <div style="font-size:28px;font-weight:900;color:#059669;margin-bottom:4px;">{depts_with_employees}</div>
                          <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px;">Departments</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Department Cards with ALL Shifts -->
          <tr>
            <td style="padding:0 14px;">
              {dept_html}
            </td>
          </tr>

          <!-- Call to Action Buttons -->
          <tr>
            <td style="padding:22px 14px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="padding:0 7px 0 0;">
                    <a href="{pages_base}/now/" style="display:inline-block;padding:15px 30px;border-radius:16px;background:linear-gradient(135deg,#1e40af,#1976d2);color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;box-shadow:0 6px 22px rgba(30,64,175,.35);white-space:nowrap;">
                      🔄 Refresh Now
                    </a>
                  </td>
                  <td style="padding:0 0 0 7px;">
                    <a href="{pages_base}/" style="display:inline-block;padding:15px 30px;border-radius:16px;background:linear-gradient(135deg,#0ea5e9,#06b6d4);color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;box-shadow:0 6px 22px rgba(14,165,233,.35);white-space:nowrap;">
                      📋 View Full Roster
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 14px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#fff;border-radius:0 0 20px 20px;border:1px solid rgba(15,23,42,.08);border-top:none;">
                <tr>
                  <td style="padding:18px;text-align:center;color:#94a3b8;font-size:13px;line-height:1.9;">
                    <strong style="color:#475569;">Last Updated:</strong> <strong style="color:#1e40af;">{last_updated}</strong>
                    <br>
                    Total on duty: <strong style="color:#64748b;">{total_employees} employees</strong> across <strong style="color:#64748b;">{depts_with_employees} departments</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>"""




# =========================
# Main
# =========================
def main():
    parser = argparse.ArgumentParser(description='Generate roster pages and send email')
    parser.add_argument('--date', help='Override roster date (YYYY-MM-DD)')
    parser.add_argument('--no-email', action='store_true', help='Generate pages only, do not send email')
    parser.add_argument('--excel-file', help='Use local Excel file instead of EXCEL_URL download')
    parser.add_argument('--source-name', help='Optional source filename to display and month-detect when using --excel-file')
    args = parser.parse_args()

    now = datetime.now(TZ)
    if args.date:
        try:
            y, m, d = [int(x) for x in args.date.strip().split('-')]
            now = datetime(y, m, d, now.hour, now.minute, tzinfo=TZ)
        except Exception:
            raise RuntimeError('Invalid --date format. Use YYYY-MM-DD')

    today_dow = (now.weekday() + 1) % 7
    today_day = now.day
    active_group = current_shift_key(now)

    # pages_base - cleanup
    pages_base_raw = PAGES_BASE_URL or infer_pages_base_url()
    pages_base = pages_base_raw.rstrip("/")
    if pages_base.endswith("/now"):
        pages_base = pages_base[:-4]

    # ─────────────────────────────────────────────────────────────
    # FIX #1: تحميل Excel - عند الفشل نكمل بالكاش (لا نخرج)
    # ─────────────────────────────────────────────────────────────
    data = None
    if args.excel_file:
        with open(args.excel_file, "rb") as f:
            data = f.read()
        print(f"Using local Excel file: {args.excel_file}")
    elif EXCEL_URL:
        try:
            data = download_excel(EXCEL_URL)
            print("✅ Excel downloaded successfully")
        except Exception as e:
            print(f"WARNING: Could not download Excel: {e}")
            print("Will attempt to use cached rosters...")
    else:
        print("⚠️ EXCEL_URL missing; using cached rosters only.")

    # ─────────────────────────────────────────────────────────────
    # FIX #2: كل هذا الكود الآن خارج الـ except - يعمل دائماً
    # ─────────────────────────────────────────────────────────────

    # قراءة اسم الملف واستخراج الشهر
    source_name = (args.source_name or "").strip() or get_source_name()
    incoming_key = month_key_from_filename(source_name) if source_name else None
    print(f"📄 Source file: {source_name}")
    print(f"📅 Detected month: {incoming_key or 'unknown'}")

    # FIX #3: حفظ في الكاش فقط إذا نجح التحميل
    if data and incoming_key:
        xlsx_path, meta_path = cache_paths(incoming_key)
        try:
            write_bytes(xlsx_path, data)
            write_json(meta_path, {
                "month_key": incoming_key,
                "original_filename": source_name,
                "downloaded_at": datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S %Z"),
            })
            print(f"✅ Cached roster: {xlsx_path}")
        except Exception as e:
            print(f"WARNING: failed caching roster: {e}")
    elif not incoming_key:
        print("⚠️ Could not detect month from filename; cache skipped for this run.")

    # حساب الأشهر الثلاثة
    prev_y, prev_m = add_months(now.year, now.month, -1)
    next_y, next_m = add_months(now.year, now.month, +1)

    prev_key = f"{prev_y:04d}-{prev_m:02d}"
    curr_key = f"{now.year:04d}-{now.month:02d}"
    next_key = f"{next_y:04d}-{next_m:02d}"

    # نطاق الـ date picker: من أول الشهر السابق إلى آخر الشهر القادم
    min_date = f"{prev_y:04d}-{prev_m:02d}-01"
    max_date = f"{next_y:04d}-{next_m:02d}-{calendar.monthrange(next_y, next_m)[1]:02d}"

    print(f"📅 Month range: {prev_key} → {curr_key} → {next_key}")

    # تحميل الكاش لكل شهر
    wb_prev = try_load_cached_workbook(prev_key)
    wb_curr = try_load_cached_workbook(curr_key)
    wb_next = try_load_cached_workbook(next_key)

    # FIX #4: استخدام البيانات المحملة لتعبئة الكاش الناقص - workbook واحد فقط
    if data:
        wb_data = load_workbook(BytesIO(data), data_only=True)
        if wb_prev is None and incoming_key == prev_key:
            wb_prev = wb_data
            print(f"✅ Using downloaded data for {prev_key}")
        elif wb_curr is None and incoming_key == curr_key:
            wb_curr = wb_data
            print(f"✅ Using downloaded data for {curr_key}")
        elif wb_next is None and incoming_key == next_key:
            wb_next = wb_data
            print(f"✅ Using downloaded data for {next_key}")

    print(f"📦 Cache status: prev={'✅' if wb_prev else '❌'} | curr={'✅' if wb_curr else '❌'} | next={'✅' if wb_next else '❌'}")

    # توليد صفحات الأشهر الثلاثة
    generate_date_pages_for_month(
        wb_prev, prev_y, prev_m, pages_base,
        source_name=cached_source_name(prev_key) or source_name,
        min_date=min_date, max_date=max_date
    )
    generate_date_pages_for_month(
        wb_curr, now.year, now.month, pages_base,
        source_name=cached_source_name(curr_key) or source_name,
        min_date=min_date, max_date=max_date
    )
    generate_date_pages_for_month(
        wb_next, next_y, next_m, pages_base,
        source_name=cached_source_name(next_key) or source_name,
        min_date=min_date, max_date=max_date
    )

    # الصفحة الرئيسية تستخدم الشهر الحالي
    wb = wb_curr

    # ─────────────────────────────────────────────────────────────
    # من هنا: توليد الصفحة الرئيسية docs/index.html و docs/now/
    # ─────────────────────────────────────────────────────────────
    if wb is None:
        os.makedirs("docs", exist_ok=True)
        os.makedirs("docs/now", exist_ok=True)

        try:
            date_label = now.strftime("%-d %B %Y")
        except Exception:
            date_label = now.strftime("%d %B %Y")

        iso_date = now.strftime("%Y-%m-%d")
        last_updated = now.strftime("%d%b%Y / %H:%M").upper()

        notice_html = (
            "<div class='deptCard' style='padding:14px;border:1px dashed rgba(15,23,42,.20);background:#fff;'>"
            "⚠️ لا يوجد روستر للشهر الحالي محفوظ بعد. (قد يكون الروستر الجديد للشهر القادم وصل مبكرًا)</div>"
        )

        html_full = page_shell_html(
            date_label=date_label,
            iso_date=iso_date,
            employees_total=0,
            departments_total=0,
            dept_cards_html="",
            cta_url=f"{pages_base}/now/",
            sent_time=now.strftime("%H:%M"),
            source_name=cached_source_name(curr_key) or source_name,
            last_updated=last_updated,
            is_now_page=False,
            min_date=min_date,
            max_date=max_date,
            notice_html=notice_html,
        )

        html_now = page_shell_html(
            date_label=date_label,
            iso_date=iso_date,
            employees_total=0,
            departments_total=0,
            dept_cards_html="",
            cta_url=f"{pages_base}/",
            sent_time=now.strftime("%H:%M"),
            source_name=cached_source_name(curr_key) or source_name,
            last_updated=last_updated,
            is_now_page=True,
            min_date=min_date,
            max_date=max_date,
            notice_html=notice_html,
        )

        with open("docs/index.html", "w", encoding="utf-8") as f:
            f.write(html_full)

        with open("docs/now/index.html", "w", encoding="utf-8") as f:
            f.write(html_now)

        print("⚠️ Skipping email (no current-month roster workbook).")
        return


    dept_cards_all = []
    dept_cards_now = []
    all_shifts_by_dept = []
    employees_total_all = 0
    employees_total_now = 0
    depts_count = 0

    for idx, (sheet_name, dept_name) in enumerate(DEPARTMENTS):
        if sheet_name not in wb.sheetnames:
            continue

        ws = wb[sheet_name]
        days_row, date_row = find_days_and_dates_rows(ws)
        day_col = find_day_col(ws, days_row, date_row, today_dow, today_day)

        if not (days_row and date_row and day_col):
            continue

        start_row = date_row + 1
        emp_col = find_employee_col(ws, start_row=start_row)
        daynum_to_col = get_daynum_to_col(ws, date_row)
        if not emp_col:
            continue

        buckets = {k: [] for k in GROUP_ORDER}
        buckets_now = {k: [] for k in GROUP_ORDER}

        for r in range(start_row, ws.max_row + 1):
            name = norm(ws.cell(row=r, column=emp_col).value)
            if not looks_like_employee_name(name):
                continue

            daynum_to_raw = {dn: norm(ws.cell(row=r, column=col).value) for dn, col in daynum_to_col.items()}

            raw = daynum_to_raw.get(today_day, "")
            if not looks_like_shift_code(raw):
                continue

            label, grp = map_shift(raw)

            up = norm(raw).upper()
            # إضافة نطاق التواريخ FROM TO للإجازات السنوية
            if grp == "Annual Leave":
                if up == "AL" or "ANNUAL LEAVE" in up or up == "LV":
                    suf = range_suffix_for_day(today_day, daynum_to_raw, "AL")
                    if suf:
                        label = suf  # فقط النطاق الزمني بدون اسم الإجازة
            # إضافة نطاق التواريخ FROM TO للإجازات المرضية
            elif grp == "Sick Leave":
                if up == "SL" or "SICK LEAVE" in up:
                    suf = range_suffix_for_day(today_day, daynum_to_raw, "SL")
                    if suf:
                        label = suf  # فقط النطاق الزمني بدون اسم الإجازة
            # إضافة نطاق التواريخ FROM TO للتدريب
            elif grp == "Training":
                if up == "TR" or "TRAINING" in up:
                    suf = range_suffix_for_day(today_day, daynum_to_raw, "TR")
                    if suf:
                        label = suf  # فقط النطاق الزمني بدون اسم الإجازة
            
            buckets.setdefault(grp, []).append({"name": name, "shift": label})

            if grp == active_group:
                buckets_now.setdefault(grp, []).append({"name": name, "shift": label})

        all_shifts_by_dept.append({"dept": dept_name, "shifts": buckets})

        if dept_name == "Unassigned":
            dept_color = UNASSIGNED_COLOR
        else:
            dept_color = DEPT_COLORS[idx % len(DEPT_COLORS)]

        open_group_full = active_group if AUTO_OPEN_ACTIVE_SHIFT_IN_FULL else None
        card_all = dept_card_html(dept_name, dept_color, buckets, open_group=open_group_full)
        dept_cards_all.append(card_all)

        # صفحة /now/ تحتوي على كل الورديات (سيتم الفلترة بـ JavaScript)
        card_now = dept_card_html(dept_name, dept_color, buckets, open_group=active_group)
        dept_cards_now.append(card_now)

        employees_total_all += sum(len(buckets.get(g, [])) for g in GROUP_ORDER)
        # حساب فقط الوردية الحالية لـ total في /now/
        employees_total_now += sum(len(buckets.get(g, [])) for g in [active_group, "Off Day", "Annual Leave", "Sick Leave", "Training", "Standby", "Other"])

        depts_count += 1

    os.makedirs("docs", exist_ok=True)
    os.makedirs("docs/now", exist_ok=True)

    try:
        date_label = now.strftime("%-d %B %Y")
    except Exception:
        date_label = now.strftime("%d %B %Y")

    iso_date = now.strftime("%Y-%m-%d")
    sent_time = now.strftime("%H:%M")
    last_updated = now.strftime("%d%b%Y / %H:%M").upper()

    full_url = f"{pages_base}/"
    now_url = f"{pages_base}/now/"

    html_full = page_shell_html(
        date_label=date_label,
        iso_date=iso_date,
        employees_total=employees_total_all,
        departments_total=depts_count,
        dept_cards_html="\n".join(dept_cards_all),
        cta_url=now_url,
        sent_time=sent_time,
        source_name=cached_source_name(curr_key) or source_name,
        last_updated=last_updated,
        min_date=min_date,
        max_date=max_date,
        is_now_page=False,
    )
    html_now = page_shell_html(
        date_label=date_label,
        iso_date=iso_date,
        employees_total=employees_total_now,
        departments_total=depts_count,
        dept_cards_html="\n".join(dept_cards_now),
        cta_url=full_url,
        sent_time=sent_time,
        source_name=cached_source_name(curr_key) or source_name,
        last_updated=last_updated,
        min_date=min_date,
        max_date=max_date,
        is_now_page=True,
    )

    with open("docs/index.html", "w", encoding="utf-8") as f:
        f.write(html_full)

    with open("docs/now/index.html", "w", encoding="utf-8") as f:
        f.write(html_now)

    # Write source name for my-schedules page to display
    _src = cached_source_name(curr_key) or source_name
    if _src:
        os.makedirs("docs/my-schedules", exist_ok=True)
        with open("docs/my-schedules/source.txt", "w", encoding="utf-8") as f:
            f.write(_src)

    # Email: send ONLY active shift + matching Standby
    if args.no_email:
        print("ℹ️ Email disabled via --no-email")
    else:
        subject = f"Duty Roster — {now.strftime('%d %B %Y')} — {active_group} Active"
        email_html = build_pretty_email_html(active_group, now, all_shifts_by_dept, pages_base)
        send_email(subject, email_html)


if __name__ == "__main__":
    main()