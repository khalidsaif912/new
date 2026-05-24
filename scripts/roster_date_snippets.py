"""Date tag icon HTML/CSS/JS snippets for roster header."""

from __future__ import annotations

import re

SVG_DATE_TAG_ICON = (
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" '
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
    'aria-hidden="true">'
    '<rect x="3" y="4" width="18" height="18" rx="2"/>'
    '<path d="M16 2v4M8 2v4M3 10h18"/>'
    '</svg>'
)


def date_tag_html(label: str) -> str:
    return (
        '<label class="dateTag" id="dateTag" for="datePicker">'
        f'<span class="dateTag-icon" aria-hidden="true">{SVG_DATE_TAG_ICON}</span>'
        f'<span class="dateTag-label" id="dateTagLabel">{label}</span>'
        '</label>'
    )


DATE_TAG_TEXT_SHADOW = (
    "0 1px 2px rgba(0,0,0,.72),"
    "0 0 5px rgba(0,0,0,.38),"
    "0 0 1px rgba(255,255,255,.5)"
)
DATE_TAG_ICON_FILTER = (
    "drop-shadow(0 1px 1px rgba(0,0,0,.7)) "
    "drop-shadow(0 0 2px rgba(255,255,255,.45))"
)

DATE_TAG_CSS_PATCH = f"""    .header .dateTag {{
      display:inline-flex;
      align-items:center;
      gap:8px;
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
      position:relative;
      z-index:3;
      pointer-events:auto;
      color:#fff;
      text-shadow:{DATE_TAG_TEXT_SHADOW};
    }}
    .dateTag-icon {{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      flex-shrink:0;
      line-height:0;
      color:#fff;
      pointer-events:none;
    }}
    .dateTag-icon svg {{
      display:block;
      width:16px;
      height:16px;
      pointer-events:none;
      filter:{DATE_TAG_ICON_FILTER};
    }}
    .dateTag-label {{
      line-height:1.2;
      pointer-events:none;
      text-shadow:{DATE_TAG_TEXT_SHADOW};
    }}"""

DATE_TAG_CSS_RE = re.compile(
    r"    \.header \.dateTag \{[^}]+\}",
    re.DOTALL,
)

DATE_TAG_SPAN_RE = re.compile(
    r'<span class="dateTag" id="dateTag">📅\s*([^<]+)</span>',
    re.IGNORECASE,
)

SYNC_HEADER_JS_REPLACEMENTS = (
    (
        re.compile(r"if \(tag\) tag\.textContent = '📅 ' \+ formatIsoLabel\(iso\);"),
        """if (tag) {
    var dateLbl = document.getElementById('dateTagLabel');
    var dateText = formatIsoLabel(iso);
    if (dateLbl) dateLbl.textContent = dateText;
    else tag.textContent = dateText;
  }""",
    ),
    (
        re.compile(r"if \(tag\) tag\.textContent = '📅 ' \+ toLabel\(picker\.value\);"),
        """if (tag) {
    var dateLbl = document.getElementById('dateTagLabel');
    var dateText = toLabel(picker.value);
    if (dateLbl) dateLbl.textContent = dateText;
    else tag.textContent = dateText;
  }""",
    ),
    (
        re.compile(
            r"if \(picker\.value\) tag\.textContent = '📅 ' \+ toLabel\(picker\.value\);"
        ),
        """if (picker.value) {
      var dateLbl = document.getElementById('dateTagLabel');
      var dateText = toLabel(picker.value);
      if (dateLbl) dateLbl.textContent = dateText;
      else tag.textContent = dateText;
    }""",
    ),
    (
        re.compile(
            r"if \(picker\.value\) \{\s*tag\.textContent = '📅 ' \+ toLabel\(picker\.value\);\s*\}"
        ),
        """if (picker.value) {
      var dateLbl = document.getElementById('dateTagLabel');
      var dateText = toLabel(picker.value);
      if (dateLbl) dateLbl.textContent = dateText;
      else tag.textContent = dateText;
    }""",
    ),
    (
        re.compile(r"tag\.textContent = '📅 ' \+ toLabel\(picker\.value\);"),
        """var dateLbl = document.getElementById('dateTagLabel');
      var dateText = toLabel(picker.value);
      if (dateLbl) dateLbl.textContent = dateText;
      else tag.textContent = dateText;""",
    ),
)

IMPORT_PICKER_CHANGE_BROKEN = """    picker.addEventListener('change', function() {
      if (picker.value) {
      var dateLbl = document.getElementById('dateTagLabel');
      var dateText = toLabel(picker.value);
      if (dateLbl) dateLbl.textContent = dateText;
      else tag.textContent = dateText;
    }
    });"""

IMPORT_PICKER_CHANGE_FIXED = """    picker.addEventListener('change', function() {
      if (picker.value) {
        var dateLbl = document.getElementById('dateTagLabel');
        var dateText = toLabel(picker.value);
        if (dateLbl) dateLbl.textContent = dateText;
        else tag.textContent = dateText;
      }
    });"""
