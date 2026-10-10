"""Engine-free consumer policy and admission controls, with genuine peer tokens."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]

class ConsumerAnimationEngineTests(unittest.TestCase):
    def test_generated_policy_and_engine_controls(self):
        result=subprocess.run(['node','tests/consumer_animation_engine_probe.mjs'],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
