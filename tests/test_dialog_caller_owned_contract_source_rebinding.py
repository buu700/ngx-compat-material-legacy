# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Existing source decisions must bind the applied dialog repair explicitly."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogOwnedContractSourceRebinding(unittest.TestCase):
    def test_individual_current_roles_and_immutable_prior_cases(self):
        result = subprocess.run(['node', 'tests/dialog_caller_owned_contract_source_rebinding_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['individual_source_rebindings'], 45)
        self.assertEqual(report['complete_prior_cases_preserved'], 45)
        self.assertTrue(report['prior_template_null_claim_explicitly_superseded'])
        self.assertEqual(report['corruptions_rejected'], 8)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertTrue(report['canonical_ledgers_unchanged'])
        self.assertEqual(report['new_semantic_closures'], 0)


if __name__ == '__main__':
    unittest.main()
