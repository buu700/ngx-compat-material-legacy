"""Requalifying source exclusions cannot alter original judgments or ignore drift."""
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class TableVirtualUpstreamTests(unittest.TestCase):
    def test_source_scopes_and_fourteen_corruption_controls(self):
        result = subprocess.run(['node', 'tests/table_virtual_upstream_requalification_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-7000:])
