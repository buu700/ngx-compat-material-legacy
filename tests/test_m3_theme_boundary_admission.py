# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Five exact decisions, mandatory source checking and independent mutations."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class M3ThemeBoundaryAdmissionTests(unittest.TestCase):
    def test_independent_five_entries_and_real_failures(self):
        from m3_theme_boundary_ledger_patch import verify_boundary_successor, LEDGER, SHAS
        report = verify_boundary_successor()
        self.assertEqual(report['individual_decisions'], 5)
        self.assertTrue(report['exact_title_successor_verified'])
        self.assertTrue(report['exact_theming_successor_verified'])
        self.assertTrue(report['exact_inspection_successor_verified'])
        self.assertTrue(report['exact_selector_density_successor_verified'])
        self.assertTrue(report['exact_button_tokenization_successor_verified'])
        self.assertTrue(report['exact_button_token_repairs_successor_verified'])
        self.assertTrue(report['exact_surface_m3_theme_successor_verified'])
        self.assertTrue(report['exact_slider_m3_repairs_successor_verified'])
        self.assertTrue(report['exact_control_m3_theme_successor_verified'])
        self.assertTrue(report['exact_foundation_m3_theme_successor_verified'])
        self.assertTrue(report['exact_core_tokenization_successor_verified'])
        self.assertTrue(report['exact_remaining_unthemable_successor_verified'])
        self.assertEqual(report['unselected_entry_bytes_preserved'], 1692)
        self.assertEqual(report['pending_security_reviews'], 1)
        original = json.loads((ROOT / LEDGER).read_bytes())
        with tempfile.TemporaryDirectory(prefix='ngx-control-base-independent-') as directory:
            path = Path(directory) / 'candidate.json'
            for fault in ['selected', 'unselected', 'header', 'clearance', 'missing-security-row', 'security-status', 'swap-dispositions']:
                value = json.loads(json.dumps(original))
                if fault == 'selected': del next(row for row in value['entries'] if row['sha'] in SHAS)['individual_proof']['m3_theme_boundary_source_scope']
                elif fault == 'unselected': next(row for row in value['entries'] if row['sha'] not in SHAS)['reason'] += ' unreviewed'
                elif fault == 'header': value['open_or_deferred'] += 1
                elif fault == 'clearance': value['g11_claim'] = 'passed'
                elif fault == 'missing-security-row': value['entries'] = [row for row in value['entries'] if row['final_disposition'] != 'security-review']
                elif fault == 'security-status': next(row for row in value['entries'] if row['final_disposition'] == 'security-review')['final_disposition'] = 'do-not-adopt'
                else:
                    for row in value['entries']:
                        if row['sha'] in SHAS: row['final_disposition'] = 'already-adapted' if row['final_disposition'] == 'do-not-adopt' else 'do-not-adopt'
                path.write_text(json.dumps(value, indent=2) + '\n')
                with self.subTest(fault=fault), self.assertRaises(AssertionError): verify_boundary_successor(candidate=path)
        output = os.environ.get('M3_BOUNDARY_RECONSTRUCTION_REPORT')
        if output:
            with Path(output).open('x') as stream: json.dump(report, stream, indent=2); stream.write('\n')

    def test_pure_metadata_fresh_source_exact_owner_and_real_CLI(self):
        command = ['node', 'tests/m3_theme_boundary_admission_probe.mjs']
        if os.environ.get('M3_BOUNDARY_ADMISSION_REPORT'): command.append(os.environ['M3_BOUNDARY_ADMISSION_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        for key, expected in [('preserved_pre_terminal_source_admissions',88),('previous_source_admissions',35),('pure_metadata_cases',5),
                              ('metadata_rejections',35),('source_rejections',6),('real_root_checker_positive_rows',5),
                              ('real_root_checker_rejected_rows',11),('rejection_controls',10)]:
            self.assertEqual(report[key], expected, key)
        self.assertEqual(report['current_epoch_scope'], 'public physical terminal owner')
        self.assertEqual(report['previous_epoch_scope'], 'maintained base historical35 JSON view')
        self.assertTrue(report['public_old_projection_rejected'])
        self.assertEqual(report['legacy_removal_source_admissions'], 1)
        self.assertEqual(report['table_local_compilation_source_admissions'], 1)
        self.assertIn(report['base_class_removal_source_admissions'], [0, 1])
        self.assertEqual(report['current_source_admissions'], 90 + report['base_class_removal_source_admissions'])
        for key, expected in [('historical_title_metadata_admissions', 0), ('historical_theming_metadata_admissions', 0),
                              ('historical_title_native_after_references', 0), ('historical_native_reference_selection', 14),
                              ('historical_native_after_positive_references', 14), ('historical_metadata_positive_cases', 3),
                              ('historical_pre_terminal_source_admissions', 88)]:
            self.assertEqual(report[key], expected, key)
        self.assertTrue(report['historical_json_and_program_authenticated_as_Git_DATA'])
        self.assertFalse(report['historical_program_executed'])
        self.assertEqual(report['title_source_admissions'], 1)
        self.assertEqual(report['title_native_metadata_tokens'], 14)
        self.assertEqual(report['theming_source_admissions'], 2)
        self.assertEqual(report['surface_m3_theme_source_admissions'], 3)
        self.assertEqual(report['slider_m3_repairs_source_admissions'], 2)
        self.assertEqual(report['control_m3_theme_source_admissions'], 4)
        self.assertEqual(report['foundation_m3_theme_source_admissions'], 6)
        self.assertEqual(report['core_tokenization_source_admissions'], 3)
        self.assertEqual(report['remaining_unthemable_source_admissions'], 14)
        self.assertTrue(report['pure_metadata_without_filesystem_or_compiler_bindings'])
        self.assertTrue(report['all_exact_current_source_members_physically_verified'])
        self.assertTrue(report['five_declined_decisions_individually_enforced'])
        self.assertTrue(report['declined_source_fault_cannot_bypass'])
        self.assertTrue(report['metadata_valid_source_fault_rejected'])
        self.assertTrue(report['missing_source_requirement_mutant_detected'])
        self.assertTrue(report['all_temporary_checker_files_removed'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__ == '__main__': unittest.main()
