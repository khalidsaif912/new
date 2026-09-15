"""Forced CI events must regenerate even when the Excel filename is unchanged."""

import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from ci_roster_change_gate import is_forced_event  # noqa: E402


class ForcedEventTests(unittest.TestCase):
    def test_schedule_is_not_forced(self):
        self.assertFalse(is_forced_event("schedule"))

    def test_manual_workflow_dispatch_is_forced(self):
        self.assertTrue(is_forced_event("workflow_dispatch"))

    def test_power_automate_repository_dispatch_is_forced(self):
        self.assertTrue(is_forced_event("repository_dispatch"))

    def test_reads_github_event_name_env(self):
        old = os.environ.get("GITHUB_EVENT_NAME")
        os.environ["GITHUB_EVENT_NAME"] = "repository_dispatch"
        try:
            self.assertTrue(is_forced_event())
        finally:
            if old is None:
                os.environ.pop("GITHUB_EVENT_NAME", None)
            else:
                os.environ["GITHUB_EVENT_NAME"] = old


if __name__ == "__main__":
    unittest.main()
