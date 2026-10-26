# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exactly73 decisions preserve earlier audit data and every original obligation."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class ComponentConfigCallerIntegration(unittest.TestCase):
    def test_exact_closures_original_bytes_and_raw_source_admission(self):
        command = ['node', 'scripts/run-historical-source-probe.mjs', 'configuration-caller-integration']
        if os.environ.get('NGX_COMPONENT_CONFIG_INTEGRATION_DIAGNOSTIC'):
            command.extend(['--original-report', os.environ['NGX_COMPONENT_CONFIG_INTEGRATION_DIAGNOSTIC']])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['closures'], 73)
        self.assertEqual(report['open'], 31)
        self.assertEqual(report['source_insufficient'], 0)
        self.assertTrue(report['all1697_ledger_bytes_preserved'])
        self.assertEqual(report['corruptions'], 6)
if __name__ == '__main__':
    unittest.main()
