# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""One exact branch-native default-module scope and its genuine compiler faults."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class LegacySassEntrypointScopeTests(unittest.TestCase):
    def test_actual_compiler_and_migration_faults(self):
        child = subprocess.run(['node', 'tests/legacy_sass_entrypoint_scope_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-8000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['positive_unmodified_fixture'], 1)
        self.assertEqual(report['rejection_controls'], 6)
        self.assertTrue(report['actual_Sass_compiler_and_migration_used'])
        self.assertTrue(report['all_fixture_roots_removed'])
        self.assertFalse(report['immutable_oracle_or_product_files_changed'])
        self.assertFalse(report['actual_native_artifact_browser_full_Sass_floor_or_audit_qualified'])

    def test_exact_source_scope_and_fresh_admission(self):
        child = subprocess.run(['node', 'tests/legacy_sass_entrypoint_admission_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-8000:])
        report = json.loads(child.stdout)
        self.assertTrue(report['positive_source_and_fresh_compiler_admission'])
        self.assertEqual(report['rejection_controls'], 16)
        self.assertEqual(report['reviewed_original_paths'], 180)
        self.assertEqual(report['reviewed_original_hunks'], 194)
        self.assertEqual(report['canonical_dispositions_changed'], 0)
        self.assertFalse(report['actual_native_artifact_browser_full_Sass_floor_or_audit_qualified'])
