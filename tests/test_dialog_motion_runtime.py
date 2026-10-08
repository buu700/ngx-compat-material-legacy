"""Owned dialog motion must cancel stale phase and destruction work."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def angular_available():
    return subprocess.run(['node', '-e', "require.resolve('@angular/compiler');require.resolve('typescript')"],
        cwd=ROOT, capture_output=True).returncode == 0


class DialogMotionRuntimeTests(unittest.TestCase):
    @unittest.skipUnless(angular_available(), 'Angular/TypeScript unavailable; dialog motion source diagnostic not executed')
    def test_owned_state_timing_reentrancy_cancellation_and_mutations(self):
        result = subprocess.run(['node', 'tests/dialog_motion_runtime_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])
