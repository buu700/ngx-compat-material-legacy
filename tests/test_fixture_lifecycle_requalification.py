# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact evidence pointer successor and unchanged source conclusions/row bytes."""
import ast
import gzip
import json
import os
from pathlib import Path
import subprocess
import unittest
from tests.tab_portal_source_requalification import historical_source_members, historical_member_bytes
from tests.test_ripple_global_options_integration import rows
from tests.fixture_lifecycle_native_requalification import parent_bytes as native_parent_bytes

ROOT = Path(__file__).resolve().parents[1]


class FixtureLifecycleRequalification(unittest.TestCase):
    def test_raw_current_successor_and_forgery_rejections(self):
        command = ['node', 'tests/fixture_lifecycle_requalification_probe.mjs']
        if os.environ.get('NGX_FIXTURE_LIFECYCLE_REQUALIFICATION_DIAGNOSTIC'):
            command.append(os.environ['NGX_FIXTURE_LIFECYCLE_REQUALIFICATION_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=150)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-10000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['requalified'], 167)
        self.assertEqual(report['new_closures'], 0)
        self.assertEqual(report['rejection_controls'], 34)
        self.assertEqual(report['canonical_insufficient'], 0)
        self.assertFalse(report['actual_legacy_packed_native_or_floor_qualified'])

    def test_only_review_pointers_change_and_old_conclusions_and_assertions_survive(self):
        parent_members = historical_source_members(ROOT)
        prior = json.loads(gzip.decompress((ROOT / 'compatibility/rc/fixture-lifecycle-requalification-prior.json.gz').read_bytes()))
        inputs = json.loads((ROOT / 'compatibility/rc/fixture-lifecycle-requalification-inputs.json').read_bytes())
        selected = {(r['file'],r['module'],r['symbol']) for r in prior['selected']}
        for member in prior['ledger_preimages']:
            after = historical_member_bytes(ROOT, member['path'], parent_members).decode(); restored = after; count = 0
            for (a, old), (b, new) in zip(rows(member['text']), rows(after)):
                identity = (a['file'], a['module'], a['symbol'])
                self.assertEqual(identity, (b['file'], b['module'], b['symbol']))
                if identity in selected:
                    self.assertEqual(b, dict(a, source_review=inputs['new_review']))
                    restored = restored.replace(new, old, 1); count += 1
                else:
                    self.assertEqual(new, old)
            self.assertEqual(count, 1 if 'current-dispositions' in member['path'] else 166)
            self.assertEqual(restored, member['text'])
        original = json.loads(prior['review_preimage']['text'])['reviews']
        current = json.loads((ROOT / inputs['new_review']['path']).read_bytes())['reviews']
        self.assertEqual(len(original),167); self.assertEqual(len(current),167)
        for before, after in zip(original,current):
            for key in ['file','module','symbol','candidate_source_sha256','conclusion','decision','reviewer']:
                self.assertEqual(before[key],after[key],key)
        for edit in inputs['context_edits']:
            before = next(m['text'] for m in prior['context_preimages'] if m['path']==edit['path'])
            expected = before
            for start, end in edit['substitutions']:
                self.assertEqual(expected.count(start),1); expected=expected.replace(start,end)
            actual = native_parent_bytes(ROOT, edit['path']).decode(); self.assertEqual(actual,expected)
            if edit['path'].endswith('.py'):
                def assertions(text):
                    return [n.func.attr for n in ast.walk(ast.parse(text)) if isinstance(n,ast.Call)
                            and isinstance(n.func,ast.Attribute) and n.func.attr.startswith('assert')]
                self.assertEqual(assertions(before),assertions(actual))


if __name__ == '__main__':
    unittest.main()
