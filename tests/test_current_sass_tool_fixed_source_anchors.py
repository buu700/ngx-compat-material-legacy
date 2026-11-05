# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Normal helper discovery retains the fixed source-ownership rejection controls."""
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CurrentSassToolFixedSourceAnchorsTests(unittest.TestCase):
    def test_resealed_profiles_cannot_change_fixed_source_ownership(self):
        child = subprocess.run([sys.executable, '-B',
            'compatibility/rc/parent-base-class-tool-fixed-anchor-controls-v1.py'],
            cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-8000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['result'], 'pass')
        cases = 23 if report['line'] == '21.x' else 3
        self.assertEqual(report['cases'], cases)
        self.assertEqual(report['engines'], 2)
        self.assertEqual(report['accepted_checks'], 2)
        self.assertEqual(report['rejected_checks'], 2 * (cases - 1))
        self.assertTrue(report['current_factories_executed'])
        self.assertFalse(report['old_Git_programs_executed'])
        self.assertFalse(report['product_or_source_owners_executed'])
        self.assertFalse(report['current_root_mutated'])


if __name__ == '__main__':
    unittest.main()
