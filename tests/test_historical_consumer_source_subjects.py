# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import json
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]


class HistoricalConsumerSourceSubjectTests(unittest.TestCase):
    def test_finite_subjects_and_rejected_substitutions(self):
        child = subprocess.run(['node', 'tests/historical_consumer_subject_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, 0, child.stderr[-4000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['original_subjects_verified'], 23)
        self.assertEqual(report['negative_controls'], 12)
        self.assertEqual(report['historical_programs_executed'], 0)
        self.assertFalse(report['current_source_qualified'])
        self.assertFalse(report['actual_native_artifact_browser_or_floor_qualified'])

    def test_unknown_cli_family_rejects_without_a_report(self):
        with tempfile.TemporaryDirectory(prefix='ngx-consumer-unknown-') as temp:
            report = Path(temp) / 'replay.json'
            child = subprocess.run(['node', 'scripts/run-historical-consumer-probe.mjs',
                                    'unknown', '--report', str(report)], cwd=ROOT,
                                   capture_output=True, text=True, timeout=15)
            self.assertNotEqual(child.returncode, 0)
            self.assertIn('unknown historical consumer family', child.stderr)
            self.assertFalse(report.exists())


if __name__ == '__main__':
    unittest.main()
