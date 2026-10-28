# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Whole original patches, unchanged finite CSS contracts and meaningful faults."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FoundationM3ThemeSourceReviewTests(unittest.TestCase):
    def test_whole_patches_original_css_public_contracts_and_mutations(self):
        command = ['node', 'tests/foundation_m3_theme_source_review_probe.mjs']
        if os.environ.get('FOUNDATION_M3_THEME_SOURCE_REPORT'):
            command.append(os.environ['FOUNDATION_M3_THEME_SOURCE_REPORT'])
            if os.environ.get('FOUNDATION_M3_THEME_REVIEW_REPORT'):
                command.append(os.environ['FOUNDATION_M3_THEME_REVIEW_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        expected = dict(original_files=40, original_hunks=81, present_original_blobs=80,
                        authenticated_absent_images=0, tagged_blobs=21, exact_patch_replays=40,
                        authenticated_tree_objects=126, additional_files_beyond_seed=23,
                        additional_hunks_beyond_seed=44, source_bindings=641, argument_cases=136,
                        affected_family_cases=124, collateral_icon_button_cases=8, ripple_cases=4,
                        historically_empty_family_cases=22, original_sass_graph_members=286,
                        original_locked_archive_packages=38, css_semantic_mutants_detected=16)
        for key, value in expected.items():
            self.assertEqual(report[key], value, key)
        self.assertEqual(report['comparison_counts'], {
            'exact-untouched16': 108, 'form-field-state': 4, 'sort': 4,
            'tree': 8, 'companion-addition': 8, 'ripple-color': 4})
        self.assertEqual(len(report['rejected']), 188)
        self.assertEqual(len(set(report['rejected'])), 188)
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
