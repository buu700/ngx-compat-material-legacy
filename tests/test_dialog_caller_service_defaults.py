# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Generic default qualification preserves actual source and historical boundaries."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogCallerServiceDefaults(unittest.TestCase):
    def test_exact_generic_default_source_and_evidence_boundary(self):
        result = subprocess.run(['node', 'tests/dialog_caller_service_default_boundary_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=45)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['cases'], 70)
        self.assertEqual(report['actual_source_faults'], 2)
        self.assertEqual(report['corruptions_rejected'], 7)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['before_admission_rejected'], 1)
        self.assertEqual(report['canonical_ledgers_unchanged'], 3)
        self.assertEqual(report['source_closures'], 0)
        self.assertFalse(report['actual_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
