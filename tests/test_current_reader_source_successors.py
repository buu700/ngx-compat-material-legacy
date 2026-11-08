# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Current source images stay distinct from authenticated historical metadata."""
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CurrentReaderSourceSuccessorsTests(unittest.TestCase):
    def run_probe(self, executable, script):
        child = subprocess.run([executable, 'tests/' + script], cwd=ROOT,
                               capture_output=True, text=True, timeout=600)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-5000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual(report['cold_rejections'], report['late_rejections'])
        self.assertEqual(report['recovery'], report['cold_rejections'])
        return report

    def test_autocomplete_current_source(self):
        report = self.run_probe('node', 'autocomplete_current_spec_source_successor_probe.mjs')
        self.assertEqual(report['cold_rejections'], 5)
        self.assertTrue(report['historical_source_substitution_rejected'])
        self.assertTrue(report['public_metadata_isolated'])

    def test_current_authored_tab_source(self):
        report = self.run_probe('node', 'current_authored_tab_source_successor_probe.mjs')
        self.assertEqual(report['cold_rejections'], 7)
        for field in ['unknown_hash_rejected', 'wrong_length_rejected',
                      'accessor_not_invoked', 'public_metadata_isolated']:
            self.assertTrue(report[field], field)

    def test_javascript_reader_owner(self):
        report = self.run_probe('node', 'current_reader_source_successor_probe.mjs')
        self.assertEqual(report['cold_rejections'], 6)
        self.assertEqual(report['unknown_references_rejected'], 2)

    def test_python_reader_owner(self):
        report = self.run_probe(sys.executable, 'current_reader_source_successor_probe.py')
        self.assertEqual(report['cold_rejections'], 6)
        self.assertEqual(report['unknown_references_rejected'], 2)


if __name__ == '__main__':
    unittest.main()
