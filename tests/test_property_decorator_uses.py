"""Genuine property/query metadata and stable historical argument contracts."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class PropertyDecoratorUseTests(unittest.TestCase):
    def test_exact_property_query_annotations_and_deprecated_option_guard(self):
        command = ['node', '--max-old-space-size=512', 'tests/property_decorator_use_probe.mjs']
        if os.environ.get('CLOSEOUT_PROPERTY_DECORATOR_REPORT'):
            command.extend(['--report', os.environ['CLOSEOUT_PROPERTY_DECORATOR_REPORT']])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'], 99)
        self.assertEqual(report['current_uses'], 101)
        self.assertEqual(report['current_delta_uses'], 2)
        self.assertEqual(report['references'], 321)
        self.assertEqual(report['annotation_shapes_per_subject'], 321)
        self.assertEqual(report['unused_imports'], 9)
        self.assertEqual(report['controls_per_subject'], 14)
        self.assertEqual(report['mutations'], 21)
        self.assertFalse(report['native_executed'])
