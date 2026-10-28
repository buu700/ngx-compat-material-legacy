# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Title source handler and mandatory native gate; no browser execution."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogTitleCanonicalAdmissionTests(unittest.TestCase):
    def test_current_source_and_mandatory_native_gate(self):
        command = ['node', 'tests/dialog_title_canonical_admission_probe.mjs']
        if os.environ.get('DIALOG_TITLE_CANONICAL_ADMISSION_REPORT'):
            command.append(os.environ['DIALOG_TITLE_CANONICAL_ADMISSION_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6500:])
        report = json.loads(child.stdout)
        self.assertEqual(report['current_raw_graph_members'], 49)
        self.assertEqual(report['original_exact_patch_replays'], 9)
        self.assertTrue(report['actual_fresh_lifecycle_execution'])
        self.assertEqual(len(report['metadata_faults_rejected']), 13)
        self.assertEqual(len(report['source_faults_rejected']), 10)
        self.assertGreaterEqual(report['late_source_faults_rejected'], 94)
        self.assertEqual(report['uncached_child_calls'], 2)
        self.assertEqual(len(report['native_observation_faults_rejected']), 9)
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])
        self.assertEqual(report['canonical_decisions_changed'], 0)
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
