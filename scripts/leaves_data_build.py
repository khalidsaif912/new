"""Rebuild docs/leaves/leaves-data.json from the schedule JSON files.

Called by both roster generators right after schedules are rewritten so the
Leaves page can never drift out of sync with the published roster.
"""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path


def rebuild(repo_root: str | Path, attempts: int = 3) -> bool:
    """Run docs/leaves/generate_leaves.py and report whether it succeeded."""
    root = Path(repo_root).resolve()
    script = root / "docs" / "leaves" / "generate_leaves.py"
    if not script.exists():
        print(f"WARNING: leaves generator not found at {script}")
        return False

    for attempt in range(1, attempts + 1):
        try:
            result = subprocess.run(
                [sys.executable, str(script)],
                cwd=str(root),
                capture_output=True,
                text=True,
            )
        except OSError as exc:
            print(f"WARNING: leaves data rebuild failed: {exc}")
            return False

        if result.returncode == 0:
            out = (result.stdout or "").strip()
            if out:
                print(out.splitlines()[-1])
            return True

        if attempt == attempts:
            tail = ((result.stderr or "") + (result.stdout or "")).strip().splitlines()
            print(f"WARNING: leaves data rebuild failed (exit {result.returncode})")
            if tail:
                print(tail[-1][:400])
            return False

        time.sleep(1.0)

    return False
