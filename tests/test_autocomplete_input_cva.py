"""Historical autocomplete typing preserves the required-selection form model."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
def available():
    return subprocess.run(['node','-e',"require.resolve('@angular/compiler');require.resolve('@angular/forms');require.resolve('typescript')"],cwd=ROOT,capture_output=True).returncode==0
class AutocompleteInputTests(unittest.TestCase):
    @unittest.skipUnless(available(),'Angular/TypeScript unavailable; source diagnostic unexecuted')
    def test_complete_source_form_model_behavior(self):
        result=subprocess.run(['node','tests/autocomplete_input_cva_probe.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=15)
        self.assertEqual(result.returncode,0,(result.stderr or result.stdout)[-6000:])
