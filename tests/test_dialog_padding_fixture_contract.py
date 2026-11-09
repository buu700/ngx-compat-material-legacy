# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
"""Pure fixture-assessment controls; this does not start a browser."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogPaddingFixtureContract(unittest.TestCase):
    def test_missing_nodes_cascade_and_wrong_value_are_rejected(self):
        child = subprocess.run(['node', '--test', 'tests/dialog_padding_fixture_contract.test.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-5000:])


if __name__ == '__main__':
    unittest.main()
