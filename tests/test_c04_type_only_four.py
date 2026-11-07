# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license that can be
# found in the LICENSE file at https://angular.io/license
"""Four exact original type-only source decisions; no runtime claim."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TypeOnlyFourTests(unittest.TestCase):
    def test_original_hunks_and_current_source_bindings(self):
        run = subprocess.run(['node', 'tests/c04_type_only_four_probe.mjs'], cwd=ROOT,
                             text=True, capture_output=True, check=False)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        result = json.loads(run.stdout)
        self.assertEqual(result['individual_reviews'], 4)
        self.assertEqual(result['upstream_files'], 14)
        self.assertEqual(len(result['controls']), 7)

    def test_actual_checker_accepts_main_and_rejects_wrong_scope(self):
        run = subprocess.run(['node', 'tests/c04_type_only_four_checker_probe.mjs'], cwd=ROOT,
                             text=True, capture_output=True, check=False)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        result = json.loads(run.stdout)
        self.assertEqual(result['main_positive'], 4)
        self.assertEqual(result['wrong_line_rejected'], 4)
        self.assertEqual(result['forged_decision_rejected'], 1)
        self.assertEqual(result['stale_source_rejected'], 1)
