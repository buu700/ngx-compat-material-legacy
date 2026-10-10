# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Seven current render Injector dependencies retain exact binding and public types."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CurrentRenderInjectorTests(unittest.TestCase):
    def test_actual_helper_types_and_source_ownership_controls(self):
        result = subprocess.run(['node', '--max-old-space-size=512', 'tests/injector_render_type_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout)
        self.assertEqual(observed['uses'], 7)
        self.assertEqual(observed['source_negative_controls'], 12)
        self.assertEqual(observed['strict_minimum_declaration_subjects'], 2)
        self.assertEqual(observed['resolved_nondeprecated_gets'], 10)
        self.assertEqual(observed['negative_types_per_subject'], 3)

    def test_current_review_bindings_and_render_evidence_cannot_be_restamped(self):
        code = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseReviewEvidence} from './scripts/authored-use-inventory.mjs';
import {reviewRenderInjectorUses} from './scripts/injector-render-use-review.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const ledger=JSON.parse(readFileSync('compatibility/f10/authored-dependency-current-dispositions.json'));
const files=new Set(reviewRenderInjectorUses().cases.map(row=>row.file));
const rows=ledger.symbol_uses.filter(row=>files.has(row.file)&&row.module==='@angular/core'&&row.symbol==='Injector');
assert.equal(rows.length,7);assert.ok(rows.every(row=>row.disposition==='closed'&&row.status==='reviewed'));
const observe=(changed={},line=ledger.line)=>authoredUseReviewEvidence({symbol_uses:rows},line,
 path=>Object.hasOwn(changed,path)?changed[path]:readFileSync(path),hash);
assert.deepEqual(observe(),{reviewed:7,insufficient:0,insufficient_uses:[]});
for(const row of rows) {
 const shared=row.file==='legacy-form-field/internal/after-form-field-render.ts'||row.file==='legacy-select/internal/after-select-render.ts';
 assert.equal(observe({['projects/ngx-material-legacy/'+row.file]:Buffer.from('changed supplied-injector source')}).insufficient,shared?2:1);
}
assert.equal(observe({},ledger.line==='main'?'21.x':'main').insufficient,7);
assert.equal(observe({'compatibility/rc/injector-render-type-current-diagnostic.json':Buffer.from('changed public lookup proof')}).insufficient,7);
assert.equal(observe({'compatibility/rc/injector-render-autocomplete-current-diagnostic.json':Buffer.from('changed selection render proof')}).insufficient,1);
assert.equal(observe({'compatibility/rc/injector-render-form-field-current-diagnostic.json':Buffer.from('changed outline render proof')}).insufficient,2);
assert.equal(observe({'compatibility/rc/injector-render-select-current-diagnostic.json':Buffer.from('changed panel render proof')}).insufficient,2);
assert.equal(observe({'compatibility/rc/injector-render-tab-header-current-diagnostic.json':Buffer.from('changed header render proof')}).insufficient,1);
assert.equal(observe({'compatibility/rc/injector-render-tooltip-current-diagnostic.json':Buffer.from('changed tooltip render proof')}).insufficient,1);
'''
        result = subprocess.run(['node', '--input-type=module', '-e', code],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
