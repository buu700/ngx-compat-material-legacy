"""Owned motion callbacks must reject stale phases, duplicates and teardown work."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MenuSelectMotionTests(unittest.TestCase):
    def test_real_owned_prototype_methods_and_specific_corruptions(self):
        result = subprocess.run(
            ['node', 'tests/menu_select_motion_runtime_probe.mjs'], cwd=ROOT,
            text=True, capture_output=True, timeout=30,
        )
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-4000:])


if __name__ == '__main__':
    unittest.main()
