# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Individual source/API decisions preserve the original populations and native gates."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class A11yCallerContracts(unittest.TestCase):
    def test_individual_source_api_and_public_runtime_boundaries(self):
        command = ['node', 'tests/a11y_caller_probe.mjs']
        if os.environ.get('NGX_A11Y_CALLER_DIAGNOSTIC'):
            command.append(os.environ['NGX_A11Y_CALLER_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['individual_routes'], 16)
        self.assertEqual(report['frozen'], 7)
        self.assertEqual(report['additional'], 9)
        self.assertEqual(report['runtime_cases'], 74)
        self.assertEqual(report['actual_source_mutants_rejected'], 6)
        self.assertGreaterEqual(report['source_and_proof_corruptions_rejected'], 25)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['review_row_corruptions_rejected'], 3)
        self.assertIn(report['canonical_closures_integrated'], [0, 16])
        self.assertTrue(report['original1697_1736_315_and_six_packed_CVA_obligations_retained'])
        self.assertFalse(report['actual_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
