# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Bound acquisition to the six original API changes before any network read."""
import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('sass_inspection_originals', ROOT / 'scripts/acquire-sass-inspection-originals.py')
READER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(READER)


class SassInspectionOriginalsTests(unittest.TestCase):
    def setUp(self):
        self.worksheet = json.loads((ROOT / 'compatibility/rc/upstream-sass-inspection-21x-review-worksheet.json').read_bytes())
        self.census = json.loads(gzip.decompress((ROOT / READER.CENSUS).read_bytes()))

    def test_exact_original_six_commits_and_seventeen_paths(self):
        selected = READER.select_subjects(self.worksheet, self.census)
        self.assertEqual([row['sha'] for row in selected], READER.SASS_INSPECTION_SHAS)
        self.assertEqual(sum(len(row['complete_changed_files']) for row in selected), 17)
        self.assertFalse(self.worksheet['source_review_complete'])
        self.assertEqual(self.worksheet['canonical_decisions_changed'], 0)

    def test_scope_corruption_rejected_before_acquisition(self):
        selected_sha = READER.SASS_INSPECTION_SHAS[0]
        added_sha = READER.SASS_INSPECTION_SHAS[-1]
        def subject(census, sha=selected_sha):
            return next(row for row in census['commits'] if row['sha'] == sha)
        changes = [
            ('unknown-subject', lambda w, c: w['subjects'].__setitem__(0, 'f' * 40)),
            ('duplicate-subject', lambda w, c: w['subjects'].__setitem__(0, w['subjects'][1])),
            ('missing-subject', lambda w, c: w['subjects'].pop()),
            ('wrong-line', lambda w, c: w.__setitem__('line', 'main')),
            ('missing-path', lambda w, c: subject(c)['complete_changed_files'].pop()),
            ('wrong-path', lambda w, c: subject(c)['complete_changed_files'][0].__setitem__('path', 'src/unreviewed.scss')),
            ('changed-status', lambda w, c: subject(c)['complete_changed_files'][0].__setitem__('status', 'D')),
            ('executable-mode', lambda w, c: subject(c)['complete_changed_files'][0].__setitem__('after_mode', '100755')),
            ('changed-addition', lambda w, c: next(row for row in subject(c, added_sha)['complete_changed_files'] if row['path'] == READER.ADDED_SOURCE_PATH).__setitem__('status', 'M')),
            ('existing-before-addition', lambda w, c: next(row for row in subject(c, added_sha)['complete_changed_files'] if row['path'] == READER.ADDED_SOURCE_PATH).__setitem__('before_mode', '100644')),
            ('merge-parent', lambda w, c: subject(c)['parents'].append('0' * 40)),
            ('incomplete-original-population', lambda w, c: c['commits'].pop()),
        ]
        for name, mutate in changes:
            with self.subTest(name=name):
                worksheet, census = copy.deepcopy(self.worksheet), copy.deepcopy(self.census)
                mutate(worksheet, census)
                with self.assertRaises(AssertionError):
                    READER.select_subjects(worksheet, census)

    def test_captured_original_git_objects_and_complete_members(self):
        packet = json.loads(gzip.decompress((ROOT / 'compatibility/rc/upstream-sass-inspection-21x-subjects.json.gz').read_bytes()))
        selected = READER.select_subjects(self.worksheet, self.census)
        self.assertEqual([row['sha'] for row in packet['subjects']], READER.SASS_INSPECTION_SHAS)
        self.assertEqual(sum(row['original_hunks'] for row in packet['subjects']), 49)
        self.assertTrue(packet['source_acquisition_only'])
        self.assertFalse(packet['actual_native_packed_or_floor_qualified'])
        self.assertEqual(packet['g11_claim'], 'not-passed')
        for row, original in zip(packet['subjects'], selected):
            raw = row['raw_commit'].encode()
            self.assertEqual(READER.git_hash('commit', raw), row['sha'])
            self.assertEqual(hashlib.sha256(raw).hexdigest(), original['raw_commit_sha256'])
            self.assertEqual([member['path'] for member in row['members']], READER.EXACT_SOURCE_PATHS[row['sha']])
            self.assertEqual(row['complete_changed_files'], original['complete_changed_files'])
            self.assertEqual(hashlib.sha256(row['diff'].encode()).hexdigest(), row['diff_sha256'])
            self.assertFalse(row['source_review_complete'])
            for member, expected in zip(row['members'], original['complete_changed_files']):
                for side in ['before', 'after']:
                    value = member[side]
                    raw = value['text'].encode()
                    self.assertEqual(value['bytes'], len(raw))
                    self.assertEqual(value['sha256'], hashlib.sha256(raw).hexdigest())
                    self.assertEqual(value['git_blob'], expected[side + '_blob'])
                    if value['git_blob'] == '0' * 40:
                        self.assertEqual(raw, b'')
                    else:
                        self.assertEqual(READER.git_hash('blob', raw), value['git_blob'])
