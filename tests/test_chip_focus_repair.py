# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current focus repair, retained native roster and explicit historical boundary."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest

from tests.chip_lifecycle_admission_context import admission_before_member
from tests.chip_focus_repair_context import (
    INPUT, focus_before_member, focus_historical_product_diff, focus_repair_context,
)

ROOT = Path(__file__).resolve().parents[1]
sha = lambda data: hashlib.sha256(data).hexdigest()


class ChipFocusRepair(unittest.TestCase):
    def test_current_focus_protocols_reproduce_before_and_reject_semantic_regressions(self):
        command = ['node', 'tests/chip_focus_repair_probe.mjs']
        if os.environ.get('NGX_CHIP_FOCUS_DIAGNOSTIC'):
            command.append(os.environ['NGX_CHIP_FOCUS_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-10000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['current_focus_protocol_cases'], 9)
        self.assertEqual(report['before_counterexamples_reproduced'], 2)
        self.assertEqual(report['current_counterexamples_remaining'], 0)
        self.assertEqual(report['semantic_mutants'], 9)
        self.assertEqual(report['controls'], 27)
        self.assertEqual(report['old_case_identities_preserved'], 2227)
        self.assertEqual(report['full_native_case_count'], 2236)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_complete_preimages_ledger_and_unrelated_product_members_are_preserved(self):
        data, prior = focus_repair_context(ROOT)
        self.assertEqual(len(prior['sources']), 11)
        for source in prior['sources']:
            original = subprocess.check_output(
                ['git', '--no-replace-objects', 'show', prior['source_parent'] + ':' + source['path']],
                cwd=ROOT,
            )
            self.assertEqual(original, source['text'].encode())
            self.assertEqual(sha(original), source['sha256'])
        self.assertEqual(sha(admission_before_member(ROOT,prior['ledger_path'])), prior['ledger_sha256'])
        for member in prior['product_members']:
            if member['path'] not in data['product_scope_changed_paths']:
                self.assertEqual(sha((ROOT/member['path']).read_bytes()), member['sha256'], member['path'])
        for path in [
            'scripts/upstream-chip-lifecycle-scope.mjs',
            'compatibility/rc/chip-lifecycle-scope-source-review.json',
            'compatibility/rc/chip-lifecycle-scope-native-proposal.json',
        ]:
            self.assertEqual((ROOT/path).read_bytes(), next(s['text'].encode() for s in prior['sources'] if s['path']==path))
        self.assertEqual(len(prior['roster']['ids']), 2227)
        self.assertEqual(len(prior['roster']['discovery_negative_ids']), 5)
        for base in data['allowed_historical_product_bases']:
            self.assertEqual(focus_historical_product_diff(ROOT, base, ['projects','testing','reference','fixtures']), b'')

    def test_historical_view_rehashes_live_inputs_and_cannot_be_poisoned(self):
        read = lambda path: (ROOT/path).read_bytes()
        data, prior = focus_repair_context(ROOT)
        source = data['current_members'][0]['path']
        old = next(s['text'].encode() for s in prior['sources'] if s['path']==source)
        data['current_members'][0]['sha256'] = '0'*64
        prior['sources'][0]['text'] = 'poisoned'
        self.assertEqual(focus_before_member(ROOT, source), old)
        clean, clean_prior = focus_repair_context(ROOT)
        self.assertNotEqual(clean['current_members'][0]['sha256'], '0'*64)
        self.assertNotEqual(clean_prior['sources'][0]['text'], 'poisoned')
        for member in clean['current_members']:
            with self.subTest(unknown=member['path']), self.assertRaises(AssertionError):
                focus_before_member(ROOT, member['path'], lambda p: read(p)+b' unreviewed' if p==member['path'] else read(p))
        for path in [INPUT, clean['prior']['path'], 'scripts/chip-focus-repair.mjs', clean['current_raw_contract_source']['path']]:
            with self.subTest(corruption=path), self.assertRaises((AssertionError, ValueError)):
                focus_repair_context(ROOT, lambda p: read(p)+b' changed' if p==path else read(p))
        with self.assertRaises(AssertionError):
            focus_historical_product_diff(ROOT, 'unapproved-baseline', ['projects'])
        with self.assertRaises(AssertionError):
            focus_historical_product_diff(ROOT, clean['source_parent'], ['scripts'])


if __name__ == '__main__':
    unittest.main()
