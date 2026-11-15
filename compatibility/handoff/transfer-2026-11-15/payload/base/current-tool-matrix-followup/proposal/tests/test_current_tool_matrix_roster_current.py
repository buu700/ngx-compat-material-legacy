# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Finite matrix source owner controls; no execution or release admission."""
from pathlib import Path
import unittest

from scripts.current_tool_matrix_source import CurrentToolMatrixSource

ROOT = Path(__file__).resolve().parents[1]


class CurrentToolMatrixRosterCurrentTests(unittest.TestCase):
    def test_physical_callbacks_and_reentry_recover(self):
        state = {'active': False, 'entered': False}
        def read(path):
            data = (ROOT / path).read_bytes()
            if state['active'] and not state['entered']:
                state['entered'] = True
                try:
                    CurrentToolMatrixSource(ROOT)
                except RuntimeError:
                    pass
            return data
        state['active'] = True
        with self.assertRaisesRegex(AssertionError, 'swallowed reentrant'):
            CurrentToolMatrixSource(ROOT, read=read)
        self.assertTrue(state['entered'])
        state.update(active=False, entered=False)
        source = CurrentToolMatrixSource(ROOT, read=read)
        self.assertEqual(len(source.comparison_bytes(source.before)), source.before['bytes'])
        self.assertEqual(len(source.comparison_bytes(source.intermediate)), source.intermediate['bytes'])
        state['active'] = True
        with self.assertRaisesRegex(AssertionError, 'swallowed reentrant'):
            source.assert_current()
        self.assertTrue(state['entered'])
        state['active'] = False
        source.assert_current()
        matrix = 'compatibility/rc/matrices/full-verify.json'
        self.assertEqual(next(x for x in source.bound if x['path'] == matrix)['sha256'],
                         '373500cac166c054945916e6639f861c61d94f74670b73a0e23cdba082d50131')
        with self.assertRaises(AssertionError):
            CurrentToolMatrixSource(ROOT, read=lambda path: b'forged' if path == matrix else (ROOT / path).read_bytes())
        source.assert_current()
