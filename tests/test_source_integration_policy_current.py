# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Current source-integration policy keeps its actual source and fixed roster."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SourceIntegrationPolicyCurrentTests(unittest.TestCase):
    def test_actual_policy_and_source_remain_current(self):
        child = subprocess.run(['node', 'tests/source_integration_policy_current_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        report = json.loads(child.stdout)
        self.assertEqual(report['current_integration_programs'], 8)
        self.assertEqual(report['original_replay_programs'], 26)
        self.assertEqual(report['original_wrapper_records'], 23)
        self.assertEqual(report['existing_wrapper_successors'], 2)
        self.assertEqual(report['current_HEAD_tooling_paths'], 6)
        self.assertEqual(report['mutable_progress_paths'], 2)
        self.assertEqual(report['actual_current_product_members'], 1142)
        self.assertEqual(report['rejections'], 6)
        self.assertTrue(report['original_wrapper_AST']['normalized_complete_AST_equal'])
        self.assertFalse(report['original_wrapper_AST']['timeout_changed'])
        self.assertTrue(report['shared_current_source_owner_used'])
        self.assertTrue(report['raw_reader_identity_preserved'])
        self.assertTrue(report['all_observed_current_bytes_rechecked'])
        self.assertFalse(report['historical_bytes_supplied_as_current'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_audit_qualified'])
