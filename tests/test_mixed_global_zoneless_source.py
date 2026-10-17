# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete global-zoneless source decision; no original setup, Angular or browser execution."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest


class MixedGlobalZonelessSourceTests(unittest.TestCase):
    def test_individual_source_contracts(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory(prefix='ngx-global-zoneless-source-') as temp:
            report = Path(temp) / 'controls.json'
            subprocess.run(['node', 'tests/mixed_global_zoneless_source_probe.mjs', str(report)],
                           cwd=root, check=True, timeout=90, capture_output=True, text=True)
            data = json.loads(report.read_text())
            self.assertEqual(data['negative_controls'], 33)
            self.assertEqual(data['retained_source_case_identities'], 4232)
            self.assertEqual(data['critical_assertion_changes'], 8)
            self.assertFalse(data['actual_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified'])
