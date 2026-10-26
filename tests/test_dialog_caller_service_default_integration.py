# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Applied service defaults retain every source obligation and pending native gate."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogServiceDefaultIntegration(unittest.TestCase):
    def test_applied_source_records_and_all_original_obligations(self):
        result = subprocess.run(['node', 'scripts/run-historical-source-probe.mjs', 'dialog-default-integration'],
                                cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-10000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['source_rebindings'], 11)
        self.assertEqual(report['open'], 31)
        self.assertEqual(report['source_insufficient'], 0)
        self.assertEqual(report['current_peer_uses'], 1963)
        self.assertEqual(report['retained_removed_additional'], 2)
        self.assertIn(report['native_missing'], [33, 34])


if __name__ == '__main__':
    unittest.main()
