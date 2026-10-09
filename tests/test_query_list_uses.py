"""Genuine QueryList collection protocols and complete historical owned query consumers."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class QueryListUseTests(unittest.TestCase):
    def test_public_queries_and_complete_owned_consumers(self):
        command = ['node', '--max-old-space-size=512', 'tests/query_list_use_probe.mjs']
        if os.environ.get('CLOSEOUT_QUERY_LIST_REPORT'):
            command.extend(['--report', os.environ['CLOSEOUT_QUERY_LIST_REPORT']])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'], 21)
        self.assertEqual(report['current_uses'], 21)
        self.assertEqual(report['references'], 38)
        self.assertEqual(report['types'], 36)
        self.assertEqual(report['constructions'], 2)
        self.assertEqual(report['unused_imports'], 1)
        self.assertEqual(report['controls_per_subject'], 17)
        self.assertEqual(report['original_owned_context_cases_per_subject'], 30)
        self.assertEqual(report['mutations'], 22)
        self.assertFalse(report['native_executed'])
