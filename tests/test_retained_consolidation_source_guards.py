# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Current retained-source regressions; no artifact, runtime, or audit credit."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RetainedConsolidationSourceGuardTests(unittest.TestCase):
    def run_probe(self, name, timeout):
        child = subprocess.run(['node', 'tests/' + name], cwd=ROOT,
                               capture_output=True, text=True, timeout=timeout)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-5000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['result'], 'pass')
        return report

    def test_harness_owned_mode(self):
        row = self.run_probe('harness_owned_mode_current_probe.mjs', 90)
        self.assertEqual((row['files'], row['cases'], row['classes']), (12, 165, 15))
        for key in ['cold_reentry_rejected_and_recovered', 'caught_reentry_rejected_and_recovered',
                    'late_physical_change_rejected_and_recovered', 'immutable_report_preserved']:
            self.assertTrue(row[key], key)
        self.assertFalse(row['runtime_or_audit_admission_granted'])

    def test_build_context(self):
        row = self.run_probe('retained_build_context_input_successor_probe.mjs', 240)
        self.assertEqual((row['cold_rejections'], row['late_rejections'], row['recovery']), (7, 7, 7))
        for key in ['cold_reentry_rejected_and_recovered', 'reentry_rejected_and_recovered',
                    'closing_sweep_rejected_and_recovered']:
            self.assertTrue(row[key], key)
        self.assertFalse(row['runtime_or_audit_admission_granted'])

    def test_f10_build_context(self):
        row = self.run_probe('retained_f10_build_source_context_probe.mjs', 360)
        self.assertEqual((row['historical_products'], row['historical_rows'],
                          row['current_individual_checks']), (1141, 14, 14))
        self.assertEqual((row['cold_rejections'], row['late_rejections'], row['recovery']), (6, 6, 6))
        for key in ['cold_reentry_rejected_and_recovered', 'reentry_rejected_and_recovered',
                    'closing_sweep_rejected_and_recovered']:
            self.assertTrue(row[key], key)
        self.assertFalse(row['full_f10_consolidation_claimed'])

    def test_fixture_safety(self):
        row = self.run_probe('isolated_retained_source_probe_safety.mjs', 90)
        self.assertEqual(row['direct_child_rejections'], 4)
        self.assertTrue(row['hostile_git_environment_isolated'])
        self.assertTrue(row['caller_head_and_files_unchanged'])

    def test_standalone_program_sweep(self):
        row = self.run_probe('main_consolidation_program_sweep_probe.mjs', 120)
        self.assertTrue(row['standalone_program_sweep_rejected_and_recovered'])
        self.assertTrue(row['fixture_isolated'])

    def test_main_consolidation_context(self):
        row = self.run_probe('retained_consolidation_context_3ac_probe.mjs', 180)
        self.assertEqual((row['testing_files'], row['historical_changes'], row['subsequent_changes']), (163, 8, 7))
        self.assertEqual((row['cold_rejections'], row['late_rejections'], row['recoveries']), (7, 7, 7))
        self.assertTrue(row['cold_and_late_reentry_rejected'])
        self.assertFalse(row['source_or_audit_admission_granted'])

    def test_f10_inventory_history(self):
        row = self.run_probe('retained_f10_inventory_source_context_probe.mjs', 180)
        self.assertEqual((row['historic_candidates'], row['changed_candidates'],
                          row['historic_shims'], row['changed_shims']), (57, 16, 21, 12))
        self.assertEqual((row['cold_rejections'], row['late_rejections'], row['recovery']), (5, 5, 5))
        self.assertTrue(row['cold_and_late_reentry_rejected'])
        self.assertTrue(row['old_inventory_is_not_current'])
        self.assertFalse(row['runtime_or_audit_admission_granted'])

    def test_f10_main_caller(self):
        row = self.run_probe('retained_f10_consolidation_main_probe.mjs', 480)
        self.assertEqual(row['line'], 'main')
        self.assertEqual((row['historical_reviews'], row['current_entries']), (32, 32))
        self.assertTrue(row['caught_reentry_rejected_and_recovered'])
        self.assertTrue(row['late_reentry_rejected_and_recovered'])
        self.assertTrue(row['old_both_line_predicate_closed'])
        self.assertFalse(row['historical_execution_reattributed'])
        self.assertFalse(row['runtime_or_audit_admission_granted'])
