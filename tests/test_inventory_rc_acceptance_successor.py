# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact main inventory rc source successor on a disposable checkout."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]

class InventoryRcAcceptanceSuccessorTests(unittest.TestCase):
    def test_actual_successor_rejects_physical_and_callback_mutations(self):
        node = shutil.which('node')
        self.assertIsNotNone(node)
        expected = json.loads((ROOT / 'toolchain-lock.json').read_bytes())['repository']['node']
        self.assertEqual(subprocess.check_output([node, '--version'], text=True).strip().removeprefix('v'), expected)
        with tempfile.TemporaryDirectory(prefix='inventory-rc-successor-') as temp:
            fixture = Path(temp) / 'checkout'
            result = subprocess.run(['cp', '-a', '--reflink=auto', str(ROOT), str(fixture)], capture_output=True, text=True, timeout=180)
            if result.returncode:
                if fixture.exists(): shutil.rmtree(fixture)
                shutil.copytree(ROOT, fixture, symlinks=True)
            child = subprocess.run([node, 'tests/inventory_rc_acceptance_successor_probe.mjs'], cwd=fixture,
                                   capture_output=True, text=True, timeout=60)
            self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
            self.assertTrue(json.loads(child.stdout)['cold_late_physical_and_callback_rejected'])

if __name__ == '__main__':
    unittest.main()
