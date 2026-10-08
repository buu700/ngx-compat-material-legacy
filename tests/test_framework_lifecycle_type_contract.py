"""Original and minimum public lifecycle type boundaries, not hook execution."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def typescript_available():
    return subprocess.run(['node', '-e', "require('typescript')"], cwd=ROOT, capture_output=True).returncode == 0


class FrameworkLifecycleTypeContractTests(unittest.TestCase):
    @unittest.skipUnless(typescript_available(), 'TypeScript unavailable; public type review not executed')
    def test_actual_imports_exact_defaults_and_rejected_semantic_mutations(self):
        result = subprocess.run(['node', 'tests/framework_lifecycle_type_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-6000:])
