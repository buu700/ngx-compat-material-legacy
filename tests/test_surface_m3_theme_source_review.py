# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Complete surface theme patches and independent historical/companion CSS."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SurfaceM3ThemeSourceReviewTests(unittest.TestCase):
    def test_whole_patches_css_and_semantic_mutations(self):
        command = ['node', 'tests/surface_m3_theme_source_review_probe.mjs']
        if os.environ.get('SURFACE_M3_THEME_CONTROLS_REPORT'):
            command.append(os.environ['SURFACE_M3_THEME_CONTROLS_REPORT'])
            if os.environ.get('SURFACE_M3_THEME_REVIEW_REPORT'):
                command.append(os.environ['SURFACE_M3_THEME_REVIEW_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        for key, value in [('original_files', 17), ('original_hunks', 32), ('present_original_blobs', 34),
                           ('tagged_blobs', 10), ('exact_patch_replays', 17), ('authenticated_tree_objects', 67),
                           ('additional_files_beyond_seed', 11), ('additional_hunks_beyond_seed', 19),
                           ('source_bindings', 634), ('original_sass_graph_members', 52), ('original_locked_archive_packages', 13),
                           ('surface_cases', 36), ('exact_tagged_cases', 32), ('existing_companion_cases', 4),
                           ('historically_empty_density_cases', 4), ('semantic_mutants_detected', 10)]:
            self.assertEqual(report[key], value, key)
        self.assertEqual(len(report['rejected']), 134)
        self.assertEqual(len(set(report['rejected'])), 134)
        for key in ['fresh_bounded_sass_compiler_execution', 'tagged_reference_sass_executed', 'existing_companion_contract_unchanged']:
            self.assertTrue(report[key], key)
        for key in ['full_sass_gate_executed', 'mixed_M2_M3_native_coexistence_qualified', 'actual_native_artifact_browser_floor_or_full_audit_qualified']:
            self.assertFalse(report[key], key)
        for key in ['canonical_decisions_changed', 'product_changes', 'consumer_HTML_CSS_SCSS_changes']:
            self.assertEqual(report[key], 0, key)
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
