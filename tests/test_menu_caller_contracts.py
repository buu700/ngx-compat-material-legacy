# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Individual menu decisions preserve the original obligations and runtime gates."""
import json
import os
from pathlib import Path
import subprocess
import unittest
from menu_caller_route import menu_line, probe_for
ROOT = Path(__file__).resolve().parents[1]
class MenuCallerContracts(unittest.TestCase):
    def test_individual_public_constructor_provider_and_source_boundaries(self):
        line = menu_line()
        command = ['node', probe_for(line)]
        if os.environ.get('NGX_MENU_CALLER_DIAGNOSTIC'):
            command.append(os.environ['NGX_MENU_CALLER_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['individual_routes'], 17)
        self.assertEqual(report['removed_current_private_routes'], 4 if line == 'main' else 3)
        if line == 'main':
            self.assertEqual(report['historical_removed_private_routes'], 3)
        self.assertEqual(report['runtime_cases'], 52)
        self.assertEqual(report['actual_source_mutants_rejected'], 6)
        self.assertGreaterEqual(report['source_and_proof_corruptions_rejected'], 20)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['review_row_corruptions_rejected'], 3)
        if line == 'main':
            self.assertEqual(report['historical_prepared'], 17)
            self.assertEqual(report['current_reviewed'], 17)
            self.assertEqual(report['current_insufficient'], 0)
        else:
            self.assertIn(report['canonical_closures_integrated'], [0, 17])
        self.assertFalse(report['actual_native_packed_AOT_or_full_floor_qualified'])
if __name__ == '__main__':
    unittest.main()
