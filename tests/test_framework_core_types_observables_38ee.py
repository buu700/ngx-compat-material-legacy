# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Lifecycle, EventEmitter and QueryList dependency-boundary successors."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FrameworkCoreTypesObservables(unittest.TestCase):
    def run_probe(self, path):
        result = subprocess.run(['node', path], cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return json.loads(result.stdout.strip().splitlines()[-1])

    def test_lifecycle_source_roles(self):
        report = self.run_probe('tests/framework_lifecycle_38ee_roles_probe.mjs')
        self.assertEqual((report['cases'], report['unchanged'], report['mutations']), (41, 41, 4))
        self.assertEqual(report['changed'], [])

    def test_observable_source_roles(self):
        report = self.run_probe('tests/framework_observable_38ee_roles_probe.mjs')
        self.assertEqual((report['cases'], report['unchanged'], report['mutations']), (18, 18, 6))
        self.assertEqual(report['changed'], [])

    def test_minimum_public_declarations(self):
        report = self.run_probe('tests/framework_lifecycle_38ee_minimum_probe.mjs')
        self.assertEqual((report['version'], report['names'], report['mutations']), ('22.1.7', 10, 7))

    def test_exact_source_review_admission(self):
        report = self.run_probe('tests/framework_core_types_observables_38ee_admission_probe.mjs')
        self.assertEqual((report['selected'], report['lifecycle'], report['event'], report['query'], report['held']), (58, 41, 8, 9, 1))
        self.assertTrue(report['source_only_result'])
        self.assertTrue(report['semantic_review_required'])
