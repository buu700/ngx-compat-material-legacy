"""Owned table adapters retain the historical outlet and ownership contracts."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def runtime_available():
    return subprocess.run(['node', '-e', "require.resolve('@angular/compiler');require.resolve('typescript')"],
        cwd=ROOT, capture_output=True).returncode == 0


class TableOutletProtocolTests(unittest.TestCase):
    @unittest.skipUnless(runtime_available(), 'Angular/TypeScript unavailable; table adapter diagnostic not executed')
    def test_original_and_actual_public_parent_outlet_and_nested_ownership(self):
        result = subprocess.run(['node', 'tests/table_outlet_runtime_probe.mjs'], cwd=ROOT,
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])

    @unittest.skipUnless(runtime_available(), 'Angular/TypeScript unavailable; strict table adapter diagnostic not executed')
    def test_public_structural_protocol_and_owned_types(self):
        result = subprocess.run(['node', 'tests/table_outlet_type_probe.mjs'], cwd=ROOT,
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])
