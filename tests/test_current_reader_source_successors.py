# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Current source images stay distinct from authenticated historical metadata."""
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CurrentReaderSourceSuccessorsTests(unittest.TestCase):
    def run_probe(self, executable, script):
        child = subprocess.run([executable, 'tests/' + script], cwd=ROOT,
                               capture_output=True, text=True, timeout=600)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-5000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual(report['cold_rejections'], report['late_rejections'])
        self.assertEqual(report['recovery'], report['cold_rejections'])
        return report

    def test_autocomplete_current_source(self):
        report = self.run_probe('node', 'autocomplete_current_spec_source_successor_probe.mjs')
        self.assertEqual(report['cold_rejections'], 5)
        self.assertTrue(report['historical_source_substitution_rejected'])
        self.assertTrue(report['public_metadata_isolated'])

    def test_current_authored_tab_source(self):
        report = self.run_probe('node', 'current_authored_tab_source_successor_probe.mjs')
        self.assertEqual(report['cold_rejections'], 7)
        for field in ['unknown_hash_rejected', 'wrong_length_rejected',
                      'accessor_not_invoked', 'public_metadata_isolated']:
            self.assertTrue(report[field], field)

    def test_javascript_reader_owner(self):
        report = self.run_probe('node', 'current_reader_source_successor_probe.mjs')
        self.assertEqual(report['cold_rejections'], 14)
        self.assertEqual(report['unknown_references_rejected'], 2)

    def test_python_reader_owner(self):
        report = self.run_probe(sys.executable, 'current_reader_source_successor_probe.py')
        self.assertEqual(report['cold_rejections'], 14)
        self.assertEqual(report['unknown_references_rejected'], 2)

    def test_current_inventory_source_routing(self):
        report = self.run_probe('node', 'current_inventory_source_routing_probe.mjs')
        self.assertEqual(report['cold_rejections'], 124)
        for field in ['old_source_substitution_rejected', 'unknown_hash_rejected',
                      'wrong_length_rejected', 'accessor_not_invoked',
                      'public_metadata_isolated', 'comparison_copy_isolated',
                      'forged_raw_property_rejected', 'intermediate_owner_preserved', 'retained_owner_preserved']:
            self.assertTrue(report[field], field)

    def test_canonical_inventory_source_routing(self):
        report = self.run_probe('node', 'canonical_inventory_routing_probe.mjs')
        self.assertEqual(report['cold_rejections'], 126)
        for field in ['unknown_predecessor_rejected', 'wrong_length_rejected',
                      'public_metadata_isolated']:
            self.assertTrue(report[field], field)

    def test_selection_native_current_source(self):
        report = self.run_probe('node', 'selection_native_current_source_probe.mjs')
        self.assertEqual(report['cold_rejections'], 21)
        self.assertEqual(report['default_selection_scopes_preserved'], 3)
        for field in ['historical_after_preserved', 'current_registry_bound',
                      'public_metadata_isolated', 'unknown_hash_rejected',
                      'wrong_length_rejected', 'accessor_not_invoked']:
            self.assertTrue(report[field], field)

    def test_retained_current_context_identity(self):
        report = self.run_probe('node', 'retained_current_context_identity_probe.mjs')
        self.assertEqual(report['cold_rejections'], 9)
        self.assertEqual(report['products'], 1120)
        self.assertEqual(report['before_contexts'], 3)
        for field in ['unknown_hash_rejected', 'wrong_length_rejected',
                      'accessor_not_invoked', 'public_metadata_isolated',
                      'extra_missing_retired_members_rejected',
                      'cross_member_physical_mutation_rejected']:
            self.assertTrue(report[field], field)


if __name__ == '__main__':
    unittest.main()
