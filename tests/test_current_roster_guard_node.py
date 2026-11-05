# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Bounded runner/recovery draft for the actual current roster source node."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'compatibility/rc/current-roster-source-epoch-inputs.json'
DRIFT = b'\n// current roster guard callback drift\n'
PROBE = str(ROOT / 'tests/roster_source_guard_node_probe.mjs')


def restore_known_mutation(before):
    if TARGET.is_symlink() or not TARGET.is_file():
        raise RuntimeError('Unexpected roster test input type preserved: ' + str(TARGET))
    current = TARGET.read_bytes()
    if current == before:
        return
    if current == before + DRIFT:
        TARGET.write_bytes(before)
        return
    raise RuntimeError('Unexpected roster test input bytes preserved: ' + str(TARGET))


class CurrentRosterGuardNodeTests(unittest.TestCase):
    def run_group(self, group):
        if TARGET.is_symlink() or not TARGET.is_file():
            raise RuntimeError('Roster test target must be a regular file: ' + str(TARGET))
        before = TARGET.read_bytes()
        try:
            child = subprocess.run(['node', PROBE, group], cwd=ROOT,
                                   capture_output=True, text=True, timeout=60)
        finally:
            # subprocess.run has killed and reaped a timed-out child first.
            restore_known_mutation(before)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        report = json.loads(child.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertIn(report['line'], ('21.x', 'main'))
        self.assertEqual(report['group'], group)
        self.assertFalse(report['actual_native_packed_browser_floor_or_full_audit_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')
        if group != 'constructor':
            self.assertTrue(report['restoration_passed'])
        return report

    def test_grouped_review_matches_original_stable_predicates_and_fresh_reads(self):
        child = subprocess.run(['node', '--test', '--test-reporter=tap', str(ROOT / 'tests/current_roster_grouped_review_conformance.mjs')],
                               cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        self.assertIn('# tests 13', child.stdout)
        self.assertIn('# fail 0', child.stdout)

    def test_actual_constructor_current_reads_and_historical_rosters(self):
        report = self.run_group('constructor')
        self.assertTrue(report['actual_roster_subject'])
        self.assertTrue(report['private_WeakMap_unwrap_and_foreign_root_rejection'])
        self.assertTrue(report['spoof_reader_rejected'])
        self.assertEqual(report['exact_historical_roster_before_images'], 2)
        self.assertTrue(report['current_program_passthrough'])
        self.assertTrue(report['repeated_member_second_callback_rejected'])

    def test_actual_guard_preflight_consume_final_and_recovery(self):
        report = self.run_group('guard')
        self.assertTrue(report['actual_roster_guard_node'])
        self.assertTrue(report['cold_restored_by_first_callback_rejected'])
        self.assertEqual(report['forged_and_nonBuffer_callbacks_rejected'], 2)
        self.assertEqual(report['old_new_same_callback_physical_mutations_rejected'], 2)
        self.assertEqual(report['direct_and_alternate_whole_plan_reentry_controls'], 2)
        self.assertTrue(report['provided_exception_recovery'])

    def test_actual_distinct_node_callback_reaches_earlier_roster_final(self):
        report = self.run_group('late')
        self.assertTrue(report['actual_roster_guard_node'])
        self.assertTrue(report['distinct_later_actual_node_callback_reached_first_node_final'])
        self.assertEqual(report['rejected_faults'], 1)



if __name__ == '__main__':
    unittest.main()
