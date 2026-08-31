#!/usr/bin/env python3
"""Former colleagues must be force-logged-out and PIN-gated like 81021."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GATE = ROOT / "docs" / "emp-id-gate.js"
ALUMNI = ROOT / "docs" / "alumni.json"
WITH_ME = ROOT / "docs" / "with-me.js"


def alumni_numeric_ids() -> list[str]:
    data = json.loads(ALUMNI.read_text(encoding="utf-8"))
    ids = []
    for person in data.get("people") or []:
        emp_id = str(person.get("id") or "").strip()
        if emp_id.isdigit():
            ids.append(emp_id)
    return ids


def test_alumni_numeric_ids_are_locked_and_pin_protected():
    gate = GATE.read_text(encoding="utf-8")
    ids = alumni_numeric_ids()
    assert ids, "alumni.json should list numeric employee IDs"
    assert "81021" in gate
    assert "'8715': true" in gate or '"8715": true' in gate
    for emp_id in ids:
        assert f"'{emp_id}'" in gate, f"{emp_id} missing from emp-id-gate.js"
    # Owner can stay logged in; alumni cannot.
    locked_block = gate.split("var LOCKED_LOGOUT_IDS")[1].split("var PROTECTED_SAVE_IDS")[0]
    assert "8715" not in locked_block
    assert "ALUMNI_IDS.forEach" in gate
    assert "LOCKED_LOGOUT_IDS[id] = true" in gate
    assert "PROTECTED_SAVE_IDS[id] = true" in gate


def test_with_me_save_requires_pin_for_protected_ids():
    js = WITH_ME.read_text(encoding="utf-8")
    assert "rosterEmpIdGate.isProtectedEmpId" in js
    assert "confirmProtectedSave" in js
    assert "checkEmpSecret" in js
    assert "if (!saveEmp(id, name, dept)) return;" in js


def test_gate_cache_bumped_on_key_pages():
    pages = [
        ROOT / "docs" / "with-me" / "index.html",
        ROOT / "docs" / "my-schedules" / "index.html",
        ROOT / "docs" / "alumni" / "index.html",
        ROOT / "scripts" / "roster_cta_snippets.py",
    ]
    for path in pages:
        text = path.read_text(encoding="utf-8")
        assert "emp-id-gate.js?v=20260831lock" in text, path
