"""OFF-cycle inference for unpublished future months."""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from project_off_months import detect_cycle, project_off_days  # noqa: E402


def test_prefer_5w3off_over_false_7day_when_sep_switched():
    # Sep-like: OO + (WWWWW OOO) x3 + WWWW — must not pick 4W+3OFF.
    sep = (
        [1, 1]
        + ([0, 0, 0, 0, 0, 1, 1, 1] * 3)
        + [0, 0, 0, 0]
    )
    assert len(sep) == 30
    cycle, period = detect_cycle(sep)
    assert period == 8
    assert sum(cycle) == 3
    assert period - sum(cycle) == 5
    proj = project_off_days(
        date(2026, 9, 30), cycle, ["2026-10"], style="export"
    )["2026-10"]
    assert [r["day"] for r in proj] == [2, 3, 4, 10, 11, 12, 18, 19, 20, 26, 27, 28]


def test_stable_5w2off_stays_period_7():
    seq = ([0, 0, 0, 0, 0, 1, 1] * 4) + [0, 0]  # 30 days
    cycle, period = detect_cycle(seq)
    assert period == 7
    assert sum(cycle) == 2


def test_partial_month_ending_on_off_block_continues_5w3off():
    # Mid-month cut after WWWW OOO WWWWW OOO
    partial = [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1]
    cycle, period = detect_cycle(partial)
    assert period == 8
    assert sum(cycle) == 3
    # Next day after final OOO is work.
    assert cycle[0] == 0
