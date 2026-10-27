# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete mixed-source decisions and exact minimum public-source boundaries."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest


class MixedPeerAsyncSourceTests(unittest.TestCase):
    def test_individual_source_contracts(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory(prefix='ngx-peer-async-source-') as temp:
            report = Path(temp) / 'controls.json'
            # Original snapshot assertions; live contracts run in test_current_inspector_contracts.py.
            subprocess.run(['node', 'scripts/run-historical-consumer-probe.mjs', 'mixed-peer-async-source', '--original-report', str(report)],
                           cwd=root, check=True, timeout=90, capture_output=True, text=True)
            data = json.loads(report.read_text())
            self.assertEqual(data['negative_controls'], 82)
            self.assertEqual(data['retained_cases'], 1394)
            self.assertFalse(data['actual_Angular_native_artifact_browser_SSR_or_floor_qualified'])
