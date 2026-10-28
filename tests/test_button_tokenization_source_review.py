# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Five whole-patch reviews, independent old Sass data and actual CSS mutations."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ButtonTokenizationSourceReviewTests(unittest.TestCase):
    def test_whole_patches_historical_namespaces_css_and_mutations(self):
        command = ['node', 'tests/button_tokenization_source_review_probe.mjs']
        if os.environ.get('BUTTON_TOKENIZATION_SOURCE_REPORT'):
            command.append(os.environ['BUTTON_TOKENIZATION_SOURCE_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        for key, value in [('original_files', 18), ('original_hunks', 47), ('present_original_blobs', 33),
                           ('tagged_blobs', 6), ('exact_patch_replays', 18), ('added_modules', 3),
                           ('proposed_individual_source_decisions', 5), ('source_bindings', 623),
                           ('original_sass_graph_members', 71), ('original_locked_archive_packages', 17),
                           ('button_cases', 14), ('modern_theme_module_source_rewrites', 7),
                           ('legacy_theme_module_source_rewrites', 5), ('legacy_structural_module_source_rewrites', 4),
                           ('namespace_or_mixin_or_selector_rewrites', 0), ('semantic_mutants_detected', 7),
                           ('upstream_wrong_component_slot_assertions_reviewed', 1), ('upstream_slot_assertion_repairs_reviewed', 1)]:
            self.assertEqual(report[key], value, key)
        self.assertEqual(len(report['rejected']), 55)
        self.assertEqual(len(set(report['rejected'])), 55)
        self.assertTrue(report['fresh_bounded_sass_compiler_execution'])
        self.assertTrue(report['tagged_reference_sass_executed'])
        self.assertFalse(report['upstream_post16_sass_or_typescript_tests_or_workflows_executed'])
        self.assertFalse(report['package_install_or_javascript_runtime_execution'])
        self.assertFalse(report['full_sass_gate_executed'])
        self.assertEqual(report['canonical_decisions_changed'], 0)
        self.assertEqual(report['product_changes'], 0)
        self.assertEqual(report['consumer_HTML_CSS_SCSS_changes'], 0)
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
