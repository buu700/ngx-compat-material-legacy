# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exercise the Chromium helper's process and CDP cleanup boundaries."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ChromiumLifecycleProcessControls(unittest.TestCase):
    def test_process_controls(self):
        expected = (ROOT / '.node-version').read_text().strip()
        version = subprocess.run(['node', '--version'], cwd=ROOT, capture_output=True, text=True, timeout=10, check=True)
        self.assertEqual(version.stdout.strip(), 'v' + expected)
        child = subprocess.run(['node', 'tests/chromium-lifecycle-process-controls.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-12000:])
