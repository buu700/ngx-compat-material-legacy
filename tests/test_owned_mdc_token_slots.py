# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Tagged token-name contracts do not substitute for CSS or native qualification."""
import json
from pathlib import Path
import subprocess
import sys
import unittest


class OwnedMdcTokenSlotsTests(unittest.TestCase):
    def test_complete_original_patch_and_hunk_coverage(self):
        root = Path(__file__).resolve().parents[1]
        child = subprocess.run([sys.executable, 'tests/token_build_originals_probe.py'], cwd=root,
                               capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-4000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['original_files'], 4)
        self.assertEqual(report['original_hunks'], 6)
        self.assertEqual(report['authenticated_blob_ids'], 8)
        self.assertEqual(report['exact_patch_roundtrips'], 4)
        self.assertEqual(report['canonical_decisions_changed'], 0)

    def test_real_reference_compiler_and_faults(self):
        root = Path(__file__).resolve().parents[1]
        child = subprocess.run(['node', 'tests/owned_mdc_token_slots_probe.mjs'], cwd=root,
                               capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['authentic_reference_cases_executed'], 19)
        self.assertEqual(report['original_added_contracts_executed'], 2)
        self.assertEqual(report['actual_Sass_slot_faults_rejected'], 4)
        self.assertEqual(report['input_faults_rejected'], 6)
        self.assertEqual(report['rejection_controls'], 11)
        self.assertTrue(report['omitted_required_case_rejected'])
        self.assertEqual(report['recorded_vendor_members_matched'], 119)
        self.assertTrue(report['no_consumer_CSS_emitted'])
        self.assertTrue(report['consumer_archived_import_rejected'])
        self.assertTrue(report['original_source_and_oracle_bytes_rechecked'])
        self.assertTrue(report['repeat_measurement_identical'])
        self.assertEqual(report['product_or_consumer_files_written'], 0)
        self.assertFalse(report['full_651_Sass_rendered_packed_native_floor_or_audit_qualified'])


if __name__ == '__main__':
    unittest.main()
