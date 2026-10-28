# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Whole slider repairs, independent tagged style identity and real CSS faults."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SliderM3RepairsSourceReviewTests(unittest.TestCase):
    def test_originals_static_geometry_css_and_mutations(self):
        command = ['node', 'tests/slider_m3_repairs_source_review_probe.mjs']
        if os.environ.get('SLIDER_M3_REPAIRS_SOURCE_REPORT'):
            command.append(os.environ['SLIDER_M3_REPAIRS_SOURCE_REPORT'])
            if os.environ.get('SLIDER_M3_REPAIRS_REVIEW_REPORT'):
                command.append(os.environ['SLIDER_M3_REPAIRS_REVIEW_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        for key, value in [('original_files', 9), ('original_hunks', 14), ('present_original_blobs', 18),
                           ('tagged_blobs', 6), ('exact_patch_replays', 9), ('authenticated_tree_objects', 50),
                           ('authenticated_absent_tagged_modules', 1), ('tagged_structural_data_blobs', 2),
                           ('additional_files_beyond_seed', 3), ('additional_hunks_beyond_seed', 3),
                           ('source_bindings', 638), ('slider_cases', 14), ('exact_tagged_CSS_cases', 14),
                           ('historically_empty_density_cases', 2), ('original_sass_graph_members', 52),
                           ('original_locked_archive_packages', 13), ('css_semantic_mutants_detected', 9),
                           ('static_source_identity_mutants_detected', 6), ('preserved_prior_CSS_semantic_mutants', 10)]:
            self.assertEqual(report[key], value, key)
        self.assertTrue(report['fresh_prior_surface_controls_executed'])
        self.assertEqual(len(report['preserved_prior_rejection_controls']), 134)
        self.assertEqual(len(set(report['preserved_prior_rejection_controls'])), 134)
        self.assertEqual(len(report['rejected']), 76)
        self.assertEqual(len(set(report['rejected'])), 76)
        for key in ['fresh_bounded_sass_compiler_execution', 'tagged_reference_sass_executed']:
            self.assertTrue(report[key], key)
        for key in ['component_structural_Sass_freshly_compiled', 'upstream_lock_changes_adopted', 'full_sass_gate_executed',
                    'mixed_M2_M3_native_coexistence_qualified', 'actual_native_artifact_browser_floor_or_full_audit_qualified']:
            self.assertFalse(report[key], key)
        for key in ['canonical_decisions_changed', 'product_changes', 'consumer_HTML_CSS_SCSS_changes']:
            self.assertEqual(report[key], 0, key)
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
