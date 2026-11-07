# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
import copy
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import historical_inventory_nine_spec_successor as successor


class NineSpecSuccessorTest(unittest.TestCase):
    def read_overrides(self, changes):
        return lambda path: changes.get(path, (ROOT / path).read_bytes())

    def test_exact_successor_and_snapshots(self):
        result = successor.verify_successor(ROOT)
        self.assertEqual(result['members'], 9)
        self.assertFalse(result['execution_credit'])
        previous = json.loads(successor.git(ROOT, 'show', successor.HEAD + ':' + successor.INVENTORY))
        current = json.loads((ROOT / successor.INVENTORY).read_bytes())
        for member in successor.MEMBERS:
            path = member['candidate']
            old = next(r for r in previous['rows'] if r['candidate'] == path)
            row = next(r for r in current['rows'] if r['candidate'] == path)
            self.assertEqual(row['prior_candidate_snapshots'][-1]['execution'], old['execution'])
            self.assertEqual(row['prior_candidate_snapshots'][-1]['candidate_sha256'], old['candidate_sha256'])
            self.assertEqual(row['execution']['state'], 'not-executed')
            self.assertIsNone(row['execution']['receipt'])
            self.assertFalse(row['execution']['bound_to_current_head'])

    def test_wrong_candidate_hash_and_late_candidate(self):
        path = successor.MEMBERS[0]['candidate']
        with self.assertRaisesRegex(ValueError, 'candidate bytes'):
            successor.verify_successor(ROOT, read_member=self.read_overrides({path: b'wrong'}))

    def test_wrong_member(self):
        members = copy.deepcopy(successor.MEMBERS)
        members[0]['candidate'] = members[1]['candidate']
        with patch.object(successor, 'MEMBERS', members), self.assertRaisesRegex(ValueError, 'membership'):
            successor.verify_successor(ROOT)

    def test_wrong_line(self):
        path = 'projects/ngx-material-legacy/package.json'
        data = json.loads((ROOT / path).read_bytes())
        data['version'] = '21.0.0'
        with self.assertRaisesRegex(ValueError, 'wrong package line'):
            successor.verify_successor(ROOT, read_member=self.read_overrides({path: successor.encoded(data)}))

    def test_stale_historical_reference(self):
        path = successor.REFERENCE
        with self.assertRaisesRegex(ValueError, 'historical CSV changed'):
            successor.verify_successor(ROOT, read_member=self.read_overrides({path: b'stale'}))

    def test_changed_execution(self):
        data = json.loads((ROOT / successor.INVENTORY).read_bytes())
        row = next(r for r in data['rows'] if r['candidate'] == successor.MEMBERS[0]['candidate'])
        row['execution']['state'] = 'passed'
        row['execution']['bound_to_current_head'] = True
        with self.assertRaisesRegex(ValueError, 'not exact'):
            successor.verify_successor(ROOT, read_member=self.read_overrides({successor.INVENTORY: successor.encoded(data)}))

    def test_previous_authority_cannot_change(self):
        with self.assertRaisesRegex(ValueError, 'authority changed'):
            successor.verify_successor(ROOT, read_member=self.read_overrides({successor.PREVIOUS_VERIFIER: b'changed'}))


if __name__ == '__main__':
    unittest.main()
