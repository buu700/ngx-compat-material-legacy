# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact restored-test successors, physical reads and callback failure controls."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from select_dialog_finite_source_successor_v4 import SelectDialogFiniteSourceV4, PACKETS, RESTORED, TESTS, _historical, _replay

NODE = os.environ.get('NODE_BINARY', '/nix/store/w8jijs92barihdb0z54dsgq5szj2wd47-nodejs-24.21.0/bin/node')


class RestoredSelectDialogSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='ngx-restored-select-dialog-')
        cls.root = Path(cls.temp.name)
        cls.line = '21.x' if json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
        owner = SelectDialogFiniteSourceV4(ROOT, line=cls.line)
        paths = {row['path'] for row in owner.bound}
        paths.update(('scripts/select-dialog-finite-source-successor.mjs', 'scripts/upstream-packed-run-evidence.mjs', 'scripts/packed-consumer-evidence.mjs',
                      'tests/restored_select_dialog_source_probe.mjs'))
        for path in paths:
            target = cls.root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((ROOT / path).read_bytes())
        git_dir = subprocess.check_output(['git', 'rev-parse', '--absolute-git-dir'], cwd=ROOT, text=True).strip()
        (cls.root / '.git').write_text('gitdir: ' + git_dir + '\n')
        packet = json.loads((ROOT / PACKETS[-1][0]).read_bytes())['branches'][cls.line]
        rows = {row['path']: row for row in packet['transitions'] + packet['d61_menu_transitions']}
        cls.prior = {path: _replay(rows[path], _historical(ROOT, rows[path]['source_parent'], path)) for path in TESTS}
        cls.current = {path: (cls.root / path).read_bytes() for path in TESTS}

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def owner(self, read=None):
        return SelectDialogFiniteSourceV4(self.root, line=self.line, read=read)

    def test_exact_predecessors_and_restored_afterimages(self):
        owner = self.owner()
        packet = json.loads((self.root / RESTORED[0]).read_bytes())['branches'][self.line]
        for row in packet['repairs']:
            current = {key: row['after'][key] for key in ('path', 'sha256', 'bytes')}
            for source in (row['before'], row['after']):
                incoming = {key: source[key] for key in ('path', 'sha256', 'bytes')}
                self.assertEqual(owner.qualify(incoming), current)
            with self.assertRaises(AssertionError):
                owner.qualify(dict(current, sha256='0' * 64))
            with self.assertRaises(AssertionError):
                owner.qualify(dict(current, bytes=current['bytes'] + 1))
        self.assertIsNone(owner.qualify(dict(path='unowned', sha256='0' * 64)))
        with self.assertRaises(AssertionError):
            SelectDialogFiniteSourceV4(self.root, line='21.x' if self.line == 'main' else 'main')

    def test_frozen_v4_still_supported_and_mixed_epoch_rejected(self):
        try:
            for path in TESTS:
                (self.root / path).write_bytes(self.prior[path])
            old = self.owner()
            self.assertNotIn(RESTORED[0], [row['path'] for row in old.bound])
            (self.root / TESTS[0]).write_bytes(self.current[TESTS[0]])
            with self.assertRaises(AssertionError):
                self.owner()
        finally:
            for path in TESTS:
                (self.root / path).write_bytes(self.current[path])
        self.owner()

    def test_every_bound_physical_input_and_callback(self):
        owner = self.owner()
        for row in owner.bound:
            with self.subTest(path=row['path']):
                path = self.root / row['path']
                original = path.read_bytes()
                try:
                    path.write_bytes(original + b'\nchanged\n')
                    with self.assertRaises(AssertionError):
                        owner.assert_current()
                    with self.assertRaises(AssertionError):
                        owner.qualify(dict(path=TESTS[0], sha256='0' * 64))
                finally:
                    path.write_bytes(original)
                with self.assertRaises(AssertionError):
                    self.owner(lambda p: b'wrong' if p == row['path'] else (self.root / p).read_bytes())
        owner.assert_current()

    def test_linked_input_rejected(self):
        path = self.root / RESTORED[0]
        original = path.read_bytes()
        other = self.root / 'outside-packet.json'
        other.write_bytes(original)
        try:
            path.unlink()
            path.symlink_to(other)
            with self.assertRaises(AssertionError):
                self.owner()
        finally:
            path.unlink()
            path.write_bytes(original)
            other.unlink()

    def test_late_callback_and_last_callback_mutation(self):
        armed = False
        victim = self.root / TESTS[0]
        original = victim.read_bytes()
        def callback(path):
            raw = (self.root / path).read_bytes()
            if armed and path == owner.bound[-1]['path']:
                victim.write_bytes(original + b'\nchanged\n')
            return raw
        owner = self.owner(callback)
        try:
            armed = True
            with self.assertRaises(AssertionError):
                owner.assert_current()
        finally:
            armed = False
            victim.write_bytes(original)
        owner.assert_current()
        bad = False
        late = self.owner(lambda p: b'wrong' if bad and p == TESTS[0] else (self.root / p).read_bytes())
        bad = True
        with self.assertRaises(AssertionError):
            late.assert_current()

    def test_swallowed_nested_calls_reject_outer_operation(self):
        for operation in ('assert_current', 'assert_physical', 'qualify', 'historical_reference'):
            with self.subTest(operation=operation):
                armed = False
                attempted = False
                def callback(path):
                    nonlocal attempted
                    if armed and not attempted:
                        attempted = True
                        try:
                            method = getattr(owner, operation)
                            method(dict(path='unowned', sha256='0' * 64)) if operation in ('qualify', 'historical_reference') else method()
                        except AssertionError:
                            pass
                    return (self.root / path).read_bytes()
                owner = self.owner(callback)
                armed = True
                with self.assertRaisesRegex(AssertionError, 'reentrant'):
                    owner.assert_current()
                self.assertTrue(attempted)
                armed = False
                owner.assert_current()

    def test_reference_values_cannot_execute_comparison_hooks(self):
        owner = self.owner()
        target = self.root / TESTS[0]
        original = target.read_bytes()
        class SideEffect:
            def __eq__(self, other):
                target.write_bytes(original + b'changed')
                try:
                    owner.qualify(dict(path='unowned', sha256='0' * 64))
                except AssertionError:
                    pass
                return False
        for key in ('path', 'sha256', 'bytes'):
            incoming = owner.qualify(dict(path=TESTS[0], sha256=json.loads((self.root / RESTORED[0]).read_bytes())['branches'][self.line]['repairs'][0]['after']['sha256']))
            incoming[key] = SideEffect()
            with self.subTest(key=key), self.assertRaises(AssertionError):
                owner.qualify(incoming)
            self.assertEqual(target.read_bytes(), original)
            owner.assert_current()

    def test_optimized_python_rejected(self):
        result = subprocess.run([sys.executable, '-O', '-c',
            "import sys; from pathlib import Path; sys.path.insert(0,sys.argv[1]); from select_dialog_finite_source_successor_v4 import SelectDialogFiniteSourceV4; SelectDialogFiniteSourceV4(Path(sys.argv[2]))",
            str(ROOT / 'scripts'), str(self.root)], capture_output=True, text=True, timeout=15)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('optimized Python', result.stderr)

    def test_node_equivalent_controls(self):
        result = subprocess.run([NODE, str(self.root / 'tests/restored_select_dialog_source_probe.mjs'), str(self.root), self.line],
                                capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('PASS restored select/dialog', result.stdout)


if __name__ == '__main__':
    unittest.main()
