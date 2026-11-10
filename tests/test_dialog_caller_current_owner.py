# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license in LICENSE.
"""Current dialog evidence must bind physical source and reject stale contexts."""
import gzip
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import subprocess
import unittest
from tests.dialog_caller_current_epoch import ROOT, dialog_command


class DialogCallerCurrentOwner(unittest.TestCase):
    def test_forged_line_capture_is_rejected(self):
        with TemporaryDirectory() as path:
            root = Path(path)
            target = root / 'compatibility/rc/dialog-caller-prior.json.gz'
            target.parent.mkdir(parents=True)
            target.write_bytes(gzip.compress(json.dumps({'line': '21.x'}).encode()))
            with patch('tests.dialog_caller_current_epoch.ROOT', root):
                with self.assertRaisesRegex(AssertionError, 'unauthenticated'):
                    dialog_command('tests/dialog_caller_review_probe.mjs', 'review')

    def test_current_source_and_wrong_context_controls(self):
        # Authenticate the line before importing the MAIN-only implementation.
        command = dialog_command('tests/dialog_caller_review_probe.mjs', 'review')
        if command[1] == 'tests/dialog_caller_review_probe.mjs':
            self.skipTest('current dialog owner is MAIN only')
        child = subprocess.run(['node', 'tests/dialog_caller_current_owner_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-10000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['source_roles'], 88)
        self.assertEqual(result['corruptions_rejected'], 11)
        self.assertTrue(result['before_source_rejected'])
        self.assertTrue(result['late_source_rejected'])
        self.assertFalse(result['native_packed_AOT_or_full_floor_qualified'])
