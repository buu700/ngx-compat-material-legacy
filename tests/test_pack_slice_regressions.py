"""Browser-free regressions for the pack → exports → consumer producers."""
from __future__ import annotations

import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PackSliceRegressionTests(unittest.TestCase):
    def _run(self, script):
        result = subprocess.run(
            ['node', script],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=120,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return result.stdout

    def test_pack_library_regressions(self):
        out = self._run('scripts/pack-library-regressions.mjs')
        self.assertIn('pack-library regressions passed', out)

    def test_packed_exports_regressions(self):
        out = self._run('scripts/packed-exports-regressions.mjs')
        self.assertIn('packed-exports regressions passed', out)

    def test_packed_consumer_regressions(self):
        out = self._run('scripts/packed-consumer-regressions.mjs')
        self.assertIn('packed-consumer regressions passed', out)


if __name__ == '__main__':
    unittest.main()
