"""Public EventEmitter scheduling, Subject and lifecycle differences."""
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class EventEmitterUseTests(unittest.TestCase):
    def test_actual_public_emitters_and_owned_modes(self):
        result = subprocess.run(['node', '--max-old-space-size=512', 'tests/event_emitter_use_probe.mjs'], cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'], 19)
        self.assertEqual(report['current_uses'], 21)
        self.assertEqual(report['current_delta_uses'], 2)
        self.assertEqual(report['constructions'], 41)
        self.assertEqual(report['async_constructions'], 2)
        self.assertEqual(report['references'], 82)
        self.assertEqual(report['controls_per_subject'], 15)
        self.assertEqual(report['mutations'], 18)
        self.assertFalse(report['native_executed'])
