# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Actual admission CLI fixtures and captured coordinator prerequisite outcomes."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


class ArtifactBehaviorTests(unittest.TestCase):
    def test_actual_cli_and_artifact_evidence_controls(self):
        command = ['node', 'tests/upstream/artifact-behavior-admission.mjs']
        if os.environ.get('ARTIFACT_BEHAVIOR_DIAGNOSTIC'):
            command.append(os.environ['ARTIFACT_BEHAVIOR_DIAGNOSTIC'])
        result = subprocess.run(command,
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['helper_cases'], 87)
        self.assertEqual(observed['actual_cli_cases'], 11)
        self.assertEqual(observed['checker_mutants_detected'], 1)
        self.assertEqual(observed['packed_roster_cases'], 106)
        self.assertEqual(observed['frozen_fixture_uses'], 1736)
        self.assertFalse(observed['actual_product_or_packed_or_native_qualified'])
        self.assertEqual(observed['g11_claim'], 'not-passed')

    def test_coordinator_forwards_actual_outcome_instead_of_inherited_environment(self):
        spec = importlib.util.spec_from_file_location('artifact_behavior_coordinator', ROOT / 'scripts/rc-verify.py')
        verify = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(verify)
        with tempfile.TemporaryDirectory() as temp:
            for prerequisite in [None, 0, 7]:
                with self.subTest(prerequisite=prerequisite):
                    active = SimpleNamespace(run_dir=Path(temp), manifest={'run_id': 'fixture-run'},
                        binding={'fixture_only': True},
                        invocations={} if prerequisite is None else {'packed-consumer': 'captured-invocation'},
                        exit_codes={} if prerequisite is None else {'packed-consumer': prerequisite},
                        invocation=lambda check_id: 'captured-upstream', record_exit=lambda check_id, code: None)
                    with patch.object(verify, 'ACTIVE_RUN', active), patch.dict(os.environ, {'RC_UPSTREAM_PACKED_CONSUMER': 'forged'}), \
                            patch.object(verify.subprocess, 'run', return_value=SimpleNamespace(returncode=0)) as child:
                        self.assertEqual(verify.run_node('scripts/check-upstream-audit-disposition.mjs', ['--admission']), 0)
                    observed = json.loads(child.call_args.kwargs['env']['RC_UPSTREAM_PACKED_CONSUMER'])
                    self.assertEqual(observed, {'run_id': 'fixture-run', 'exit_code': prerequisite,
                        'invocation_id': None if prerequisite is None else 'captured-invocation'})
