# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Bounded actual SDK/constructor/focus evidence preserves wider pending gates."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogCallerConfigCandidateRuntime(unittest.TestCase):
    def test_tagged_defaults_JIT_constructor_and_fresh_input_boundaries(self):
        command = ['node', 'tests/dialog_caller_config_runtime_evidence_probe.mjs']
        if os.environ.get('NGX_DIALOG_CONFIG_RUNTIME_DIAGNOSTIC'):
            command.append(os.environ['NGX_DIALOG_CONFIG_RUNTIME_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['contexts'], 4)
        self.assertEqual(report['cases'], 54)
        self.assertEqual(report['semantically_emitted_owned_sources_per_side'], 49)
        self.assertEqual(report['source_faults_rejected'], 3)
        self.assertTrue(report['public_injector_JIT_constructor_identity_qualified'])
        self.assertTrue(report['historical_tagged_focus_aria_width_and_duration_defaults_matched'])
        self.assertTrue(report['before_candidate_full_config_descriptors_focus_lifecycle_and_duration_results_equal'])
        self.assertIn(report['tagged_differences_retained'], [22, 24])
        self.assertGreaterEqual(report['read_only_input_corruptions_rejected'], 25)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertTrue(report['candidate_only'])
        self.assertFalse(report['product_applied'])
        self.assertEqual(report['source_closures'], 0)
        self.assertFalse(report['actual_native_leaf_Component_factory_template_query_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
