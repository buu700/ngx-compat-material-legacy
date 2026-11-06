# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite native source and fresh route controls in a disposable copy."""
import contextlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
ROOT = Path(__file__).resolve().parents[1]
class NativeIndividualZoneSourceSuccessorTest(unittest.TestCase):
    @contextlib.contextmanager
    def fixture(self):
        with tempfile.TemporaryDirectory(prefix='native-individual-zone-') as temp:
            target = Path(temp) / 'checkout'
            child = subprocess.run(['cp', '-a', '--reflink=auto', str(ROOT), str(target)], capture_output=True, text=True, timeout=180)
            if child.returncode:
                if target.exists(): shutil.rmtree(target)
                shutil.copytree(ROOT, target, symlinks=True)
            yield target
    def setUp(self):
        self.node = shutil.which('node')
        self.assertIsNotNone(self.node)
        version = json.loads((ROOT / 'toolchain-lock.json').read_bytes())['repository']['node']
        self.assertEqual(subprocess.check_output([self.node, '--version'], text=True).strip().removeprefix('v'), version)
    def test_current_source_and_route_controls(self):
        with self.fixture() as fixture:
            child = subprocess.run([self.node, 'tests/native_individual_zone_source_probe.mjs'], cwd=fixture, capture_output=True, text=True, timeout=180)
            self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
            report = json.loads(child.stdout)
            self.assertTrue(report['positive'])
            self.assertEqual(report['bound'], 15)
            for key in ('cold', 'late', 'callbackCold', 'callbackLate'):
                self.assertEqual(report[key], 15)
            self.assertTrue(report['callback_mutation_rejected'])
            self.assertEqual(report['fresh_route_controls'], 39)
            self.assertFalse(report['native_executed'])
            api = subprocess.run([self.node, 'tests/native_individual_zone_api_probe.mjs'], cwd=fixture, capture_output=True, text=True, timeout=90)
            self.assertEqual(api.returncode, 0, api.stdout + api.stderr)
            api_report = json.loads(api.stdout)
            self.assertTrue(api_report['export_names_preserved'])
            self.assertTrue(api_report['changed_declarations_enumerated'])
            self.assertFalse(api_report['native_executed'])
            child = subprocess.run([self.node, 'tests/ripple_replay_route_source_probe.mjs'], cwd=fixture, capture_output=True, text=True, timeout=90)
            self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
            route = json.loads(child.stdout)
            self.assertEqual(route['controls'], 39)
            self.assertFalse(route['actual_angular_native_or_packed_qualified'])
if __name__ == '__main__':
    unittest.main()
