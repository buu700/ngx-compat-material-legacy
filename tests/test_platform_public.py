"""Public Platform token, boolean flags and supplied-instance boundary."""
from pathlib import Path
import json
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PlatformPublicTests(unittest.TestCase):
    def test_genuine_public_factory_flags_and_constructor_difference(self):
        result = subprocess.run(['node', 'tests/platform_public_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['uses'], 13)
        self.assertEqual(observed['delta_sources'], 1)
        self.assertEqual(observed['subjects'], 6)
        self.assertEqual(observed['cases'], 96)
        self.assertEqual(observed['source_negative_controls'], 12)
        self.assertEqual(observed['runtime_mutation_rejections'], 15)
        self.assertFalse(observed['actual_legacy_components_executed'])
        self.assertFalse(observed['native_or_packed_qualified'])

    def test_review_bindings_preserve_roster_and_prior_ripple_review(self):
        code = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseInventory, authoredUseReviewEvidence} from './scripts/authored-use-inventory.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const ledger = JSON.parse(readFileSync('compatibility/f10/authored-dependency-dispositions.json'));
const seed = JSON.parse(readFileSync('compatibility/f10/authored-dependency-inventory-seed.json'));
assert.equal(authoredUseInventory(seed.symbol_uses, ledger).complete, true);
const all = ledger.symbol_uses.filter(r => r.module === '@angular/cdk/platform' && r.symbol === 'Platform');
assert.equal(all.length, 13); assert.ok(all.every(r => r.status === 'reviewed' && r.disposition === 'closed'));
const ripple = all.find(r => r.file === 'legacy-core/ripple/ripple-renderer.ts');
assert.equal(ripple.source_review.path, 'compatibility/f10/authored-use-reviews/public-ripple-renderer-boundaries.json');
const rows = all.filter(r => r !== ripple);
assert.equal(rows.length, 12);
const observe = (changed = {}, line = ledger.line) => authoredUseReviewEvidence({symbol_uses: rows}, line,
 p => Object.hasOwn(changed, p) ? changed[p] : readFileSync(p), hash);
assert.deepEqual(observe(), {reviewed: 12, insufficient: 0, insufficient_uses: []});
for (const row of rows) assert.equal(observe({['projects/ngx-material-legacy/' + row.file]: Buffer.from('changed source')}).insufficient, 1);
const report = JSON.parse(readFileSync(rows[0].source_review.path));
for (const evidence of report.reviews[0].independent_evidence)
 assert.equal(observe({[evidence.path]: Buffer.from('changed evidence')}).insufficient, 12);
assert.equal(observe({}, ledger.line === 'main' ? '21.x' : 'main').insufficient, 12);
assert.equal(observe({[rows[0].source_review.path]: Buffer.from('changed review')}).insufficient, 12);
'''
        result = subprocess.run(['node', '--input-type=module', '-e', code],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
