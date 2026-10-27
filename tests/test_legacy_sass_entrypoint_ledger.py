# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""One source disposition cannot alter unrelated rows or bypass the real guard."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests'))


class LegacySassEntrypointLedgerTests(unittest.TestCase):
    def test_independent_exact_reconstruction_and_mutations(self):
        from legacy_sass_entrypoint_ledger_patch import verify_sass_entrypoint_successor, LEDGER, SHA
        result = verify_sass_entrypoint_successor()
        self.assertEqual(result['other_entries_preserved'], 1696)
        self.assertEqual(result['individual_decisions'], 1)
        self.assertEqual(result['pending_dispositions'], 1340)
        self.assertFalse(result['actual_native_artifact_browser_floor_or_full_audit_qualified'])
        original = json.loads((ROOT / LEDGER).read_bytes())
        with tempfile.TemporaryDirectory(prefix='ngx-entrypoint-python-') as directory:
            candidate = Path(directory) / 'candidate.json'
            for fault in ('unselected', 'selected', 'summary', 'clearance'):
                value = json.loads(json.dumps(original))
                if fault == 'unselected':
                    next(row for row in value['entries'] if row['sha'] != SHA)['reason'] += ' unreviewed'
                elif fault == 'selected':
                    del next(row for row in value['entries'] if row['sha'] == SHA)['individual_proof']['legacy_sass_entrypoint_scope']
                elif fault == 'summary':
                    value['open_or_deferred'] += 1
                else:
                    value['g11_claim'] = 'passed'
                candidate.write_text(json.dumps(value, indent=2) + '\n')
                with self.subTest(fault=fault), self.assertRaises(AssertionError):
                    verify_sass_entrypoint_successor(candidate=candidate)

    def test_current_owner_and_real_root_checker(self):
        child = subprocess.run(['node', 'tests/legacy_sass_entrypoint_ledger_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=150)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['positive_current_and_previous_states'], 2)
        self.assertEqual(report['real_root_checker_positive'], 1)
        self.assertEqual(report['real_root_checker_rejections'], 3)
        self.assertEqual(report['rejection_controls'], 11)
        self.assertEqual(report['individual_decisions_applied'], 27)
        self.assertEqual(report['legacy_sass_entrypoint_decisions_applied'], 1)
        self.assertTrue(report['current_checker_bytes_returned_raw'])
        self.assertTrue(report['all_fixture_roots_removed'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__ == '__main__':
    unittest.main()
