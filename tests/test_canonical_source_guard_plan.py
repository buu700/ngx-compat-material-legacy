# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Include the shared scheduler's actual Node controls in helper CI discovery."""
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CanonicalSourceGuardPlanTests(unittest.TestCase):
    def test_all_node_lifetime_controls_execute(self):
        child = subprocess.run(['node', '--test', '--test-reporter=tap',
                                'tests/canonical_source_guard_plan_probe.mjs'],
                               cwd=ROOT, text=True, capture_output=True, timeout=30)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        for key, count in [('tests', 13), ('pass', 13), ('fail', 0), ('skipped', 0)]:
            self.assertEqual(re.findall(r'^# ' + key + r' (\d+)$', child.stdout, re.M), [str(count)])


if __name__ == '__main__':
    unittest.main()
