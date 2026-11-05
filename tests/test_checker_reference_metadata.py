# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact metadata, actual checker contracts and the shared owner stay distinct."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests'))


class CheckerReferenceMetadataTests(unittest.TestCase):
    def test_independent_reconstruction_and_mutations(self):
        from current_sass_canonical_test_scope import historical424_ledger_test_subject
        subject = historical424_ledger_test_subject(ROOT)
        from checker_reference_metadata_patch import verify_checker_reference_successor, LEDGER
        result = verify_checker_reference_successor()
        self.assertEqual(result['checker_digest_tokens_updated'], 14)
        self.assertEqual(result['unselected_entries_preserved'], 1683)
        self.assertEqual(result['new_SHA_decisions'], 0)
        original = json.loads(subject['comparison'])
        with tempfile.TemporaryDirectory(prefix='ngx-checker-reference-') as directory:
            candidate = Path(directory) / 'candidate.json'
            candidate.write_bytes(subject['comparison'])
            verify_checker_reference_successor(candidate=candidate)
            for fault in ('selected', 'unselected', 'header', 'clearance'):
                value = json.loads(json.dumps(original))
                if fault == 'selected':
                    row = next(row for row in value['entries'] if row['sha'] == '77ffdf98ba71c11d908b29e02b516dddf487ae0b')
                    row['individual_proof']['historical_behavior']['source_members'][4]['sha256'] = '0' * 64
                elif fault == 'unselected':
                    next(row for row in value['entries'] if not any(ref['path'] == 'scripts/check-upstream-audit-disposition.mjs'
                        for ref in row.get('individual_proof', {}).get('historical_behavior', {}).get('source_members', [])))['reason'] += ' unreviewed'
                elif fault == 'header':
                    value['closed_dispositions'] += 1
                else:
                    value['g11_claim'] = 'passed'
                candidate.write_text(json.dumps(value, indent=2) + '\n')
                with self.subTest(fault=fault), self.assertRaises(AssertionError):
                    verify_checker_reference_successor(candidate=candidate)
        subject['assert_current']()

    def test_actual_checker_contracts_and_rejections(self):
        child = subprocess.run(['node', 'tests/checker_reference_metadata_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['complete_checker_hunks_reconstructed'], 6)
        self.assertEqual(report['actual_guard_exclusions'], 56)
        self.assertEqual(report['actual_reader_cases'], 9)
        self.assertEqual(report['rejection_controls'], 12)
        self.assertEqual(report['structural_policy_sets_preserved'], 5)
        self.assertTrue(report['independent_Python_bytes_match'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])

    def test_current_owner_and_earlier_state(self):
        child = subprocess.run(['node', 'tests/checker_reference_metadata_owner_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        report = json.loads(child.stdout)
        # Historical complete JSON counts remain distinct from actual current source guards.
        from current_sass_canonical_test_scope import current_canonical_test_frame
        physical = current_canonical_test_frame(ROOT)
        self.assertTrue(report['historical_json_comparison_only'])
        self.assertTrue(report['original_program_authenticated_as_DATA'])
        self.assertFalse(report['original_program_executed'])
        self.assertTrue(report['current_physical_owner_guarded'])
        self.assertEqual(report['current_physical_source_admissions'], physical['individual_source_reviews'])
        self.assertEqual(report['current_physical_base_class_decisions'], physical['base_class_decisions'])
        self.assertEqual(report['current_nonphysical_ledger_rejections'], 3)
        physical['assert_current']()
        self.assertFalse(report['preflight_only'])
        self.assertEqual(report['metadata_tokens_applied'], 14)
        self.assertEqual(report['previous_metadata_tokens_applied'], 0)
        self.assertEqual(report['individual_decisions_applied'], 27)
        self.assertEqual(report['rejection_controls'], 4)
        self.assertTrue(report['raw_checker_bytes_preserved'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__ == '__main__':
    unittest.main()
