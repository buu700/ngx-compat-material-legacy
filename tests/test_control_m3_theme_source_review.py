# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Complete source populations, independent historical CSS and meaningful faults."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ControlM3ThemeSourceReviewTests(unittest.TestCase):
    def test_whole_patches_original_css_public_alias_and_mutations(self):
        command = ['node', 'tests/control_m3_theme_source_review_probe.mjs']
        if os.environ.get('CONTROL_M3_THEME_SOURCE_REPORT'):
            command.append(os.environ['CONTROL_M3_THEME_SOURCE_REPORT'])
            if os.environ.get('CONTROL_M3_THEME_REVIEW_REPORT'):
                command.append(os.environ['CONTROL_M3_THEME_REVIEW_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        expected = dict(original_files=24, original_hunks=43, present_original_blobs=46,
                        authenticated_absent_images=2, tagged_blobs=15, exact_patch_replays=24,
                        authenticated_tree_objects=66, additional_files_beyond_seed=20,
                        additional_hunks_beyond_seed=32, source_bindings=682, control_cases=56,
                        exact_tagged_CSS_cases=42, current_spinner_snack_bridge_cases=10, existing_progress_alias_cases=4,
                        historically_empty_cases=14, original_sass_graph_members=82,
                        original_locked_archive_packages=22, css_semantic_mutants_detected=13)
        for key, value in expected.items():
            self.assertEqual(report[key], value, key)
        self.assertEqual(len(report['rejected']), 125)
        self.assertEqual(len(set(report['rejected'])), 125)
        self.assertTrue(report['fresh_bounded_sass_compiler_execution'])
        self.assertTrue(report['tagged_reference_sass_executed'])
        for key in ['component_structural_Sass_freshly_compiled', 'full_sass_gate_executed',
                    'mixed_M2_M3_native_coexistence_qualified',
                    'actual_native_artifact_browser_floor_or_full_audit_qualified']:
            self.assertFalse(report[key], key)
        for key in ['canonical_decisions_changed', 'product_changes', 'consumer_HTML_CSS_SCSS_changes']:
            self.assertEqual(report[key], 0, key)
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
