"""Complete progress-bar zone lifecycle and evidence bindings at real peer minima."""
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT-style license: see LICENSE.
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ProgressBarZoneTests(unittest.TestCase):
    def test_genuine_zones_historical_parity_and_behavior_mutants(self):
        command = ['node', 'tests/progress_bar_zone_runtime_probe.mjs']
        if os.environ.get('CLOSEOUT_PROGRESS_BAR_ZONE_REPORT'):
            command.append(os.environ['CLOSEOUT_PROGRESS_BAR_ZONE_REPORT'])
        run = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        report = json.loads(run.stdout)
        self.assertEqual(report['subjects'], 10)
        self.assertEqual(report['cases'], 40)
        self.assertEqual(report['source_negative_controls'], 12)
        self.assertEqual(report['runtime_mutation_rejections'], 66)
        self.assertTrue(report['complete_manual_classes_executed'])
        self.assertFalse(report['native_or_packed_qualified'])

    def test_actual_review_rejects_stale_source_and_changed_runtime_receipt(self):
        # This exercises the shipped evidence admission with actual review bytes,
        # while overriding reads in memory rather than editing product or oracles.
        script = r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseReviewEvidence} from './scripts/authored-use-inventory.mjs';
const sha = b => createHash('sha256').update(b).digest('hex');
const path = 'compatibility/f10/authored-use-reviews/public-progress-bar-zone-boundary.json';
const bytes = readFileSync(path), body = JSON.parse(bytes), review = body.reviews[0];
const row = {file: review.file, module: review.module, symbol: review.symbol,
  status: 'reviewed', disposition: 'closed', source_review: {path, sha256: sha(bytes)}};
const observe = (overrides = {}, line = body.line) => authoredUseReviewEvidence({symbol_uses: [row]},
  line, p => overrides[p] ?? readFileSync(p), sha);
assert.equal(observe().reviewed, 1);
assert.equal(observe({}, body.line === 'main' ? '21.x' : 'main').insufficient, 1);
assert.equal(observe({['projects/ngx-material-legacy/' + row.file]: Buffer.from('changed source')}).insufficient, 1);
const runtime = review.independent_evidence.find(r => r.path.endsWith('progress-bar-zone-runtime-diagnostic.json'));
assert.ok(runtime);
assert.equal(observe({[runtime.path]: Buffer.from('changed runtime receipt')}).insufficient, 1);
const stale = Buffer.from(JSON.stringify({...body, reviews: [{...review, candidate_source_sha256: '0'.repeat(64)}]}));
const alteredRow = {...row, source_review: {path, sha256: sha(stale)}};
assert.equal(authoredUseReviewEvidence({symbol_uses: [alteredRow]}, body.line,
  p => p === path ? stale : readFileSync(p), sha).insufficient, 1);
console.log(JSON.stringify({negative_controls: 4, native_or_packed_qualified: false}));
"""
        run = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT,
            capture_output=True, text=True, timeout=30)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        self.assertEqual(json.loads(run.stdout)['negative_controls'], 4)

    def test_current_owned_observer_reviews_are_individually_bound(self):
        script = r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseReviewEvidence} from './scripts/authored-use-inventory.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const path = 'compatibility/f10/authored-use-reviews/public-owned-observer-zone-boundary.json';
const bytes = readFileSync(path), body = JSON.parse(bytes);
const ledger = JSON.parse(readFileSync('compatibility/f10/authored-dependency-current-dispositions.json'));
const rows = ledger.symbol_uses.filter(r => r.source_review?.path === path);
assert.equal(rows.length, 2);
assert.deepEqual(rows.map(r => r.file).sort(), ['legacy-core/internal/legacy-viewport.ts',
  'legacy-tabs/internal/owned-header-resize.ts']);
assert.equal(rows.filter(r => r.status === 'reviewed' && r.disposition === 'closed').length, 2);
const observe = (changed = {}, line = body.line) => authoredUseReviewEvidence({symbol_uses: rows}, line,
  p => Object.hasOwn(changed, p) ? changed[p] : readFileSync(p), hash);
assert.equal(observe().reviewed, 2);
for (const row of rows) assert.equal(observe({['projects/ngx-material-legacy/' + row.file]: Buffer.from('changed helper')}).insufficient, 1);
assert.equal(observe({}, body.line === 'main' ? '21.x' : 'main').insufficient, 2);
assert.equal(observe({[path]: Buffer.from('changed review')}).insufficient, 2);
const receipt = 'compatibility/rc/zone-observers-current-runtime-diagnostic.json';
assert.ok(body.reviews.every(r => r.independent_evidence.some(e => e.path === receipt)));
assert.equal(observe({[receipt]: Buffer.from('changed runtime')}).insufficient, 2);
console.log(JSON.stringify({current_uses: 2, negative_controls: 5}));
"""
        run = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT,
            capture_output=True, text=True, timeout=30)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        self.assertEqual(json.loads(run.stdout)['negative_controls'], 5)
