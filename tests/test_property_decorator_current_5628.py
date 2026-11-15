# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Current property metadata census and bounded source reviews."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PropertyDecoratorCurrentReview(unittest.TestCase):
    def run_probe(self, path):
        result = subprocess.run(['node', path], cwd=ROOT, capture_output=True,
                                text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return json.loads(result.stdout.strip().splitlines()[-1])

    def test_full_current_metadata_census(self):
        report = self.run_probe('tests/property_decorator_current_f9_probe.mjs')
        self.assertEqual((report['frozen_uses'], report['current_uses'],
                          report['current_delta_uses'], report['references']), (99, 104, 5, 324))
        self.assertEqual(report['mutations'], 26)
        self.assertFalse(report['native_executed'])

    def test_original_and_packed_plain_disabled_input(self):
        report = self.run_probe('tests/pseudo_checkbox_plain_input_f9_probe.mjs')
        self.assertEqual(len(report['mutants']), 4)
        self.assertEqual(report['original_source_sha256'],
                         'a9c76e44bd88bf920b5fd77f309e3a841995193c8f2d5fead49b35e33a40ee37')

    def test_source_admission_and_transitions(self):
        report = self.run_probe('tests/property_decorator_f9_admission_probe.mjs')
        self.assertEqual((report['selected'], report['transitions']), (4, 14))
        self.assertEqual(report['historical_reviewed'], 19)
        self.assertEqual(report['live_reviewed'], 19)
        self.assertTrue(report['independent_change_accepted'])
        self.assertTrue(report['source_only_result'])
        self.assertTrue(report['semantic_review_required'])

    def test_versioned_producer_has_only_reviewed_population_changes(self):
        source = (ROOT / 'scripts/property-decorator-use-review.mjs').read_text()
        old = ("const deltaKeys = ['legacy-dialog/internal/dialog-container-base.ts#ViewChild', "
               "'legacy-table/internal/table-outlet.ts#Input', 'legacy-menu/internal/menu-item-base.ts#Input'].sort();")
        new = ("const deltaKeys = ['legacy-dialog/internal/dialog-container-base.ts#ViewChild', "
               "'legacy-table/internal/table-outlet.ts#Input', 'legacy-menu/internal/menu-item-base.ts#Input', "
               "'legacy-paginator/internal/page-size-options.ts#Input', 'legacy-paginator/paginator.ts#ViewChild'].sort();")
        replacements = [(old, new), ('assert.equal(actual.length, 48);', 'assert.equal(actual.length, 50);'),
                        ('assert.equal(cases.length, 102);', 'assert.equal(cases.length, 104);'),
                        ('assert.equal(applications.length, 322);', 'assert.equal(applications.length, 324);'),
                        ('current_uses: 102, current_delta_uses: 3', 'current_uses: 104, current_delta_uses: 5'),
                        ('322 actual call expressions replayed', '324 actual call expressions replayed')]
        for before, after in replacements:
            self.assertEqual(source.count(before), 1)
            source = source.replace(before, after)
        self.assertEqual(source, (ROOT / 'scripts/property-decorator-current-5628.mjs').read_text())
