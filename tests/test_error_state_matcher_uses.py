"""Real public Material matcher namespaces and tagged historical state/emission behavior."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class ErrorStateMatcherUseTests(unittest.TestCase):
    def test_genuine_public_matcher_and_historical_owned_mixins(self):
        command=['node','--max-old-space-size=512','tests/error_state_matcher_use_probe.mjs']
        if os.environ.get('CLOSEOUT_ERROR_MATCHER_REPORT'):
            command.extend(['--report',os.environ['CLOSEOUT_ERROR_MATCHER_REPORT']])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=180)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        report=json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'],26)
        self.assertEqual(report['current_imports'],26)
        self.assertEqual(report['type_references'],72)
        self.assertEqual(report['module_providers'],2)
        self.assertEqual(report['owned_mixins'],22)
        self.assertEqual(report['controls_per_subject'],9)
        self.assertEqual(report['observations_per_subject'],32)
        self.assertEqual(report['mixin_transition_cases_per_subject'],230)
        self.assertEqual(report['mutations'],20)
        self.assertFalse(report['native_executed'])
