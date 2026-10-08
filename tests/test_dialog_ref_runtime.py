"""Bounded owned DialogRef lifetime/reentrancy diagnostic; no native qualification."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def angular_available():
    return subprocess.run(['node', '-e', "require.resolve('@angular/compiler');require.resolve('typescript')"],
        cwd=ROOT, capture_output=True).returncode == 0


class DialogRefRuntimeTests(unittest.TestCase):
    @unittest.skipUnless(angular_available(), 'Angular/TypeScript unavailable; ref source diagnostic not executed')
    def test_actual_owned_ref_teardown_reentrancy_and_mutations(self):
        result = subprocess.run(['node', 'tests/dialog_ref_runtime_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])
