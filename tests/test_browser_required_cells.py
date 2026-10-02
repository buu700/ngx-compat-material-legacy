#!/usr/bin/env python3
"""The required-cell credit rule rejects evidence-free and out-of-matrix ids."""
from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def summarize(required, outcomes):
    script = """
import {summarizeCells} from './scripts/browser-required-cells.mjs';
const required = JSON.parse(process.argv[1]);
const outcomes = JSON.parse(process.argv[2]);
console.log(JSON.stringify(summarizeCells(required, outcomes)));
"""
    result = subprocess.run(
        ['node', '--input-type=module', '-e', script, json.dumps(required), json.dumps(outcomes)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)
    return json.loads(result.stdout)


class BrowserRequiredCellCreditTests(unittest.TestCase):
    def test_intact_rows_match_the_required_ids(self):
        summary = summarize(
            ['pr/main/chromium/zoneful/button/default', 'pr/main/firefox/zoneful/button/default'],
            [
                {'id': 'pr/main/chromium/zoneful/button/default', 'ok': True, 'evidence': 'mat-button'},
                {'id': 'pr/main/firefox/zoneful/button/default', 'ok': True, 'evidence': 'mat-button'},
            ],
        )
        self.assertTrue(summary['ok'])
        self.assertEqual(summary['executed_count'], 2)
        self.assertEqual(summary['failed_cell_ids'], [])
        self.assertEqual(summary['missing_cell_ids'], [])
        self.assertEqual(summary['unknown_cell_ids'], [])

    def test_missing_duplicate_and_empty_evidence_are_not_a_pass(self):
        summary = summarize(
            ['kept', 'removed-from-run', 'empty-evidence'],
            [
                {'id': 'kept', 'ok': True, 'evidence': 'host'},
                {'id': 'kept', 'ok': True, 'evidence': 'copied'},
                {'id': 'empty-evidence', 'ok': True, 'evidence': ''},
                {'id': 'not-in-matrix', 'ok': True, 'evidence': 'extra'},
            ],
        )
        self.assertFalse(summary['ok'])
        self.assertEqual(summary['executed_cell_ids'], ['kept'])
        self.assertIn('empty-evidence', summary['failed_cell_ids'])
        self.assertIn('removed-from-run', summary['missing_cell_ids'])
        self.assertIn('kept', summary['unknown_cell_ids'])
        self.assertIn('not-in-matrix', summary['unknown_cell_ids'])


if __name__ == '__main__':
    unittest.main()
