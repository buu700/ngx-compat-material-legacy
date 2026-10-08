"""Finite delegated table construction cannot waive factory/identity/API failures."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class TableApiContractTests(unittest.TestCase):
    def test_exact_authority_originals_factory_parent_flags_lifetime_and_rejection(self):
        result=subprocess.run(['node','tests/table_api_contract_probe.mjs'],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-8000:])
