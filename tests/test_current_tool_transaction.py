# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import pathlib
import importlib.util
import sys
import unittest
import tempfile
import subprocess
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from current_sass_tool_references import CurrentSassToolReferences

class ToolTransactionTest(unittest.TestCase):
    def test_root_transaction(self):
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        alias = pathlib.Path(scratch.name) / 'root'
        alias.symlink_to(ROOT, target_is_directory=True)
        spec = importlib.util.spec_from_file_location('alternate_current_tool_test', ROOT / 'scripts/current_sass_tool_references.py')
        alternate = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(alternate)
        baseline = CurrentSassToolReferences(ROOT)
        fixture = pathlib.Path(scratch.name) / 'fixture'
        fixture.mkdir()
        for ref in baseline.bound:
            dest = fixture / ref['path']
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / ref['path'], dest)
        gitdir = subprocess.check_output(['git','rev-parse','--absolute-git-dir'],cwd=ROOT,text=True).strip()
        (fixture / '.git').write_text('gitdir: ' + gitdir + '\n')
        fixture_subject = CurrentSassToolReferences(fixture)
        self.assertEqual(fixture_subject.epoch, 7)
        future = baseline.bound[-1]['path']
        first_paths = []
        class StopProbe(Exception): pass
        def record(path):
            first_paths.append(path)
            if len(first_paths) == 2: raise StopProbe()
            return (fixture / path).read_bytes()
        with self.assertRaises(StopProbe):
            CurrentSassToolReferences(fixture, read=record)
        self.assertEqual(len(first_paths), 2)
        self.assertNotIn(future, first_paths)
        target = fixture / future
        original = target.read_bytes()
        self.assertTrue(original)
        altered = bytes([original[0] ^ 1]) + original[1:]
        calls = []
        def cross_read(path):
            raw = (fixture / path).read_bytes()
            calls.append(path)
            if len(calls) == 1: target.write_bytes(altered)
            if len(calls) == 2: target.write_bytes(original)
            return raw
        try:
            with self.assertRaises(AssertionError):
                CurrentSassToolReferences(fixture, read=cross_read)
            self.assertEqual(len(calls), 1)
        finally:
            target.write_bytes(original)
        try:
            target.write_bytes(altered)
            with self.assertRaises(AssertionError): fixture_subject.assert_current()
            with self.assertRaises(AssertionError): CurrentSassToolReferences(fixture)
        finally:
            target.write_bytes(original)
        fixture_subject.assert_current()
        scripts, saved_scripts = fixture / 'scripts', pathlib.Path(scratch.name) / 'fixture-scripts'
        scripts.rename(saved_scripts)
        scripts.symlink_to(saved_scripts, target_is_directory=True)
        try:
            with self.assertRaises(AssertionError): fixture_subject.assert_current()
            with self.assertRaises(AssertionError): CurrentSassToolReferences(fixture)
        finally:
            scripts.unlink()
            saved_scripts.rename(scripts)
        fixture_subject.assert_current()
        caught = []
        def nested_constructor(path):
            try:
                CurrentSassToolReferences(alias)
            except RuntimeError:
                caught.append(True)
            return (ROOT / path).read_bytes()
        with self.assertRaisesRegex(RuntimeError, 'reentrant current tool root transaction'):
            CurrentSassToolReferences(ROOT, read=nested_constructor)
        self.assertEqual(len(caught), 1)
        state = {'armed': False, 'nested': None}
        def read(path):
            if state['armed']:
                state['armed'] = False
                try: state['nested']()
                except RuntimeError: pass
            return (ROOT / path).read_bytes()
        subject = CurrentSassToolReferences(ROOT, read=read)
        self.assertEqual(subject.epoch, 7)
        row = subject.transitions[0]
        known = dict(path=row['path'], **row['before'])
        unknown = dict(path='scripts/unknown-tool.mjs', sha256='0'*64, bytes=0)
        nested_success = []
        def other_root():
            self.assertEqual(CurrentSassToolReferences(fixture).epoch, 7)
            nested_success.append(True)
        state.update(armed=True, nested=other_root)
        subject.qualify(known)
        self.assertEqual(nested_success, [True])
        def alternate_after_tampering():
            registry = sys.modules['_ngx_compat_material_legacy_current_tool_root_transactions_v1']
            self.assertIsInstance(registry, tuple)
            self.assertFalse(hasattr(registry, 'roots'))
            with self.assertRaisesRegex(RuntimeError, 'reentrant current tool root transaction'):
                alternate.CurrentSassToolReferences(ROOT)
            with self.assertRaises(TypeError): registry[0] = None
        for outer, nested in [
            (lambda: subject.qualify(known), lambda: subject.qualify(unknown)),
            (lambda: subject.comparison_bytes(known), lambda: subject.predecessor_reference(unknown)),
            (subject.assert_current, lambda: subject.owns_reference(unknown)),
            (lambda: subject.qualify(known), lambda: CurrentSassToolReferences(ROOT)),
            (lambda: subject.qualify(known), alternate_after_tampering),
        ]:
            state.update(armed=True, nested=nested)
            with self.assertRaisesRegex(RuntimeError, 'reentrant current tool root transaction'):
                outer()
            self.assertFalse(state['armed'])
        subject.assert_current()

if __name__ == '__main__': unittest.main()
