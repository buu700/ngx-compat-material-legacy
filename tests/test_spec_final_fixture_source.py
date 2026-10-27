# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete original frames and changed scheduling/DI/metadata boundaries."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest


class FinalFixtureSourceTests(unittest.TestCase):
    def test_reviewed_original_frames_and_mutations(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory(prefix='ngx-final-fixture-') as temp:
            report = Path(temp) / 'controls.json'
            # Original snapshot assertions; live contracts run in test_current_inspector_contracts.py.
            subprocess.run(['node', 'scripts/run-historical-consumer-probe.mjs', 'spec-final-fixture-source', '--original-report', str(report)],
                           cwd=root, check=True, timeout=90, capture_output=True, text=True)
            data = json.loads(report.read_text())
            self.assertEqual(data['negative_controls'], 181)
            self.assertEqual(data['paired_original_cases'], 4001)
            self.assertFalse(data['actual_Angular_native_artifact_or_floor_qualified'])
