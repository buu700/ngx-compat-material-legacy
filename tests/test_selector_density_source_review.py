# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Whole-patch review with untouched tagged Sass behavior and semantic failures."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SelectorDensitySourceReviewTests(unittest.TestCase):
    def test_originals_live_callers_tagged_behavior_and_mutations(self):
        command = ['node', 'tests/selector_density_source_review_probe.mjs']
        if os.environ.get('SELECTOR_DENSITY_SOURCE_REPORT'):
            command.append(os.environ['SELECTOR_DENSITY_SOURCE_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        for key, value in [('original_files', 4), ('original_hunks', 5), ('present_original_blobs', 7),
                           ('tagged_blobs', 6), ('exact_patch_replays', 4), ('disabled_original_density_assertions', 1),
                           ('proposed_individual_source_decisions', 2), ('source_bindings', 619),
                           ('selector_cases', 12), ('density_cases', 8), ('reviewed_after_changed_css_cases', 4),
                           ('semantic_mutants_detected', 9), ('density_caller_modules', 3)]:
            self.assertEqual(report[key], value, key)
        self.assertGreater(report['selector_caller_modules'], 0)
        self.assertGreaterEqual(report['selector_calls'], report['selector_caller_modules'])
        self.assertEqual(len(report['rejected']), 38)
        self.assertEqual(len(set(report['rejected'])), 38)
        self.assertTrue(report['original_before_selector_mixin_matches_tag'])
        self.assertTrue(report['fresh_bounded_sass_compiler_execution'])
        self.assertTrue(report['tagged_reference_sass_executed'])
        self.assertTrue(report['reviewed_after_selector_mixin_sass_executed'])
        self.assertFalse(report['original_order_reversal_reproduced_on_pinned_compiler'])
        self.assertFalse(report['upstream_typescript_tests_or_workflows_executed'])
        self.assertFalse(report['full_sass_gate_executed'])
        self.assertEqual(report['canonical_decisions_changed'], 0)
        self.assertEqual(report['product_changes'], 0)
        self.assertEqual(report['consumer_HTML_CSS_SCSS_changes'], 0)
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
