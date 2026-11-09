# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exercise owned historical Karma browser lifecycle controls."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class LegacyRunnerBrowserLifecycleTests(unittest.TestCase):
    def test_owner_and_failure_controls(self):
        expected = (ROOT / '.node-version').read_text().strip()
        version = subprocess.run(['node', '--version'], cwd=ROOT, capture_output=True, text=True, timeout=10, check=True)
        self.assertEqual(version.stdout.strip(), 'v' + expected)
        child = subprocess.run(['node', 'tests/legacy-runner-browser-lifecycle-controls.cjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=20)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-8000:])
