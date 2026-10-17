# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Preserve current individual-review readers and qualified compiler context."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PROGRAM = r"""
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectEmptySelectionSourceContext} from './scripts/autocomplete-empty-selection-source-context.mjs';
const read=p=>fs.readFileSync(p), json=p=>JSON.parse(read(p));
const hash=x=>createHash('sha256').update(x).digest('hex');
const root=process.cwd(), base=inspectEmptySelectionSourceContext({root});
const line=json('projects/ngx-material-legacy/package.json').version.startsWith('21.')?'21.x':'main';
assert.equal(base.summary.source_rows_requalified,52);
assert.equal(base.summary.qualified_branch_compiler_alignment?.current_compiler??null,line==='21.x'?'5.9.2':null);
const ledger=json('compatibility/f10/disposition-ledger/ledger.json');
const pooled='compatibility/f10/disposition-ledger/evidence/closeout-slider-range-followup-native-context.json';
const group=json(pooled);assert.equal(group.reviews.length,15);
for(const old of group.reviews){
 const entry=ledger.entries.find(row=>row.sha===old.sha), current=json(entry.evidence_report);
 assert.notEqual(entry.evidence_report,pooled);assert.equal(current.sha,entry.sha);
 assert.deepEqual(current.individual_proof,entry.individual_proof);
 const link=current.slider_range_followup_native_context_materialization;
 assert.deepEqual(link,{group:{path:pooled,sha256:hash(read(pooled))},individual_document_interface_preserved:true});
 delete current.slider_range_followup_native_context_materialization;assert.deepEqual(current,old);
}
const target='compatibility/f10/disposition-ledger/evidence/closeout-bazel-build-only-review.json', original=json(target);
const mutations=line==='21.x'?[
 ['missing-qualified-transition',b=>{delete b.slider_range_followup_branch_compiler_context;}],
 ['forged-prior-subject',b=>{b.slider_range_followup_branch_compiler_context.prior.sha256='0'.repeat(64);}],
 ['wrong-compiler',b=>{b.slider_range_followup_branch_compiler_context.current_branch_compiler='6.0.3';}],
 ['unrelated-source-analysis',b=>{b.source_analysis.reviews[0].unreviewed_semantics=true;}],
]:[
 ['foreign-branch-transition',b=>{b.slider_range_followup_branch_compiler_context={};}],
 ['unrelated-source-analysis',b=>{b.source_analysis.reviews[0].unreviewed_semantics=true;}],
 ['unknown-current-qualification',b=>{b.unreviewed_qualification={status:'approved'};}],
];
for(const[name,mutate]of mutations){
 const candidate=structuredClone(original);mutate(candidate);const raw=Buffer.from(JSON.stringify(candidate,null,2)+'\n');
 assert.throws(()=>inspectEmptySelectionSourceContext({root,readMember:p=>p===target?raw:read(p)}),undefined,name);
}
console.log(JSON.stringify({line,individual_document_interfaces_preserved:15,source_rows_checked:52,
 transition_mutants_rejected:mutations.length,actual_native_packed_or_floor_qualified:false}));
"""


class ExistingContextCompatibility(unittest.TestCase):
    def test_current_readers_and_exact_compiler_transition(self):
        result = subprocess.run(['node', '--input-type=module', '-e', PROGRAM], cwd=ROOT,
                                capture_output=True, text=True, timeout=45)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
