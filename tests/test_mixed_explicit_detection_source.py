# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete explicit-detection source decision; no original setup, Angular or browser execution."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest


class MixedExplicitDetectionSourceTests(unittest.TestCase):
    def test_individual_source_contracts(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory(prefix='ngx-explicit-detection-source-') as temp:
            report = Path(temp) / 'controls.json'
            subprocess.run(['node', 'tests/mixed_explicit_detection_source_probe.mjs', str(report)],
                           cwd=root, check=True, timeout=90, capture_output=True, text=True)
            data = json.loads(report.read_text())
            self.assertEqual(data['negative_controls'], 26)
            self.assertEqual(data['retained_source_case_identities'], 5964)
            self.assertEqual(data['added_strategy_properties'], 945)
            self.assertFalse(data['actual_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified'])
