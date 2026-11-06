# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Form source continuity and real owner callback checks on disposable copies."""
import contextlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]

class BrowserFormZoneSourceSuccessorTest(unittest.TestCase):
    @contextlib.contextmanager
    def fixture(self):
        with tempfile.TemporaryDirectory(prefix='browser-form-zone-successor-') as temp:
            fixture = Path(temp) / 'checkout'
            result = subprocess.run(['cp', '-a', '--reflink=auto', str(ROOT), str(fixture)], capture_output=True, text=True, timeout=180)
            if result.returncode:
                if fixture.exists():
                    shutil.rmtree(fixture)
                shutil.copytree(ROOT, fixture, symlinks=True)
            yield fixture

    def setUp(self):
        self.node = shutil.which('node')
        self.assertIsNotNone(self.node)
        required = json.loads((ROOT / 'toolchain-lock.json').read_bytes())['repository']['node']
        self.assertEqual(subprocess.check_output([self.node, '--version'], text=True).strip().removeprefix('v'), required)

    def test_finite_helper_physical_and_callback_controls(self):
        with self.fixture() as fixture:
            child = subprocess.run([self.node, 'tests/browser_form_zone_source_probe.mjs'], cwd=fixture, capture_output=True, text=True, timeout=90)
            self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
            report = json.loads(child.stdout)
            self.assertTrue(report['positive'])
            self.assertEqual(report['all_bound_physical_cold_rejected'], 5)
            self.assertEqual(report['all_bound_physical_late_rejected'], 5)
            self.assertTrue(report['mutation_during_callback_rejected'])
            self.assertFalse(report['actual_native_or_full_audit_qualified'])

    def test_real_owner_late_callback_controls(self):
        version = json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())['version']
        if not version.startswith('22.'):
            self.skipTest('real owner callback controls run on main; 21.x retains separate helper controls')
        with self.fixture() as fixture:
            for mode in ('proposal', 'browser-owner', 'inventory-owner'):
                with self.subTest(mode=mode):
                    child = subprocess.run([self.node, 'tests/browser_form_zone_composition_probe.mjs', mode], cwd=fixture, capture_output=True, text=True, timeout=300)
                    self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
                    report = json.loads(child.stdout)
                    self.assertEqual(report['result'], 'pass')
                    self.assertEqual(report['mode'], mode)
                    self.assertTrue(report['same_subject_guard'])
                    self.assertFalse(report['full_owner_or_native_qualified'])

if __name__ == '__main__':
    unittest.main()
