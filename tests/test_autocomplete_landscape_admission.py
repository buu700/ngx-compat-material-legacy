# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact landscape native requirements preserve the prior full-run validator."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AutocompleteLandscapeAdmissionTests(unittest.TestCase):
    def test_exact_named_cases_and_real_admission_corruption_controls(self):
        result = subprocess.run(['node', 'tests/autocomplete_landscape_admission_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-6000:])
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['prior_scopes_preserved'], 10)
        self.assertEqual(observed['named_cases'], 5)
        self.assertEqual(observed['full_historical_cases'], 2236)
        self.assertEqual(observed['synthetic_rejections'], 28)
        self.assertFalse(observed['actual_browser_artifact_or_floor_executed'])
