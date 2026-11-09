# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""The final seven ordinary roles retain their complete owned source graph."""
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


class MaterialRemainingCallerSource(unittest.TestCase):
    def test_original_roles_graph_and_changed_inputs(self):
        result = subprocess.run(['node', ('tests/material_remaining_caller_current_source_probe.mjs' if current_epoch() else 'tests/material_remaining_caller_source_probe.mjs')],
                                cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['selected'], 7)
        self.assertEqual(report['complete_owned_source_graph'], 89 if current_epoch() else 91)
        self.assertEqual(report['input_corruptions_rejected'], 10)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertTrue(report['canonical_ledgers_unchanged'])
        self.assertEqual(report['source_closures_prepared'], 0)
        self.assertEqual(report['product_changes_by_probe' if current_epoch() else 'product_changes'], 0)


if __name__ == '__main__':
    unittest.main()
