# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete original wide fixture changes do not replace owned compiler/default contracts."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class WideFixtureSourceTests(unittest.TestCase):
    def test_complete_source_case_hook_metadata_and_boundary_accounting(self):
        # Original snapshot assertions; live contracts run in test_current_inspector_contracts.py.
        result = subprocess.run(['node', 'scripts/run-historical-consumer-probe.mjs', 'spec-wide-fixture-source'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        for key, expected in {'complete_original_files': 362, 'complete_original_bodies': 724,
                              'complete_original_hunks': 841, 'static_cases_paired': 8119,
                              'hooks_paired': 1216, 'changed_case_callbacks': 24,
                              'unchanged_case_callbacks': 8095, 'template_style_properties_preserved': 1441,
                              'compiler_calls_removed': 302, 'async_hook_modifiers_removed': 51,
                              'async_hooks_retained': 4, 'compiler_assertion_retained': 1,
                              'standalone_true_properties_removed': 553,
                              'Component_metadata_removals': 543, 'Directive_metadata_removals': 10,
                              'disabled_cases_preserved': 1, 'owned_product_members': 1141,
                              'current_owned_cases_preserved': 2223, 'required_consumer_CSS_SCSS_changes': 0}.items():
            self.assertEqual(report[key], expected, key)
        self.assertGreaterEqual(report['controls'], 30)
        self.assertFalse(report['actual_Angular_native_artifact_or_floor_qualified'])
        self.assertEqual(report['security_clearance'], 'not-passed')
