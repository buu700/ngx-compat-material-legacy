# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Individual standalone, heading, form and tooltip source contracts."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest


class MixedExampleDocsSourceTests(unittest.TestCase):
    def test_individual_source_contracts(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory(prefix='ngx-example-docs-source-') as temp:
            report = Path(temp) / 'controls.json'
            subprocess.run(['node', 'tests/mixed_example_docs_source_probe.mjs', str(report)],
                           cwd=root, check=True, timeout=90, capture_output=True, text=True)
            data = json.loads(report.read_text())
            self.assertEqual(data['negative_controls'], 97)
            self.assertEqual(data['retained_source_case_identities'], 286)
            self.assertFalse(data['actual_Angular_native_artifact_browser_SSR_or_floor_qualified'])
