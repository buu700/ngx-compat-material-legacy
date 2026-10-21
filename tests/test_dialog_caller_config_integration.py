# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""The applied compatibility patch preserves every audit and native obligation."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogConfigIntegration(unittest.TestCase):
    def test_exact_patch_and_preserved_obligations(self):
        child = subprocess.run(['node', 'tests/dialog_caller_config_integration_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['source_rebindings'], 32)
        self.assertEqual(report['open'], 31)
        self.assertEqual(report['source_insufficient'], 0)
        self.assertEqual(report['current_peer_uses'], 1963)
        self.assertEqual(report['retained_removed_additional'], 2)
        self.assertIn(report['native_missing'], [33, 34])


if __name__ == '__main__':
    unittest.main()
