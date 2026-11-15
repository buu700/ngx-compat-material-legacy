# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Current detector source review admission and authentic transitions."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ChangeDetectorCurrentAdmission(unittest.TestCase):
    def test_source_admission_and_transitions(self):
        result = subprocess.run(['node', 'tests/change_detector_current_5628_admission_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual((report['selected'], report['transitions']), (10, 14))
        self.assertTrue(report['source_only_result'])
        self.assertTrue(report['semantic_review_required'])
