# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SassNoticeScopeGuardTests(unittest.TestCase):
    def test_actual_owner_scope_controls(self):
        child = subprocess.run(['node', 'tests/sass_notice_scope_guard_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=600)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        row = json.loads(child.stdout)
        self.assertEqual(row['checks_passed'], 8)
        self.assertEqual(row['getters'], 0)
        self.assertTrue(row['input_scope_preserved'])
