# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exercise the schema-2/v3 seal transport on disposable source histories."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
NODE = '/nix/store/w8jijs92barihdb0z54dsgq5szj2wd47-nodejs-24.21.0/bin/node'

class CheckerSealV3(unittest.TestCase):
    def test_exact_and_rejection_controls(self):
        result = subprocess.run([NODE, str(ROOT / 'tests/npm_replay_checker_self_pin_transport_v3_probe.mjs')],
                                cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['controls'], 36)
        self.assertEqual(sum(not row['rejected'] for row in report['cases']), 2)
        self.assertFalse(report['current_npm_semantic_profile_qualification_exercised'])

if __name__ == '__main__':
    unittest.main()
