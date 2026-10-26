# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Seven individual decisions require their exact source and execution evidence."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MaterialRemainingCallerReview(unittest.TestCase):
    def test_individual_decisions_and_changed_inputs(self):
        result = subprocess.run(
            ['node', 'tests/material_remaining_caller_review_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=90,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['prepared_individual_reviews'], 7)
        self.assertEqual(report['input_corruptions_rejected'], 10)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertTrue(report['canonical_ledgers_unchanged'])


if __name__ == '__main__':
    unittest.main()
