"""Two actual factory/constructor injection boundaries against authenticated Core."""
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT-style license: see LICENSE.
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CurrentFactoryInjectTests(unittest.TestCase):
    def test_current_scopes_and_independent_namespace_mutations(self):
        result = subprocess.run(['node', '--max-old-space-size=768',
            'tests/current_factory_inject_probe.mjs'], cwd=ROOT,
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])
        observed = json.loads(result.stdout)
        self.assertEqual(observed['current_uses'], 2)
        self.assertEqual(observed['namespaces'], 3)
        self.assertEqual(observed['development_production_contexts'], 6)
        self.assertEqual(observed['cases'], 54)
        self.assertEqual(observed['source_controls'], 10)
        self.assertEqual(observed['runtime_mutations_rejected'], 12)
        self.assertFalse(observed['complete_product_qualified'])


if __name__ == '__main__':
    unittest.main()
