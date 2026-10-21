# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Owned menu content typing changes no runtime code and rejects stale evidence."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class MenuPanelContentBoundary(unittest.TestCase):
    def test_applied_type_and_raw_evidence_guards(self):
        command = ['node', 'tests/menu_panel_content_boundary_probe.mjs']
        if os.environ.get('NGX_MENU_PANEL_BOUNDARY_DIAGNOSTIC'):
            command.append(os.environ['NGX_MENU_PANEL_BOUNDARY_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['semantic_source_files'], 53)
        self.assertEqual(report['private_current_method_uses_before'], 2)
        self.assertEqual(report['private_current_method_uses_after'], 0)
        self.assertEqual(report['semantic_JS_files_identical'], 53)
        self.assertTrue(report['owned_content_assignment_restored'])
        self.assertEqual(report['actual_interface_mutants_rejected'], 3)
        self.assertEqual(report['raw_input_corruptions_rejected'], 15)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertTrue(report['historical_before_substitution_rejected'])
        self.assertEqual(report['actual_product_files_changed'], 1)
        self.assertEqual(report['HTML_CSS_SCSS_consumer_map_or_allowlist_changes'], 0)
        self.assertFalse(report['actual_runtime_native_packed_AOT_or_floor_qualified'])
if __name__ == '__main__':
    unittest.main()
