/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Focused current caller qualification; no build or remote work. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),hash=b=>createHash('sha256').update(b).digest('hex');
const {prepareBaseClassCurrentUseReview,lexicalPeerUses,validateExistingUse,BASE_CURRENT_USE_PROOF,BASE_CURRENT_USE_REVIEW}=await import(pathToFileURL(join(root,'scripts/base-class-removal-current-use-review.mjs')));
const {authoredUseReviewEvidence}=await import(pathToFileURL(join(root,'scripts/authored-use-inventory.mjs')));
const mutations=new Map(),disk=p=>readFileSync(resolve(root,p)),read=p=>mutations.get(p)??disk(p);
const start=performance.now(),prepared=prepareBaseClassCurrentUseReview({root,read}),controls=[];
function rejects(name,action,pattern){assert.throws(action,pattern);controls.push({name,rejected:true});}
const unchanged=prepared.proof.continuity.find(r=>r.symbol==='ComponentHarness');
const toLexical=(row,side)=>({...row,uses:structuredClone(row[side])});
const damaged=toLexical(unchanged,'current_uses');damaged.uses[0].expression='AnotherComponentHarness';
rejects('different existing upstream receiver',()=>validateExistingUse(toLexical(unchanged,'before_uses'),damaged),/changed existing lexical peer use/);
const helper=prepared.proof.continuity.find(r=>r.symbol==='HarnessPredicate'),oldFactory=toLexical(helper,'current_uses');oldFactory.uses[2].expression='new HarnessPredicate(this, options)';
rejects('unrestored helper factory receiver',()=>validateExistingUse(toLexical(helper,'before_uses'),oldFactory),/Expected values to be strictly deep-equal/);
const retired=prepared.proof.continuity.find(r=>r.symbol==='InjectionToken');assert.equal(retired.current_uses.length,0);
const revived=toLexical(retired,'current_uses');revived.uses=[{role:'NewExpression',expression:'new InjectionToken("changed")'}];
rejects('retired token use becomes active',()=>validateExistingUse(toLexical(retired,'before_uses'),revived),/changed existing lexical peer use/);
const lexicalPath='projects/ngx-material-legacy/testing/binding-fixture.ts';
const lexical=lexicalPeerUses(lexicalPath,"import {MatSnackBarRef as Peer} from '@angular/material/snack-bar';\nconst token = Peer;\nfunction local(Peer: unknown) { return Peer; }\nconst object = {Peer: 1}; object.Peer;\n");
assert.equal(lexical.length,1);assert.deepEqual(lexical[0].uses,[{role:'VariableDeclaration',expression:'token = Peer'}]);
controls.push({name:'lexical shadow and property names excluded from import references',passed:true});
const readProposal=p=>prepared.writes.get(p)??disk(p);
const candidate=structuredClone(prepared.candidate),body=JSON.parse(prepared.writes.get(BASE_CURRENT_USE_REVIEW));
const wrong=structuredClone(body);wrong.reviews[0].candidate_source_sha256='0'.repeat(64);
function invalidReview(name,reviewBody,expectedInsufficient){
 const raw=Buffer.from(JSON.stringify(reviewBody,null,2)+'\n'),changed=structuredClone(candidate);for(const row of changed.symbol_uses)row.source_review.sha256=hash(raw);
 const report=authoredUseReviewEvidence(changed,prepared.line,p=>p===BASE_CURRENT_USE_REVIEW?raw:readProposal(p),hash);
 assert.equal(report.insufficient,expectedInsufficient);controls.push({name,rejected:true,insufficient:report.insufficient});
}
invalidReview('one stale source binding',wrong,1);
const missing=structuredClone(body);missing.reviews.shift();invalidReview('one missing current caller review',missing,1);
const brokenEvidence=authoredUseReviewEvidence(candidate,prepared.line,p=>p===BASE_CURRENT_USE_PROOF?Buffer.from('changed source proof'):readProposal(p),hash);assert.equal(brokenEvidence.insufficient,95);
controls.push({name:'changed independent continuity proof',rejected:true,insufficient:95});
const cold='projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts';mutations.set(cold,Buffer.from(disk(cold).toString().replace('    event.stopPropagation();','    // omitted propagation')));
rejects('cold source reader cannot hide an actual-file mismatch',()=>prepareBaseClassCurrentUseReview({root,read}),/diagnostic reader differs from actual current file/);mutations.clear();
for(const path of [cold,prepared.proof.public_import_resolution[0].declaration.path,prepared.proof.continuity[0].prior_source_review.path]){
 mutations.set(path,Buffer.concat([disk(path),Buffer.from('\n/* late mutation */\n')]));rejects('late input '+path,()=>prepared.assertCurrent(),/diagnostic reader differs from actual current file/);mutations.clear();
}
prepared.assertCurrent();
for(const [path,raw]of prepared.writes){assert.equal(existsSync(join(root,path)),false,'fresh current-use output already exists');writeFileSync(join(root,path),raw);}
const actual=authoredUseReviewEvidence(candidate,prepared.line,disk,hash);assert.equal(actual.reviewed,95);assert.equal(actual.insufficient,0);prepared.assertCurrent();
const producerPath='compatibility/rc/base-class-removal-current-use-verify.mjs';
const report={schema_version:1,line:prepared.line,status:'qualified current source-use continuity and two new public imports; canonical integration remains pending',node:process.version,compiler:prepared.proof.compiler,
 existing_reviewed_uses:93,identical_lexical_uses:90,explicit_historical_helper_extraction_uses:3,new_public_uses:2,
 new_public_declarations:prepared.proof.public_import_resolution,
 independent_review_record_check:actual,controls,controls_rejected:controls.filter(c=>c.rejected).length,
 current_input_bindings:prepared.bound.length,outputs:[...prepared.writes].map(([path,raw])=>({path,sha256:hash(raw),bytes:raw.length})),
 execution:{producer:producerPath,sha256:hash(disk(producerPath)),seconds:(performance.now()-start)/1000,prior_compiler_or_runtime_tests_reexecuted:false},
 canonical_authored_rosters_changed:false,canonical_dispositions_changed:0,shared_source_owner_reconciliation_complete:false,
 current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
const out='compatibility/rc/base-class-removal-current-use-qualified.json';assert.equal(existsSync(join(root,out)),false);writeFileSync(join(root,out),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({line:report.line,reviewed:actual.reviewed,insufficient:actual.insufficient,controls_rejected:report.controls_rejected,input_bindings:report.current_input_bindings,seconds:report.execution.seconds,canonical_integration:false}));
