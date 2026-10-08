"""Exact public type domain and erased uses; no focus behavior claims."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def typescript_available():
    return subprocess.run(['node', '-e', "require('typescript')"], cwd=ROOT, capture_output=True).returncode == 0


class FocusOriginTypeContractTests(unittest.TestCase):
    @unittest.skipUnless(typescript_available(), 'TypeScript unavailable; focus-origin type review not executed')
    def test_exact_type_domain_actual_uses_and_rejected_mutations(self):
        result = subprocess.run(['node', 'tests/focus_origin_type_probe.mjs'], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-6000:])
