"""Run21.x CSP/SSR negatives in the existing lightweight helper CI lane."""
import subprocess,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class CspSsrRegressions(unittest.TestCase):
    def test_actual_branch_roster_and_policy_negatives(self):
        result=subprocess.run(['node','scripts/csp-ssr-regressions.mjs'],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertIn('83 cases',result.stdout)
