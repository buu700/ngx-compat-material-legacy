"""Actual render-helper declarations and independently retained runtime bindings."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RenderRegistrationTypesTests(unittest.TestCase):
    def test_per_caller_source_and_receipt_bindings(self):
        script = r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseReviewEvidence} from './scripts/authored-use-inventory.mjs';
const path='compatibility/f10/authored-use-reviews/current-render-registration-boundary.json';
const ledger=JSON.parse(readFileSync('compatibility/f10/authored-dependency-current-dispositions.json'));
const selected=ledger.symbol_uses.filter(r=>r.source_review?.path===path);
assert.equal(selected.length,20);
const review=JSON.parse(readFileSync(path));
assert.equal(review.reviews.length,20);
const hash=b=>createHash('sha256').update(b).digest('hex');
const observe=overrides=>authoredUseReviewEvidence({symbol_uses:selected},ledger.line,
 p=>Object.hasOwn(overrides,p)?overrides[p]:readFileSync(p),hash);
assert.deepEqual(observe({}),{reviewed:20,insufficient:0,insufficient_uses:[]});
assert.equal(observe({'projects/ngx-material-legacy/legacy-autocomplete/internal/after-legacy-render.ts':Buffer.from('changed helper')}).insufficient,4);
assert.equal(observe({'compatibility/rc/render-registration-public-source-proof.json':Buffer.from('changed declaration evidence')}).insufficient,20);
assert.equal(observe({'compatibility/rc/injector-render-select-current-diagnostic.json':Buffer.from('changed replay subject')}).insufficient,4);
assert.equal(observe({'tests/render_registration_type_probe.mjs':Buffer.from('changed producer')}).insufficient,20);
"""
        result = subprocess.run(['node', '--input-type=module', '-e', script],
                                cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_whole_minimum_declarations_and_existing_runtime_subjects(self):
        result = subprocess.run(['node', 'tests/render_registration_type_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout)
        self.assertEqual(observed['uses'], 20)
        self.assertEqual(observed['source_and_receipt_negative_controls'], 15)
        self.assertEqual(observed['strict_current_declaration_subjects'], 2)
        self.assertEqual(observed['stable_resolved_calls'], 20)
        self.assertEqual(observed['retained_runtime_contexts'], 50)
        self.assertEqual(observed['retained_runtime_mutants'], 260)
        self.assertFalse(observed['runtime_rerun'])
        self.assertEqual(observed['g11_claim'], 'not-passed')
