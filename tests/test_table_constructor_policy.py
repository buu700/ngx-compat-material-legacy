"""Tagged table behavior and the delegated Angular-DI constructor policy."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class TableConstructorPolicyTests(unittest.TestCase):
    def test_tagged_original_and_actual_parent_factory_subclass_and_manual_rejection(self):
        result=subprocess.run(['node','tests/table_constructor_contract_probe.mjs'],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-6000:])
