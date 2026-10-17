# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Public fixture promise delegation survives complete owned bootstrap setup."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest


class BootstrapStabilityTests(unittest.TestCase):
    def test_pending_and_rejected_promises(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory(prefix='ngx-bootstrap-stability-') as temp:
            report = Path(temp) / 'controls.json'
            subprocess.run(['node', 'tests/bootstrap_stability_probe.mjs', str(report)], cwd=root,
                           check=True, timeout=30, capture_output=True, text=True)
            data = json.loads(report.read_text())
            self.assertEqual(data['original_control']['failed'], 3)
            self.assertEqual(data['current_control']['passed'], 8)
            self.assertEqual(data['negative_controls'], 8)
            self.assertFalse(data['actual_Angular_fixture_fakeAsync_native_browser_SSR_or_floor_qualified'])
