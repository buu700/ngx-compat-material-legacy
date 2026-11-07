/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync, gzipSync} from 'node:zlib';
import {runInNewContext} from 'node:vm';
import {C04_FIRST_SHAS, c04FirstIndividualEvidenceOk, c04FirstIndividualEvidenceClass} from '../scripts/upstream-c04-first-individual-evidence.mjs';

const prefix='compatibility/rc/c04-first-individual';
const read=p=>{try{return readFileSync(p);}catch{return null;}};
const manifest=JSON.parse(read(`${prefix}/manifest.json`));
assert.deepEqual(manifest.subjects.map(x=>x.sha),C04_FIRST_SHAS);
const changed=(path, f=b=>Buffer.concat([b,Buffer.from('x')]))=>p=>p===path ? f(read(p)) : read(p);
let negatives=0;
for(const row of manifest.subjects){
 const entry={sha:row.sha, final_disposition:row.proposed_disposition, evidence_report:row.evidence_report, individual_proof:structuredClone(row.individual_proof), reason:row.review.decision, product_adaptation:false};
 const body=JSON.parse(read(entry.evidence_report));
 const call=(over={})=>c04FirstIndividualEvidenceOk({entry,body,line:'main',read,...over});
 assert.equal(call(),true,entry.sha);
 assert.equal(c04FirstIndividualEvidenceClass(entry,'main',read),null);
 const tree=/^tree ([0-9a-f]{40})\n/.exec(read(`${prefix}/objects/${manifest.original16_commit}`).toString())[1];
 const mutateCensus=b=>{const c=JSON.parse(gunzipSync(b));c.commits.find(x=>x.sha===entry.sha).raw_commit+='x';return gzipSync(JSON.stringify(c));};
 const omitted=b=>{const m=JSON.parse(b);m.subjects=m.subjects.filter(x=>x.sha!==entry.sha);return Buffer.from(JSON.stringify(m));};
 const duplicate=b=>{const m=JSON.parse(b);m.subjects.push(m.subjects[0]);return Buffer.from(JSON.stringify(m));};
 const controls=[
  ['stale-current',{read:changed(body.current_members[0].path)}],
  ['stale-tagged-blob',{read:changed(`${prefix}/${body.current_members[0].tagged_snapshot}`)}],
  ['stale-tree',{read:changed(`${prefix}/objects/${tree}`)}],
  ['stale-tag-commit',{read:changed(`${prefix}/objects/${manifest.original16_commit}`)}],
  ['stale-raw-commit',{read:changed('compatibility/rc/upstream-complete-patch-census.json.gz',mutateCensus)}],
  ['stale-census',{read:changed('compatibility/rc/upstream-complete-patch-census.json.gz')}],
  ['stale-patch',{read:changed(body.patch_file)}],['stale-report',{read:changed(entry.evidence_report)}],
  ['missing',{read:p=>p===body.patch_file?null:read(p)}],['wrong-line',{line:'21.x'}],
  ['disposition',{entry:{...entry,final_disposition:'inherited'}}],
  ['wrong-reason',{entry:{...entry,reason:'obsolete MDC rationale'}}],
  ['false-adaptation-claim',{entry:{...entry,product_adaptation:true}}],
  ['unrelated-sha',{entry:{...entry,sha:'0000000000000000000000000000000000000000'}}],
  ['manifest-omission',{read:changed(`${prefix}/manifest.json`,omitted)}],
  ['manifest-duplicate',{read:changed(`${prefix}/manifest.json`,duplicate)}],
 ];
 for(const [name,over] of controls){assert.equal(call(over),false,`${entry.sha}: ${name}`);negatives++;}
 // Execute the checker's actual evidenceClass body: each failure must exit at
 // its C04 route, before the generic disposition or report handling can run.
 const source=read('scripts/check-upstream-audit-disposition.mjs').toString();
 const start=source.indexOf('function evidenceClass(entry) {'), end=source.indexOf('\nfunction regularRepoMember(',start);
 assert.ok(start>=0&&end>start);
 const checkerClass=runInNewContext(`(${source.slice(start,end)})`,{
  c04FirstIndividualEvidenceClass, line:'main', regularRepoMember:p=>p, readFileSync:read,
 });
 for(const e of [
  {...entry,final_disposition:'irrelevant'}, {...entry,final_disposition:'not-applicable', evidence_report:'other.json'},
  {...entry,evidence_report:''}, {...entry,evidence_report:null},
 ]) assert.equal(checkerClass(e),'invalid-c04-first-individual',`checker route ${entry.sha}`);
}
assert.equal(c04FirstIndividualEvidenceClass({sha:'0000000000000000000000000000000000000000'},'main',read),null);
console.log(JSON.stringify({pinned_positives:C04_FIRST_SHAS.length, negative_controls:negatives, checker_route_controls:20}));
