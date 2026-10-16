# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Filtered research paths cannot replace complete original change populations."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('upstream_census', ROOT / 'scripts/upstream_complete_patch_census.py')
census = importlib.util.module_from_spec(spec)
spec.loader.exec_module(census)


class CompleteOriginalCensusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix='ngx-complete-census-test-')
        cls.repo = Path(cls.temporary.name)
        def run(*args):
            return subprocess.check_output(['git', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                                             *args], cwd=cls.repo)
        cls.run_git = staticmethod(run)
        run('init', '-q', '--object-format=sha1')
        for name in ['runtime.ts', 'fixture.spec.ts']:
            (cls.repo / name).write_text('original\n')
        run('add', '.')
        run('-c', 'user.name=Census fixture', '-c', 'user.email=fixture@example.invalid',
            '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Original synthetic files')
        first = run('rev-parse', 'HEAD').decode().strip()
        for name in ['runtime.ts', 'fixture.spec.ts']:
            (cls.repo / name).write_text('changed\n')
        run('add', '.')
        run('-c', 'user.name=Census fixture', '-c', 'user.email=fixture@example.invalid',
            '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Runtime and test change together')
        second = run('rev-parse', 'HEAD').decode().strip()
        cls.expected = [first, second]
        revisions = ('\n'.join(cls.expected) + '\n').encode()
        cls.objects = census.git(cls.repo / '.git', ['cat-file', '--batch'], revisions)
        cls.changes = census.git(cls.repo / '.git', ['diff-tree', '--stdin', '-r', '--root',
                                                  '--no-renames', '--raw', '--no-abbrev', '-z'], revisions)

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def test_real_git_objects_and_complete_root_and_parent_diffs(self):
        objects = census.commit_objects(self.objects, self.expected)
        changes = census.complete_changes(self.changes, self.expected)
        self.assertEqual(objects[self.expected[0]]['parents'], [])
        self.assertEqual(objects[self.expected[1]]['parents'], [self.expected[0]])
        self.assertEqual([row['status'] for row in changes[self.expected[0]]], ['A', 'A'])
        self.assertEqual([row['status'] for row in changes[self.expected[1]]], ['M', 'M'])
        full = [row['path'] for row in changes[self.expected[1]]]
        self.assertEqual(full, ['fixture.spec.ts', 'runtime.ts'])
        comparison = census.compare_paths(full, ['fixture.spec.ts'])
        self.assertFalse(comparison['same_complete_set'])
        self.assertEqual(comparison['omitted_original_paths'], ['runtime.ts'])
        self.assertTrue(census.compare_paths(full, full)['exact_complete_population'])

    def test_truncated_forged_or_extra_commit_responses(self):
        for raw in [self.objects[:-1], self.objects[:-10], self.objects + b'extra',
                    self.objects.replace(b' commit ', b' blob ', 1),
                    self.objects.replace(b'tree ', b'tree!', 1)]:
            with self.subTest(size=len(raw)), self.assertRaises((AssertionError, ValueError)):
                census.commit_objects(raw, self.expected)
        with self.assertRaises(AssertionError):
            census.commit_objects(self.objects, list(reversed(self.expected)))

    def test_duplicate_commits_and_merges_are_not_empty_scope(self):
        first = self.run_git('cat-file', 'commit', self.expected[0])
        response = self.expected[0].encode() + b' commit ' + str(len(first)).encode() + b'\n' + first + b'\n'
        with self.assertRaisesRegex(AssertionError, 'duplicate'):
            census.commit_objects(response + response, [self.expected[0], self.expected[0]])
        merge = first.replace(b'\n\n', ('\nparent ' + self.expected[0] + '\nparent ' + self.expected[1] + '\n\n').encode(), 1)
        sha = census.git_object('commit', merge)
        response = sha.encode() + b' commit ' + str(len(merge)).encode() + b'\n' + merge + b'\n'
        with self.assertRaisesRegex(AssertionError, 'merge needs'):
            census.commit_objects(response, [sha])

    def test_unparsed_missing_foreign_and_duplicate_change_records(self):
        zero = b'0' * 40
        for raw in [self.changes[:-1], b'foreign\0' + self.changes,
                    self.changes.replace(self.expected[0].encode(), zero, 1),
                    self.changes + self.expected[0].encode() + b'\0']:
            with self.subTest(size=len(raw)), self.assertRaises(AssertionError):
                census.complete_changes(raw, self.expected)
        with self.assertRaisesRegex(AssertionError, 'incomplete original SHA population'):
            census.complete_changes(self.changes, [*self.expected, '0' * 40])

    def test_paths_statuses_and_modes_are_framed_exactly(self):
        second = self.expected[1].encode()
        # Reuse a complete authenticated actual Git entry, then corrupt only its
        # framing/path/mode. These controls cannot execute the upstream code.
        tokens = self.changes.split(b'\0')
        start = tokens.index(second)
        meta, path = tokens[start + 1:start + 3]
        for suffix in [meta + b'\0', meta + b'\0../escape.ts\0',
                       meta.replace(b' M', b' R100') + b'\0' + path + b'\0',
                       meta.replace(b':100644', b':000000') + b'\0' + path + b'\0',
                       meta + b'\0' + path + b'\0' + meta + b'\0' + path + b'\0']:
            with self.subTest(suffix=suffix[:40]), self.assertRaises(AssertionError):
                census.complete_changes(second + b'\0' + suffix, [self.expected[1]])

    def test_wildcards_and_duplicates_do_not_prove_full_membership(self):
        for listed in [None, [], ['src/**/*.ts'], ['runtime.ts', 'runtime.ts']]:
            with self.subTest(listed=listed):
                result = census.compare_paths(['fixture.spec.ts', 'runtime.ts'], listed)
                self.assertFalse(result['same_complete_set'])
        result = census.compare_paths(['fixture.spec.ts', 'runtime.ts'], ['runtime.ts', 'fixture.spec.ts'])
        self.assertTrue(result['same_complete_set'])
        self.assertFalse(result['exact_complete_population'])
