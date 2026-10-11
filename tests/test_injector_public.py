# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Public Injector API/ownership protocols and source-bound dependency reviews."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class InjectorPublicTests(unittest.TestCase):
    def test_genuine_public_hierarchy_contexts_and_owned_source_routes(self):
        result = subprocess.run(['node', '--max-old-space-size=768', 'tests/injector_public_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['uses'], 6)
        self.assertEqual(observed['current_named_imports'], 16)
        self.assertEqual(observed['pending_delta_uses'], 10)
        self.assertEqual(observed['contexts'], 6)
        self.assertEqual(observed['cases'], 72)
        self.assertEqual(observed['strict_type_subjects'], 3)
        self.assertEqual(observed['source_negative_controls'], 12)
        self.assertEqual(observed['runtime_mutation_rejections'], 6)
        self.assertFalse(observed['actual_legacy_components_executed'])
        self.assertFalse(observed['native_or_packed_executed'])

    def test_exact_review_bindings_reject_changed_caller_or_wrong_line(self):
        code = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseInventory,authoredUseReviewEvidence} from './scripts/authored-use-inventory.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const ledger=JSON.parse(readFileSync('compatibility/f10/authored-dependency-dispositions.json'));
const seed=JSON.parse(readFileSync('compatibility/f10/authored-dependency-inventory-seed.json'));
assert.equal(authoredUseInventory(seed.symbol_uses,ledger).complete,true);
const rows=ledger.symbol_uses.filter(r=>r.module==='@angular/core'&&r.symbol==='Injector');
assert.equal(rows.length,6);assert.ok(rows.every(r=>r.disposition==='closed'&&r.status==='reviewed'));
const observe=(files={},line=ledger.line)=>authoredUseReviewEvidence({symbol_uses:rows},line,p=>Object.hasOwn(files,p)?files[p]:readFileSync(p),hash);
assert.deepEqual(observe(),{reviewed:6,insufficient:0,insufficient_uses:[]});
for(const row of rows)assert.equal(observe({['projects/ngx-material-legacy/'+row.file]:Buffer.from('changed supplied-injector route')}).insufficient,1);
assert.equal(observe({'compatibility/rc/injector-public-source-proof.json':Buffer.from('changed public ownership proof')}).insufficient,6);
assert.equal(observe({},ledger.line==='main'?'21.x':'main').insufficient,6);
'''
        result = subprocess.run(['node', '--input-type=module', '-e', code],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
