"""Actual public forward references, exact callbacks and production/development contracts."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class ForwardRefUseTests(unittest.TestCase):
    def test_public_forward_references_and_owned_callbacks(self):
        command = ['node', '--max-old-space-size=512', 'tests/forward_ref_use_probe.mjs']
        if os.environ.get('CLOSEOUT_FORWARD_REF_REPORT'):
            command.extend(['--report', os.environ['CLOSEOUT_FORWARD_REF_REPORT']])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'], 11)
        self.assertEqual(report['current_uses'], 11)
        self.assertEqual(report['callbacks'], 12)
        self.assertEqual(report['unused_imports'], 1)
        self.assertEqual(report['development_controls_per_subject'], 13)
        self.assertEqual(report['production_controls_per_subject'], 12)
        self.assertEqual(report['mutations'], 19)
        self.assertFalse(report['native_executed'])
