"""sass-api-and-values roster, oracle and pending-decision regressions (pure node, no Sass compile)."""
from __future__ import annotations
import json
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipIf(shutil.which("node") is None, "node is required")
class SassApiInventoryTests(unittest.TestCase):
    def test_node_regressions(self):
        done = subprocess.run(["node", "scripts/sass-api-regressions.mjs"], cwd=ROOT,
                              capture_output=True, text=True, timeout=120)
        self.assertEqual(done.returncode, 0, done.stderr[-2000:])
        self.assertIn("651 api cases", done.stdout)

    def test_pending_decisions_are_open_blockers_not_exceptions(self):
        decisions = json.loads((ROOT / "compatibility/rc/sass-pending-decisions.json").read_text())
        self.assertEqual(
            [d["id"] for d in decisions["decisions"]],
            ["companion-bridge-appended", "cdk-forced-colors-and-overlay",
             "upstream-29870-select-disabled-placeholder", "upstream-27511-snack-bar-action",
             "button-line-height-inherit", "aggregates-composite"],
        )
        for decision in decisions["decisions"]:
            self.assertEqual(decision["state"], "pending")
            self.assertTrue(decision["decision_requested"].strip())
        exceptions = ROOT / "compatibility/css-exceptions.json"
        text = exceptions.read_text()
        for decision in decisions["decisions"]:
            self.assertNotIn(decision["id"], text)


if __name__ == "__main__":
    unittest.main()
