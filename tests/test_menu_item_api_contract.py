"""Finite owner-approved historical menu construction cannot waive factory/identity failures."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def runtime_available():
    return subprocess.run(['node', '-e', "require.resolve('@angular/compiler');require.resolve('typescript')"],
        cwd=ROOT, capture_output=True).returncode == 0


class MenuItemApiContractTests(unittest.TestCase):
    @unittest.skipUnless(runtime_available(), 'Angular/TypeScript unavailable; source factory integration not executed')
    def test_exact_authority_constructor_factory_flags_identity_and_lifetime(self):
        result = subprocess.run(['node', 'tests/menu_item_api_contract_probe.mjs'], cwd=ROOT,
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])
