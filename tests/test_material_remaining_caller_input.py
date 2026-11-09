# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Real input classes retain their consumed extension and token contracts."""
import json
import hashlib
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
MAIN_PRIOR = '29b36009d5570484e84afe031503b87e6d348267bdb3c7c05b4a528028a00646'
V21_PRIOR = '838ef6fba77dc90eedb7ef4c4c3e6cba70831379ef8914a53b78b88cabca44b5'

def current_epoch():
    digest = hashlib.sha256((ROOT / 'compatibility/rc/material-remaining-caller-prior.json').read_bytes()).hexdigest()
    if digest not in (MAIN_PRIOR, V21_PRIOR):
        raise AssertionError('unknown historical Material caller capture')
    return digest == MAIN_PRIOR


class MaterialRemainingCallerInput(unittest.TestCase):
    def test_input_identity_and_receiver_protocols(self):
        result = subprocess.run(
            ['node', ('tests/material_remaining_caller_current_input_probe.mjs' if current_epoch() else 'tests/material_remaining_caller_input_probe.mjs')],
            cwd=ROOT, capture_output=True, text=True, timeout=120,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['cases'], 14)
        self.assertEqual(report['source_files'], 89 if current_epoch() else 91)
        self.assertEqual(report['behavior_faults_rejected'], 4)
        self.assertEqual(report['source_closures'], 0)


if __name__ == '__main__':
    unittest.main()
