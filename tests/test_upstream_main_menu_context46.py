# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite main menu DI source context; no runtime or security clearance."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MainMenuContext46Tests(unittest.TestCase):
    def test_sources_and_controls(self):
        result = subprocess.run(['node', 'tests/upstream_main_menu_context46_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        data = json.loads(result.stdout)
        self.assertEqual((data['builds'], data['consolidations']), (14, 32))
        self.assertEqual((data['context_records'], data['product_paths']), (70, 1143))
        self.assertEqual(data['negative_controls'], 22)
