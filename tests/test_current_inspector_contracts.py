# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import json
from pathlib import Path
import subprocess
import unittest


class CurrentInspectorContractsTests(unittest.TestCase):
    def test_live_predicates_writer_and_adapter_keep_current_subject(self):
        root = Path(__file__).resolve().parents[1]
        child = subprocess.run(['node', 'tests/current_inspector_contracts_probe.mjs'], cwd=root,
                               capture_output=True, text=True, timeout=180)
        self.assertEqual(child.returncode, 0, child.stderr[-6000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['current_subject']['required_full_case_ids'], 2236)
        self.assertFalse(report['current_subject']['historical_read_used_for_current_subject'])
        self.assertEqual(report['support']['current_contract_group_count'], 13)
        self.assertEqual(len(report['adapter']['rejection_controls']), 7)
        self.assertGreater(report['writer']['positive_cases'], 0)
        self.assertGreater(len(report['writer']['rejection_controls']), 0)
        self.assertGreater(len(report['predicate_rejection_controls']), 40)
        self.assertTrue(report['original_adapter_protocol']['assertion_statements_unchanged'])
        self.assertTrue(report['original_writer_protocol']['assertion_statements_unchanged'])
        self.assertEqual(len(report['writer']['current_regression_requirements']), 7)
        self.assertFalse(report['actual_Angular_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__ == '__main__':
    unittest.main()
