# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""The tagged broadcast correction cannot discard existing close-safety coverage."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogOwnedContractDiagnostics(unittest.TestCase):
    def test_original_cases_and_exact_public_type_difference(self):
        result = subprocess.run(['node', 'tests/dialog_caller_owned_contract_diagnostic_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['original_case_definitions'], 17)
        self.assertEqual(report['unchanged_case_definitions'], 16)
        self.assertEqual(report['tagged_broadcast_successor_cases'], 1)
        self.assertTrue(report['nine_source_mutation_programs_unchanged'])
        self.assertTrue(report['python_case_and_skip_condition_unchanged'])
        if report['line'] == 'main':
            self.assertFalse(report['previous_API_signature_records_unchanged'])
            self.assertEqual(report['historical_API_records_retained'], 112)
            self.assertEqual(report['historical_API_records_restored'], 1)
            self.assertEqual(report['reviewed_successor_API_records'], 12)
        else:
            self.assertTrue(report['previous_API_signature_records_unchanged'])
            self.assertEqual(report['historical_API_records_restored'], 0)
            self.assertEqual(report['reviewed_successor_API_records'], 1)
        self.assertEqual(report['targeted_componentRef_records'], 1)
        self.assertTrue(report['unlisted_componentRef_type_rejected'])


if __name__ == '__main__':
    unittest.main()
