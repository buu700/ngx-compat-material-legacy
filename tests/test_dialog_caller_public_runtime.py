"""Genuine dialog SDK calls preserve the separately recorded tagged differences.

Copyright Google LLC All Rights Reserved.
Copyright (c) 2026 Ryan Lester.
Use of this source code is governed by the MIT license in LICENSE.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]


class DialogCallerPublicRuntimeTest(unittest.TestCase):
    def test_public_dialog_evidence_inputs_and_scope(self):
        result = subprocess.run(
            ['node', '--input-type=module', '-e',
             'import {qualifiedDialogPublicRuntime} from "./scripts/dialog-caller-public-runtime-evidence.mjs";'
             'qualifiedDialogPublicRuntime();'],
            cwd=ROOT, capture_output=True, text=True, timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_genuine_sdk_runtime_matches_retained_observations(self):
        reference = json.loads((ROOT / 'compatibility/rc/dialog-caller-public-runtime.json').read_text())
        with tempfile.TemporaryDirectory(prefix='dialog-public-runtime-') as directory:
            report = Path(directory) / 'report.json'
            result = subprocess.run(
                ['node', 'tests/dialog_caller_public_runtime_probe.mjs', str(report)],
                cwd=ROOT, env=os.environ.copy(), capture_output=True, text=True, timeout=120,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            actual = json.loads(report.read_text())
        self.assertEqual(actual['inputs'], reference['inputs'])
        self.assertEqual(actual['sdk_capsule'], reference['sdk_capsule'])
        self.assertEqual(actual['tagged_differences_retained'], reference['tagged_differences_retained'])
        for key in ['prototype_only', 'SDK_source_rewrites', 'source_closures',
                    'actual_native_packed_AOT_or_full_floor_qualified', 'g11_claim']:
            self.assertEqual(actual[key], reference[key])
        self.assertEqual(len(actual['runtime_subjects']), 6)
        for subject, expected in zip(actual['runtime_subjects'], reference['runtime_subjects']):
            for key in ['line', 'mode', 'cases', 'observations', 'Core', 'Material']:
                self.assertEqual(subject[key], expected[key])
        self.assertEqual(len(actual['type_contracts']), 3)
        for subject, expected in zip(actual['type_contracts'], reference['type_contracts']):
            self.assertEqual({k: v for k, v in subject.items() if k != 'typescript'},
                             {k: v for k, v in expected.items() if k != 'typescript'})


if __name__ == '__main__':
    unittest.main()
