# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Four complete slider range-input source applicability decisions."""
import copy
import gzip
import importlib.util
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SliderRangeFollowups(unittest.TestCase):
    def test_bounded_original_acquisition_selection(self):
        spec = importlib.util.spec_from_file_location('slider_range_acquire', ROOT / 'scripts/acquire-slider-range-followups.py')
        acquire = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(acquire)
        worksheet = json.loads((ROOT / 'compatibility/rc/slider-range-followup-worksheet.json').read_text())
        census = json.loads(gzip.decompress((ROOT / 'compatibility/rc/upstream-complete-patch-census.json.gz').read_bytes()))
        self.assertEqual(len(acquire.select_subjects(worksheet, census)), 4)
        for kind in ['unknown', 'duplicate', 'wrong-line', 'omitted', 'extra-path', 'wrong-mode']:
            with self.subTest(kind=kind):
                w, c = copy.deepcopy(worksheet), copy.deepcopy(census)
                row = next(x for x in c['commits'] if x['sha'] == w['subjects'][0])
                if kind == 'unknown':
                    w['subjects'][0] = '0' * 40
                elif kind == 'duplicate':
                    w['subjects'][1] = w['subjects'][0]
                elif kind == 'wrong-line':
                    w['line'] = 'other'
                elif kind == 'omitted':
                    row['complete_changed_files'].pop()
                elif kind == 'extra-path':
                    row['complete_changed_files'].append({**row['complete_changed_files'][0], 'path': 'src/unreviewed.ts'})
                else:
                    row['complete_changed_files'][0]['after_mode'] = '100755'
                with self.assertRaises(AssertionError):
                    acquire.select_subjects(w, c)

    def test_source_semantics_and_actual_cli_binding(self):
        result = subprocess.run(['node', 'tests/slider_range_followup_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['individual_subjects'], 4)
        self.assertEqual(observed['semantic_mutants_rejected'], 9)
        self.assertEqual(observed['helper_mutants_rejected'], 16)
        self.assertEqual(observed['actual_CLI_source_binding_cases'], 3)
        self.assertFalse(observed['actual_native_packed_browser_or_floor_qualified'])
