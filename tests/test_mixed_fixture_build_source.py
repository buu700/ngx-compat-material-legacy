# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete fixture/build source decisions, including the commented-out upstream case."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest


class MixedFixtureBuildSourceTests(unittest.TestCase):
    def test_individual_source_contracts(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory(prefix='ngx-fixture-build-source-') as temp:
            report = Path(temp) / 'controls.json'
            subprocess.run(['node', 'tests/mixed_fixture_build_source_probe.mjs', str(report)],
                           cwd=root, check=True, timeout=90, capture_output=True, text=True)
            data = json.loads(report.read_text())
            self.assertEqual(data['negative_controls'], 57)
            self.assertEqual(data['source_case_identities_before'], 406)
            self.assertEqual(data['retained_source_case_identities'], 405)
            self.assertEqual(data['explicitly_commented_out_upstream_cases'], 1)
            self.assertFalse(data['actual_Angular_native_artifact_browser_SSR_or_floor_qualified'])
