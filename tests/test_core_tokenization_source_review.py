# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Complete tokenization patches, immutable16CSS and current-peer ownership boundaries."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreTokenizationSourceReviewTests(unittest.TestCase):
    def test_whole_patches_legacy_fallbacks_public_tokens_and_rejections(self):
        command = ['node', 'tests/core_tokenization_source_review_probe.mjs']
        if os.environ.get('CORE_TOKENIZATION_SOURCE_CONTROLS'):
            command.append(os.environ['CORE_TOKENIZATION_SOURCE_CONTROLS'])
            if os.environ.get('CORE_TOKENIZATION_SOURCE_REPORT'):
                command.append(os.environ['CORE_TOKENIZATION_SOURCE_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        expected = dict(original_files=12, original_hunks=17, present_original_blobs=20,
                        authenticated_absent_images=4, tagged_blobs=15, authenticated_tagged_absences=3,
                        exact_patch_replays=12, authenticated_tree_objects=59,
                        additional_files_beyond_seed=0, additional_hunks_beyond_seed=0,
                        source_bindings=642, argument_cases=32, historically_empty_cases=6,
                        tree_density_supplemental_boundaries=11, historical_valid_density_fallbacks=10,
                        current_public_density_tokens=10, historical_invalid_density_arguments=1,
                        documented_ownership_differences=3, css_semantic_mutants_detected=9,
                        density_semantic_mutants_detected=2, owned_scss_members_rehashed=409,
                        reference_sass_members=286, reference_locked_archives=38)
        for key, value in expected.items():
            self.assertEqual(report[key], value, key)
        self.assertEqual(report['comparison_counts'], {
            'exact-untouched16': 10, 'sort': 4, 'tree': 8, 'ripple-color': 10})
        self.assertEqual(len(report['rejected']), 96)
        self.assertEqual(len(set(report['rejected'])), 96)
        self.assertTrue(report['tagged_reference_Sass_executed'])
        self.assertTrue(report['approved_installed_minimum_peer_public_Sass_executed'])
        for key in ['canonical_decisions_changed', 'golden_or_finite_contract_changes',
                    'product_changes', 'consumer_HTML_CSS_SCSS_changes']:
            self.assertEqual(report[key], 0, key)
        for key in ['prior_CSS_results_reused',
                    'captured_post16_patch_Sass_TypeScript_tests_or_workflows_executed',
                    'actual_native_artifact_browser_floor_or_full_audit_qualified']:
            self.assertFalse(report[key], key)
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
