# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT.
"""Exact one-use retirement and surviving field checks."""
import json
import subprocess
import unittest

class PseudoBooleanRetirement(unittest.TestCase):
    def test_retired_binding_and_controls(self):
        r = subprocess.run(['node', 'tests/pseudo_boolean_retirement_9a_probe.mjs'],
                           capture_output=True, text=True, check=True)
        report = json.loads(r.stdout)
        self.assertEqual(report['retired'], 1)
        self.assertEqual(report['property_roles'], 324)
        self.assertEqual(len(report['mutations']), 4)
        self.assertTrue(report['unrelated_row_accepted'])
