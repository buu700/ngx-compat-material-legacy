"""Actual public injection guard scopes retain manual fallbacks and provider errors."""
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT-style license: see LICENSE.
from pathlib import Path
import os
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CurrentInjectionContextTests(unittest.TestCase):
    def test_authenticated_namespaces_and_actual_guard_scopes(self):
        result = subprocess.run(['node', '--max-old-space-size=768',
            'tests/current_injection_context_probe.mjs'], cwd=ROOT,
            env=os.environ.copy(), capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])


if __name__ == '__main__':
    unittest.main()
