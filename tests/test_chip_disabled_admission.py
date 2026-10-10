"""The packed forms regression is required, explicit and artifact-bound."""
from pathlib import Path
import json
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ChipDisabledAdmissionTests(unittest.TestCase):
    def test_missing_false_or_forged_disabled_observation_cannot_pass(self):
        result = subprocess.run(['node', 'tests/packed_chip_disabled_admission_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observation = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observation['cases'], 9)
        self.assertEqual(observation['mutants_rejected'], 2)
        self.assertEqual(observation['derived_cases'], 93)
        self.assertFalse(observation['native_executed'])
