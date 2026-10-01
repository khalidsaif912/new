"""Import JD letter-codes merge into organized section titles."""

from __future__ import annotations

from generate_and_send_import import dept_display_name


def test_prefix_groups_merge_letter_codes() -> None:
    assert dept_display_name("CHKA") == "Import Checkers"
    assert dept_display_name("CHKE") == "Import Checkers"
    assert dept_display_name("DOCA") == "Documentation"
    assert dept_display_name("DOCE") == "Documentation"
    assert dept_display_name("FLTA") == "Flight Dispatch"
    assert dept_display_name("FLTI") == "Flight Dispatch"
    assert dept_display_name("OPTA") == "Import Operators"
    assert dept_display_name("RELA") == "Release Control"
    assert dept_display_name("SUPA") == "Supervisors"
    assert dept_display_name("SUPV") == "Supervisors"


def test_unknown_code_passthrough() -> None:
    assert dept_display_name("XYZ1") == "XYZ1"
