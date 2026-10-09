"""Enter activation and disabled/native tab-link keyboard routes remain distinct."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
def available():
    return subprocess.run(['node','-e',"require.resolve('@angular/cdk/keycodes');require.resolve('typescript')"],cwd=ROOT,capture_output=True).returncode==0
class TabLinkKeydownTests(unittest.TestCase):
    @unittest.skipUnless(available(),'CDK/TypeScript unavailable; source diagnostic unexecuted')
    def test_complete_handler_and_original_enter_contract(self):
        result=subprocess.run(['node','tests/tab_link_keydown_probe.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=15)
        self.assertEqual(result.returncode,0,(result.stderr or result.stdout)[-6000:])
