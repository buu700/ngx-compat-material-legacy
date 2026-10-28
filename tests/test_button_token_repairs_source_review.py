# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Whole M/A/D patches, authenticated trees and independent historical CSS."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ButtonTokenRepairsSourceReviewTests(unittest.TestCase):
    def test_complete_patches_historical_css_and_semantic_mutations(self):
        command = ['node', 'tests/button_token_repairs_source_review_probe.mjs']
        if os.environ.get('BUTTON_TOKEN_REPAIRS_SOURCE_REPORT'):
            command.append(os.environ['BUTTON_TOKEN_REPAIRS_SOURCE_REPORT'])
            if os.environ.get('BUTTON_TOKEN_REPAIRS_REVIEW_REPORT'):
                command.append(os.environ['BUTTON_TOKEN_REPAIRS_REVIEW_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        for key, value in [('original_files', 9), ('original_hunks', 14), ('present_original_blobs', 14),
                           ('tagged_blobs', 6), ('exact_patch_replays', 9), ('added_modules', 2), ('deleted_modules', 2),
                           ('authenticated_tree_objects', 34), ('authenticated_absent_members', 4),
                           ('frozen_seed_omitted_deletions', 2), ('exact_prefix_only_module_moves', 2),
                           ('raised_color_producer_repairs', 3), ('dark_disabled_opacity_repairs', 1),
                           ('source_bindings', 627), ('shared_button_source_bindings', 623),
                           ('original_sass_graph_members', 71), ('original_locked_archive_packages', 17),
                           ('button_cases', 14), ('preserved_prior_semantic_mutants', 7), ('additional_semantic_mutants_detected', 4)]:
            self.assertEqual(report[key], value, key)
        self.assertTrue(report['fresh_prior_button_controls_executed'])
        self.assertEqual(len(report['preserved_prior_rejections']), 55)
        self.assertEqual(len(set(report['preserved_prior_rejections'])), 55)
        self.assertEqual(len(report['rejected']), 50)
        self.assertEqual(len(set(report['rejected'])), 50)
        for key in ['owned_raised_producer_already_protected', 'owned_dark_disabled_opacity_already_historical',
                    'owned_MDC_prefixes_already_correct', 'fresh_bounded_sass_compiler_execution', 'tagged_reference_sass_executed']:
            self.assertTrue(report[key], key)
        for key in ['upstream_post16_sass_or_typescript_tests_or_workflows_executed', 'package_install_or_javascript_runtime_execution',
                    'full_sass_gate_executed', 'actual_native_artifact_browser_floor_or_full_audit_qualified']:
            self.assertFalse(report[key], key)
        self.assertEqual(report['canonical_decisions_changed'], 0)
        self.assertEqual(report['product_changes'], 0)
        self.assertEqual(report['consumer_HTML_CSS_SCSS_changes'], 0)
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
