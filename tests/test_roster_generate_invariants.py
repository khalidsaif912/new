#!/usr/bin/env python3
"""Invariants that must survive roster HTML generation."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_inventory_ids_are_pulled_from_source_departments():
    from generate_and_send import (
        INVENTORY_DEPT_NAME,
        INVENTORY_EMP_IDS,
        insert_card_after_export_operators,
        is_inventory_employee,
        take_inventory_employees,
    )

    assert INVENTORY_EMP_IDS == frozenset({"82592", "990737"})
    assert is_inventory_employee("Mohamed Al Subhi - 82592 (Inventory)")
    assert is_inventory_employee("Said Al Amri - 990737")
    assert not is_inventory_employee("Mohamed Al Amri - 81224")

    buckets = {
        "Morning": [{"name": "Said Al Amri - 990737", "shift": "MN06"}],
        "Afternoon": [{"name": "Mohamed Al Subhi - 82592 (Inventory)", "shift": "MN12"}],
        "Night": [{"name": "Ali Al Farsi - 81393", "shift": "NN21"}],
    }
    taken = take_inventory_employees(buckets)
    assert [e["name"] for e in taken["Morning"]] == ["Said Al Amri - 990737"]
    assert [e["name"] for e in taken["Afternoon"]] == ["Mohamed Al Subhi - 82592 (Inventory)"]
    assert buckets["Morning"] == []
    assert buckets["Afternoon"] == []
    assert [e["name"] for e in buckets["Night"]] == ["Ali Al Farsi - 81393"]

    cards = ["<div class='deptTitle'>Export Operators</div>", "<div class='deptTitle'>Officers</div>"]
    out = insert_card_after_export_operators(cards, f"<div class='deptTitle'>{INVENTORY_DEPT_NAME}</div>")
    assert [c for c in out if "Inventory" in c or "Export Operators" in c or "Officers" in c]
    assert out[1].find("Inventory") != -1


def test_generator_never_bakes_open_shift_from_clock():
    gen = (ROOT / "generate_and_send.py").read_text(encoding="utf-8")
    settings = (ROOT / "roster_app" / "settings.py").read_text(encoding="utf-8")
    assert "AUTO_OPEN_ACTIVE_SHIFT_IN_FULL" not in settings
    assert "AUTO_OPEN_ACTIVE_SHIFT_IN_FULL" not in gen
    assert "open_group=active_group" not in gen
    assert "open_group=open_group_full" not in gen
    assert "|| shiftCards[0]" not in gen
    assert "open-current-shift.js" in gen


def test_shared_shift_script_has_no_morning_fallback():
    js = (ROOT / "docs" / "open-current-shift.js").read_text(encoding="utf-8")
    snippets = (ROOT / "scripts" / "roster_cta_snippets.py").read_text(encoding="utf-8")
    assert "shiftCards[0]" not in js
    assert "shifts[0]" not in js
    assert "Asia/Muscat" in js
    assert "open-current-shift.js?v=20260908s" in snippets
    assert snippets.count("open-current-shift.js?v=20260908s") == 2


def test_export_generator_owns_split_date_banner():
    from generate_and_send import page_shell_html
    from home_date_split import assert_split_date_banner

    html = page_shell_html(
        date_label="8 September 2026",
        iso_date="2026-09-08",
        employees_total=1,
        departments_total=1,
        dept_cards_html="<div class='deptCard'></div>",
        cta_url="/now/",
        sent_time="15:00",
        is_now_page=False,
        min_date="2026-08-01",
        max_date="2026-10-31",
    )
    assert_split_date_banner(html)
    assert 'id="dateTagLabel"' not in html
    assert 'id="dateTagDay"' in html
    gen = (ROOT / "generate_and_send.py").read_text(encoding="utf-8")
    assert "DATE_SPLIT_CSS" in gen
    assert 'class="header homeDateSplit"' in gen
    assert "shutil.copy2" in gen and "docs/home.html" in gen
