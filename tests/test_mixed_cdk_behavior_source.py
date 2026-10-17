# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete original mixed behavior decisions and published source boundaries."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest


class MixedCdkBehaviorSourceTests(unittest.TestCase):
    def test_individual_source_contracts(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory(prefix='ngx-mixed-cdk-source-') as temp:
            report = Path(temp) / 'controls.json'
            subprocess.run(['node', 'tests/mixed_cdk_behavior_source_probe.mjs', str(report)],
                           cwd=root, check=True, timeout=90, capture_output=True, text=True)
            data = json.loads(report.read_text())
            self.assertEqual(data['negative_controls'], 64)
            self.assertEqual(data['retained_cases'], 257)
            self.assertTrue(data['inherited_observer_runtime_delegation_admission_still_required'])
            self.assertFalse(data['actual_Angular_native_artifact_browser_SSR_or_floor_qualified'])
