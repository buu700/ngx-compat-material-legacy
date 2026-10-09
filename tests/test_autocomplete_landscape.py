"""Autocomplete landscape settings reset and release their stream ownership."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
def available():
    return subprocess.run(['node','-e',"require.resolve('@angular/compiler');require.resolve('@angular/cdk/portal');require.resolve('typescript')"],cwd=ROOT,capture_output=True).returncode==0
class AutocompleteLandscapeTests(unittest.TestCase):
    @unittest.skipUnless(available(),'Angular/CDK/TypeScript unavailable; diagnostic unexecuted')
    def test_complete_owned_landscape_and_lifetime_boundary(self):
        result=subprocess.run(['node','tests/autocomplete_landscape_probe.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=15)
        self.assertEqual(result.returncode,0,(result.stderr or result.stdout)[-6000:])
