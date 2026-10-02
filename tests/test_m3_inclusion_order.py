#!/usr/bin/env python3
"""The inclusion-order compiler emits M3 and M2 markers in the requested order."""
from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class M3InclusionOrderTests(unittest.TestCase):
    def test_workspace_compiles_both_orders(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "m3-inclusion-order.json"
            result = subprocess.run(
                ["node", "scripts/check-m3-inclusion-order.mjs", "--out", str(out)],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
            report = json.loads(out.read_text())
            self.assertEqual(report["result"], "pass")
            self.assertEqual(report["coverage"], "slice")
            self.assertEqual(report["g07_claim"], "not-passed")
            line = report["lines"][0]
            self.assertEqual(line["line"], "main")
            current = line["orders"]["current-then-legacy"]
            legacy = line["orders"]["legacy-then-current"]
            self.assertLess(current["m3_index"], current["m2_index"])
            self.assertLess(legacy["m2_index"], legacy["m3_index"])
            self.assertFalse(line["orders"]["current-only"]["m2_present"])
            self.assertFalse(line["orders"]["legacy-only"]["m3_present"])


if __name__ == "__main__":
    unittest.main()
