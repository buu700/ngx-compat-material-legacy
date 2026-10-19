# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Actual constructor and public-zone boundaries, plus a source-bound refreshed render observation."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class AutocompleteZoneUseReview(unittest.TestCase):
    def test_constructor_borrowing_blur_context_lifetime_and_view_reentry(self):
        command = ['node', '--max-old-space-size=640', 'tests/autocomplete_zone_use_probe.mjs']
        if os.environ.get('NGX_AUTOCOMPLETE_ZONE_USE_DIAGNOSTIC'):
            command.append(os.environ['NGX_AUTOCOMPLETE_ZONE_USE_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=150)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-12000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['source_imports'], 1)
        self.assertEqual(report['genuine_zone_subjects'], 10)
        self.assertEqual(report['fresh_supplement_cases'], 50)
        self.assertEqual(report['fresh_supplement_faults'], 74)
        self.assertEqual(report['source_declaration_evidence_controls'], 16)
        self.assertEqual(report['refreshed_original_render_subjects'], 10)
        self.assertEqual(report['refreshed_original_render_faults'], 16)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
