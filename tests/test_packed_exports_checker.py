"""Regressions for the shipped packed-exports checker and the existing evaluator.

The checker tests use minimal packages. They do not qualify a release artifact.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests'))
sys.path.insert(0, str(ROOT / 'scripts'))
from test_rc_acceptance import CompleteFixture


class PackedExportsCheckerTests(unittest.TestCase):
    def test_shipped_checker_rejects_domain_and_identity_mutations(self):
        result = subprocess.run(
            ["node", "scripts/packed-exports-regressions.mjs"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("packed-exports regressions passed", result.stdout)

    def test_omitted_case_cannot_enter_complete_checks(self):
        with tempfile.TemporaryDirectory(prefix="packed-exports-eval-") as temp:
            fixture = CompleteFixture(Path(temp))
            report = fixture.reports["packed-exports"]
            report["case_results"] = report["case_results"][:-1]
            fixture.save_report("packed-exports")
            result = fixture.evaluate()
        self.assertNotIn("packed-exports", result["complete_checks"])
        self.assertIn("packed-exports", result["incomplete_checks"])
        self.assertEqual(result["automatic_product_result"], "incomplete")
        self.assertEqual(result["engineering_admission"], "not-decided")
        self.assertEqual(result["g_gates_claimed"], [])


if __name__ == "__main__":
    unittest.main()
