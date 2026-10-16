# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""A bounded review must use complete original test paths on its own line."""
import copy
import gzip
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('upstream_spec_acquisition', ROOT / 'scripts/acquire-upstream-spec-originals.py')
acquisition = importlib.util.module_from_spec(spec)
spec.loader.exec_module(acquisition)


class UpstreamSpecAcquisitionTests(unittest.TestCase):
    def setUp(self):
        self.worksheet = json.loads((ROOT / 'compatibility/rc/spec-peer-test-source-worksheet.json').read_text())
        self.census = json.loads(gzip.decompress((ROOT / acquisition.CENSUS).read_bytes()))

    def test_actual_branch_selection_uses_complete_originals(self):
        selected = acquisition.select_subjects(self.worksheet, self.census)
        self.assertEqual([row['sha'] for row in selected], self.worksheet['subjects'])
        self.assertEqual(sum(len(row['complete_changed_files']) for row in selected), 4)

    def test_empty_duplicate_foreign_and_wrong_line_selections_fail(self):
        for subjects in [[], self.worksheet['subjects'] * 2, ['f' * 40], [self.worksheet['subjects'][0], 'bad']]:
            with self.subTest(subjects=subjects):
                changed = copy.deepcopy(self.worksheet)
                changed['subjects'] = subjects
                with self.assertRaises(AssertionError):
                    acquisition.select_subjects(changed, self.census)
        changed = copy.deepcopy(self.worksheet)
        changed['line'] = '21.x' if changed['line'] == 'main' else 'main'
        with self.assertRaises(AssertionError):
            acquisition.select_subjects(changed, self.census)

    def test_a_filtered_test_path_cannot_hide_production_members(self):
        changed = copy.deepcopy(self.census)
        row = next(row for row in changed['commits'] if row['sha'] == self.worksheet['subjects'][0])
        row['complete_changed_files'].append({**row['complete_changed_files'][0], 'path': 'src/cdk/overlay/overlay.ts'})
        with self.assertRaisesRegex(AssertionError, 'not a complete test-source-only patch'):
            acquisition.select_subjects(self.worksheet, changed)

    def test_incomplete_duplicate_unsafe_and_merge_populations_fail(self):
        for mutation in ['empty', 'duplicate', 'unsafe', 'merge']:
            with self.subTest(mutation=mutation):
                changed = copy.deepcopy(self.census)
                row = next(row for row in changed['commits'] if row['sha'] == self.worksheet['subjects'][0])
                if mutation == 'empty':
                    row['complete_changed_files'] = []
                elif mutation == 'duplicate':
                    row['complete_changed_files'] *= 2
                elif mutation == 'unsafe':
                    row['complete_changed_files'][0]['path'] = 'src/../unreviewed.spec.ts'
                else:
                    row['parents'] *= 2
                with self.assertRaises(AssertionError):
                    acquisition.select_subjects(self.worksheet, changed)
