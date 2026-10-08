"""Independent immutable method-body timing reference, not native qualification."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def angular_available():
    return subprocess.run(['node', '-e', "require.resolve('@angular/compiler');require.resolve('typescript')"],
        cwd=ROOT, capture_output=True).returncode == 0


class DialogTaggedFocusContractTests(unittest.TestCase):
    @unittest.skipUnless(angular_available(), 'Angular/TypeScript unavailable; tagged timing comparison not executed')
    def test_exact_tagged_focus_and_zone_readiness_timing(self):
        result = subprocess.run(['node', 'tests/dialog_tagged_focus_contract_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])
