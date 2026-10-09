"""Stable animation-mode token and real owned policy bodies; native lifecycle remains open."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class AnimationTokenUseTests(unittest.TestCase):
    def test_public_mode_token_providers_and_owned_policy(self):
        command=['node','--max-old-space-size=512','tests/animation_token_use_probe.mjs']
        if os.environ.get('CLOSEOUT_ANIMATION_TOKEN_REPORT'):
            command.extend(['--report',os.environ['CLOSEOUT_ANIMATION_TOKEN_REPORT']])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=150)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        report=json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'],22)
        self.assertEqual(report['current_uses'],24)
        self.assertEqual(report['references'],28)
        self.assertEqual(report['constructor_annotations'],25)
        self.assertEqual(report['test_providers'],2)
        self.assertEqual(report['policy_inject'],1)
        self.assertEqual(report['token_controls_per_subject'],8)
        self.assertEqual(report['owned_policy_controls_per_subject'],13)
        self.assertEqual(report['mutations'],15)
        self.assertEqual(report['production_modules'],3)
        self.assertFalse(report['native_executed'])
