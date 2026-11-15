# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Current lifecycle source reviews and public minimum declarations."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FrameworkLifecycleCurrentReview(unittest.TestCase):
    def run_probe(self, path):
        result = subprocess.run(['node', path], cwd=ROOT, capture_output=True,
                                text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return json.loads(result.stdout.strip().splitlines()[-1])

    def test_current_source_review_scope(self):
        report = self.run_probe('tests/framework_lifecycle_4903_admission_probe.mjs')
        self.assertEqual(report['selected'], 10)
        self.assertTrue(report['source_only_result'])
        self.assertTrue(report['semantic_review_required'])

    def test_installed_public_minimum_declarations(self):
        report = self.run_probe('scripts/framework-lifecycle-minimum-review.mjs')
        self.assertEqual(report['version'], '22.1.7')
        self.assertEqual(report['actual_sha256'], report['retained_sha256'])
        self.assertEqual(set(report['rejected_mutations']), {
            'wrong-version', 'wrong-entry', 'different-bytes',
            'missing-root-export', 'deprecated', 'private',
        })
