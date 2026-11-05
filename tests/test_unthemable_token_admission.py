# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Five source decisions and mandatory CLI checking retain exact independent evidence."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests'))


class UnthemableTokenAdmissionTests(unittest.TestCase):
    def test_independent_five_decisions_and_fourteen_metadata_tokens(self):
        from current_sass_canonical_test_scope import historical424_ledger_test_subject
        subject = historical424_ledger_test_subject(ROOT)
        from unthemable_ledger_patch import verify_unthemable_successor, LEDGER, SHAS
        report = verify_unthemable_successor()
        self.assertEqual(report['individual_decisions'], 5)
        self.assertEqual(report['checker_digest_tokens_updated'], 14)
        self.assertEqual(report['five_decision_stage_unselected_entry_bytes_preserved'], 1692)
        self.assertEqual(report['final_unmodified_entry_bytes_preserved'], 1678)
        original = json.loads(subject['comparison'])
        with tempfile.TemporaryDirectory(prefix='ngx-unthemable-independent-') as directory:
            path = Path(directory) / 'candidate.json'
            path.write_bytes(subject['comparison'])
            verify_unthemable_successor(candidate=path)
            for fault in ['selected', 'unselected', 'checker-digest', 'header', 'clearance', 'missing-security-row']:
                value = json.loads(json.dumps(original))
                if fault == 'selected':
                    del next(row for row in value['entries'] if row['sha'] in SHAS)['individual_proof']['unthemable_token_source_scope']
                elif fault == 'unselected':
                    next(row for row in value['entries'] if row['sha'] not in SHAS)['reason'] += ' unreviewed'
                elif fault == 'checker-digest':
                    next(ref for row in value['entries'] for ref in row.get('individual_proof', {}).get('historical_behavior', {}).get('source_members', []) if ref['path'] == 'scripts/check-upstream-audit-disposition.mjs')['sha256'] = '0' * 64
                elif fault == 'header':
                    value['open_or_deferred'] += 1
                elif fault == 'clearance':
                    value['g11_claim'] = 'passed'
                else:
                    value['entries'] = [row for row in value['entries'] if row['final_disposition'] != 'security-review']
                path.write_text(json.dumps(value, indent=2) + '\n')
                with self.subTest(fault=fault), self.assertRaises(AssertionError):
                    verify_unthemable_successor(candidate=path)
        subject['assert_current']()

    def test_pure_metadata_and_actual_fresh_source(self):
        child = subprocess.run(['node', 'tests/unthemable_token_admission_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['pure_metadata_cases'], 5)
        self.assertEqual(report['mandatory_shared_source_cases'], 5)
        self.assertEqual(report['rejection_controls'], 43)
        self.assertTrue(report['pure_metadata_without_filesystem_or_compiler_bindings'])

    def test_actual_owner_and_root_checker_reject_source_without_changing_metadata(self):
        child = subprocess.run(['node', 'tests/unthemable_token_ledger_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=180)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-8000:])
        report = json.loads(child.stdout)
        # Old27/22/21/20 counters below are authenticated historical DATA.
        from current_sass_canonical_test_scope import current_canonical_test_frame
        physical = current_canonical_test_frame(ROOT)
        self.assertTrue(report['historical_json_comparison_only'])
        self.assertTrue(report['original_program_authenticated_as_DATA'])
        self.assertFalse(report['original_program_executed'])
        self.assertTrue(report['current_physical_owner_guarded'])
        self.assertEqual(report['current_physical_source_admissions'], physical['individual_source_reviews'])
        self.assertEqual(report['current_physical_base_class_decisions'], physical['base_class_decisions'])
        physical['assert_current']()
        self.assertEqual(report['current_source_admissions'], 27)
        self.assertEqual(report['previous_source_admissions'], 22)
        self.assertEqual(report['real_root_checker_positive_rows'], 5)
        self.assertEqual(report['real_root_checker_rejected_rows'], 11)
        self.assertEqual(report['rejection_controls'], 10)
        self.assertTrue(report['missing_source_requirement_mutant_detected'])
        self.assertTrue(report['metadata_valid_source_fault_rejected'])
        self.assertTrue(report['all_temporary_checker_files_removed'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__ == '__main__':
    unittest.main()
