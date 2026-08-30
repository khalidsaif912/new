#!/usr/bin/env python3
"""Tests for the With-me chip swap and roster HTML parsing used by the page."""

from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from sync_with_me_chip import patch_apps_ver, patch_chip  # noqa: E402


SAMPLE = """<!doctype html>
<html><head><style>
    a.summaryChip.diffChip:hover { box-shadow:0 8px 20px rgba(239,68,68,.18); }
    a.summaryChip.readSignChip .chipVal { color:#0f766e; }
    a.summaryChip.readSignChip:hover { box-shadow:0 8px 20px rgba(15,118,110,.18); }
</style></head><body>
  <div class="summaryBar">
    <a href="https://khalidsaif912.github.io/roster-site/read-and-sign/" id="readSignChipBtn" class="summaryChip readSignChip" style="text-decoration:none;">
      <div class="chipVal">x</div>
      <div class="chipLabel" data-key="readSignPage">Read&amp;Sign</div>
    </a>
    <a href="#" id="myScheduleBtn" class="summaryChip">Sched</a>
  </div>
  <script>
var T = {
  en: {
    morning2:'Morning', readSignPage:'Read&Sign',
  },
  ar: {
    morning2:'صباح', readSignPage:'إقرار',
  }
};
  document.querySelectorAll('.chipLabel').forEach(function(el) {
    var k=el.dataset.key;
    else if(k==='diffPage') el.textContent=t.diffPage;
    else if(k==='readSignPage') el.textContent=t.readSignPage;
  });
function setSummaryChipHrefs() {
  var base = getSiteRootUrl();
  var readSign = document.getElementById('readSignChipBtn');
  if (readSign) readSign.href = base + '/read-and-sign/';
  var welcome = document.getElementById('welcomeChip');
}
    addScript(root + '/site-apps.js?v=' + ver);
  </script>
</body></html>
"""

ROSTER_FRAGMENT = """
<div class="deptCard">
  <div class="deptTitle">Officers</div>
  <details class="shiftCard" data-shift="Morning">
    <div class="empRow" data-emp-name="Rodolfo Magcaling - 80235">
      <span class="empName" data-name-ar="رودولفو ماجكالينج - 80235">Rodolfo Magcaling - 80235</span>
      <span class="empStatus">ME07</span>
    </div>
    <div class="empRow" data-emp-name="Adil Al Balushi - 81392">
      <span class="empName">Adil Al Balushi - 81392</span>
    </div>
  </details>
</div>
<div class="deptCard">
  <div class="deptTitle">Supervisors</div>
  <details class="shiftCard" data-shift="Morning">
    <div class="empRow" data-emp-name="Mohamed Al Kalbani - 82593">
      <span class="empName">Mohamed Al Kalbani - 82593</span>
    </div>
  </details>
  <details class="shiftCard" data-shift="Afternoon">
    <div class="empRow" data-emp-name="Someone Else - 11111">
      <span class="empName">Someone Else - 11111</span>
    </div>
  </details>
</div>
"""


def test_patch_chip_replaces_read_sign():
    text, changed = patch_chip(SAMPLE)
    assert changed
    assert 'id="withMeChipBtn"' in text
    assert 'id="readSignChipBtn"' not in text
    assert "withMePage:'With me'" in text
    assert "withMePage:'معي'" in text
    assert "k==='withMePage'" in text
    assert "/with-me/" in text
    assert "a.summaryChip.withMeChip" in text
    # Idempotent
    text2, changed2 = patch_chip(text)
    assert not changed2
    assert text2.count('id="withMeChipBtn"') == 1


def test_patch_apps_ver():
    text, changed = patch_apps_ver(SAMPLE)
    assert changed
    assert "site-apps.js?v=20260830wm" in text
    text2, changed2 = patch_apps_ver(text)
    assert not changed2


def test_live_date_page_has_morning_officers():
    path = ROOT / "docs" / "date" / "2026-08-30" / "index.html"
    html = path.read_text(encoding="utf-8")
    assert "Rodolfo Magcaling - 80235" in html
    assert 'data-shift="Morning"' in html


def test_with_me_page_exists():
    page = ROOT / "docs" / "with-me" / "index.html"
    js = ROOT / "docs" / "with-me.js"
    assert page.is_file()
    assert js.is_file()
    html = page.read_text(encoding="utf-8")
    assert "crewTrack" in html
    assert "with-me.js" in html
    assert "empNameHeader" in html
    assert "deptHead" in html
    assert "crewSummary" in html
    assert "changeEmp" in html
    assert "border-inline-start" in html
    assert "inset-inline" in html
    assert 'html[dir="rtl"]' in html
    src = js.read_text(encoding="utf-8")
    assert "parseRosterHtml" in src
    assert "bindSwipe" in src
    assert "REST_QUOTES" in src
    assert "pickRestQuote" in src
    assert "restSubtitle" in src
    assert "اختيار موظف آخر" in src
    assert "touch-action: pan-y" in src or "touchmove" in src
    assert "passive: false" in src
    assert "flattenPeople" in src
    assert "t('titleMain')" in src
    assert "deptSplitBar" not in src
    assert "swipeHint" not in src
    assert "DEPT_META" not in src
    flatten = src[src.find("function flattenPeople") : src.find("function renderGroups")]
    assert "dept: g.dept" in flatten
    assert "status" not in flatten
    render = src[src.find("function renderGroups") : src.find("function renderDay")]
    assert "crewCard" in render
    assert "crewSummary" in render
    assert "deptHead" in render
    assert "deptGroup" in render
    assert "roleBadge" not in render
    assert "empStatus" not in render
    assert "deptSplitBar" not in html
    assert "swipeHint" not in html
    assert ".deptHead" in html
    assert "personLabel" in src
    assert "unicode-bidi: embed" in html


def test_site_apps_keeps_read_sign_in_window_not_banner():
    src = (ROOT / "docs" / "site-apps.js").read_text(encoding="utf-8")
    assert "ensureReadSignAppLink" in src
    assert "ensureWithMeChip" in src
    assert "ensureReadSignSummaryChip" not in src
    assert "siteAppsLink--readSign" in src
    assert "/with-me/" in src


def test_generator_uses_with_me_chip():
    src = (ROOT / "generate_and_send.py").read_text(encoding="utf-8")
    assert 'id="withMeChipBtn"' in src
    assert 'id="readSignChipBtn"' not in src
    assert "withMePage:'معي'" in src
    assert "sync_with_me_chip" in src
    wf = (ROOT / ".github" / "workflows" / "roster.yml").read_text(encoding="utf-8")
    assert "sync_with_me_chip.py" in wf


def test_roster_fragment_morning_only():
    # Mirror the JS parser enough to lock the sample the user quoted.
    names = re.findall(
        r'data-shift="Morning"[\s\S]*?data-emp-name="([^"]+)"',
        ROSTER_FRAGMENT,
    )
    # First match per card via a simpler walk:
    morning = re.findall(
        r'<details class="shiftCard" data-shift="Morning">([\s\S]*?)</details>',
        ROSTER_FRAGMENT,
    )
    people = []
    for block in morning:
        people.extend(re.findall(r'data-emp-name="([^"]+)"', block))
    assert people == [
        "Rodolfo Magcaling - 80235",
        "Adil Al Balushi - 81392",
        "Mohamed Al Kalbani - 82593",
    ]
    assert "Someone Else - 11111" not in people
    # Combined With-me list: department on the right, not shift code.
    depts = []
    for card in re.finditer(
        r'<div class="deptTitle">([^<]+)</div>([\s\S]*?)(?=<div class="deptCard">|\Z)',
        ROSTER_FRAGMENT,
    ):
        dept = card.group(1).strip()
        block = card.group(2)
        morning = re.search(
            r'<details class="shiftCard" data-shift="Morning">([\s\S]*?)</details>',
            block,
        )
        if not morning:
            continue
        for name in re.findall(r'data-emp-name="([^"]+)"', morning.group(1)):
            depts.append((name, dept))
    assert depts == [
        ("Rodolfo Magcaling - 80235", "Officers"),
        ("Adil Al Balushi - 81392", "Officers"),
        ("Mohamed Al Kalbani - 82593", "Supervisors"),
    ]


if __name__ == "__main__":
    test_patch_chip_replaces_read_sign()
    test_patch_apps_ver()
    test_live_date_page_has_morning_officers()
    test_with_me_page_exists()
    test_site_apps_keeps_read_sign_in_window_not_banner()
    test_generator_uses_with_me_chip()
    test_roster_fragment_morning_only()
    print("ok")
