# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Legacy dialog must pass its live motion policy to the public CDK overlay."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def angular_available():
    return subprocess.run(['node', '-e', "require.resolve('@angular/compiler');require.resolve('typescript')"],
                          cwd=ROOT, capture_output=True).returncode == 0


class DialogBackdropPolicyRuntimeTests(unittest.TestCase):
    @unittest.skipUnless(angular_available(), 'Angular/TypeScript unavailable; dialog policy diagnostic not executed')
    def test_live_policy_injector_precedence_manual_fallback_and_lifecycle(self):
        result = subprocess.run(['node', 'tests/dialog_backdrop_policy_runtime_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])


if __name__ == '__main__':
    unittest.main()
