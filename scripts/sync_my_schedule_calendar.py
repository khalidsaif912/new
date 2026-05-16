#!/usr/bin/env python3
"""Sync calendar + legend styles/JS between export and import my-schedule pages."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

CAL_CSS = (ROOT / "templates" / "my_schedule_calendar_styles.css").read_text(encoding="utf-8")

LEGEND_JS = r"""
  var COLORS={
    Morning:{dot:'#d29922'},Afternoon:{dot:'#db6d28'},Night:{dot:'#bc8cff'},
    'Off Day':{dot:'#8b949e'},'Annual Leave':{dot:'#3fb950'},'Sick Leave':{dot:'#3fb950'},
    Training:{dot:'#58a6ff'},Standby:{dot:'#ff7b72'},Other:{dot:'#8b949e'}
  };
  function buildLegendHTML(){
    var order=['Morning','Afternoon','Night','Off Day','Annual Leave','Sick Leave','Training','Standby','Other'];
    var leg=(T[lang]&&T[lang].legend)||{};
    return '<motion class="legend-card"><div class="section-label">'+esc(t('legendTitle'))+'</div><motion class="legend-grid">'+order.map(function(k){
      var dot=(COLORS[k]||COLORS.Other).dot;
      return '<span class="leg-item"><span class="l-dot" style="background:'+dot+'"></span>'+esc(leg[k]||k)+'</span>';
    }).join('')+'</div></div>';
  }
""".replace("<motion class", "<div class").replace("<motion class", "<motion class").replace(
    "<motion class=\"legend-grid\">", '<div class="legend-grid">'
)

T_EN_LEGEND = (
    "legendTitle:'Legend',"
    "legend:{Morning:'Morning',Afternoon:'Afternoon',Night:'Night',"
    "'Off Day':'Day Off','Annual Leave':'Annual Leave','Sick Leave':'Sick Leave',"
    "Training:'Training',Standby:'Standby',Other:'Other'},"
)
T_AR_LEGEND = (
    "legendTitle:'الدليل',"
    "legend:{Morning:'صباحي',Afternoon:'مسائي',Night:'ليلي',"
    "'Off Day':'إجازة','Annual Leave':'سنوية','Sick Leave':'مرضية',"
    "Training:'تدريب',Standby:'احتياطي',Other:'أخرى'},"
)

CAL_START = "    .cal-card{"
CAL_END_MARKERS = (
    "    /* ── LEGEND ── */",
    "    .actions-card{",
    "    .stats-modal-overlay{",
)


def replace_calendar_block(text: str) -> str:
    start = text.find(CAL_START)
    if start < 0:
        return text
    end = len(text)
    for marker in CAL_END_MARKERS:
        pos = text.find(marker, start + 10)
        if pos > start:
            end = min(end, pos)
    return text[:start] + CAL_CSS + text[end:]


def patch_legend_js(text: str) -> str:
    if "function buildLegendHTML" not in text:
        anchor = "  function shiftClass(g){"
        if anchor in text:
            text = text.replace(anchor, LEGEND_JS + anchor, 1)
    if "legendTitle:" not in text:
        text = text.replace(
            "months:['January','February'",
            T_EN_LEGEND + "months:['January','February'",
            1,
        )
        text = text.replace(
            "months:['يناير','فبراير'",
            T_AR_LEGEND + "months:['يناير','فبراير'",
            1,
        )
    if "buildLegendHTML()" in text:
        return text
    # Export template literal
    text = re.sub(
        r"(<div class=\"cal-body\">\$\{cells\}</div>\s*</div>\s*)\n(\s*</motion>\s*\n\s*<!-- Actions -->)",
        r"\1\n        ${buildLegendHTML()}\n\2",
        text,
        count=1,
    )
  text = re.sub(
        r"(<div class=\"cal-body\">\$\{cells\}</motion>\s*</motion>\s*)\n(\s*</motion>\s*\n\s*<!-- Actions -->)",
        r"\1\n        ${buildLegendHTML()}\n\2",
        text,
        count=1,
    )
    # Import minified
    text = text.replace(
        "'</div></div></motion></motion></motion><div class=\"actions-card\">'",
        "'</div></div></div>'+buildLegendHTML()+'</div><div class=\"actions-card\">'",
        1,
    )
    text = text.replace(
        "'</div></div></div></div><div class=\"actions-card\">'",
        "'</motion></motion></motion>'+buildLegendHTML()+'</motion><div class=\"actions-card\">'",
        1,
    )
    return text.replace("<motion", "<div").replace("</motion>", "</motion>").replace(
        "</motion>", "</div>"
    )


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text
    text = replace_calendar_block(text)
    text = patch_legend_js(text)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> int:
    from scripts.sync_import_my_schedule_page import main as sync_import_page

    paths = [
        ROOT / "templates" / "import_my_schedule.html",
        ROOT / "docs" / "my-schedules" / "index.html",
    ]
    n = 0
    for p in paths:
        if p.is_file() and patch_file(p):
            print("patched", p.relative_to(ROOT))
            n += 1
    sync_import_page()
    print("synced docs/import/my-schedules from template")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
