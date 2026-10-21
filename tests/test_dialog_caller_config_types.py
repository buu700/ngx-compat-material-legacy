# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Type equivalence for an unapplied candidate does not imply runtime/DI admission."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogCallerConfigCandidateTypes(unittest.TestCase):
    def test_tagged_domains_consumed_contracts_and_fresh_inputs(self):
        command = ['node', 'tests/dialog_caller_config_type_evidence_probe.mjs']
        if os.environ.get('NGX_DIALOG_CONFIG_TYPES_DIAGNOSTIC'):
            command.append(os.environ['NGX_DIALOG_CONFIG_TYPES_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['candidate_graph_files'], 49)
        self.assertEqual(report['original_roles_retained'], 18)
        self.assertEqual(report['live_peer_bindings'], 16)
        self.assertEqual(report['owned_bindings'], 2)
        self.assertEqual(report['stable_public_member_reads'], 44)
        self.assertEqual(report['stable_public_calls'], 6)
        self.assertEqual(report['previously_flagged_reads_now_locally_owned'], 7)
        self.assertEqual(report['invalid_typed_controls'], 24)
        self.assertGreaterEqual(report['source_input_corruptions_rejected'], 25)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertTrue(report['candidate_only'])
        self.assertFalse(report['product_applied'])
        self.assertEqual(report['source_closures'], 0)
        self.assertFalse(report['defaults_actual_DI_owned_runtime_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
