"""The owned nearest-tab token must preserve exact factory argument identities."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def runtime_available():
    return subprocess.run(['node', '-e',
        "require.resolve('@angular/compiler');require.resolve('@angular/material/tabs');require('typescript')"],
        cwd=ROOT, capture_output=True).returncode == 0


class TabTokenRuntimeTests(unittest.TestCase):
    @unittest.skipUnless(runtime_available(), 'Angular/TypeScript runtime unavailable; native regressions remain required')
    def test_actual_factory_identity_optional_token_and_rejected_mutations(self):
        result = subprocess.run(['node', 'tests/tab_token_runtime_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-2400:])
