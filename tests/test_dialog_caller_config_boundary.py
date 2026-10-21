# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Historical evidence cannot silently admit partial or changed current sources."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogConfigSourceBoundary(unittest.TestCase):
    def test_complete_current_consumers_and_exact_source_context(self):
        child = subprocess.run(['node', 'tests/dialog_caller_config_boundary_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['modeled_after_source_files'], 49)
        self.assertEqual(report['expanded_semantic_source_files'], 51)
        self.assertEqual(report['overlay_source_files'], 145)
        self.assertEqual(report['affected_overlay_sources_covered'], 12)
        self.assertEqual(report['source_rebindings_prepared'], 32)
        self.assertEqual(report['complete_prior_cases_preserved'], 32)
        self.assertEqual(report['explicit_current_Inject_annotations'], 2)
        self.assertEqual(report['partial_applications_rejected'], 3)
        self.assertEqual(report['before_source_admission_rejected'], 2)
        self.assertEqual(report['corruptions_rejected'], 65)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['canonical_ledgers_unchanged'], 3)
        self.assertTrue(report['model_only_after_admission_in_this_probe'])
        self.assertEqual(report['source_closures'], 0)
        self.assertFalse(report['actual_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
