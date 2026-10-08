"""Owned input aliases must retain the complete authenticated16 type contract."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def typescript_available():
    return subprocess.run(['node', '-e', "require('typescript')"], cwd=ROOT, capture_output=True).returncode == 0


class CoercionInputTypeContractTests(unittest.TestCase):
    @unittest.skipUnless(typescript_available(), 'TypeScript unavailable; source type qualification not executed')
    def test_every_actual_alias_reference_strict_value_contract_and_mutant(self):
        result = subprocess.run(['node', 'tests/coercion_input_type_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-4800:])
