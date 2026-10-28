# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Original constructor/focus assertions with a real public outlet and tagged protocol oracle."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogPublicContainerRuntimeTests(unittest.TestCase):
    def test_original_arguments_public_portals_restoration_and_mutations(self):
        result = subprocess.run(['node', 'tests/dialog_portal_current_protocol_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])
        summaries = [json.loads(line) for line in result.stdout.splitlines()]
        self.assertEqual(len(summaries), 2)
        original, current = summaries
        self.assertEqual(original['cases'], 28)
        self.assertEqual(original['mutants_rejected'], 8)
        self.assertEqual(current['original_observations_passed'], 28)
        self.assertEqual(current['original_mutations_rejected'], 8)
        self.assertEqual(current['portal_checks'], 14)
        self.assertEqual(current['disposal_observations'], 24)
        self.assertEqual(current['oracle_byte_faults_rejected'], 8)
        self.assertEqual(current['late_oracle_byte_faults_rejected'], 8)
        self.assertTrue(current['generic_disposal_bypass_mutant_rejected'])
        self.assertEqual(current['known_lifetime_differences'], 1)
        self.assertFalse(current['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__ == '__main__':
    unittest.main()
