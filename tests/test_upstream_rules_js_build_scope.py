# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Complete original source reconstruction and conservative proposal controls."""
import copy
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from upstream_rules_js_build_scope import analyze_originals, delta, read_subjects, review, verify_review


class RulesJsBuildScopeTests(unittest.TestCase):
    def test_complete_originals_and_corruptions(self):
        subjects = read_subjects(ROOT)
        result = analyze_originals(subjects)
        self.assertEqual(result['original_file_occurrences'], 135)
        self.assertEqual(result['original_hunks'], 195)
        self.assertEqual(result['exact_inverse_file_pairs'], 45)
        self.assertEqual(result['reapplication_identical_file_pairs'], 42)
        self.assertFalse(result['upstream_programs_or_tools_executed'])
        for mutation in ('commit', 'patch', 'missing-file', 'extra-blob', 'vendor-bytes', 'false-hunk-count', 'missing-revert', 'path'):
            with self.subTest(mutation=mutation):
                bad = copy.deepcopy(subjects)
                if mutation == 'commit':
                    bad['reviews'][0]['raw_commit'] += '\n'
                elif mutation == 'patch':
                    bad['reviews'][0]['patch'] += '\n'
                elif mutation == 'missing-file':
                    bad['reviews'][0]['members'].pop()
                elif mutation == 'extra-blob':
                    bad['blobs'].append(bad['blobs'][0])
                elif mutation == 'vendor-bytes':
                    vendor = next(b for b in bad['blobs'] if b['sha256'] == 'cc00dce5de4f68d11450519a0f69eadf2a1cbe5cc0d8e740bfac817a31d76874')
                    vendor['text'] += '\n'
                elif mutation == 'false-hunk-count':
                    bad['reviews'][0]['hunks'] = 64
                elif mutation == 'missing-revert':
                    bad['reviews'].pop(1)
                else:
                    bad['reviews'][0]['members'][0]['path'] = 'src/owned-runtime.ts'
                with self.assertRaises(AssertionError):
                    analyze_originals(bad)

    def test_complete_hunks_include_context_tail_empty_and_no_newline(self):
        before, after = 'a\nb\nc\nd\n', 'a\nB\nc\nD\n'
        patch = '@@ -1,2 +1,2 @@\n a\n-b\n+B\n@@ -3,2 +3,2 @@\n c\n-d\n+D\n'
        self.assertEqual(delta(before, after, patch), 2)
        self.assertEqual(delta(None, 'new\n', '@@ -0,0 +1 @@\n+new\n'), 1)
        self.assertEqual(delta('old\n', None, '@@ -1 +0,0 @@\n-old\n'), 1)
        self.assertEqual(delta('old', 'new', '@@ -1 +1 @@\n-old\n\\ No newline at end of file\n+new\n\\ No newline at end of file\n'), 1)
        for old, new, diff in ((before, after+'unreviewed\n', patch),
                                ('wrong\n'+before, after, patch),
                                (before, after, patch.replace('-1,2', '-1,3')),
                                (before, after, patch.split('@@ -3')[0])):
            with self.assertRaises(AssertionError):
                delta(old, new, diff)

    def test_source_matched_proposal_and_false_claim_controls(self):
        body = review(ROOT)
        self.assertTrue(verify_review(ROOT, body))
        self.assertEqual(body['candidate_context']['product_member_count'], 1142)
        self.assertEqual(len(body['candidate_context']['retained_historical_root_Bazel_members']), 3)
        self.assertEqual(len(body['individual_decisions']), 3)
        for mutation in ('wrong-line', 'inherited-runtime', 'source-digest', 'hidden-root-Bazel',
                         'borrowed-peer', 'canonical-admitted', 'runtime-qualified', 'vendor-cleared'):
            with self.subTest(mutation=mutation):
                bad = copy.deepcopy(body)
                if mutation == 'wrong-line':
                    bad['line'] = '21.x' if body['line'] == 'main' else 'main'
                elif mutation == 'inherited-runtime':
                    bad['individual_decisions'][0]['proposed_disposition'] = 'inherited'
                elif mutation == 'source-digest':
                    bad['candidate_context']['product_members'][0]['sha256'] = '0'*64
                elif mutation == 'hidden-root-Bazel':
                    bad['candidate_context']['retained_historical_root_Bazel_members'] = []
                elif mutation == 'borrowed-peer':
                    bad['candidate_context']['installed_peer_manifests']['@angular/cdk']['sha256'] = '0'*64
                elif mutation == 'canonical-admitted':
                    bad['canonical_admitted'] = True
                elif mutation == 'runtime-qualified':
                    bad['current_runtime_or_packed_or_floor_qualified'] = True
                else:
                    bad['upstream_vendor_security_clearance'] = True
                self.assertFalse(verify_review(ROOT, bad))


if __name__ == '__main__':
    unittest.main()
