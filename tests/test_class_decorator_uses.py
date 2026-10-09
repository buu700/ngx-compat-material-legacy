"""Genuine class metadata, hook registration and historical nonstandalone base repair."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class ClassDecoratorUseTests(unittest.TestCase):
    def test_class_metadata_hooks_and_historical_standalone_mode(self):
        command=['node','--max-old-space-size=512','tests/class_decorator_use_probe.mjs']
        if os.environ.get('CLOSEOUT_CLASS_DECORATOR_REPORT'):
            command.extend(['--report',os.environ['CLOSEOUT_CLASS_DECORATOR_REPORT']])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=120)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        report=json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'],144)
        self.assertEqual(report['current_uses'],147)
        self.assertEqual(report['current_delta_uses'],3)
        self.assertEqual(report['references'],182)
        self.assertEqual(report['metadata_constructors_per_subject'],182)
        self.assertEqual(report['historical_bases_repaired'],22)
        self.assertEqual(report['unused_imports'],5)
        self.assertEqual(report['controls_per_subject'],13)
        self.assertEqual(report['mutations'],15)
        self.assertFalse(report['native_executed'])
