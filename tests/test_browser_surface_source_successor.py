# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite surface and actual browser-source controls on isolated Git copies."""
import contextlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]

class BrowserSurfaceSourceSuccessorTest(unittest.TestCase):
    @contextlib.contextmanager
    def fixture(self):
        with tempfile.TemporaryDirectory(prefix='browser-surface-successor-') as temp:
            fixture = Path(temp) / 'checkout'
            result = subprocess.run(['cp', '-a', '--reflink=auto', str(ROOT), str(fixture)], capture_output=True, text=True, timeout=180)
            if result.returncode:
                if fixture.exists(): shutil.rmtree(fixture)
                shutil.copytree(ROOT, fixture, symlinks=True)
            yield fixture

    def setUp(self):
        self.node = shutil.which('node')
        self.assertIsNotNone(self.node)
        required = json.loads((ROOT / 'toolchain-lock.json').read_bytes())['repository']['node']
        self.assertEqual(subprocess.check_output([self.node, '--version'], text=True).strip().removeprefix('v'), required)

    def test_finite_successor_negative_controls(self):
        with self.fixture() as fixture:
            child = subprocess.run([self.node, 'tests/browser_surface_source_successor_probe.mjs', 'helper'], cwd=fixture,
                                   capture_output=True, text=True, timeout=90)
            self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
            report = json.loads(child.stdout)
            self.assertEqual(report['result'], 'pass')
            self.assertTrue(report['unknown_reference_rejected'])
            self.assertEqual(report['physical_and_callback_controls'], 3)
            self.assertFalse(report['full_owner_or_native_qualified'])

    def test_actual_source_guard_controls(self):
        version = json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())['version']
        is_21 = version.startswith('21.')
        if is_21:
            if sys.platform != 'linux' or any(shutil.which(tool) is None for tool in ('unshare', 'mount')):
                self.skipTest('21.x full source isolation requires Linux user/mount namespaces')
            if (ROOT / '../../../../cyph').resolve() != Path('/home/parallels/cyph'):
                self.skipTest('21.x historical repair requires the original four-level checkout layout')
            with tempfile.TemporaryDirectory(prefix='browser-surface-namespace-') as temp:
                source, target = Path(temp) / 'source', Path(temp) / 'target'
                source.mkdir(); target.mkdir()
                check = subprocess.run(['unshare', '-Urnm', 'mount', '--bind', str(source), str(target)], capture_output=True, text=True, timeout=15)
                if check.returncode: self.skipTest('unprivileged namespaces unavailable: ' + check.stderr.strip())
        with self.fixture() as fixture:
            command = [self.node, 'tests/browser_surface_source_successor_probe.mjs', 'subject']
            if is_21:
                deps = fixture / 'node_modules'
                if deps.is_symlink():
                    source = deps.resolve(strict=True)
                    deps.unlink()
                    shutil.copytree(source, deps, symlinks=True)
                runner = 'mount --bind "$1" "$2" && cd "$2" && exec "$3" tests/browser_surface_source_successor_probe.mjs subject'
                command = ['unshare', '-Urnm', 'sh', '-c', runner, 'probe', str(fixture), str(ROOT), self.node]
            child = subprocess.run(command, cwd=fixture, capture_output=True, text=True, timeout=300)
            self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
            report = json.loads(child.stdout)
            self.assertEqual(report['result'], 'pass')
            self.assertEqual(report['mode'], 'subject')
            self.assertEqual(report['physical_and_callback_controls'], 3)
            self.assertFalse(report['full_owner_or_native_qualified'])

    def test_actual_composition_callback_controls(self):
        version = json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())['version']
        if not version.startswith('22.'):
            self.skipTest('composition callback controls run on the main branch')
        with self.fixture() as fixture:
            for mode in ('proposal', 'browser-owner', 'inventory-owner', 'inventory-rc'):
                with self.subTest(mode=mode):
                    child = subprocess.run([self.node, 'tests/browser_surface_composition_probe.mjs', mode], cwd=fixture,
                                           capture_output=True, text=True, timeout=300)
                    self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
                    report = json.loads(child.stdout)
                    self.assertEqual(report['result'], 'pass')
                    self.assertEqual(report['mode'], mode)
                    self.assertTrue(report['same_subject_guard'])
                    self.assertFalse(report['full_owner_or_native_qualified'])

if __name__ == '__main__':
    unittest.main()
