# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exercise finite successor guards in disposable, Git-backed copies.

The frame and selector run at any checkout location. The full source owner also
reads a separately owned Cyph source at a fixed absolute location and requires a
four-level checkout layout. Its physical mutation test uses a private Linux
user/mount namespace to bind the copy to that path; it is skipped where this
facility or layout is unavailable. Neither test writes the working checkout.
"""
import contextlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class BaseClassTabsInspectorSuccessorTests(unittest.TestCase):
    def setUp(self):
        version = json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())['version']
        if not version.startswith('21.'):
            self.skipTest('base-class removal admission is a 21.x source contract')
        self.node = shutil.which('node')
        self.assertIsNotNone(self.node, 'pinned Node is required')
        expected = json.loads((ROOT / 'toolchain-lock.json').read_bytes())['repository']['node']
        actual = subprocess.check_output([self.node, '--version'], text=True).strip().removeprefix('v')
        self.assertEqual(actual, expected, 'use the pinned repository Node')
        self.assertIsNotNone(shutil.which('git'), 'Git is required for authenticated original bytes')
        self.assertIsNotNone(shutil.which('cp'), 'cp is required for an isolated copy')

    @contextlib.contextmanager
    def fixture(self):
        with tempfile.TemporaryDirectory(prefix='base-tabs-inspector-') as temporary:
            fixture = Path(temporary) / 'checkout'
            # Never use hard links: probes deliberately change source bytes.
            copied = subprocess.run(['cp', '-a', '--reflink=auto', str(ROOT), str(fixture)],
                                    capture_output=True, text=True, timeout=180)
            if copied.returncode:
                # BSD cp lacks --reflink; ordinary copies retain isolation.
                if fixture.exists():
                    shutil.rmtree(fixture)
                shutil.copytree(ROOT, fixture, symlinks=True)
            yield fixture

    def test_frame_and_selector_in_disposable_checkout(self):
        with self.fixture() as fixture:
            child = subprocess.run([self.node, 'tests/base_class_tabs_inspector_frame_probe.mjs'], cwd=fixture,
                                   capture_output=True, text=True, timeout=120)
            self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
            self.assertIn('finite selector and actual frame controls pass', child.stdout)

    def test_source_owner_in_disposable_checkout_at_required_location(self):
        if sys.platform != 'linux' or any(shutil.which(tool) is None for tool in ('unshare', 'mount')):
            self.skipTest('source owner isolation requires Linux user and mount namespaces')
        if (ROOT / '../../../../cyph').resolve() != Path('/home/parallels/cyph'):
            self.skipTest('historical repair reader requires the original four-level checkout layout')
        with tempfile.TemporaryDirectory(prefix='base-tabs-namespace-') as temporary:
            source, target = Path(temporary) / 'source', Path(temporary) / 'target'
            source.mkdir(); target.mkdir()
            check = subprocess.run(['unshare', '-Urnm', 'mount', '--bind', str(source), str(target)],
                                   capture_output=True, text=True, timeout=15)
            if check.returncode:
                self.skipTest('unprivileged user/mount namespaces unavailable: ' + check.stderr.strip())
        with self.fixture() as fixture:
            # Paths are arguments, never shell-interpolated. Git metadata supplies
            # existing objects read-only to the admission contract.
            runner = 'mount --bind "$1" "$2" && cd "$2" && exec "$3" tests/base_class_tabs_inspector_successor_probe.mjs'
            child = subprocess.run(['unshare', '-Urnm', 'sh', '-c', runner, 'probe', str(fixture), str(ROOT), self.node],
                                   capture_output=True, text=True, timeout=180, env=os.environ.copy())
            self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
            self.assertIn('metadata tamper rejected cold/late; restoration accepted', child.stdout)


if __name__ == '__main__':
    unittest.main()
