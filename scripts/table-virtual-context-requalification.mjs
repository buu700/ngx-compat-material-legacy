/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite table-use requalification; prior execution and new helper uses retain their scope. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {reviewClassDecoratorUses} from './class-decorator-use-review.mjs';
import {reviewFrameworkEnumUses} from './framework-enum-use-review.mjs';
import {reviewCurrentInjectionContexts} from './current-injection-context-review.mjs';
import {scanCurrentAuthoredUses} from './authored-current-use-inventory.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const key=row=>JSON.stringify([row.file,row.module,row.symbol]);
export const TABLE_VIEWPORT_INPUTS='compatibility/rc/table-virtual-context-evidence-inputs.json';
const inputHashes={main:'2a7c03164146767396417f65e73f6cb63a637ff25a3af4635ea86ee0314de0e0','21.x':'28a495370a8f22f37ac32a1bfe53b2eefb2b5d56265f8543bb54e1b3b6c4b2a1'};
const tablePath='projects/ngx-material-legacy/legacy-table/table.ts';
const helperPath='projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts';
const removed=['HeaderRowOutlet','DataRowOutlet','NoDataRowOutlet','FooterRowOutlet'];
const historicalNote='Source identity reconciled after earlier test adaptations; no current artifact-family execution receipt. Historical reference identities and prior candidate/execution snapshots remain retained.';
function shape(value){
 if(Array.isArray(value))return value.map(shape);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value)
  .filter(([name])=>!['line','candidate_source_sha256'].includes(name)).map(([name,item])=>[name,shape(item)]));
 return value;
}
function afterHistorical(before,inputs){
 const result=structuredClone(before);
 for(const item of inputs.historical_stale_rows){
  const row=result.rows.find(r=>r.candidate===item.prior.candidate);assert.deepEqual(row,item.prior);
  const prior={candidate_sha256:row.candidate_sha256,adaptation:row.adaptation,
   execution:structuredClone(row.execution),current_source_binding:false};
  row.prior_candidate_snapshots=[...(row.prior_candidate_snapshots||[]),prior];
  row.candidate_sha256=item.current_candidate_sha256;row.adaptation='adapted';
  row.execution={state:'not-executed',bound_to_current_head:false,receipt:null,note:historicalNote};
 }
 return result;
}
export async function inspectTableViewportRequalification({root=rootDefault,readMember}={}){
 const read=path=>readMember?readMember(path):readFileSync(resolve(root,path));
 const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
 const raw=read(TABLE_VIEWPORT_INPUTS);assert.equal(hash(raw),inputHashes[line],'table inputs changed');
 const inputs=JSON.parse(raw);assert.equal(inputs.line,line);assert.equal(inputs.prior_reviews.length,9);
 assert.equal(hash(read('compatibility/handoff/codex-closeout/reference/historical-paths.csv')),
  '33e24c7a3350004bda35236d5e643ae0d6f67bad5149faaf85e81cd108368d74','historical reference changed');
 function unpack(member){const packed=read(member.path);assert.equal(hash(packed),member.stored_sha256,'preimage archive changed');const bytes=gunzipSync(packed);assert.equal(hash(bytes),member.sha256,'preimage bytes changed');return bytes;}
 const before=unpack(inputs.preimage).toString(),table=read(tablePath).toString(),helper=read(helperPath).toString();
 assert.equal(inputs.preimage.sha256,'156faca47dc2fa1efdd2fcfbbe9a0424aa48e7a840c62178c4f2d7068ae33683');
 assert.equal(hash(table),inputs.table.sha256,'changed table source');
 assert.equal(hash(helper),inputs.helper.sha256,'changed tested constructor helper');
 assert.equal(inputs.helper.sha256,'9edd40a3915297b0ad36f6cc812649979c7a00bf8e40eabfc363aecdf6ea6771');
 const addedImport="import {preserveLegacyTableViewport} from './internal/table-construction-context';\n";
 assert.equal(table.split(addedImport).length,2);assert.equal(table.split('@preserveLegacyTableViewport\n').length,2);
 assert.equal(table.replace(addedImport,'').replace('@preserveLegacyTableViewport\n',''),before,'table changed outside the construction boundary');
 const documents=new Map();
 for(const member of inputs.members){const bytes=read(member.path);assert.equal(hash(bytes),member.sha256,'retained diagnostic changed: '+member.path);documents.set(member.path,JSON.parse(bytes));}
 const proof=documents.get('compatibility/rc/table-virtual-context-source-proof.json');assert.equal(proof.line,line);
 const historicalBytes=unpack(inputs.historical_inventory_preimage),historicalBefore=JSON.parse(historicalBytes);
 assert.equal(hash(historicalBytes),inputs.historical_inventory_before_sha256);
 for(const member of proof.source_members){const bytes=member.path==='testing/legacy-runner/historical-inventory.json'?historicalBytes:read(member.path);assert.equal(hash(bytes),member.sha256,'repair diagnostic subject changed: '+member.path);}
 const source=path=>read(path).toString();
 const classes=await reviewClassDecoratorUses({root,skipDiagnostics:true,readSource:source,sourceFiles:['legacy-table/table.ts']});
 // The old enum profiler's frozen roster includes imports retired later in
 // unrelated files. Replay their authenticated previous source cohort, with
 // the actual current table substituted, and claim only its two enum roles.
 const enumCohort=JSON.parse(unpack(inputs.enum_cohort));
 assert.equal(enumCohort.line,line);assert.equal(enumCohort.members.length,39);
 const enumSources=new Map(enumCohort.members.map(member=>{assert.equal(hash(member.source),member.sha256);return ['projects/ngx-material-legacy/'+member.file,member.source];}));
 const enums=reviewFrameworkEnumUses({root,readSource:path=>path===tablePath?source(path):enumSources.has(path)?enumSources.get(path):source(path)});
 const guards=reviewCurrentInjectionContexts({root,readSource:source});
 const enumPrior=documents.get('compatibility/rc/framework-enum-use-review.json');
 for(const row of enumPrior.cases)assert.equal(hash(enumSources.get('projects/ngx-material-legacy/'+row.file)),row.candidate_source_sha256,'preceding enum cohort differs from executed diagnostic');
 const guardPrior=documents.get('compatibility/rc/owned-menu-item-current-context-requalification.json').source_review;
 const roles=[],priorContexts=[];
 for(const row of inputs.prior_reviews){
  const bytes=read(row.source_review.path);assert.equal(hash(bytes),row.source_review.sha256,'prior review changed');
  const prior=JSON.parse(bytes).reviews.filter(r=>key(r)===key(row));assert.equal(prior.length,1);
  const old=prior[0];assert.equal(old.candidate_source_sha256,inputs.preimage.sha256);
  for(const ref of old.independent_evidence)assert.equal(hash(read(ref.path)),ref.sha256,'prior independent evidence changed');
  let currentRole,oldRole;
  if(removed.includes(row.symbol)){
   for(const text of [before,table,helper]){const file=ts.createSourceFile('subject.ts',text,ts.ScriptTarget.Latest,true);let found=0;const visit=node=>{if(ts.isIdentifier(node)&&node.text===row.symbol)found++;ts.forEachChild(node,visit);};visit(file);assert.equal(found,0,'removed outlet binding returned');}
   assert.equal(old.conclusion,'removed-use');currentRole={absent_in_preimage_table_current_table_and_helper:true};
  }else{
   const collection=['Component','Directive'].includes(row.symbol)?classes.cases:
    ['ChangeDetectionStrategy','ViewEncapsulation'].includes(row.symbol)?enums.cases:guards.cases;
   currentRole=collection.find(r=>key(r)===key(row));assert.ok(currentRole,'missing current table role');
   oldRole=['Component','Directive'].includes(row.symbol)?old.recorded_case:
    ['ChangeDetectionStrategy','ViewEncapsulation'].includes(row.symbol)?enumPrior.cases.find(r=>key(r)===key(row)):guardPrior.cases.find(r=>key(r)===key(row));
   assert.ok(oldRole);assert.deepEqual(shape(currentRole),shape(oldRole),'changed public table role');
  }
  priorContexts.push({...row,prior_candidate_source_sha256:old.candidate_source_sha256,conclusion:old.conclusion});
  roles.push({file:row.file,module:row.module,symbol:row.symbol,conclusion:old.conclusion,current_role:currentRole,
   prior_source_review:row.source_review,retained_independent_evidence:old.independent_evidence});
 }
 assert.equal(classes.cases.length,2);assert.equal(classes.whole_population_reviewed,false);assert.equal(enums.cases.length,78);assert.equal(guards.cases.length,9);
 const snapshot=scanCurrentAuthoredUses({root}),seed=JSON.parse(read('compatibility/f10/authored-dependency-inventory-seed.json'));
 const frozenKeys=new Set(seed.symbol_uses.map(key)),additions=snapshot.symbol_uses.filter(r=>!frozenKeys.has(key(r)));
 const helperUses=additions.filter(r=>r.file==='legacy-table/internal/table-construction-context.ts');
 assert.deepEqual(helperUses.map(r=>r.symbol).sort(),['CDK_VIRTUAL_SCROLL_VIEWPORT','CdkTable','InjectOptions','Injector','ProviderToken','inject','runInInjectionContext'].sort());
 assert.equal(additions.length,308);assert.equal(snapshot.symbol_uses.length,1958);assert.equal(snapshot.source_files.length,531);
 assert.equal(seed.symbol_uses.length,1736);assert.equal(seed.symbol_uses.filter(r=>!snapshot.symbol_uses.some(u=>key(u)===key(r))).length,86);
 const historicalAfter=afterHistorical(historicalBefore,inputs),historicalCurrent=JSON.parse(read('testing/legacy-runner/historical-inventory.json'));
 assert.ok(hash(read('testing/legacy-runner/historical-inventory.json'))===inputs.historical_inventory_before_sha256||
  JSON.stringify(historicalCurrent)===JSON.stringify(historicalAfter),'historical inventory changed outside the six candidate bindings');
 assert.equal(inputs.historical_stale_rows.length,6);
 for(const item of inputs.historical_stale_rows)assert.equal(hash(read(item.prior.candidate)),item.current_candidate_sha256,'historical candidate source changed');
 return {schema_version:1,line,source_parent:inputs.source_parent,input_capsule_sha256:hash(raw),roles,prior_contexts:priorContexts,
  prior_diagnostics_retained:true,complete_existing_table_recovered:true,tested_constructor_helper_unchanged:true,
  fresh_domain_role_counts:{selected_current_class_decorators:classes.cases.length,preceding_enum_cohort_cases:enums.cases.length,current_table_enum_roles:2,context_guard_cases:guards.cases.length,current_table_guard_roles:1},
  enum_scope:'Two actual current table roles; the other 38 files are authenticated preceding-cohort scaffolding. No whole-current enum population claim.',
  snapshot,additions,helper_uses_open:helperUses,historical_before:historicalBefore,historical_after:historicalAfter,
  scope:'Only nine existing imported table roles are requalified by unchanged expressions/metadata/guard scope and the exact tested parent-construction boundary. Seven helper imports remain open. Historical candidate identity reconciliation grants no execution credit. No upstream SHA closure, new helper behavior closure, native/packed/floor or G11 qualification.',g11_claim:'not-passed'};
}

export async function recordTableViewportRequalification(root=rootDefault){
 const read=path=>readFileSync(resolve(root,path)),json=path=>JSON.parse(read(path));
 const write=(path,value)=>writeFileSync(resolve(root,path),JSON.stringify(value,null,2)+'\n',{flag:existsSync(resolve(root,path))?'w':'wx'});
 const reviewPath='compatibility/f10/authored-use-reviews/table-virtual-context-requalified-boundaries.json';
 const reportPath='compatibility/rc/table-virtual-context-evidence-requalification.json';
 assert.equal(existsSync(resolve(root,reviewPath)),false,'table roles already recorded');
 assert.equal(existsSync(resolve(root,reportPath)),false,'table requalification already recorded');
 const result=await inspectTableViewportRequalification({root});
 const frozenPath='compatibility/f10/authored-dependency-dispositions.json',currentPath='compatibility/f10/authored-dependency-current-dispositions.json';
 const frozen=json(frozenPath),current=json(currentPath),all=[...frozen.symbol_uses,...current.symbol_uses];
 for(const role of result.roles){const row=all.find(r=>key(r)===key(role));assert.deepEqual(row?.source_review,role.prior_source_review);}
 const report={...result,producer_sha256:hash(read('scripts/table-virtual-context-requalification.mjs')),
  source_checkers:['scripts/class-decorator-use-review.mjs','scripts/framework-enum-use-review.mjs','scripts/current-injection-context-review.mjs'].map(path=>({path,sha256:hash(read(path))}))};
 delete report.snapshot;delete report.additions;delete report.historical_before;delete report.historical_after;
 report.historical_candidate_changes=result.historical_after.rows.filter(r=>result.historical_before.rows.find(old=>old.candidate===r.candidate)?.candidate_sha256!==r.candidate_sha256)
  .map(r=>({candidate:r.candidate,candidate_sha256:r.candidate_sha256,historical_sha256:r.historical_sha256,execution:r.execution}));
 write('testing/legacy-runner/historical-inventory.json',result.historical_after);
 report.historical_inventory_source_check={exit_code:0,stdout:execFileSync('python3',['scripts/historical_inventory_source.py'],{cwd:root,encoding:'utf8'}).trim()};
 write(reportPath,report);
 const evidence=[TABLE_VIEWPORT_INPUTS,reportPath,'scripts/table-virtual-context-requalification.mjs',
  'compatibility/rc/table-virtual-context-source-proof.json',
  'compatibility/rc/table-virtual-context-evidence-controls.json',
  'tests/table_virtual_context_requalification_probe.mjs',
  ...report.source_checkers.map(member=>member.path)].map(path=>({path,sha256:hash(read(path))}));
 const reviews=result.roles.map(role=>({file:role.file,module:role.module,symbol:role.symbol,
  candidate_source_sha256:hash(read(tablePath)),conclusion:role.conclusion,reviewer:'Codex primary implementer',
  prior_source_review:role.prior_source_review,current_role:role.current_role,
  decision:removed.includes(role.symbol)?'The previously removed direct outlet import remains absent in the entire preceding/current table and the new helper. Removing exactly the added local helper import and class decorator recovers the complete preceding table. Public module/outlet ownership and all prior evidence remain unchanged. The construction boundary is separately supported by genuine minimum node-injection and focused Angular22 full/partial AOT diagnostics; real legacy templates/native/packed/floors remain required. This requalifies only the removed frozen binding.':
   'Fresh existing domain inspection binds this imported public table role and compares it with its retained diagnostic case, excluding only source identity and observation line numbers. Metadata expressions, enum values/members and constructor guard scope remain unchanged. The complete preceding table is recovered by reversing only the new local helper import and class decorator. Its parent-construction interaction has separate genuine-minimum node-DI, strict declarations and Angular22 full/partial AOT diagnostics. Prior namespace/metadata/guard receipts retain their exact bytes and limited scope. This requalifies only the named public role, without native legacy-view, packed, actual21 compiler, floor, new helper-use or upstream SHA clearance.',
  independent_evidence:[...role.retained_independent_evidence,...evidence]}));
 write(reviewPath,{schema_version:1,line:result.line,status:'reviewed',reviews,g11_claim:'not-passed'});
 for(const role of result.roles){const row=all.find(r=>key(r)===key(role));row.source_review_history=[...(row.source_review_history||[]),{
  prior_source_review:row.source_review,reason:'Finite unchanged table-role requalification after constructor-only viewport boundary.'}];row.source_review={path:reviewPath,sha256:hash(read(reviewPath))};}
 const previousKeys=new Set(current.symbol_uses.map(key)),freshKeys=new Set(result.additions.map(key));
 assert.ok([...previousKeys].every(k=>freshKeys.has(k)));assert.equal(result.additions.length-current.symbol_uses.length,7);
 current.source_snapshot_history=[...(current.source_snapshot_history||[]),{current_source_population_sha256:current.current_source_population_sha256,
  current_uses:current.current_uses,current_source_files:current.current_source_files,symbol_use_count:current.symbol_use_count,
  reason:'One owned constructor helper adds seven inventoried open peer uses; all preceding uses and frozen obligations retained.'}];
 for(const row of current.symbol_uses){const fresh=result.additions.find(r=>key(r)===key(row));row.candidate_source_sha256=fresh.candidate_source_sha256;row.occurrences=fresh.occurrences;}
 current.symbol_uses.push(...result.additions.filter(r=>!previousKeys.has(key(r))).map(r=>({...r,status:'unreviewed-current-use',disposition:'open',
  review_requirement:'New constructor-context import. Public-export, type/runtime and behavior review remains required; native viewport rendering is a separate mandatory artifact-family case.'})));
 Object.assign(current,{current_source_population_sha256:result.snapshot.source_population_sha256,current_uses:1958,current_source_files:531,symbol_use_count:308});
 const frozenCounts=authoredUseReviewEvidence(frozen,result.line,read,hash),currentCounts=authoredUseReviewEvidence(current,result.line,read,hash);
 assert.equal(frozenCounts.insufficient,0);assert.equal(currentCounts.insufficient,0);
 frozen.reviewed_uses=frozenCounts.reviewed;frozen.open_uses=frozen.symbol_uses.length-frozenCounts.reviewed;
 write(frozenPath,frozen);write(currentPath,current);
 return {line:result.line,requalified_roles:9,new_open_uses:7,frozen_reviewed:frozenCounts.reviewed,current_reviewed:currentCounts.reviewed,
  historical_source_paths:57,historical_execution_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 assert.deepEqual(process.argv.slice(2),['--record'],'usage: node scripts/table-virtual-context-requalification.mjs --record');
 console.log(JSON.stringify(await recordTableViewportRequalification()));
}
