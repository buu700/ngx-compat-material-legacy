# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Current-context source revalidation preserves the complete historical review."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RetainedRulesJsCurrentSourceTests(unittest.TestCase):
    def test_current_context_and_late_physical_guards(self):
        child = subprocess.run(['node', 'tests/retained_rules_js_current_source_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        report = json.loads(child.stdout)
        self.assertEqual((report['individual_source_exclusions'], report['original_file_occurrences'], report['original_hunks']), (3, 135, 195))
        self.assertEqual((report['historical_members'], report['current_members'], report['bound']), (1142, 1120, 1201))
        self.assertEqual((report['cold_rejections'], report['late_rejections'], report['recoveries']), (10, 10, 10))
        for field in ['fresh_complete_analysis_equal', 'public_metadata_isolated', 'historical_source_callback_rejected',
                      'physical_cross_member_mutation_rejected', 'peer_mutation_rejected', 'retired_member_reintroduction_rejected']:
            self.assertTrue(report[field], field)
        self.assertFalse(report['runtime_artifact_floor_or_security_qualification'])
        self.assertEqual(report['g11_claim'], 'not-passed')
