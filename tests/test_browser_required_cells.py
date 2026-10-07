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




def allocate(parent, prefix='chrome-'):
    script = """
import {allocateLauncherDir} from './scripts/browser-required-cells.mjs';
const parent = process.argv[1];
const prefix = process.argv[2];
console.log(allocateLauncherDir(prefix, parent));
"""
    result = subprocess.run(
        ['node', '--input-type=module', '-e', script, parent, prefix],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result


class LauncherParentTests(unittest.TestCase):
    def test_absent_owned_parent_is_created_without_touching_shared_tmp(self):
        import tempfile
        owned = Path(tempfile.mkdtemp(prefix='ngx-launcher-owned-'))
        absent = owned / 'missing-parent'
        self.assertFalse(absent.exists())
        shared = Path('/tmp/ngx-required-cells')
        shared_before = shared.exists()
        try:
            result = allocate(str(absent))
            self.assertEqual(result.returncode, 0, result.stderr)
            created = Path(result.stdout.strip())
            self.assertTrue(created.is_dir())
            self.assertEqual(created.parent, absent)
            self.assertTrue(str(created.name).startswith('chrome-'))
            self.assertEqual(shared.exists(), shared_before)
        finally:
            import shutil
            shutil.rmtree(owned, ignore_errors=True)

    def test_parent_collision_fails_without_spawning(self):
        import tempfile
        owned = Path(tempfile.mkdtemp(prefix='ngx-launcher-collide-'))
        blocker = owned / 'not-a-directory'
        blocker.write_text('occupied', encoding='utf8')
        try:
            result = allocate(str(blocker), 'ff-')
            self.assertNotEqual(result.returncode, 0)
            self.assertTrue(blocker.is_file())
            self.assertIn('EEXIST', result.stderr + result.stdout)
        finally:
            import shutil
            shutil.rmtree(owned, ignore_errors=True)

if __name__ == '__main__':
    unittest.main()
