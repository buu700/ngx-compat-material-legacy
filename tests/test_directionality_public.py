"""Finite Directionality public dependency and authentic factory contract."""
from pathlib import Path
import json
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DirectionalityPublicTests(unittest.TestCase):
    def test_public_service_factory_stream_and_explicit_constructor_difference(self):
        result = subprocess.run(['node', 'tests/directionality_public_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['uses'], 15)
        self.assertEqual(observed['subjects'], 6)
        self.assertEqual(observed['cases'], 66)
        self.assertEqual(observed['source_negative_controls'], 10)
        self.assertEqual(observed['runtime_mutation_rejections'], 12)
        self.assertFalse(observed['actual_legacy_components_executed'])
        self.assertFalse(observed['native_or_packed_qualified'])

    def test_finite_review_bindings_reject_source_evidence_and_line_tampering(self):
        code = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseInventory,authoredUseReviewEvidence} from './scripts/authored-use-inventory.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const ledger=JSON.parse(readFileSync('compatibility/f10/authored-dependency-dispositions.json'));
const seed=JSON.parse(readFileSync('compatibility/f10/authored-dependency-inventory-seed.json'));
assert.equal(authoredUseInventory(seed.symbol_uses,ledger).complete,true);
const rows=ledger.symbol_uses.filter(r=>r.module==='@angular/cdk/bidi'&&r.symbol==='Directionality');
assert.equal(rows.length,15);assert.ok(rows.every(r=>r.status==='reviewed'&&r.disposition==='closed'));
const observe=(changed={},line=ledger.line)=>authoredUseReviewEvidence({symbol_uses:rows},line,p=>
 Object.hasOwn(changed,p)?changed[p]:readFileSync(p),hash);
assert.deepEqual(observe(),{reviewed:15,insufficient:0,insufficient_uses:[]});
for(const row of rows)assert.equal(observe({['projects/ngx-material-legacy/'+row.file]:Buffer.from('changed source')}).insufficient,1);
const report=JSON.parse(readFileSync(rows[0].source_review.path));
for(const e of report.reviews[0].independent_evidence)assert.equal(observe({[e.path]:Buffer.from('changed evidence')}).insufficient,15);
assert.equal(observe({},ledger.line==='main'?'21.x':'main').insufficient,15);
assert.equal(observe({[rows[0].source_review.path]:Buffer.from('changed review')}).insufficient,15);
'''
        result = subprocess.run(['node', '--input-type=module', '-e', code],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
