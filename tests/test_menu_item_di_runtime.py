"""Accepted menu DI construction using genuine public parent/root services."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def angular_available():
    return subprocess.run(['node', '-e', "require.resolve('@angular/compiler');require.resolve('typescript')"],
        cwd=ROOT, capture_output=True).returncode == 0


class MenuItemDiRuntimeTests(unittest.TestCase):
    @unittest.skipUnless(angular_available(), 'Angular/TypeScript unavailable; source DI diagnostic not executed')
    def test_owned_panel_identity_caller_services_and_accepted_construction_policy(self):
        result = subprocess.run(['node', 'tests/menu_item_di_runtime_probe.mjs'], cwd=ROOT,
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-6000:])

    @unittest.skipUnless(angular_available(), 'Angular/TypeScript unavailable; source type diagnostic not executed')
    def test_nominal_parent_token_and_exact_constructor_language_boundary(self):
        result = subprocess.run(['node', 'tests/menu_item_di_type_probe.mjs'], cwd=ROOT,
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-6000:])
