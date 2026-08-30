#!/usr/bin/env python3
"""Read&Sign is now an Apps-window tile. Delegate to sync_with_me_chip."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sync_with_me_chip import main as with_me_main  # noqa: E402


def main() -> int:
    return with_me_main()


if __name__ == "__main__":
    raise SystemExit(main())
