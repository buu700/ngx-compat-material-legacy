"""Actual partial source decisions cannot shrink scope or pass all-use admission."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AuthoredUseDispositionsTests(unittest.TestCase):
    def test_actual_bound_reviews_and_semantic_mutations(self):
        script = r"""
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {authoredUseInventory,authoredUseReviewEvidence} from './scripts/authored-use-inventory.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const seed=JSON.parse(readFileSync('compatibility/f10/authored-dependency-inventory-seed.json'));
const all=JSON.parse(readFileSync('compatibility/f10/authored-dependency-dispositions.json'));
const reviewPath='compatibility/f10/authored-use-reviews/menu-panel-owned-type-and-unused-token.json';
const candidate={...all,symbol_uses:all.symbol_uses.map(row=>row.source_review?.path===reviewPath?row:
 {...row,status:'pending',disposition:'open',source_review:undefined})};
const read=p=>readFileSync(p),good=authoredUseReviewEvidence(candidate,candidate.line,read,sha);
assert.equal(seed.symbol_uses.length,1736);
assert.ok(seed.symbol_uses.every(row=>row.disposition==='open'),'frozen seed remains untouched');
const roster=authoredUseInventory(seed.symbol_uses,candidate);
assert.equal(roster.complete,true);assert.equal(roster.open,1733);
assert.deepEqual(good,{reviewed:3,insufficient:0,insufficient_uses:[]});
assert.equal(authoredUseReviewEvidence(candidate,candidate.line==='main'?'21.x':'main',read,sha).insufficient,3);
const path='projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts';
const stale=authoredUseReviewEvidence(candidate,candidate.line,p=>p===path?Buffer.from('changed source'):read(p),sha);
assert.equal(stale.insufficient,2);assert.equal(stale.reviewed,1);
const original='reference/material-16.2.14/interface-sources/menu-panel.ts';
assert.equal(authoredUseReviewEvidence(candidate,candidate.line,p=>p===original?Buffer.from('changed oracle'):read(p),sha).insufficient,3);
const closed={...candidate,status:'closed',symbol_uses:candidate.symbol_uses.map(row=>({...row,status:'reviewed',disposition:'closed'}))};
assert.equal(authoredUseInventory(seed.symbol_uses,closed).open,0);
const forged=authoredUseReviewEvidence(closed,candidate.line,read,sha);
assert.equal(forged.reviewed,3);assert.equal(forged.insufficient,1733);
"""
        result = subprocess.run(['node', '--input-type=module', '-e', script],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)

    def test_real_checker_defaults_to_exact_dispositions_with_complete_scope(self):
        candidate_path = ROOT / 'compatibility/f10/authored-dependency-dispositions.json'
        candidate_bytes = candidate_path.read_bytes()
        candidate = json.loads(candidate_bytes)
        closed = [row for row in candidate['symbol_uses']
            if row['status'] == 'reviewed' and row['disposition'] == 'closed']
        open_count = 1736 - len(closed)
        with tempfile.TemporaryDirectory() as folder:
            report = Path(folder) / 'admission.json'
            result = subprocess.run(['node', 'scripts/check-upstream-audit-disposition.mjs',
                '--admission', '--report', str(report)], cwd=ROOT, capture_output=True, text=True)
            self.assertIn(result.returncode, (0, 1), result.stderr or result.stdout)
            body = json.loads(report.read_text())
            self.assertEqual(body['authored_use_inventory']['expected'], 1736)
            self.assertEqual(body['symbol_dispositions_sha256'], hashlib.sha256(candidate_bytes).hexdigest())
            self.assertEqual(body['symbol_uses_open'], open_count)
            self.assertEqual(body['authored_use_review_evidence']['reviewed'], len(closed))
            self.assertEqual(body['authored_use_review_evidence']['insufficient'], 0)
            if open_count:
                self.assertEqual(result.returncode, 1)
                self.assertEqual(body['disposition_admission'], 'incomplete')
            self.assertEqual(body['g11_claim'], 'not-passed')
