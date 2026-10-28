# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Current title browser wiring; these tests do not execute native rendering."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class DialogTitleNativeBindingTests(unittest.TestCase):
    def test_minimum_templates_real_branch_gating_and_semantic_faults(self):
        command=['node','tests/dialog_title_native_binding_probe.mjs']
        if os.environ.get('DIALOG_TITLE_NATIVE_BINDING_REPORT'):
            command.append(os.environ['DIALOG_TITLE_NATIVE_BINDING_REPORT'])
        child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=120)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-6500:])
        report=json.loads(child.stdout)
        self.assertEqual(len(report['lines']),2)
        self.assertEqual(report['predicate_faults_rejected'],22)
        self.assertEqual(report['templates_parsed'],16)
        self.assertEqual(report['scenario_observation_rows'],42)
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])
        for line in report['lines']:
            self.assertEqual(line['actual_default_branch_negatives'],3)
            self.assertTrue(line['old_runtime_programs_and_matrix_rosters_and_ledger_unchanged'])
if __name__=='__main__':unittest.main()
