# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Fresh synthetic tab controls and bounded successor on a disposable copy."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
ROOT = Path(__file__).resolve().parents[1]
class ZoneTabProducerSourceSuccessorTest(unittest.TestCase):
    def test_fresh_producer_and_source_guard(self):
        node = shutil.which('node')
        self.assertIsNotNone(node)
        required = json.loads((ROOT / 'toolchain-lock.json').read_bytes())['repository']['node']
        self.assertEqual(subprocess.check_output([node, '--version'], text=True).strip().removeprefix('v'), required)
        with tempfile.TemporaryDirectory(prefix='zone-tab-source-') as temp:
            fixture = Path(temp) / 'checkout'
            copy = subprocess.run(['cp', '-a', '--reflink=auto', str(ROOT), str(fixture)], capture_output=True, text=True, timeout=180)
            if copy.returncode:
                if fixture.exists(): shutil.rmtree(fixture)
                shutil.copytree(ROOT, fixture, symlinks=True)
            for script in ('tests/zone_tab_producer_source_probe.mjs', 'tests/tab_completion_producer_probe.mjs'):
                child = subprocess.run([node, script], cwd=fixture, capture_output=True, text=True, timeout=180)
                self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
                result = json.loads(child.stdout)
                self.assertFalse(result['native_executed'])
                if script.endswith('zone_tab_producer_source_probe.mjs'):
                    self.assertEqual(result['bound'], 6)
                    for key in ('cold', 'late', 'callbackCold', 'callbackLate'): self.assertEqual(result[key], 6)
                    self.assertTrue(result['callback_mutation_rejected'])
                else:
                    self.assertEqual(result['passed'], 29)
if __name__ == '__main__':
    unittest.main()
