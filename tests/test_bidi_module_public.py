"""Finite BidiModule reexport scope with authentic public peer behavior."""
from pathlib import Path
import json
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class BidiModulePublicTests(unittest.TestCase):
    def test_module_exports_scoped_identity_and_direction_lifecycle(self):
        result = subprocess.run(['node', 'tests/bidi_module_public_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['uses'], 25)
        self.assertEqual(observed['subjects'], 6)
        self.assertEqual(observed['cases'], 36)
        self.assertEqual(observed['source_negative_controls'], 9)
        self.assertEqual(observed['runtime_mutation_rejections'], 17)
        self.assertFalse(observed['native_or_packed_qualified'])

    def test_exact_review_bindings_and_tamper_controls(self):
        code = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseInventory,authoredUseReviewEvidence} from './scripts/authored-use-inventory.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const ledger=JSON.parse(readFileSync('compatibility/f10/authored-dependency-dispositions.json'));
const seed=JSON.parse(readFileSync('compatibility/f10/authored-dependency-inventory-seed.json'));
assert.equal(authoredUseInventory(seed.symbol_uses,ledger).complete,true);
const rows=ledger.symbol_uses.filter(r=>r.module==='@angular/cdk/bidi'&&r.symbol==='BidiModule');
assert.equal(rows.length,25);assert.ok(rows.every(r=>r.status==='reviewed'&&r.disposition==='closed'));
const observe=(changed={},line=ledger.line)=>authoredUseReviewEvidence({symbol_uses:rows},line,p=>
 Object.hasOwn(changed,p)?changed[p]:readFileSync(p),hash);
assert.deepEqual(observe(),{reviewed:25,insufficient:0,insufficient_uses:[]});
for(const row of rows)assert.equal(observe({['projects/ngx-material-legacy/'+row.file]:Buffer.from('changed source')}).insufficient,1);
const report=JSON.parse(readFileSync(rows[0].source_review.path));
for(const e of report.reviews[0].independent_evidence)assert.equal(observe({[e.path]:Buffer.from('changed evidence')}).insufficient,25);
assert.equal(observe({},ledger.line==='main'?'21.x':'main').insufficient,25);
assert.equal(observe({[rows[0].source_review.path]:Buffer.from('changed review')}).insufficient,25);
'''
        result = subprocess.run(['node', '--input-type=module', '-e', code],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
