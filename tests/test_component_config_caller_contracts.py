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
from component_config_route import component_config_line, probe_for

ROOT = Path(__file__).resolve().parents[1]


class ComponentConfigCallerContracts(unittest.TestCase):
    def test_individual_source_api_and_public_runtime_boundaries(self):
        line = component_config_line()
        command = ['node', probe_for(line, 'contracts')]
        if os.environ.get('NGX_COMPONENT_CONFIG_CALLER_DIAGNOSTIC'):
            command.append(os.environ['NGX_COMPONENT_CONFIG_CALLER_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['individual_routes'], 73)
        self.assertEqual(report['frozen'], 44)
        self.assertEqual(report['additional'], 29)
        self.assertEqual(report['public_runtime_cases'], 210)
        self.assertEqual(report['owned_runtime_cases'], 46)
        self.assertEqual(report['helper_semantic_controls_rejected'], 6)
        self.assertEqual(report['actual_source_mutants_rejected'], 11 if line == 'main' else 10)
        self.assertGreaterEqual(report['source_and_proof_corruptions_rejected'], 50)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['review_row_corruptions_rejected'], 6 if line == 'main' else 3)
        if line == 'main':
            self.assertEqual(report['historical_prepared_roles'], 73)
            self.assertEqual(report['current_reviewed'] + report['current_insufficient'], 73)
        else:
            self.assertIn(report['canonical_closures_integrated'], [0, 73])
        self.assertTrue(report['original1697_1736_315_and_six_packed_CVA_obligations_retained'])
        self.assertFalse(report['actual_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
