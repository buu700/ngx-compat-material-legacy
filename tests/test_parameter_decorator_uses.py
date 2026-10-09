"""Actual built-in annotation metadata and public factory dependency scopes."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class ParameterDecoratorUseTests(unittest.TestCase):
    def test_annotations_exact_callers_and_provider_flags(self):
        command = ['node', '--max-old-space-size=512', 'tests/parameter_decorator_use_probe.mjs']
        if os.environ.get('CLOSEOUT_PARAMETER_DECORATOR_REPORT'):
            command.extend(['--report', os.environ['CLOSEOUT_PARAMETER_DECORATOR_REPORT']])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'], 89)
        self.assertEqual(report['current_uses'], 112)
        self.assertEqual(report['current_delta_uses'], 23)
        self.assertEqual(report['references'], 207)
        self.assertEqual(report['annotation_shapes_per_subject'], 205)
        self.assertEqual(report['factory_metadata_objects'], 2)
        self.assertEqual(report['unused_imports'], 5)
        self.assertEqual(report['controls_per_subject'], 15)
        self.assertEqual(report['mutations'], 19)
        self.assertFalse(report['native_host_boundary_executed'])
