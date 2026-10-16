# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Real native-admission CLI controls and coordinator prerequisite ownership."""
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


class HistoricalBehaviorTests(unittest.TestCase):
    def test_actual_writer_named_cases_and_admission_corruption_controls(self):
        result = subprocess.run(['node', 'tests/upstream/historical-behavior-admission.mjs'],
                                cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-10000:])
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['subjects'], 3)
        self.assertEqual(observed['exact_named_cases'], 7)
        self.assertEqual(observed['full_historical_roster'], 2225)
        self.assertGreaterEqual(observed['helper_controls'], 80)
        self.assertEqual(observed['actual_CLI_controls'], 12)
        self.assertTrue(observed['preceding_packed_validators_path_hash_primitives_writer_and_fixture_unchanged'])
        self.assertFalse(observed['actual_native_browser_library_or_floor_execution'])

    def test_coordinator_owns_both_observed_prerequisites(self):
        spec = importlib.util.spec_from_file_location('historical_behavior_coordinator', ROOT / 'scripts/rc-verify.py')
        verify = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(verify)
        with tempfile.TemporaryDirectory() as temp:
            for packed in [None, 0, 7]:
                for historical in [None, 0, 9]:
                    with self.subTest(packed=packed, historical=historical):
                        codes = {key: value for key, value in [('packed-consumer', packed),
                                 ('historical-legacy-artifact', historical)] if value is not None}
                        active = SimpleNamespace(run_dir=Path(temp), manifest={'run_id': 'synthetic'},
                            binding={'fixture_only': True}, exit_codes=codes,
                            invocations={key: 'captured-' + key for key in codes},
                            invocation=lambda check_id: 'captured-upstream', record_exit=lambda check_id, code: None)
                        with patch.object(verify, 'ACTIVE_RUN', active), \
                                patch.dict(os.environ, {'RC_UPSTREAM_PACKED_CONSUMER': 'forged', 'RC_UPSTREAM_HISTORICAL': 'forged'}), \
                                patch.object(verify.subprocess, 'run', return_value=SimpleNamespace(returncode=0)) as child:
                            self.assertEqual(verify.run_node('scripts/check-upstream-audit-disposition.mjs', ['--admission']), 0)
                        for env_name, key, code in [('RC_UPSTREAM_PACKED_CONSUMER', 'packed-consumer', packed),
                                                   ('RC_UPSTREAM_HISTORICAL', 'historical-legacy-artifact', historical)]:
                            self.assertEqual(json.loads(child.call_args.kwargs['env'][env_name]),
                                {'run_id': 'synthetic', 'exit_code': code,
                                 'invocation_id': None if code is None else 'captured-' + key})
