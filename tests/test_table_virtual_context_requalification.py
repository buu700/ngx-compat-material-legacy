"""Finite table evidence requalification cannot hide source or scope changes."""
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class TableViewportRequalificationTests(unittest.TestCase):
    def test_finite_role_comparison_and_corruption_controls(self):
        result = subprocess.run(['node', 'tests/table_virtual_context_requalification_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-7000:])
