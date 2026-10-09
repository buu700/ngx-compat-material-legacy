"""Erased public forms interface contracts, separate from forms behavior."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
def available():
    return subprocess.run(['node','-e',"require.resolve('typescript')"],cwd=ROOT,capture_output=True).returncode==0
class ControlValueAccessorTypeTests(unittest.TestCase):
    @unittest.skipUnless(available(),'TypeScript unavailable; type review unexecuted')
    def test_public_minimum_shapes_and_exact_erased_bindings(self):
        result=subprocess.run(['node','--max-old-space-size=512','tests/control_value_accessor_type_probe.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=45)
        self.assertEqual(result.returncode,0,(result.stderr or result.stdout)[-6000:])
