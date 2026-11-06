# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Physical focus successor controls in a private, minimal repository fixture."""
from pathlib import Path
import json
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from dialog_focus_finite_source_successor_v5 import DialogFocusFiniteSourceV5, PATHS, PEER_PREFIX


class DialogFocusFiniteSourceV5Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='ngx-dialog-focus-python-')
        cls.root = Path(cls.temp.name)
        physical = DialogFocusFiniteSourceV5(ROOT)
        cls.line = '21.x' if json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
        paths = {ref['path'] for ref in physical.bound}
        paths.add('projects/ngx-material-legacy/package.json')
        for path in sorted(paths):
            target = cls.root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((ROOT / path).read_bytes())
        git_dir = subprocess.check_output(['git', 'rev-parse', '--absolute-git-dir'], cwd=ROOT, text=True).strip()
        (cls.root / '.git').write_text('gitdir: ' + git_dir + '\n')
        cls.subject = DialogFocusFiniteSourceV5(cls.root, line=cls.line)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_exact_current_references_and_immutable_public_copies(self):
        self.assertEqual(len(self.subject.transitions), 2)
        self.assertEqual([row['path'] for row in self.subject.transitions], list(PATHS))
        self.assertEqual(len([ref for ref in self.subject.bound if ref['path'].startswith(PEER_PREFIX)]), 3)
        for row in self.subject.transitions:
            old = {key: row['before'][key] for key in ('path', 'sha256', 'bytes')}
            current = {key: row['after'][key] for key in ('path', 'sha256', 'bytes')}
            self.assertEqual(self.subject.qualify(old), current)
            self.assertEqual(self.subject.qualify(current), current)
            self.assertEqual(self.subject.historical_reference(current), old)
            with self.assertRaises(AssertionError):
                self.subject.qualify(dict(old, sha256='0' * 64))
            with self.assertRaises(AssertionError):
                self.subject.qualify(dict(old, bytes=old['bytes'] + 1))
        self.assertIsNone(self.subject.qualify(dict(path='unowned.ts', sha256='0' * 64)))
        bound, transitions = self.subject.bound, self.subject.transitions
        bound[0]['sha256'] = '0' * 64
        transitions[0]['after']['sha256'] = '0' * 64
        self.subject.assert_current()
        self.assertNotEqual(self.subject.bound[0]['sha256'], '0' * 64)
        self.assertNotEqual(self.subject.transitions[0]['after']['sha256'], '0' * 64)

    def test_retained_state_cannot_be_replaced_or_deleted(self):
        for name, replacement in (('_bound', ()), ('_records', ()), ('_row_images', ()),
                                  ('_read', lambda _: b'wrong'), ('_root', Path('/tmp')),
                                  ('_active', False)):
            with self.subTest(name=name):
                with self.assertRaises(AttributeError):
                    setattr(self.subject, name, replacement)
                with self.assertRaises(AttributeError):
                    object.__setattr__(self.subject, name, replacement)
                with self.assertRaises(AttributeError):
                    delattr(self.subject, name)
                with self.assertRaises(AttributeError):
                    object.__delattr__(self.subject, name)
        with self.assertRaises(AssertionError):
            DialogFocusFiniteSourceV5.__init__(self.subject, self.root, line=self.line)
        row = self.subject.transitions[0]
        target = self.root / row['path']
        original = target.read_bytes()
        try:
            target.write_bytes(b'original retained-state bypass product mutation')
            with self.assertRaises(AttributeError):
                self.subject._bound = ()
            with self.assertRaises(AssertionError):
                self.subject.assert_current()
            with self.assertRaises(AssertionError):
                self.subject.qualify({key: row['before'][key] for key in ('path', 'sha256', 'bytes')})
        finally:
            target.write_bytes(original)
        self.subject.assert_current()

    def test_late_product_mutation_fails_both_reference_routes(self):
        row = self.subject.transitions[0]
        target = self.root / row['path']
        original = target.read_bytes()
        try:
            target.write_bytes(b'late product mutation')
            with self.assertRaises(AssertionError):
                self.subject.qualify({key: row['before'][key] for key in ('path', 'sha256', 'bytes')})
            with self.assertRaises(AssertionError):
                self.subject.historical_reference({key: row['after'][key] for key in ('path', 'sha256', 'bytes')})
        finally:
            target.write_bytes(original)
        self.subject.assert_current()

    def test_late_minimum_peer_declaration_fails_all_current_routes(self):
        declaration = next(ref for ref in self.subject.bound if ref['path'].endswith('/core.d.ts'))
        target = self.root / declaration['path']
        original = target.read_bytes()
        row = self.subject.transitions[0]
        try:
            target.write_bytes(b'late peer declaration mutation')
            with self.assertRaises(AssertionError):
                self.subject.assert_current()
            with self.assertRaises(AssertionError):
                self.subject.qualify({key: row['before'][key] for key in ('path', 'sha256', 'bytes')})
        finally:
            target.write_bytes(original)
        self.subject.assert_current()

    def test_cross_callback_and_last_callback_mutations_fail(self):
        declaration = next(ref for ref in self.subject.bound if ref['path'].endswith('/core.d.ts'))
        target = self.root / declaration['path']
        original = target.read_bytes()
        triggered = False
        def mutate_declaration(path):
            nonlocal triggered
            raw = (self.root / path).read_bytes()
            if not triggered and path == 'scripts/dialog_focus_finite_source_successor_v5.py':
                triggered = True
                target.write_bytes(b'cross callback declaration mutation')
            return raw
        try:
            with self.assertRaises(AssertionError):
                DialogFocusFiniteSourceV5(self.root, line=self.line, read=mutate_declaration)
            self.assertTrue(triggered)
        finally:
            target.write_bytes(original)
        self.subject.assert_current()
        earlier = self.root / PATHS[0]
        earlier_bytes = earlier.read_bytes()
        armed = False
        def mutate_earlier(path):
            nonlocal armed
            raw = (self.root / path).read_bytes()
            if armed and path == PATHS[1]:
                armed = False
                earlier.write_bytes(b'last callback product mutation')
            return raw
        successor = DialogFocusFiniteSourceV5(self.root, line=self.line, read=mutate_earlier)
        try:
            armed = True
            with self.assertRaises(AssertionError):
                successor.assert_current()
        finally:
            earlier.write_bytes(earlier_bytes)
        successor.assert_current()

    def test_false_callback_symlink_root_and_optimized_python_rejected(self):
        with self.assertRaises(AssertionError):
            DialogFocusFiniteSourceV5(self.root, line=self.line, read=lambda _: b'wrong')
        link = self.root.parent / (self.root.name + '-link')
        link.symlink_to(self.root, target_is_directory=True)
        try:
            with self.assertRaises(AssertionError):
                DialogFocusFiniteSourceV5(link, line=self.line)
        finally:
            link.unlink()
        code = ("import sys;sys.path.insert(0,sys.argv[1]);"
                "from dialog_focus_finite_source_successor_v5 import DialogFocusFiniteSourceV5;"
                "\ntry: DialogFocusFiniteSourceV5(sys.argv[2])\n"
                "except RuntimeError as error:\n"
                " assert 'optimized Python' in str(error)\n"
                "else: raise RuntimeError('optimized constructor accepted')\n")
        child = subprocess.run([sys.executable, '-O', '-c', code, str(ROOT / 'scripts'), str(self.root)],
                               cwd=ROOT, text=True, capture_output=True, timeout=30)
        self.assertEqual(child.returncode, 0, child.stderr)


if __name__ == '__main__':
    unittest.main()
