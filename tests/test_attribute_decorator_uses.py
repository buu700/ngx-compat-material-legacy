"""Genuine Attribute annotation/constructor metadata; native node reads remain separate."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class AttributeDecoratorUseTests(unittest.TestCase):
    def test_public_attribute_annotation_and_constructor_binding(self):
        command=['node','--max-old-space-size=512','tests/attribute_decorator_use_probe.mjs']
        if os.environ.get('CLOSEOUT_ATTRIBUTE_DECORATOR_REPORT'):
            command.extend(['--report',os.environ['CLOSEOUT_ATTRIBUTE_DECORATOR_REPORT']])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=120)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        report=json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'],9)
        self.assertEqual(report['current_uses'],9)
        self.assertEqual(report['current_delta_uses'],0)
        self.assertEqual(report['references'],9)
        self.assertEqual(report['annotation_registrations_per_subject'],9)
        self.assertEqual(report['controls_per_subject'],9)
        self.assertEqual(report['mutations'],14)
        self.assertFalse(report['native_executed'])
