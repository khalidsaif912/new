#!/usr/bin/env python3
"""Ask roster-site repo to refresh legacy redirect pages after a successful new/docs publish."""

from __future__ import annotations

import os
import subprocess
import sys


def main() -> int:
    token = (
        os.getenv("ROSTER_SITE_SYNC_TOKEN")
        or os.getenv("GH_TOKEN")
        or os.getenv("GITHUB_TOKEN")
        or ""
    ).strip()
    if not token:
        print("No GitHub token available; skip roster-site redirect sync.")
        return 0

    repo = os.getenv("ROSTER_SITE_REPO", "khalidsaif912/roster-site")
    cmd = [
        "gh",
        "api",
        f"repos/{repo}/dispatches",
        "-f",
        "event_type=sync-redirects",
    ]
    env = os.environ.copy()
    env["GH_TOKEN"] = token
    try:
        subprocess.run(cmd, check=True, env=env, capture_output=True, text=True)
    except subprocess.CalledProcessError as exc:
        print(f"::warning::Could not trigger roster-site redirect sync: {exc.stderr or exc}")
        return 0
    print(f"Triggered roster-site redirect sync on {repo}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
