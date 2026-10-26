# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Raw audit reads preserve missing/unsafe distinctions in the real source graph."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SourceRepositoryReader(unittest.TestCase):
    def test_actual_reader_and_dependency_graph(self):
        child = subprocess.run(['node', 'tests/source_repository_reader_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        report = json.loads(child.stdout)
        self.assertTrue(report['actual_root_reader_wired'])
        self.assertTrue(report['before_null_reader_reproduces_actual_graph_failure'])
        self.assertTrue(report['after_strict_reader_resolves_actual_graph'])
        self.assertEqual(report['negative_controls'], 12)
        self.assertFalse(report['product_or_runtime_qualification'])
