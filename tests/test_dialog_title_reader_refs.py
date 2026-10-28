# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""A separate Python implementation authenticates metadata and rejects real byte faults."""
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('dialog_title_reader_refs', ROOT / 'tests/dialog_title_reader_refs.py')
REFS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(REFS)


class DialogTitleReaderRefsTests(unittest.TestCase):
    def test_reverse_proofs_exact_aliases_and_cold_byte_faults(self):
        packet = json.loads((ROOT / REFS.PACKET).read_bytes())
        original = Path.read_bytes
        rejected = 0
        for row in packet['code_subjects']:
            prior = REFS.title_prior_tool_bytes(ROOT, row['path'])
            self.assertEqual(REFS.SHA(prior), row['before']['sha256'])
            for side in ('before', 'after'):
                self.assertEqual(REFS.qualified_title_reader_reference(ROOT, dict(path=row['path'], **row[side])), dict(path=row['path'], **row['after']))
            for bad in [dict(path=row['path'], sha256='0' * 64), dict(path=row['path'], **{**row['before'], 'bytes': 0})]:
                with self.assertRaises(AssertionError):
                    REFS.qualified_title_reader_reference(ROOT, bad)
                rejected += 1
            selected = ROOT / row['path']
            def corrupt(path):
                raw = original(path)
                return raw + b'\n' if path == selected else raw
            with patch.object(Path, 'read_bytes', corrupt):
                with self.assertRaises(AssertionError):
                    REFS.title_prior_tool_bytes(ROOT, row['path'])
            rejected += 1
        selected = ROOT / REFS.PACKET
        with patch.object(Path, 'read_bytes', lambda path: original(path) + (b' ' if path == selected else b'')):
            with self.assertRaises(AssertionError):
                REFS.title_prior_tool_bytes(ROOT, packet['code_subjects'][0]['path'])
        rejected += 1
        self.assertEqual(rejected, 28)
        for path in ['projects/ngx-material-legacy/legacy-dialog/dialog-content-directives.ts', 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-state.ts']:
            self.assertEqual(REFS.title_prior_tool_bytes(ROOT, path), (ROOT / path).read_bytes())
            self.assertIsNone(REFS.qualified_title_reader_reference(ROOT, dict(path=path, sha256='0' * 64)))


if __name__ == '__main__':
    unittest.main()
