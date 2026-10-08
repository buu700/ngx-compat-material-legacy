"""Actual owned tab header cancellation/reentrancy, with synthetic geometry."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def angular_available():
    return subprocess.run(['node', '-e', "require.resolve('@angular/compiler');require.resolve('typescript')"],
        cwd=ROOT, capture_output=True).returncode == 0


class TabHeaderLifetimeTests(unittest.TestCase):
    @unittest.skipUnless(angular_available(), 'Angular/TypeScript unavailable; source lifetime diagnostic not executed')
    def test_queued_lifetimes_public_key_manager_reentrancy_and_live_styles(self):
        result = subprocess.run(['node', 'tests/tab_header_lifetime_probe.mjs'], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-6000:])
