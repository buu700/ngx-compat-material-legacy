"""Actual historical owned menu behavior uses each line's authenticated minimum peers."""
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT-style license: see LICENSE.
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MenuItemMinimumParentTests(unittest.TestCase):
    def test_real_parent_scopes_and_namespace_counterexamples(self):
        result = subprocess.run(['node', '--max-old-space-size=768',
            'tests/menu_item_minimum_parent_probe.mjs'], cwd=ROOT,
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])
        observed = json.loads(result.stdout)
        self.assertEqual(observed['minimum_namespaces'], 2)
        self.assertEqual(observed['development_production_contexts'], 4)
        self.assertEqual(observed['signature_mutations_rejected'], 32)
        self.assertEqual(observed['runtime_mutations_rejected'], 44)
        self.assertEqual(observed['settlement_mutations_rejected'], 76)
        self.assertEqual(observed['namespace_controls'], 8)
        self.assertEqual(observed['actual_JIT_factory_subjects'], 4)
        self.assertFalse(observed['packed_or_native_qualified'])


if __name__ == '__main__':
    unittest.main()
