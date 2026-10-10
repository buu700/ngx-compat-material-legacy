"""Original comparator defect and complete public minimum fixes."""
from pathlib import Path
import json
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SelectionModelPublicTests(unittest.TestCase):
    def test_original_bug_minimum_fixes_and_mutations(self):
        result = subprocess.run(['node', 'tests/selection_model_public_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['uses'], 3)
        self.assertEqual(observed['source_negative_controls'], 4)
        self.assertEqual(observed['subjects'], 3)
        self.assertEqual(observed['cases'], 17)
        self.assertTrue(observed['original_bug_reproduced'])
        self.assertEqual(observed['mutation_rejections'], 2)
        self.assertFalse(observed['native_executed'])

    def test_packed_legacy_exposure_requires_actual_observation(self):
        result = subprocess.run(['node', 'tests/packed_selection_comparator_admission_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['cases'], 9)
        self.assertEqual(observed['mutants_rejected'], 2)
        self.assertEqual(observed['derived_cases'], 93)
        self.assertFalse(observed['native_executed'])
