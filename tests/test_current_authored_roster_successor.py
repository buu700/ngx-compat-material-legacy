# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Source-roster successor checks; the historical baseline remains separate."""
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CurrentAuthoredRosterSuccessorTest(unittest.TestCase):
    def test_current_data_and_retirement_source(self):
        for probe in ('current_authored_roster_successor_probe.mjs',
                      'current_dialog_retirement_successor_probe.mjs'):
            with self.subTest(probe=probe):
                subprocess.run(['node', str(ROOT / 'tests' / probe)], cwd=ROOT,
                               env=os.environ.copy(), check=True, timeout=60)


if __name__ == '__main__':
    unittest.main()
