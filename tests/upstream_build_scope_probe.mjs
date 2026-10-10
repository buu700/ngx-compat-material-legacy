/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Actual finite source-scope admission with canonical patches and branch bytes.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {BUILD_SCOPE_PATCHES,buildScopeEvidenceOk} from '../scripts/upstream-build-scope-evidence.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),reportPath='compatibility/f10/disposition-ledger/evidence/closeout-fourteen-build-scope-review.json';
const body=JSON.parse(readFileSync(join(root,reportPath))),ledger=JSON.parse(readFileSync(join(root,'compatibility/f10/disposition-ledger/ledger.json')));
const result=spawnSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','ls-files','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'});assert.equal(result.status,0);
const paths=result.stdout.trim().split('\n'),bytes=new Map();
for(const path of [...body.candidate_context.files.map(r=>r.path),...paths,...body.reviews.map(r=>r.patch_file),reportPath])bytes.set(path,readFileSync(join(root,path)));
const hash=raw=>createHash('sha256').update(raw).digest('hex');let cases=0,negativeControls=0;
for(const review of body.reviews){assert.ok(buildScopeEvidenceOk(body,ledger.entries.find(e=>e.sha===review.sha),p=>bytes.get(p),paths),review.sha);cases++;}
const selected=body.reviews.find(r=>r.sha==='5373ced467ba58315abf22bc96c0c24583467776'),original=ledger.entries.find(e=>e.sha===selected.sha);
function reject(name,mutate){
 const b=structuredClone(body),e=structuredClone(original),files=new Map(bytes),p=[...paths];
 mutate(b,e,files,p);
 // Recomputed JSON receipt hashes must not turn incomplete semantics into proof.
 const raw=Buffer.from(JSON.stringify(b));files.set(reportPath,raw);e.source_check.evidence_report_sha256=hash(raw);
 assert.equal(buildScopeEvidenceOk(b,e,path=>files.get(path),p),false,name);negativeControls++;
}
reject('omitted-role',b=>{delete b.role;});
reject('foreign-line',b=>{b.line=b.line==='main'?'21.x':'main';});
reject('omitted-member',b=>{b.reviews.pop();b.scope_sha_ids.pop();});
reject('duplicated-member',b=>{b.reviews[1]=b.reviews[0];});
reject('broadened-SHA',b=>{b.scope_sha_ids.push('a'.repeat(40));});
reject('omitted-build-context',b=>{b.candidate_context.files.pop();});
reject('changed-current-context-bytes',(b,e,f)=>{f.set('chainman.toml',Buffer.from('different builder'));});
reject('omitted-current-product-member',b=>{b.candidate_context.product_members.pop();});
reject('changed-current-product-bytes',(b,e,f)=>{f.set(paths[0],Buffer.from('changed candidate product'));});
reject('broadened-product-population',(b,e,f,p)=>{p.push('projects/ngx-material-legacy/Bazelfile.bzl');});
reject('omitted-patch-path',b=>{b.reviews.find(r=>r.sha===selected.sha).patch_paths.pop();});
reject('omitted-ledger-path',(b,e)=>{e.files.pop();});
reject('runtime-import-misclassified-as-Bazel',b=>{const r=b.reviews.find(r=>r.sha===selected.sha);r.bazel_graph_paths.push(...r.other_paths);r.other_paths=[];});
reject('self-rehashed-unrelated-runtime-patch',(b,e,f)=>{const r=b.reviews.find(r=>r.sha===selected.sha),raw=Buffer.concat([f.get(r.patch_file),Buffer.from('\ndiff --git a/src/material/button/button.ts b/src/material/button/button.ts\n+unrelated runtime change\n')]);f.set(r.patch_file,raw);r.diff_sha256=hash(raw);r.patch_bytes=raw.length;e.individual_proof.diff_sha256=r.diff_sha256;});
reject('tampered-commit-object',b=>{b.reviews.find(r=>r.sha===selected.sha).upstream_commit_object+='changed';});
reject('batch-labelled-individual-proof',(b,e)=>{e.individual_proof.proof_kind='batch';});
reject('borrowed-decision',(b,e)=>{e.reason='generic build-only';});
reject('omitted-branch-proof',(b,e)=>{e.individual_proof.affected_branches=['main'];});
reject('runtime-inheritance-claim',(b,e)=>{e.final_disposition='inherited';});
reject('forged-G11-pass',b=>{b.g11_claim='passed';});
assert.equal(Object.keys(BUILD_SCOPE_PATCHES).length,14);
console.log(JSON.stringify({line:body.line,cases,negative_controls:negativeControls,canonical_path_memberships:body.reviews.reduce((n,r)=>n+r.path_count,0),scope:'Fourteen source-scope evidence bindings only; no native product, installed behavior, security, full audit or G11 pass.'}));
