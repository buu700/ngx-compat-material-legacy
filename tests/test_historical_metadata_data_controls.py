# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Regression controls for historical metadata DATA-only predicates."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HistoricalMetadataDataControlsTests(unittest.TestCase):
    def test_authenticated_baselines_and_original_fault_roster(self):
        package = json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())
        if not package['version'].startswith('21.'):
            self.skipTest('These fixed historical frames belong to the 21.x line')
        child = subprocess.run(['node', 'scripts/historical-metadata-data-controls.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        report = json.loads(child.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual(report['scope'], 'historical DATA only')
        self.assertFalse(report['owners_executed'])
        self.assertFalse(report['probes_executed'])
        self.assertEqual(report['g11_claim'], 'not-passed')
        self.assertEqual(report['controls'], [
            'checker-before', 'checker-after', 'checker-partial-reference',
            'chip-before', 'chip-after', 'chip-partial-entry', 'chip-disposition',
            'chip-partial-reference', 'chip-independent-reference',
            'consumer-before', 'consumer-after', 'consumer-partial-reference',
            'consumer-disposition', 'consumer-independent-reference', 'consumer-malformed-bytes',
            'sass-checkpoint-baseline', 'sass-unselected-row', 'sass-selected-row-reason',
            'sass-selected-row-missing-scope', 'sass-incorrect-summary',
        ])


if __name__ == '__main__':
    unittest.main()
