# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Radio document ownership, scheduling and focused-state regression controls."""
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class RadioOwnerDocumentTests(unittest.TestCase):
    def test_owned_method_document_and_focus_controls(self):
        done = subprocess.run(['node', 'tests/radio_owner_document_probe.mjs', str(ROOT)], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(done.returncode, 0, done.stderr)
        report = json.loads(done.stdout)
        self.assertEqual(report['cases'], 7)
        self.assertEqual(report['mutants_rejected'], ['missing-destruction-guard', 'global-document', 'synchronous-focus', 'steal-later-focus', 'missing-disabled-blur', 'missing-destruction-hook'])
