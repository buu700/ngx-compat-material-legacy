# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Bounded pure metadata successors; no current owner/producer/Sass execution."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CurrentSassM3ReviewTests(unittest.TestCase):
    def test_exact_report_successors_and_metadata_seams(self):
        command = ['node', 'tests/current_sass_m3_review_probe.mjs']
        if os.environ.get('CURRENT_SASS_M3_REVIEW_CONTROLS'):
            command.append(os.environ['CURRENT_SASS_M3_REVIEW_CONTROLS'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=45)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual([r['historical_source_bindings'] for r in report['populations']], [642, 641, 634])
        self.assertEqual([r['modeled_measurement_rows'] for r in report['populations']], [32, 136, 36])
        self.assertEqual(report['sass_compiles'], 0)
        self.assertFalse(report['actual_current_source_or_tool_owner_constructed'])
        self.assertFalse(report['current_producers_executed'])
        self.assertFalse(report['canonical_or_artifact_admission_granted'])
        self.assertEqual(len(report['positive']), len(set(report['positive'])))
        self.assertEqual(len(report['rejected']), len(set(report['rejected'])))


if __name__ == '__main__':
    unittest.main()
