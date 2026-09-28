# -*- coding: utf-8 -*-
"""Compatibility wrapper — prefer scripts/compare_roster_alumni.py."""
from __future__ import annotations

import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).resolve().parent / "scripts" / "compare_roster_alumni.py"), run_name="__main__")
