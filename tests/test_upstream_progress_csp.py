# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Two finite same-run native CSP subjects, with actual reader/writer/CLI paths."""
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


class ProgressCspAdmissionTests(unittest.TestCase):
    def test_actual_reader_writer_cli_and_source_corruption_controls(self):
        command = ['node', 'tests/upstream/progress-csp-admission.mjs']
        if os.environ.get('PROGRESS_CSP_DIAGNOSTIC'):
            command.append(os.environ['PROGRESS_CSP_DIAGNOSTIC'])
        result = subprocess.run(command, cwd=ROOT,
                                capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-10000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['subjects'], 2)
        self.assertEqual(report['full_browser_roster'], 912)
        self.assertEqual(report['semantic_progress_controls'], 100)
        self.assertEqual(report['actual_CLI_controls'], 18)
        self.assertEqual(report['source_corruptions_rejected'], 10)
        self.assertTrue(report['complete_actual_browser_writer_used'])
        self.assertFalse(report['actual_native_packed_or_floor_executed'])

    def test_coordinator_replaces_inherited_capture_with_actual_outcome(self):
        spec = importlib.util.spec_from_file_location('progress_csp_coordinator', ROOT / 'scripts/rc-verify.py')
        verify = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(verify)
        with tempfile.TemporaryDirectory() as temp:
            for browser in [None, 0, 8]:
                for packed in [None, 0, 7]:
                    codes = {key: value for key, value in [('browser-matrix', browser), ('packed-consumer', packed)] if value is not None}
                    active = SimpleNamespace(run_dir=Path(temp), manifest={'run_id': 'synthetic'}, binding={'fixture_only': True},
                        exit_codes=codes, invocations={key: 'captured-' + key for key in codes},
                        invocation=lambda check_id: 'captured-upstream', record_exit=lambda check_id, code: None)
                    with patch.object(verify, 'ACTIVE_RUN', active), patch.dict(os.environ, {'RC_UPSTREAM_BROWSER_MATRIX': 'forged'}), \
                            patch.object(verify.subprocess, 'run', return_value=SimpleNamespace(returncode=0)) as child:
                        self.assertEqual(verify.run_node('scripts/check-upstream-audit-disposition.mjs', ['--admission']), 0)
                    for env_name, key, code in [('RC_UPSTREAM_BROWSER_MATRIX', 'browser-matrix', browser),
                                                ('RC_UPSTREAM_PACKED_CONSUMER', 'packed-consumer', packed),
                                                ('RC_UPSTREAM_HISTORICAL', 'historical-legacy-artifact', None)]:
                        self.assertEqual(json.loads(child.call_args.kwargs['env'][env_name]),
                            {'run_id': 'synthetic', 'exit_code': code, 'invocation_id': None if code is None else 'captured-' + key})
