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
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync,lstatSync,realpathSync,symlinkSync} from 'node:fs';
import {dirname,join,resolve,relative,isAbsolute,extname,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {reviewMetadataComplete,individualReviewScopeOk} from '../scripts/upstream-individual-evidence-scope.mjs';
import {scanCurrentAuthoredUses} from '../scripts/authored-current-use-inventory.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p));
const hash=b=>createHash('sha256').update(b).digest('hex'),ts=createRequire(import.meta.url)('typescript');
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const clone=value=>structuredClone(value);
// A complete synthetic source-only proof for helper scope controls. Its source
// references identify fixture inputs and make no product qualification claim.
const helperSourceMembers=[{path:'fixtures/scope-proof/owned-source.ts',sha256:hash('export const fixtureOnly = true;\n')}];
const helperDecision='Synthetic complete source-only review bound to explicit fixture source bytes; no runtime or product claim.';
const helperProof={proof_kind:'individual-contextual-source-review',source_conclusion_only:true,execution_claim:'not-claimed',
 source_members:helperSourceMembers,diff_sha256:hash('synthetic complete patch\n'),review_depth:'individual-compatibility',
 affected_branches:[line],decision:helperDecision};
const base={entry:{final_disposition:'already-adapted',reason:helperDecision},proof:helperProof,body:{status:'reviewed'},
 review:{status:'reviewed',final_disposition:'already-adapted',decision:helperDecision,affected_branches:[line],
  source_conclusion_only:true,execution_claim:'not-claimed',source_members:helperSourceMembers,individual_proof:clone(helperProof)},
 requiresIndividual:true,claimsBehavior:true};
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
 // Copy exact bytes for the checker's complete static .mjs import closure.
 // Relative imports must remain inside this canonical repository, resolve to
 // regular non-symlink .mjs files, and never pass through an unreviewed path.
 const checkerInputAllowed=(target,base=root)=>{const rel=relative(base,target);
  if(!rel||rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel)||extname(target)!=='.mjs')return false;
  try{
   if(lstatSync(base).isSymbolicLink()||!lstatSync(base).isDirectory())return false;
   const parts=rel.split(sep);let current=base;
   for(let i=0;i<parts.length;i++){current=join(current,parts[i]);const stat=lstatSync(current);
    if(stat.isSymbolicLink()||(i===parts.length-1?!stat.isFile():!stat.isDirectory()))return false;}
   return realpathSync(target)===target&&realpathSync(base)===base;
  }catch{return false;}
 };
 assert.equal(checkerInputAllowed(resolve(root,'..','outside.mjs')),false,'reject repository escape');
 assert.equal(checkerInputAllowed(resolve(root,'README.md')),false,'reject unknown source extension');
 assert.equal(checkerInputAllowed(resolve(root,'testing/table-inherited/contracts.mjs')),true,'allow owned in-repository checker contract');
 const pathControls=join(fixture,'checker-path-controls'),outsideControls=join(fixture,'checker-path-outside');
 mkdirSync(join(pathControls,'inside'),{recursive:true});mkdirSync(outsideControls);
 writeFileSync(join(pathControls,'inside/valid.mjs'),'export const fixture=true;\n');
 writeFileSync(join(outsideControls,'escape.mjs'),'export const outside=true;\n');
 symlinkSync(outsideControls,join(pathControls,'linked-parent'),'dir');
 symlinkSync(join(pathControls,'inside/valid.mjs'),join(pathControls,'linked-leaf.mjs'));
 symlinkSync(join(pathControls,'inside'),join(pathControls,'linked-inside-parent'),'dir');
 assert.equal(checkerInputAllowed(join(pathControls,'inside/valid.mjs'),pathControls),true,'regular nested source accepted');
 assert.equal(checkerInputAllowed(join(pathControls,'linked-parent/escape.mjs'),pathControls),false,'reject escaping symlink parent');
 assert.equal(checkerInputAllowed(join(pathControls,'linked-inside-parent/valid.mjs'),pathControls),false,'reject internal symlink parent');
 assert.equal(checkerInputAllowed(join(pathControls,'linked-leaf.mjs'),pathControls),false,'reject symlink leaf');
 assert.equal(checkerInputAllowed(join(pathControls,'inside/missing.mjs'),pathControls),false,'reject missing source');
 const copied=new Set();
 const copyModule=path=>{if(copied.has(path))return;const source=resolve(root,path);assert.ok(checkerInputAllowed(source),'disallowed checker input '+path);copied.add(path);const bytes=read(path);put(path,bytes);const sf=ts.createSourceFile(path,bytes.toString(),ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);
  for(const node of sf.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier?.text.startsWith('.')){
   const target=resolve(root,dirname(path),node.moduleSpecifier.text);assert.ok(checkerInputAllowed(target),'disallowed static import '+path+' -> '+node.moduleSpecifier.text);copyModule(relative(root,target));
  }
 };
 copyModule('scripts/check-upstream-audit-disposition.mjs');
 // Sass validators authenticate these data assets when their modules load.
 // Copy their exact bytes too; these are fixture inputs, never replacements
 // for the original catalogs, CSS expectations or validator assertions.
 // Additional files read by imported checker modules at load time. The
 // expected hashes are the modules' own embedded provenance pins.
 const checkerInputs=[
  ['scripts/revalidate-typeahead.mjs','07a2cc01841fc1807ce6f4c7ec2b8ddb1dfce41eb8d25f69518fd5f7d4042f1e'],
  ['compatibility/rc/matrices/library-exports.json','f63246c293f1bd589e7c5e2bee6e9a4ebb995d86dca11697863bccc6ec7d122f'],
  ['compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json','fd78f8c7f6e072fb7393c61aef782ccdf3a1c8d009227d08b29921ea2809e0a8'],
  ['compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-inputs.json','52cb87f967965026ef0056a9d8c36a11a54f36b6d9efab1d235cb3e89c30d64f'],
  ['compatibility/rc/ordinary-checkbox-button-legacy-composition-cases-v1.json','8f4186d34848a0f298170c2124bbb727ff31a3995a1e8f041ab05476ffe1125d'],
  ['compatibility/rc/ordinary-checkbox-button-legacy-composition-known-before-v1.json','3e96bf8c73dc35d1cb9d132c74f69b6f91ee7d22b19b185cf3540d68d3cb9f43'],
  ['compatibility/rc/ordinary-card-c04-successor-inputs-v1.json','0ebb1f81be067cee2bbc2149dd9fd4e9188c4129d1482b40145a1a4893ad9634'],
  ['compatibility/rc/ordinary-card-public-bridge-original-cases-v1.json','59e47c924f0f541b7b262a9ee31f6e55bc4160c1c420f683247a1703be470bbf'],
  ['compatibility/rc/ordinary-card-public-bridge-model-v1.mjs','0286969a007029a3628d8a56fb17c0ee2bbfecec735abdf5d95911ac7c709a83'],
  ['compatibility/rc/current-sass-legacy-retention-reference-v1.json','38ff89f3707c959c91e9fe2da922c4d8bba29b41756350cc0238ea946f9c4342'],
 ];
 for(const [path,expectedHash] of checkerInputs){const bytes=read(path);assert.equal(hash(bytes),expectedHash,path+' provenance');put(path,bytes);assert.equal(hash(readFileSync(join(fixture,path))),expectedHash,path+' copied provenance');}
 const sassInputs=[
  'compatibility/rc/oracles/material-16.2.14-sass-api.json',
  'compatibility/rc/original16-sass-source-diagnostic-identity.json',
  ...['default-core-cdk','default-companion','default-mapped-companion','default-aggregate',
   'datepicker-controls','form-field-state','ripple-color','mixin-argument','owned-aggregate',
   'aggregate-color-theme','ordered-aggregate'].map(name=>'fixtures/sass/'+name+'-contracts.json'),
  ...['_index.scss','styles/core/ripple/_ripple-theme.scss','styles/core/theming/_theming.scss',
   'styles/core/theming/_palette.scss','styles/core/density/private/_compatibility.scss',
   'styles/core/style/_sass-utils.scss'].map(path=>'projects/ngx-material-legacy/'+path),
 ];
 for(const path of sassInputs){const bytes=read(path);put(path,bytes);assert.equal(hash(readFileSync(join(fixture,path))),hash(bytes));}
 // The actual checker requires a known source epoch even in synthetic CLI
 // fixtures. Restore the authenticated pre-repair panel, whose seven imports
 // are additional fixture obligations alongside the original synthetic route.
 const priorBytes=read('compatibility/rc/menu-caller-prior.json.gz');
 assert.equal(hash(priorBytes),line==='21.x'?'2da547a58102ec0a5715ebfdc91a86085d9728a6b6f747e35bf15cf8d0f8fe8e':'a6cf639de2151c32bc80b82be63ae4390453dc8c92a309801c1c153de9a82a00');
 const prior=JSON.parse(gunzipSync(priorBytes));assert.equal(prior.line,line);
 const panel=prior.sources.find(row=>row.path==='projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts');
 assert.equal(hash(panel.text),'4212186406b92fc485c050ffae7a8fd7b1f8e7af855bfd0133b018435834018a');
 put(panel.path,panel.text);
 put('projects/ngx-material-legacy/package.json',read('projects/ngx-material-legacy/package.json'));

 const seedBytes=read('compatibility/f10/authored-dependency-inventory-seed.json'),seed=JSON.parse(seedBytes);
 put('compatibility/f10/authored-dependency-inventory-seed.json',seedBytes);
 const note='Synthetic validator fixture only. These source files, review labels and source hashes do not qualify any real product API, use, upstream fix, runtime or approval.\n';
 for(const file of new Set(seed.symbol_uses.map(row=>row.file)))put('projects/ngx-material-legacy/'+file,'// '+note);
 put('projects/ngx-material-legacy/__individual_scope_fixture__.ts',"import {InjectionToken} from '@angular/core';\n// Synthetic discovery route only.\n");
 const html='projects/ngx-material-legacy/legacy-select/select.html';put(html,read(html));
 const active=scanCurrentAuthoredUses({root:fixture}),key=row=>JSON.stringify([row.file,row.module,row.symbol]),seedKeys=new Set(seed.symbol_uses.map(key));
 const additional=active.symbol_uses.filter(row=>!seedKeys.has(key(row)));
 assert.equal(seed.symbol_uses.length,1736);assert.equal(active.symbol_uses.length,8);assert.equal(additional.length,8);
 assert.equal(additional.filter(row=>row.file==='legacy-menu/internal/menu-panel.ts').length,7);
 assert.equal(additional.filter(row=>row.file==='__individual_scope_fixture__.ts').length,1);
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
 // Synthetic complete behavior-disposition input. The current source bytes,
 // source-evidence reference, proof, review and patch are all explicitly bound;
 // no real product or runtime qualification is represented by this fixture.
 const behaviorSourcePath='projects/ngx-material-legacy/__individual_scope_fixture__.ts';
 const behaviorSource=Buffer.from("import {InjectionToken} from '@angular/core';\n// Synthetic discovery route only.\n"),behaviorDecision='Synthetic source-bound admission fixture only; no product API or behavior qualification is claimed.';
 const behaviorPatch=[
  'diff --git a/'+behaviorSourcePath+' b/'+behaviorSourcePath,
  '--- a/'+behaviorSourcePath,'+++ b/'+behaviorSourcePath,'@@ -1 +1,2 @@',
  '-old synthetic fixture source',...behaviorSource.toString().trimEnd().split('\n').map(text=>'+'+text),
 ].join('\n')+'\n';
 const behaviorProof={proof_kind:'whole-input-transform-hunk-and-original-native-behavior',source_conclusion_only:true,execution_claim:'not-claimed',
  source_evidence_scope:'current',source_evidence:[{path:behaviorSourcePath,sha256:hash(behaviorSource),bytes:behaviorSource.length}],
  diff_sha256:hash(behaviorPatch),review_depth:'individual-compatibility',affected_branches:[line],decision:behaviorDecision};
 const positive={sha:'d'.repeat(40),subject:'synthetic fixture: individual behavior proof shape',files:[behaviorSourcePath],bucket:'behavior-semantic',
  final_disposition:'already-adapted',reason:behaviorDecision,evidence_report:'compatibility/f10/disposition-ledger/evidence/scope-positive-fixture.json',individual_proof:behaviorProof};
 const positiveReview={sha:positive.sha,status:'reviewed',final_disposition:positive.final_disposition,decision:behaviorDecision,
  affected_branches:[line],source_conclusion_only:true,execution_claim:'not-claimed',source_evidence:behaviorProof.source_evidence,
  individual_proof:clone(behaviorProof),diff_sha256:behaviorProof.diff_sha256,diff:behaviorPatch,fixture_only:true};
 const docsPath='docs/scope-fixture.md',docsSource=Buffer.from('Synthetic fixture documentation only\n');put(docsPath,docsSource);
 const docsPatch='diff --git a/docs/scope-fixture.md b/docs/scope-fixture.md\n--- a/docs/scope-fixture.md\n+++ b/docs/scope-fixture.md\n@@ -1 +1 @@\n-old documentation\n+Synthetic fixture documentation only\n';
 const docsApplyRoot=join(fixture,'docs-patch-control');mkdirSync(join(docsApplyRoot,'docs'),{recursive:true});
 writeFileSync(join(docsApplyRoot,docsPath),'old documentation\n');
 const docsApply=spawnSync('git',['apply','-'],{cwd:docsApplyRoot,input:docsPatch,encoding:'utf8'});
 assert.equal(docsApply.status,0,docsApply.stderr);
 assert.ok(readFileSync(join(docsApplyRoot,docsPath)).equals(docsSource),'documentation patch produces exact source');
 const docsDecision='Synthetic complete documentation applicability review. This fixture has no executable or packaged behavior change and provides no real product qualification.';
 const docsProof={proof_kind:'complete-syntax-and-documentation-review',source_conclusion_only:true,execution_claim:'not-claimed',source_evidence_scope:'current',
  source_evidence:[{path:docsPath,sha256:hash(docsSource),bytes:docsSource.length}],diff_sha256:hash(docsPatch),review_depth:'individual-compatibility',affected_branches:[line],decision:docsDecision};
 const docs={sha:'1'.repeat(40),subject:'docs: a11y fixture',files:[docsPath],bucket:'docs-build-batch-candidate',final_disposition:'not-applicable',reason:docsDecision,
  evidence_report:'compatibility/f10/disposition-ledger/evidence/scope-docs-fixture.json',individual_proof:docsProof};
 const docsReview={sha:docs.sha,status:'reviewed',final_disposition:'not-applicable',decision:docsDecision,affected_branches:[line],source_conclusion_only:true,
  execution_claim:'not-claimed',source_evidence:docsProof.source_evidence,individual_proof:clone(docsProof),diff_sha256:docsProof.diff_sha256,diff:docsPatch,fixture_only:true};
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
  assert.ok([0,1].includes(child.status),child.stderr||String(child.error));
  assert.ok(existsSync(output),name+' '+child.stderr);const report=JSON.parse(readFileSync(output));
  assert.equal(report.authored_use_inventory.expected,1736);assert.equal(report.authored_use_review_evidence.reviewed,1736);assert.equal(report.authored_use_review_evidence.insufficient,0);
  assert.equal(report.current_authored_use_inventory.ready,true,JSON.stringify(report.current_authored_use_inventory));
  assert.equal(report.current_authored_use_inventory.additional_uses,8);
  assert.equal(report.current_authored_use_inventory.additional_baseline.mode,'pre-repair-source-epoch');assert.equal(report.g11_claim,'not-passed');
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
 const lowRisk=clone(docs);lowRisk.subject='docs: general fixture';delete lowRisk.individual_proof;
 // Keep this mutant control on the top-level final-state guard; an individual
 // proof would correctly reject the pending body again through scope binding.
 assert.equal(run('pending-nonsensitive-final',lowRisk,{...docsReview,status:'pending'},false).evidence_failures[0].reason,'unfinished-review');
 // Execute weakened copies of the shipped checker: each real CLI control must catch its guard.
 // The real select SHA now also has an independent artifact guard. Isolate the
 // older source-kind guard on an explicitly synthetic, unregistered subject.
 const isolated=clone(weak);isolated.sha='f'.repeat(40);isolated.fixture_only=true;
 const isolatedReview={...clone(weakCompleted),sha:isolated.sha,fixture_only:true};
 assert.equal(run('synthetic-unregistered-source-kind-baseline',isolated,isolatedReview,false).insufficient_behavior,1);
 const checker=read('scripts/check-upstream-audit-disposition.mjs').toString();
 let mutated=checker.replace('if(!individualReviewScopeOk(', 'if(false&&!individualReviewScopeOk(');assert.notEqual(mutated,checker);
 put('scripts/scope-mutant-proof.mjs',mutated);run('mutant-source-kind-guard',isolated,isolatedReview,true,'scripts/scope-mutant-proof.mjs');checkerMutants++;
 mutated=checker.replace('if(ALLOWED_FINAL.has(entry.final_disposition)&&!reviewMetadataComplete(', 'if(false&&ALLOWED_FINAL.has(entry.final_disposition)&&!reviewMetadataComplete(');assert.notEqual(mutated,checker);
 put('scripts/scope-mutant-state.mjs',mutated);run('mutant-final-state-guard',lowRisk,{...docsReview,status:'pending'},true,'scripts/scope-mutant-state.mjs');checkerMutants++;
}finally{rmSync(fixture,{recursive:true,force:true});}
const output={schema_version:1,line,node:process.version,typescript:ts.version,role:'Completion/scope and actual CLI validator fixtures only; no real API, runtime, native, packed or G11 qualification',
 helper_positives:helperPositive,helper_negatives:helperNegative,actual_CLI_cases:cliCases,checker_mutants_detected:checkerMutants,
 complete_positive_behavior_fixture:true,complete_positive_source_applicability_fixture:true,frozen_fixture_uses:1736,current_fixture_additional_uses:8,synthetic_current_fixture_uses:1,authenticated_panel_fixture_uses:7,observations,
 producer_sha256:hash(read('tests/upstream_individual_evidence_scope_probe.mjs')),checker_sha256:hash(read('scripts/check-upstream-audit-disposition.mjs')),
 scope_helper_sha256:hash(read('scripts/upstream-individual-evidence-scope.mjs')),actual_product_or_packed_or_native_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(output));
