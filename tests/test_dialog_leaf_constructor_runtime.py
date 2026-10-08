"""Restore the actual legacy leaf constructor, not the modern Material leaf."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def angular_available():
    return subprocess.run(['node', '-e', "require.resolve('@angular/compiler');require.resolve('typescript')"],
        cwd=ROOT, capture_output=True).returncode == 0


class DialogLeafConstructorRuntimeTests(unittest.TestCase):
    @unittest.skipUnless(angular_available(), 'Angular/TypeScript unavailable; leaf constructor source diagnostic not executed')
    def test_authentic_constructor_di_arguments_manual_runtime_and_mutations(self):
        result = subprocess.run(['node', 'tests/dialog_leaf_constructor_runtime_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])
