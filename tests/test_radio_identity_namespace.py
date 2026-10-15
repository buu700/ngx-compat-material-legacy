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
        result = subprocess.run(['node', 'tests/radio_identity_namespace_probe.mjs'], cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in {'subjects': 3, 'contexts': 9, 'positive': 3, 'negative': 6, 'owned_modules': 8, 'source_requalification_negatives': 4}.items():
            self.assertEqual(observed[field], expected, field)
