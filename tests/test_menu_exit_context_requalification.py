"""Finite source contexts retain old judgments and reject unreviewed drift."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MenuExitContextRequalificationTests(unittest.TestCase):
    def test_source_contexts_roles_and_corruption_controls(self):
        result = subprocess.run(
            ['node', 'tests/menu_exit_context_requalification_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-7000:])
