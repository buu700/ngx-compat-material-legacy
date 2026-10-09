"""Owned tab motion retains duration, unique state completion and lifecycle cancellation."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
def angular_available():
    return subprocess.run(['node','-e',"require.resolve('@angular/compiler');require.resolve('typescript')"],cwd=ROOT,capture_output=True).returncode==0
class TabBodyMotionRuntimeTests(unittest.TestCase):
    @unittest.skipUnless(angular_available(),'Angular/TypeScript unavailable; tab-body source diagnostic not executed')
    def test_actual_owned_source_lifecycle_and_regression_mutants(self):
        result=subprocess.run(['node','tests/tab_body_motion_runtime_probe.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=15)
        self.assertEqual(result.returncode,0,(result.stderr or result.stdout)[-6000:])
