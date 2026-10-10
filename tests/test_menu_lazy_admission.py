"""Lazy item destruction must be an explicit complete packed observation."""
from pathlib import Path
import json
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class MenuLazyAdmissionTests(unittest.TestCase):
    def test_missing_false_or_unconditional_destruction_is_rejected(self):
        code = "import {probeRequiredPackedContract} from './tests/packed_required_contract_admission.mjs'; console.log(JSON.stringify(probeRequiredPackedContract('menu')));"
        result = subprocess.run(['node', '--input-type=module', '-e', code],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observation = json.loads(result.stdout)
        self.assertEqual(observation['cases'], 9)
        self.assertEqual(observation['mutants_rejected'], 2)
        self.assertTrue(observation['roster_bound'])
        self.assertFalse(observation['native_executed'])
