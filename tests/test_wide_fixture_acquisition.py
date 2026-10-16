# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Wide original-source capture cannot accept a filtered or unrelated patch census."""
import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / (name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


class WideFixtureAcquisitionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.producer = module('acquire-upstream-wide-fixture-originals')
        cls.original = module('acquire-upstream-spec-originals')
        cls.worksheet = json.loads((ROOT / 'compatibility/rc/spec-wide-fixture-source-worksheet.json').read_text())
        cls.census = json.loads(gzip.decompress((ROOT / 'compatibility/rc/upstream-complete-patch-census.json.gz').read_bytes()))

    def test_two_complete_sealed_censuses_and_unchanged_original_bound(self):
        rows = self.producer.select_subjects(self.worksheet, self.census)
        self.assertEqual([row['sha'] for row in rows], list(self.producer.EXPECTED))
        self.assertEqual([len(row['complete_changed_files']) for row in rows], [187, 175])
        self.assertEqual(hashlib.sha256((ROOT / 'scripts/acquire-upstream-spec-originals.py').read_bytes()).hexdigest(),
                         'f3aaeddf694d07b9fc9f96615d6d46e1ae56e29b5b6a4f2e44d11a0ed2d9dac4')
        with self.assertRaises(AssertionError):
            self.original.select_subjects(self.worksheet, self.census)
        small = {**self.worksheet, 'subjects': ['2ad427438e903cb9f40666207287b13b132a2bc1']}
        self.assertEqual(len(self.original.select_subjects(small, self.census)[0]['complete_changed_files']), 1)
        with self.assertRaises(AssertionError):
            self.producer.select_subjects(small, self.census)

    def test_reject_changed_selection_or_partial_population(self):
        for subjects in [[], self.worksheet['subjects'][:1], list(reversed(self.worksheet['subjects'])),
                         [self.worksheet['subjects'][0]] * 2]:
            with self.subTest(subjects=subjects), self.assertRaises(AssertionError):
                self.producer.select_subjects({**self.worksheet, 'subjects': subjects}, self.census)
        other_line = '21.x' if self.worksheet['line'] == 'main' else 'main'
        with self.assertRaises(AssertionError):
            self.producer.select_subjects({**self.worksheet, 'line': other_line}, self.census)
        for commits in [self.census['commits'][:-1], self.census['commits'][:-1] + [self.census['commits'][0]]]:
            with self.assertRaises(AssertionError):
                self.producer.select_subjects(self.worksheet, {**self.census, 'commits': commits})

    def test_reject_rehashed_incomplete_or_changed_original_identity(self):
        def mutate(action):
            commits = list(self.census['commits'])
            at = next(i for i, row in enumerate(commits) if row['sha'] == self.worksheet['subjects'][0])
            commits[at] = copy.deepcopy(commits[at]); action(commits[at])
            with self.assertRaises(AssertionError):
                self.producer.select_subjects(self.worksheet, {**self.census, 'commits': commits})

        mutate(lambda row: row['complete_changed_files'].pop())
        mutate(lambda row: row['complete_changed_files'].reverse())
        mutate(lambda row: row['complete_changed_files'][0].update(path='src/material/foreign.spec.ts'))
        mutate(lambda row: row['complete_changed_files'][0].update(status='A'))
        mutate(lambda row: row['complete_changed_files'][0].update(before_mode='100755'))
        mutate(lambda row: row['complete_changed_files'][0].update(after_blob='0' * 40))

        def changed_commit(row):
            row['raw_commit'] += '\n'
            row['raw_commit_sha256'] = hashlib.sha256(row['raw_commit'].encode()).hexdigest()

        mutate(changed_commit)


if __name__ == '__main__':
    unittest.main()
