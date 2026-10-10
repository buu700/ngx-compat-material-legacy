"""Finite document-token identities, DI boundaries and owned location factory."""
from pathlib import Path
import json
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DocumentTokenPublicTests(unittest.TestCase):
    def test_public_token_annotations_and_owned_factory(self):
        result = subprocess.run(['node', 'tests/document_token_public_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['frozen_uses'], 10)
        self.assertEqual(observed['current_uses'], 12)
        self.assertEqual(observed['delta_uses'], 2)
        self.assertEqual(observed['subjects'], 6)
        self.assertEqual(observed['cases'], 96)
        self.assertEqual(observed['source_negative_controls'], 10)
        self.assertEqual(observed['contract_negative_controls'], 15)
        self.assertFalse(observed['actual_legacy_components_executed'])
        self.assertFalse(observed['native_or_packed_qualified'])

    def test_finite_review_bindings_and_tamper_controls(self):
        code = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseInventory,authoredUseReviewEvidence} from './scripts/authored-use-inventory.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const ledger=JSON.parse(readFileSync('compatibility/f10/authored-dependency-dispositions.json'));
const seed=JSON.parse(readFileSync('compatibility/f10/authored-dependency-inventory-seed.json'));
assert.equal(authoredUseInventory(seed.symbol_uses,ledger).complete,true);
const rows=ledger.symbol_uses.filter(r=>r.module==='@angular/common'&&r.symbol==='DOCUMENT');
assert.equal(rows.length,10);assert.ok(rows.every(r=>r.status==='reviewed'&&r.disposition==='closed'));
const observe=(changed={},line=ledger.line)=>authoredUseReviewEvidence({symbol_uses:rows},line,p=>
 Object.hasOwn(changed,p)?changed[p]:readFileSync(p),hash);
assert.deepEqual(observe(),{reviewed:10,insufficient:0,insufficient_uses:[]});
for(const row of rows)assert.equal(observe({['projects/ngx-material-legacy/'+row.file]:Buffer.from('changed source')}).insufficient,1);
const report=JSON.parse(readFileSync(rows[0].source_review.path));
assert.equal(report.reviews.length,12);
assert.equal(report.reviews.filter(r=>r.source_binding.frozen_use===false).length,2);
for(const e of report.reviews[0].independent_evidence)assert.equal(observe({[e.path]:Buffer.from('changed evidence')}).insufficient,10);
assert.equal(observe({},ledger.line==='main'?'21.x':'main').insufficient,10);
assert.equal(observe({[rows[0].source_review.path]:Buffer.from('changed review')}).insufficient,10);
'''
        result = subprocess.run(['node', '--input-type=module', '-e', code],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
