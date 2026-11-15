# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class RadioBoundaryTests(unittest.TestCase):
    def test_genuine_subjects_and_rejection_controls(self):
        result = subprocess.run(['node', 'tests/radio_dispatcher_probe.mjs'], cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in {'roles': 2, 'methods': 7, 'contexts': 5, 'negative_controls': 9, 'import_alias_positive': True}.items():
            self.assertEqual(observed[field], expected, field)
