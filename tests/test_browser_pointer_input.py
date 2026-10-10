# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class BrowserPointerInputTests(unittest.TestCase):
    def test_owned_native_driver_protocol_and_failure_paths(self):
        result = subprocess.run(['node', 'tests/browser_pointer_input_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertFalse(json.loads(result.stdout)['native_executed'])


if __name__ == '__main__':
    unittest.main()
