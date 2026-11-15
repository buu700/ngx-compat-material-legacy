# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Current parameter metadata census and bounded source reviews."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ParameterDecoratorCurrentReview(unittest.TestCase):
    def run_probe(self, path):
        result = subprocess.run(['node', path], cwd=ROOT, capture_output=True,
                                text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return json.loads(result.stdout.strip().splitlines()[-1])

    def test_full_current_metadata_census(self):
        report = self.run_probe('tests/parameter_decorator_current_5628_probe.mjs')
        self.assertEqual((report['frozen_uses'], report['current_uses'],
                          report['current_delta_uses'], report['references']), (89, 116, 27, 215))
        self.assertEqual(report['annotation_shapes_per_subject'], 213)
        self.assertEqual(report['mutations'], 25)
        self.assertFalse(report['native_host_boundary_executed'])

    def test_source_admission_and_transitions(self):
        report = self.run_probe('tests/parameter_decorator_current_5628_admission_probe.mjs')
        self.assertEqual((report['selected'], report['transitions']), (15, 15))
        self.assertTrue(report['source_only_result'])
        self.assertTrue(report['semantic_review_required'])

    def test_versioned_producer_has_only_reviewed_population_changes(self):
        source = (ROOT / 'scripts/parameter-decorator-use-review.mjs').read_text()
        replacements = [
            ('"legacy-menu/internal/menu-item-base.ts#Optional"].sort();',
             '"legacy-menu/internal/menu-item-base.ts#Optional", "legacy-table/internal/column-classes.ts#Inject", "legacy-table/internal/column-classes.ts#Optional"].sort();'),
            ('assert.equal(actual.length, 58);', 'assert.equal(actual.length, 59);'),
            ('assert.equal(cases.length, 114);', 'assert.equal(cases.length, 116);'),
            ('assert.equal(applications.length, 209);', 'assert.equal(applications.length, 213);'),
            ('current_uses: 114, current_delta_uses: 25', 'current_uses: 116, current_delta_uses: 27'),
            ('209 annotation shapes replayed', '213 annotation shapes replayed'),
        ]
        for before, after in replacements:
            self.assertEqual(source.count(before), 1)
            source = source.replace(before, after)
        self.assertEqual(source, (ROOT / 'scripts/parameter-decorator-current-5628.mjs').read_text())
