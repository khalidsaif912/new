"""September → October leavers stay pending until confirmation."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_compare_sep_oct_stages_pending_not_alumni():
    script = ROOT / "scripts" / "compare_roster_alumni.py"
    subprocess.check_call([sys.executable, str(script), "--old", "2026-09", "--new", "2026-10"], cwd=ROOT)

    data = json.loads((ROOT / "docs" / "tools" / "leavers" / "data.json").read_text(encoding="utf-8"))
    alumni = json.loads((ROOT / "docs" / "alumni.json").read_text(encoding="utf-8"))
    alumni_ids = {str(p.get("id")) for p in (alumni.get("people") or []) if p.get("id")}

    assert data["compareFrom"] == "2026-09"
    assert data["compareTo"] == "2026-10"
    candidates = data.get("candidates") or []
    assert candidates, "expected Sep→Oct leavers"
    pending = [c for c in candidates if not c.get("inAlumni")]
    assert pending, "expected pending confirmation list"
    for c in pending:
        assert str(c["id"]) not in alumni_ids
        assert c["compareFrom"] == "2026-09"
        assert c["compareTo"] == "2026-10"

    # Static alumni.json must not be silently expanded by the compare script.
    before = alumni_ids
    after = {str(p.get("id")) for p in (alumni.get("people") or []) if p.get("id")}
    assert before == after
