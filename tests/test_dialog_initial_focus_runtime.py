"""Own initial focus without current CDK private fields; source-only diagnostic."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def angular_available():
    return subprocess.run(['node', '-e', "require.resolve('@angular/compiler');require.resolve('typescript')"],
        cwd=ROOT, capture_output=True).returncode == 0


class DialogInitialFocusRuntimeTests(unittest.TestCase):
    @unittest.skipUnless(angular_available(), 'Angular/TypeScript unavailable; focus source diagnostic not executed')
    def test_owned_focus_timing_lifecycle_public_algorithm_and_mutations(self):
        result = subprocess.run(['node', 'tests/dialog_initial_focus_runtime_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])
