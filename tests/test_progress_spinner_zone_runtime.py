"""Historical spinner optional resize/zone contracts at genuine public peer minima."""
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT-style license: see LICENSE.
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ProgressSpinnerZoneTests(unittest.TestCase):
    def test_whole_construction_resize_callback_and_teardown(self):
        command = ['node', 'tests/progress_spinner_zone_runtime_probe.mjs']
        if os.environ.get('CLOSEOUT_PROGRESS_SPINNER_ZONE_REPORT'):
            command.append(os.environ['CLOSEOUT_PROGRESS_SPINNER_ZONE_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout)
        self.assertEqual(observed['subjects'], 10)
        self.assertEqual(observed['cases'], 60)
        self.assertEqual(observed['source_negative_controls'], 13)
        self.assertEqual(observed['runtime_mutation_rejections'], 96)
        self.assertFalse(observed['native_style_init_or_packed_qualified'])

    def test_frozen_import_review_rejects_wrong_subjects_and_receipts(self):
        script = r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseReviewEvidence} from './scripts/authored-use-inventory.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const path = 'compatibility/f10/authored-use-reviews/public-progress-spinner-zone-boundary.json';
const bytes = readFileSync(path), body = JSON.parse(bytes);
const ledger = JSON.parse(readFileSync('compatibility/f10/authored-dependency-dispositions.json'));
const rows = ledger.symbol_uses.filter(r => r.source_review?.path === path);
assert.equal(rows.length, 1); assert.equal(rows[0].file, 'legacy-progress-spinner/progress-spinner.ts');
assert.equal(rows[0].module, '@angular/core'); assert.equal(rows[0].symbol, 'NgZone');
const observe = (changed = {}, line = body.line, selected = rows) => authoredUseReviewEvidence({symbol_uses: selected}, line,
  p => Object.hasOwn(changed, p) ? changed[p] : readFileSync(p), hash);
assert.equal(observe().reviewed, 1);
assert.equal(observe({['projects/ngx-material-legacy/' + rows[0].file]: Buffer.from('changed source')}).insufficient, 1);
assert.equal(observe({}, body.line === 'main' ? '21.x' : 'main').insufficient, 1);
assert.equal(observe({[path]: Buffer.from('changed review')}).insufficient, 1);
const receipt = 'compatibility/rc/progress-spinner-zone-runtime-diagnostic.json';
assert.ok(body.reviews[0].independent_evidence.some(r => r.path === receipt));
assert.equal(observe({[receipt]: Buffer.from('changed runtime')}).insufficient, 1);
assert.equal(observe({}, body.line, [{...rows[0], source_review: {path, sha256: '0'.repeat(64)}}]).insufficient, 1);
console.log(JSON.stringify({negative_controls: 5}));
"""
        result = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT,
            capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(json.loads(result.stdout)['negative_controls'], 5)
