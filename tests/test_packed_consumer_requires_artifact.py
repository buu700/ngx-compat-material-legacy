"""Missing explicit artifact input must stop before installation or execution."""
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PackedConsumerRequiresArtifact(unittest.TestCase):
    def test_missing_run_and_tarball_exits_two(self):
        env = {key: value for key, value in os.environ.items() if not key.startswith('RC_')}
        result = subprocess.run(['node', 'scripts/packed-consumer-aot-smoke.mjs'], cwd=ROOT,
            env=env, capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 2, result.stderr or result.stdout)
        self.assertIn('--tarball or --run is required', result.stderr)
        self.assertIn('historical-unbound', result.stderr)
