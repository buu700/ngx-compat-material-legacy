"""Historical optional anchor zone registration and exact listener lifetime."""
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT-style license: see LICENSE.
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AnchorZoneTests(unittest.TestCase):
    def test_whole_owned_parent_anchor_and_historical_mixins(self):
        command = ['node', 'tests/anchor_zone_runtime_probe.mjs']
        if os.environ.get('CLOSEOUT_ANCHOR_ZONE_REPORT'):
            command.append(os.environ['CLOSEOUT_ANCHOR_ZONE_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout)
        self.assertEqual(observed['subjects'], 10)
        self.assertEqual(observed['cases'], 20)
        self.assertEqual(observed['source_negative_controls'], 13)
        self.assertEqual(observed['runtime_mutation_rejections'], 86)
        self.assertTrue(observed['complete_parent_anchor_and_mixins_executed'])
        self.assertFalse(observed['native_or_packed_qualified'])

    def test_actual_import_review_rejects_wrong_source_and_receipt(self):
        script = r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseReviewEvidence} from './scripts/authored-use-inventory.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const path = 'compatibility/f10/authored-use-reviews/public-anchor-zone-boundary.json';
const bytes = readFileSync(path), body = JSON.parse(bytes);
const ledger = JSON.parse(readFileSync('compatibility/f10/authored-dependency-dispositions.json'));
const rows = ledger.symbol_uses.filter(r => r.source_review?.path === path);
assert.equal(rows.length, 1); assert.equal(rows[0].file, 'legacy-button/button.ts');
assert.equal(rows[0].symbol, 'NgZone'); assert.equal(rows[0].module, '@angular/core');
const observe = (changed = {}, line = body.line) => authoredUseReviewEvidence({symbol_uses: rows}, line,
  p => Object.hasOwn(changed, p) ? changed[p] : readFileSync(p), hash);
assert.equal(observe().reviewed, 1);
assert.equal(observe({['projects/ngx-material-legacy/' + rows[0].file]: Buffer.from('changed source')}).insufficient, 1);
assert.equal(observe({}, body.line === 'main' ? '21.x' : 'main').insufficient, 1);
assert.equal(observe({[path]: Buffer.from('changed review')}).insufficient, 1);
const runtime = 'compatibility/rc/anchor-zone-runtime-diagnostic.json';
assert.ok(body.reviews[0].independent_evidence.some(r => r.path === runtime));
assert.equal(observe({[runtime]: Buffer.from('changed runtime')}).insufficient, 1);
console.log(JSON.stringify({negative_controls: 4}));
"""
        result = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT,
            capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(json.loads(result.stdout)['negative_controls'], 4)
