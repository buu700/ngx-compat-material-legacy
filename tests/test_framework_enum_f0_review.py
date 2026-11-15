# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Current framework metadata enum source and minimum identities."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FrameworkEnumCurrentReview(unittest.TestCase):
    def run_probe(self, path):
        result = subprocess.run(['node', path], cwd=ROOT, capture_output=True,
                                text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return json.loads(result.stdout.strip().splitlines()[-1])

    def test_complete_current_enum_population_and_semantic_mutations(self):
        with tempfile.TemporaryDirectory(prefix='framework-enum-current-') as scratch:
            report_path = Path(scratch) / 'diagnostic.json'
            result = subprocess.run([
                'node', 'tests/framework_enum_use_probe.mjs',
                '--report', str(report_path),
            ], cwd=ROOT, capture_output=True, text=True, timeout=60)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            report = json.loads(report_path.read_text())
            self.assertEqual(len(report['cases']), 76)
            self.assertEqual(report['files'], 38)
            self.assertEqual(len(report['mutations']), 26)
            self.assertTrue(all(row['rejected'] for row in report['mutations']))

    def test_source_admission_and_transitions(self):
        report = self.run_probe('tests/framework_enum_f0_historical_f9_admission_probe.mjs')
        self.assertEqual(report['selected'], 24)
        self.assertEqual(report['transitions'], 12)
        self.assertTrue(report['historical_subject'])
        self.assertEqual(report['live_reviewed'], 24)
        self.assertTrue(report['source_only_result'])
        self.assertTrue(report['semantic_review_required'])

    def test_installed_minimum_enum_subjects(self):
        report = self.run_probe('scripts/framework-enum-minimum-identity.mjs')
        self.assertEqual(report['version'], '22.1.7')
        self.assertEqual(len(report['members']), 4)
        self.assertEqual(len(report['rejected_mutations']), 11)
