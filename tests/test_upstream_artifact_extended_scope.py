# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete same-run fixtures qualify only finite registered behavior contracts."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ExtendedArtifactScopeTests(unittest.TestCase):
    def test_shared_run_contract_and_actual_cli_scope_controls(self):
        command = ['node', 'tests/upstream_artifact_extended_scope_probe.mjs']
        if os.environ.get('ARTIFACT_EXTENDED_DIAGNOSTIC'):
            command.append(os.environ['ARTIFACT_EXTENDED_DIAGNOSTIC'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['actual_cli_cases'], 32)
        self.assertEqual(observed['new_scopes'], 2)
        for field in ['complete_run_validation_text_preserved', 'complete_path_hash_primitives_preserved',
                'focus_observation_predicate_preserved', 'existing_focus_hunk_judgment_unchanged']:
            self.assertTrue(observed[field], field)
        self.assertEqual(observed['real_source_judgments_used'], 2)
        self.assertEqual(observed['real_runtime_judgments_closed'], 0)
        self.assertFalse(observed['actual_product_or_packed_or_native_qualified'])
        self.assertEqual(observed['g11_claim'], 'not-passed')
