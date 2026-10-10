"""Original comparator defect and complete public minimum fixes."""
from pathlib import Path
import json
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SelectionModelPublicTests(unittest.TestCase):
    def test_original_bug_minimum_fixes_and_mutations(self):
        result = subprocess.run(['node', 'tests/selection_model_public_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['uses'], 3)
        self.assertEqual(observed['source_negative_controls'], 9)
        self.assertEqual(observed['subjects'], 6)
        self.assertEqual(observed['cases'], 64)
        self.assertTrue(observed['original_bug_reproduced'])
        self.assertEqual(observed['mutation_rejections'], 11)
        self.assertEqual(observed['strict_type_subjects'], 3)
        self.assertEqual(observed['declaration_negative_controls'], 12)
        self.assertEqual(observed['delta_sources'], 1)
        self.assertEqual(observed['delta_negative_controls'], 2)
        self.assertFalse(observed['native_executed'])

    def test_packed_legacy_exposure_requires_actual_observation(self):
        result = subprocess.run(['node', 'tests/packed_selection_comparator_admission_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['cases'], 9)
        self.assertEqual(observed['mutants_rejected'], 2)
        self.assertTrue(observed['roster_bound'])
        self.assertFalse(observed['native_executed'])

    def test_review_bindings_cover_exact_uses_and_inherited_reads(self):
        code = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseInventory,authoredUseReviewEvidence} from './scripts/authored-use-inventory.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const ledger=JSON.parse(readFileSync('compatibility/f10/authored-dependency-dispositions.json'));
const seed=JSON.parse(readFileSync('compatibility/f10/authored-dependency-inventory-seed.json'));
assert.equal(authoredUseInventory(seed.symbol_uses,ledger).complete,true);
const rows=ledger.symbol_uses.filter(r=>r.module==='@angular/cdk/collections'&&r.symbol==='SelectionModel');
assert.equal(rows.length,3);assert.ok(rows.every(r=>r.status==='reviewed'&&r.disposition==='closed'));
const observe=(files={},line=ledger.line)=>authoredUseReviewEvidence({symbol_uses:rows},line,p=>Object.hasOwn(files,p)?files[p]:readFileSync(p),hash);
assert.deepEqual(observe(),{reviewed:3,insufficient:0,insufficient_uses:[]});
for(const row of rows)assert.equal(observe({['projects/ngx-material-legacy/'+row.file]:Buffer.from('changed caller')}).insufficient,1);
const delta='projects/ngx-material-legacy/legacy-select/select.ts';
assert.equal(observe({[delta]:Buffer.from('changed inherited model access')}).insufficient,3);
assert.equal(observe({'compatibility/rc/selection-model-boundary-source-proof.json':Buffer.from('changed public proof')}).insufficient,3);
assert.equal(observe({},ledger.line==='main'?'21.x':'main').insufficient,3);
'''
        result = subprocess.run(['node', '--input-type=module', '-e', code],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
