"""Actual owned radio methods reject the upstream touch/lifecycle regressions."""
from pathlib import Path
import subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]
def runtime_available():
    return subprocess.run(['node','-e',"require.resolve('@angular/compiler');require.resolve('@angular/core');require('typescript')"],cwd=ROOT,capture_output=True).returncode==0
class RadioUpstreamRuntimeTests(unittest.TestCase):
    @unittest.skipUnless(runtime_available(),'Angular/TypeScript diagnostic runtime unavailable;native historical regressions remain required')
    def test_owned_source_execution_and_rejected_mutations(self):
        result=subprocess.run(['node','tests/radio_upstream_runtime_probe.mjs'],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,(result.stderr or result.stdout)[-1600:])
