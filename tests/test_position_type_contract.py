"""Historical public position/direction type and source-binding boundaries."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PositionTypeContractTests(unittest.TestCase):
    def test_original_minimum_types_erasure_and_specific_corruptions(self):
        result = subprocess.run(
            ['node', 'tests/position_type_use_probe.mjs'], cwd=ROOT,
            text=True, capture_output=True, timeout=60,
        )
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-6000:])


if __name__ == '__main__':
    unittest.main()
