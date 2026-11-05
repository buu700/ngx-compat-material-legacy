# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Four exact decisions, mandatory source checking and independent mutations."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ModernControlBaseAdmissionTests(unittest.TestCase):
    def test_independent_four_entries_and_real_failures(self):
        from current_sass_canonical_test_scope import historical424_ledger_test_subject
        subject = historical424_ledger_test_subject(ROOT)
        from modern_control_base_ledger_patch import verify_control_successor, LEDGER, SHAS
        report = verify_control_successor()
        self.assertEqual(report['individual_decisions'], 4)
        self.assertEqual(report['unselected_entry_bytes_preserved'], 1693)
        self.assertEqual(report['pending_security_reviews'], 1)
        original = json.loads(subject['comparison'])
        with tempfile.TemporaryDirectory(prefix='ngx-control-base-independent-') as directory:
            path = Path(directory) / 'candidate.json'
            path.write_bytes(subject['comparison'])
            verify_control_successor(candidate=path)
            for fault in ['selected', 'unselected', 'header', 'clearance', 'missing-security-row', 'security-status']:
                value = json.loads(json.dumps(original))
                if fault == 'selected': del next(row for row in value['entries'] if row['sha'] in SHAS)['individual_proof']['modern_control_base_source_scope']
                elif fault == 'unselected': next(row for row in value['entries'] if row['sha'] not in SHAS)['reason'] += ' unreviewed'
                elif fault == 'header': value['open_or_deferred'] += 1
                elif fault == 'clearance': value['g11_claim'] = 'passed'
                elif fault == 'missing-security-row': value['entries'] = [row for row in value['entries'] if row['final_disposition'] != 'security-review']
                else: next(row for row in value['entries'] if row['final_disposition'] == 'security-review')['final_disposition'] = 'do-not-adopt'
                path.write_text(json.dumps(value, indent=2) + '\n')
                with self.subTest(fault=fault), self.assertRaises(AssertionError): verify_control_successor(candidate=path)
        output = os.environ.get('MODERN_CONTROL_RECONSTRUCTION_REPORT')
        if output:
            with Path(output).open('x') as stream: json.dump(report, stream, indent=2); stream.write('\n')
        subject['assert_current']()

    def test_pure_metadata_fresh_source_exact_owner_and_real_CLI(self):
        command = ['node', 'tests/modern_control_base_admission_probe.mjs']
        if os.environ.get('MODERN_CONTROL_ADMISSION_REPORT'): command.append(os.environ['MODERN_CONTROL_ADMISSION_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        # Old31/27,33/31,35/33 counters below are authenticated historical DATA.
        from current_sass_canonical_test_scope import current_canonical_test_frame
        physical = current_canonical_test_frame(ROOT)
        self.assertTrue(report['historical_json_comparison_only'])
        self.assertTrue(report['original_program_authenticated_as_DATA'])
        self.assertFalse(report['original_program_executed'])
        self.assertTrue(report['current_physical_owner_guarded'])
        self.assertEqual(report['current_physical_source_admissions'], physical['individual_source_reviews'])
        self.assertEqual(report['current_physical_base_class_decisions'], physical['base_class_decisions'])
        physical['assert_current']()
        for key, expected in [('current_source_admissions',31),('previous_source_admissions',27),('pure_metadata_cases',4),
                              ('metadata_rejections',24),('source_rejections',6),('real_root_checker_positive_rows',4),
                              ('real_root_checker_rejected_rows',9),('rejection_controls',10)]:
            self.assertEqual(report[key], expected, key)
        self.assertTrue(report['pure_metadata_without_filesystem_or_compiler_bindings'])
        self.assertTrue(report['metadata_valid_source_fault_rejected'])
        self.assertTrue(report['missing_source_requirement_mutant_detected'])
        self.assertTrue(report['all_temporary_checker_files_removed'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__ == '__main__': unittest.main()
