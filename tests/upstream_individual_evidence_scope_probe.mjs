/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Validator fixtures only. No synthetic source review qualifies a product use. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {reviewMetadataComplete,individualReviewScopeOk} from '../scripts/upstream-individual-evidence-scope.mjs';
import {scanCurrentAuthoredUses} from '../scripts/authored-current-use-inventory.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p));
const hash=b=>createHash('sha256').update(b).digest('hex'),ts=createRequire(import.meta.url)('typescript');
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const clone=value=>structuredClone(value);
const base={entry:{final_disposition:'already-adapted'},proof:{proof_kind:'whole-input-transform-hunk-and-original-native-behavior'},body:{status:'reviewed'},review:{status:'reviewed'},requiresIndividual:true,claimsBehavior:true};
assert.equal(individualReviewScopeOk(base),true);
let helperPositive=1,helperNegative=0;
const accept=value=>{assert.equal(individualReviewScopeOk(value),true);helperPositive++;};
const reject=value=>{assert.equal(individualReviewScopeOk(value),false);helperNegative++;};
for(const status of ['reviewed','complete','completed','verified','resolved','accepted','approved','passed',
 'bounded-source-and-native-behavior-review-completed','individually-reviewed-original-restoration-qualified','individually-reviewed-do-not-adopt']){
 const value=clone(base);value.body.status=status;accept(value);
}
const absent=clone(base);delete absent.body.status;delete absent.review.status;accept(absent);
const scoped=clone(base);scoped.body.decision='This individual review is complete; unrelated package rendering work remains pending.';accept(scoped);
for(const kind of ['candidate-source-line-match','candidate-source-equivalent','diff-read']){
 const value=clone(base);value.proof.proof_kind=kind;reject(value);
 const sensitive=clone(value);sensitive.entry.final_disposition='not-applicable';sensitive.claimsBehavior=false;reject(sensitive);
 const applicability=clone(sensitive);applicability.requiresIndividual=false;accept(applicability);
}
for(const node of ['entry','proof','body','review'])for(const field of ['status','final_disposition','disposition']){
 for(const state of ['pending','open','needs-individual-review','security-review','in-progress','partial','partially-reviewed',
  'unreviewed','proposed','blocked','failed','awaiting-owner','deferred','unfinished','not-reviewed','reviewed-but-pending-execution',
  '', ' ',null,true,4,[],{}]){
  const value=clone(base);value[node][field]=state;reject(value);
 }
}
for(const state of ['investigating','read','unknown']){const value=clone(base);value.body.status=state;reject(value);}
for(const property of ['requiresIndividual','claimsBehavior'])for(const value of [undefined,null,1,'true']){const bad=clone(base);bad[property]=value;reject(bad);}
for(const value of [null,[],true,{},'source']){const bad=clone(base);bad.proof=value;reject(bad);}
for(const kind of [undefined,null,1,'',{}]){const bad=clone(base);bad.proof.proof_kind=kind;reject(bad);}
assert.equal(reviewMetadataComplete({entry:{final_disposition:'not-applicable'},body:{status:'reviewed'},review:{disposition:'not-owned'}}),true);

const fixture=mkdtempSync(join(tmpdir(),'individual-review-scope-validator-'));
const put=(path,body)=>{const target=join(fixture,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body,null,2)+'\n');};
let cliCases=0,checkerMutants=0;const observations=[];
try{
 // Copy the actual checker and its complete relative-import closure, never a rewritten validator.
 const copied=new Set();
 const copyModule=path=>{if(copied.has(path))return;copied.add(path);const bytes=read(path);put(path,bytes);const sf=ts.createSourceFile(path,bytes.toString(),ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);
  for(const node of sf.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier?.text.startsWith('.')){
   const target=resolve(root,dirname(path),node.moduleSpecifier.text);assert.ok(target.startsWith(root+'/scripts/'));copyModule(target.slice(root.length+1));
  }
 };
 copyModule('scripts/check-upstream-audit-disposition.mjs');
 const seedBytes=read('compatibility/f10/authored-dependency-inventory-seed.json'),seed=JSON.parse(seedBytes);
 put('compatibility/f10/authored-dependency-inventory-seed.json',seedBytes);
 const note='Synthetic validator fixture only. These source files, review labels and source hashes do not qualify any real product API, use, upstream fix, runtime or approval.\n';
 for(const file of new Set(seed.symbol_uses.map(row=>row.file)))put('projects/ngx-material-legacy/'+file,'// '+note);
 put('projects/ngx-material-legacy/__individual_scope_fixture__.ts',"import {InjectionToken} from '@angular/core';\n// Synthetic discovery route only.\n");
 const html='projects/ngx-material-legacy/legacy-select/select.html';put(html,read(html));
 const active=scanCurrentAuthoredUses({root:fixture}),key=row=>JSON.stringify([row.file,row.module,row.symbol]),seedKeys=new Set(seed.symbol_uses.map(key));
 const additional=active.symbol_uses.filter(row=>!seedKeys.has(key(row)));
 assert.equal(seed.symbol_uses.length,1736);assert.equal(active.symbol_uses.length,1);assert.equal(additional.length,1);
 put('compatibility/rc/scope-validator-fixture-note.txt',note);
 const noteRef={path:'compatibility/rc/scope-validator-fixture-note.txt',sha256:hash(note)};
 const reviewFor=new Map(),groups=new Map();
 for(const row of [...seed.symbol_uses,...additional]){if(!groups.has(row.file))groups.set(row.file,[]);groups.get(row.file).push(row);}
 for(const [file,rows]of groups){
  const path='compatibility/f10/authored-use-reviews/scope-fixture-'+hash(file)+'.json';
  const reviews=rows.map(row=>({file:row.file,module:row.module,symbol:row.symbol,conclusion:seedKeys.has(key(row))?'removed-use':'stable-public-peer',reviewer:'Synthetic validator fixture; no product judgment',
   candidate_source_sha256:hash(readFileSync(join(fixture,'projects/ngx-material-legacy',file))),decision:note,independent_evidence:[noteRef]}));
  put(path,{schema_version:1,line,status:'reviewed',reviews,fixture_only:true});const ref={path,sha256:hash(readFileSync(join(fixture,path)))};
  for(const row of rows)reviewFor.set(key(row),ref);
 }
 const closed=row=>({...row,status:'reviewed',disposition:'closed',source_review:reviewFor.get(key(row))});
 put('symbols.json',{schema_version:1,line,status:'closed',symbol_uses:seed.symbol_uses.map(closed),fixture_only:true});
 put('current.json',{schema_version:1,line,status:'closed',current_uses:active.symbol_uses.length,current_source_files:active.source_files.length,
  current_source_population_sha256:active.source_population_sha256,symbol_use_count:additional.length,symbol_uses:additional.map(closed),fixture_only:true});
 const actual=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
 const positive=clone(actual.entries.find(row=>row.sha==='dd04fe910c4587f11cd37b1d0b216e4a56cac2e3'));
 const positiveReview=JSON.parse(read(positive.evidence_report));assert.equal(positiveReview.final_disposition,'already-adapted');
 const positivePatch=read(positiveReview.patch_file);assert.equal(hash(positivePatch),positiveReview.diff_sha256);
 put(positiveReview.patch_file,positivePatch);positive.evidence_report='compatibility/f10/disposition-ledger/evidence/scope-positive-fixture.json';
 const docsPatch='diff --git a/docs/scope-fixture.md b/docs/scope-fixture.md\n--- a/docs/scope-fixture.md\n+++ b/docs/scope-fixture.md\n@@ -1 +1 @@\n-old documentation\n+Synthetic fixture documentation only\n';
 const docsDecision='Synthetic complete documentation applicability review. This fixture has no executable or packaged behavior change and provides no real product qualification.';
 const docs={sha:'1'.repeat(40),subject:'docs: a11y fixture',files:['docs/scope-fixture.md'],bucket:'docs-build-batch-candidate',final_disposition:'not-applicable',reason:docsDecision,
  evidence_report:'compatibility/f10/disposition-ledger/evidence/scope-docs-fixture.json',individual_proof:{proof_kind:'complete-syntax-and-documentation-review',diff_sha256:hash(docsPatch),review_depth:'individual-compatibility',affected_branches:[line],decision:docsDecision}};
 const docsReview={sha:docs.sha,status:'reviewed',final_disposition:'not-applicable',diff_sha256:hash(docsPatch),diff:docsPatch,fixture_only:true};
 const pending=JSON.parse(read('compatibility/f10/disposition-ledger/evidence/closeout-select-detach-review.json'));
 const pendingPatch=read(pending.patch_file);assert.equal(hash(pendingPatch),pending.diff_sha256);put(pending.patch_file,pendingPatch);
 const htmlBytes=read(html),coordinate=htmlBytes.toString().split('\n').findIndex(text=>text.includes('(detach)="close()"'))+1;assert.ok(coordinate>0);
 const weak={sha:pending.sha,subject:'fix(material/select): close panel on detach output event',files:pending.complete_original_files,bucket:'behavior-semantic',final_disposition:'already-adapted',
  reason:'Synthetic deliberate source-presence corruption control; no behavior execution is supplied.',evidence_report:'compatibility/f10/disposition-ledger/evidence/scope-weak-fixture.json',
  individual_proof:{proof_kind:'candidate-source-line-match',diff_sha256:pending.diff_sha256,review_depth:'individual-compatibility',affected_branches:[line],
   decision:'Synthetic source-presence control without executed behavior; this must never qualify a material behavioral disposition.',candidate_member:{path:html,sha256:hash(htmlBytes)},added_lines:[{upstream_added:'(detach)="close()"',candidate_lines:[coordinate]}]}};
 const weakCompleted={...clone(pending),status:'reviewed',final_disposition:'already-adapted',fixture_only:true};
 const environment={...process.env,NODE_PATH:dirname(dirname(dirname(createRequire(import.meta.url).resolve('typescript'))))};
 for(const name of ['RC_CHECK_ID','RC_RUN_ID','RC_INVOCATION_ID','RC_EVIDENCE_BINDING','RC_ASSERTION_OUTPUT_DIR'])delete environment[name];
 const run=(name,row,body,expectPass,checker='scripts/check-upstream-audit-disposition.mjs')=>{
  put(row.evidence_report,body);put('seed.json',{commits:[{sha:row.sha}],fixture_only:true});put('ledger.json',{g11_claim:'not-passed',entries:[row],fixture_only:true});
  const output=join(fixture,'report-'+name+'.json');
  const child=spawnSync(process.execPath,[join(fixture,checker),'--seed',join(fixture,'seed.json'),'--ledger',join(fixture,'ledger.json'),
   '--symbols',join(fixture,'symbols.json'),'--current-symbols',join(fixture,'current.json'),'--report',output,'--admission','--line',line],{cwd:fixture,env:environment,encoding:'utf8',timeout:30000});
  assert.ok([0,1].includes(child.status),child.stderr||String(child.error));const report=JSON.parse(readFileSync(output));
  assert.equal(report.authored_use_inventory.expected,1736);assert.equal(report.authored_use_review_evidence.reviewed,1736);assert.equal(report.authored_use_review_evidence.insufficient,0);
  assert.equal(report.current_authored_use_inventory.ready,true);assert.equal(report.g11_claim,'not-passed');
  assert.equal(child.status===0,expectPass,name+' '+child.stderr);assert.equal(report.disposition_admission,expectPass?'pass':'incomplete',name);
  observations.push({name,fixture_only:true,exit_code:child.status,admission:report.disposition_admission,missing_evidence:report.missing_evidence,behavior:report.insufficient_behavior,inherited:report.insufficient_inherited,sensitive:report.insufficient_sensitive,evidence_failures:report.evidence_failures});
  cliCases++;return report;
 };
 run('complete-behavior-input',positive,positiveReview,true);
 run('complete-source-applicability',docs,docsReview,true);
 let body={...clone(positiveReview),status:'pending'};
 assert.equal(run('pending-container',positive,body,false).evidence_failures[0].reason,'unfinished-review');
 body={status:'reviewed',reviews:[{...clone(positiveReview),status:'security-review'}]};
 assert.equal(run('pending-selected-member',positive,body,false).evidence_failures[0].reason,'unfinished-review');
 let row=clone(positive);row.individual_proof.status='pending';
 assert.equal(run('pending-proof',row,positiveReview,false).insufficient_behavior,1);
 assert.equal(run('completed-source-only-behavior',weak,weakCompleted,false).insufficient_behavior,1);
 run('actual-pending-select-review',weak,pending,false);
 row=clone(weak);row.final_disposition='inherited';row.individual_proof.installed_member={sha256:'a'.repeat(64)};row.individual_proof.reachable_behavior={kind:'executed-delegation',id:'synthetic-marker-only'};
 assert.equal(run('source-only-inherited-marker',row,{...weakCompleted,final_disposition:'inherited'},false).insufficient_inherited,1);
 const lowRisk=clone(docs);lowRisk.subject='docs: general fixture';
 assert.equal(run('pending-nonsensitive-final',lowRisk,{...docsReview,status:'pending'},false).evidence_failures[0].reason,'unfinished-review');
 // Execute weakened copies of the shipped checker: each real CLI control must catch its guard.
 const checker=read('scripts/check-upstream-audit-disposition.mjs').toString();
 let mutated=checker.replace('if(!individualReviewScopeOk(', 'if(false&&!individualReviewScopeOk(');assert.notEqual(mutated,checker);
 put('scripts/scope-mutant-proof.mjs',mutated);run('mutant-source-kind-guard',weak,weakCompleted,true,'scripts/scope-mutant-proof.mjs');checkerMutants++;
 mutated=checker.replace('if(ALLOWED_FINAL.has(entry.final_disposition)&&!reviewMetadataComplete(', 'if(false&&ALLOWED_FINAL.has(entry.final_disposition)&&!reviewMetadataComplete(');assert.notEqual(mutated,checker);
 put('scripts/scope-mutant-state.mjs',mutated);run('mutant-final-state-guard',lowRisk,{...docsReview,status:'pending'},true,'scripts/scope-mutant-state.mjs');checkerMutants++;
}finally{rmSync(fixture,{recursive:true,force:true});}
const output={schema_version:1,line,node:process.version,typescript:ts.version,role:'Completion/scope and actual CLI validator fixtures only; no real API, runtime, native, packed or G11 qualification',
 helper_positives:helperPositive,helper_negatives:helperNegative,actual_CLI_cases:cliCases,checker_mutants_detected:checkerMutants,
 complete_positive_behavior_fixture:true,complete_positive_source_applicability_fixture:true,frozen_fixture_uses:1736,current_fixture_additional_uses:1,observations,
 producer_sha256:hash(read('tests/upstream_individual_evidence_scope_probe.mjs')),checker_sha256:hash(read('scripts/check-upstream-audit-disposition.mjs')),
 scope_helper_sha256:hash(read('scripts/upstream-individual-evidence-scope.mjs')),actual_product_or_packed_or_native_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(output));
