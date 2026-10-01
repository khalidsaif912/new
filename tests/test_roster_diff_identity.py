"""Roster auto-diff must ignore cosmetic id/name fixes and keep shift deltas."""

from __future__ import annotations

import sys
from pathlib import Path

from openpyxl import Workbook

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from build_roster_diff import (  # noqa: E402
    build_diff,
    names_compatible,
    shifts_equivalent,
    shifts_fingerprint,
    stable_emp_key,
)


def _write_mini_roster(path: Path, rows: list[tuple[str, str, dict[int, str]]]) -> None:
    """rows: (emp_id_or_empty, name, {day: code})."""
    wb = Workbook()
    ws = wb.active
    ws.title = "OCTOBER 2026"
    ws.append(["JD", "Name", "SN", "SUN", "MON", "TUE"])
    for emp_id, name, shifts in rows:
        ws.append(
            [
                "CHKA",
                name,
                emp_id,
                shifts.get(1, ""),
                shifts.get(2, ""),
                shifts.get(3, ""),
            ]
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)


def test_stable_key_prefers_id_and_name_suffix() -> None:
    assert stable_emp_key("82677", "Rashid Al Shayai") == "id:82677"
    assert stable_emp_key("", "Rashid Al Shayai - 82677") == "id:82677"
    assert stable_emp_key("", "Rashid Shayai").startswith("name:")


def test_names_compatible_ignores_al_particle() -> None:
    assert names_compatible("Rashid Shayai", "Rashid Al Shayai - 82677")


def test_id_fix_does_not_invent_shift_changes(tmp_path: Path) -> None:
    old = tmp_path / "old.xlsx"
    new = tmp_path / "new.xlsx"
    shifts = {1: "OFF", 2: "MN06", 3: "AN13"}
    _write_mini_roster(old, [("", "Rashid Shayai", shifts)])
    _write_mini_roster(new, [("82677", "Rashid Al Shayai - 82677", shifts)])
    assert shifts_equivalent(old, new)
    assert build_diff(old, new) == []


def test_real_shift_change_still_detected(tmp_path: Path) -> None:
    old = tmp_path / "old.xlsx"
    new = tmp_path / "new.xlsx"
    _write_mini_roster(old, [("82677", "Rashid Al Shayai", {1: "OFF", 2: "MN06"})])
    _write_mini_roster(new, [("82677", "Rashid Al Shayai", {1: "OFF", 2: "AN13"})])
    changes = build_diff(old, new)
    assert len(changes) == 1
    assert changes[0]["v1"] == "MN06"
    assert changes[0]["v2"] == "AN13"
    assert shifts_fingerprint(old) != shifts_fingerprint(new)
