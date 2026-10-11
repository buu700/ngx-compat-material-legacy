# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Source member identities and coordinates cannot silently become stale."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CandidateSourceEvidenceTests(unittest.TestCase):
    def test_member_coordinates_and_absence_controls(self):
        code = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {candidateSourceEvidenceOk,candidateProductSourcePaths} from './scripts/upstream-candidate-source-evidence.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const path='projects/ngx-material-legacy/legacy-select/select.html',bytes=readFileSync(path);
const lines=bytes.toString().split('\n'),needle='(detach)="close()"',number=lines.findIndex(r=>r.includes(needle))+1;
assert.ok(number>0);
// This isolated helper fixture makes no disposition or runtime claim.
const proof={proof_kind:'candidate-source-line-match',candidate_member:{path,sha256:hash(bytes)},
 added_lines:[{upstream_added:needle,candidate_lines:[number]}]};
const read=p=>p===path?bytes:null,paths=()=>[path];
assert.equal(candidateSourceEvidenceOk(proof,read,paths),true);
const equivalence={...structuredClone(proof),proof_kind:'candidate-source-equivalent',
 equivalent_candidate_lines:[{candidate_snippet:needle,candidate_lines:[number]}]};
assert.equal(candidateSourceEvidenceOk(equivalence,read,paths),true);
const absence={...structuredClone(proof),absent_in_package:{needles:['deliberately-absent-fixture-string'],hits:[]}};
assert.equal(candidateSourceEvidenceOk(absence,read,paths),true);
const rejected=[];
function reject(id,change,reader=read,population=paths,base=proof){
 const p=structuredClone(base);change(p);assert.equal(candidateSourceEvidenceOk(p,reader,population),false,id+' escaped');rejected.push(id);
}
reject('stale-member-hash',p=>{p.candidate_member.sha256='0'.repeat(64);});
reject('renamed-kind-keeps-source-claim',p=>{p.proof_kind='renamed-unchecked-proof';});
reject('changed-current-member',()=>{},()=>Buffer.concat([bytes,Buffer.from('\nchanged member')]));
reject('missing-current-member',()=>{},()=>null);
reject('outside-product',p=>{p.candidate_member.path='scripts/other.html';});
reject('empty-added-lines',p=>{p.added_lines=[];});
reject('empty-coordinates',p=>{p.added_lines[0].candidate_lines=[];});
reject('wrong-coordinate',p=>{p.added_lines[0].candidate_lines=[1];});
reject('zero-coordinate',p=>{p.added_lines[0].candidate_lines=[0];});
reject('negative-coordinate',p=>{p.added_lines[0].candidate_lines=[-1];});
reject('fractional-coordinate',p=>{p.added_lines[0].candidate_lines=[number+0.5];});
reject('outside-coordinate',p=>{p.added_lines[0].candidate_lines=[lines.length+1];});
reject('duplicate-coordinate',p=>{p.added_lines[0].candidate_lines=[number,number];});
reject('different-source-snippet',p=>{p.added_lines[0].upstream_added='different call()';});
reject('empty-source-snippet',p=>{p.added_lines[0].upstream_added=' \n ';});
reject('missing-equivalence',p=>{delete p.equivalent_candidate_lines;},read,paths,equivalence);
reject('different-equivalence',p=>{p.equivalent_candidate_lines[0].candidate_snippet='wrong';},read,paths,equivalence);
reject('absence-now-present',p=>{p.absent_in_package.needles=[needle];},read,paths,absence);
reject('claimed-absence-hits',p=>{p.absent_in_package.hits=[path];},read,paths,absence);
reject('missing-absence-population',()=>{},read,()=>[],absence);
const ledger=JSON.parse(readFileSync('compatibility/f10/disposition-ledger/ledger.json'));
let actual=0;
for(const entry of ledger.entries){
 const p=entry.individual_proof;
 if(['candidate-source-line-match','candidate-source-equivalent'].includes(p?.proof_kind)){
  assert.equal(candidateSourceEvidenceOk(p,p=>readFileSync(p),()=>candidateProductSourcePaths(process.cwd())),true,entry.sha);actual++;
 }
}
console.log(JSON.stringify({isolated_positives:3,actual_remaining_source_proofs:actual,rejected:rejected.length,runtime_or_artifact_executed:false}));
'''
        result = subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['isolated_positives'], 3)
        self.assertEqual(report['rejected'], 20)
        self.assertFalse(report['runtime_or_artifact_executed'])
