# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Public table-helper roles preserve lookup and constructor-context boundaries."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TableVirtualHelperUseTests(unittest.TestCase):
    def test_public_import_contracts_and_complete_helper_mutants(self):
        result = subprocess.run(['node', 'tests/table_virtual_helper_use_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-7000:])
