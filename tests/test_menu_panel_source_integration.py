# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Retain prior audit judgments and pending runtime gates after a type-only repair."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class MenuPanelSourceIntegration(unittest.TestCase):
    def test_retained_obligations_and_exact_source_rebindings(self):
        command = ['node', 'scripts/run-historical-source-probe.mjs', 'menu-panel-integration']
        if os.environ.get('NGX_MENU_PANEL_INTEGRATION_DIAGNOSTIC'):
            command.extend(['--original-report', os.environ['NGX_MENU_PANEL_INTEGRATION_DIAGNOSTIC']])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180 + 180)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['rebindings'], 6)
        self.assertEqual(report['independent_menu_closures'], 17)
        self.assertEqual(report['source_insufficient'], 0)
        self.assertEqual(report['open'], 31)
        self.assertEqual(report['SHA_metadata_refreshes'], 73)
        self.assertEqual(report['corruptions'], 8)
        self.assertEqual(report['late_changes'], 2)
if __name__ == '__main__':
    unittest.main()
