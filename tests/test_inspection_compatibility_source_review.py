# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Whole original compatibility/removal patches and preserved owned contracts."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class InspectionCompatibilitySourceReviewTests(unittest.TestCase):
    def test_originals_tagged_ownership_and_current_mutations(self):
        command = ['node', 'tests/inspection_compatibility_source_review_probe.mjs']
        if os.environ.get('INSPECTION_COMPATIBILITY_SOURCE_REPORT'):
            command.append(os.environ['INSPECTION_COMPATIBILITY_SOURCE_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['source_bindings'], report['expected_source_bindings'])
        self.assertTrue(report['current_source_bindings_match_exact_successor'])
        for key, value in [('original_files', 7), ('original_hunks', 14), ('present_original_blobs', 12),
                           ('tagged_blobs', 8), ('exact_patch_replays', 7), ('whitespace_only_fixups', 1),
                           ('tagged_deleted_modern_files', 2), ('proposed_individual_source_decisions', 4),
                           ('owned_scss_members', 409), ('historical_exported_functions', 25),
                           ('public_override_boundaries', 9), ('historical_public_override_boundaries', 4), ('legacy_theme_module_source_rewrites', 4),
                           ('legacy_theme_namespace_or_mixin_or_selector_rewrites', 0)]:
            self.assertEqual(report[key], value, key)
        self.assertEqual(report['historical_source_bindings'], 610)
        self.assertEqual(len(report['rejected']), 35)
        self.assertEqual(len(set(report['rejected'])), 35)
        self.assertFalse(report['fresh_compiler_execution_this_review'])
        self.assertFalse(report['upstream_code_executed'])
        self.assertEqual(report['canonical_decisions_changed'], 0)
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
