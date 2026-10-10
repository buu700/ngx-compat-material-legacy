"""Actual NgControl public inheritance/consumed accessors and unchanged legacy bindings."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class NgControlUseTests(unittest.TestCase):
    def test_historical_ng_control_subclass_and_consumed_properties(self):
        command=['node','--max-old-space-size=512','tests/ng_control_use_probe.mjs']
        if os.environ.get('CLOSEOUT_NG_CONTROL_REPORT'):
            command.extend(['--report',os.environ['CLOSEOUT_NG_CONTROL_REPORT']])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=180)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        report=json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'],24)
        self.assertEqual(report['type_references'],26)
        self.assertEqual(report['consumed_member_accesses'],14)
        self.assertEqual(report['accessor_writes'],2)
        self.assertEqual(report['decorated_optional_self_constructors'],2)
        self.assertEqual(report['controls_per_subject'],7)
        self.assertEqual(report['observations_per_subject'],6)
        self.assertEqual(report['mutations'],15)
        self.assertFalse(report['native_executed'])
