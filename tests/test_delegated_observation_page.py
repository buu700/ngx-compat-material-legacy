"""The coverage observer must preserve failures without inserting layout UI."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DelegatedObservationPageTests(unittest.TestCase):
    def test_bootstrap_failure_and_layout_observation(self):
        result = subprocess.run(
            ['node', 'tests/delegated_observation_page_probe.mjs'], cwd=ROOT,
            text=True, capture_output=True, timeout=30,
        )
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-4000:])


if __name__ == '__main__':
    unittest.main()
