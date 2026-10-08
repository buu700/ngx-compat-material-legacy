"""Mouse fixture masks must distinguish primary, auxiliary and secondary presses."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def runtime_available():
    return subprocess.run(['node', '-e', "require.resolve('@angular/core');require.resolve('typescript')"],
        cwd=ROOT, capture_output=True).returncode == 0


class OwnedMouseFixtureTests(unittest.TestCase):
    @unittest.skipUnless(runtime_available(), 'Angular/TypeScript unavailable; mouse fixture diagnostic not executed')
    def test_both_helpers_use_standard_masks_and_preserve_other_event_options(self):
        result = subprocess.run(['node', 'tests/owned_mouse_fixture_probe.mjs'], cwd=ROOT,
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])
