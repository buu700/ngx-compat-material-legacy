/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite current review integration; historical reports never become current runtime results. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {scanCurrentAuthoredUses} from '../../scripts/authored-current-use-inventory.mjs';
import {authoredUseInventory,authoredUseReviewEvidence} from '../../scripts/authored-use-inventory.mjs';
import {historicalContractRepairSourceSubject} from '../../scripts/historical-contract-repair-source.mjs';
import {dialogTitleProductSubject,DIALOG_TITLE_SOURCE_IMAGES} from '../../scripts/dialog-title-source-context.mjs';
import {readHistoricalContractRepairOwnerMember} from '../../scripts/historical-contract-repair-readers.mjs';
const root=process.cwd(),mode=process.argv[2],prefix='compatibility/rc/current-repaired-source-roster-';
assert.ok(['--prepare','--apply','--verify'].includes(mode));
const paths={frozen:'compatibility/f10/authored-dependency-dispositions.json',extra:'compatibility/f10/authored-dependency-current-dispositions.json',oldReview:'compatibility/f10/authored-use-reviews/base-class-removal-current-uses.json',review:'compatibility/f10/authored-use-reviews/current-repaired-source-integration.json',proof:prefix+'preparation-proof.json'};
const hash=b=>createHash('sha256').update(b).digest('hex'),key=r=>JSON.stringify([r.file,r.module,r.symbol]),json=d=>JSON.stringify(d,null,2)+'\n',cache=new Map(),parsed=new Map();
const physical=p=>readHistoricalContractRepairOwnerMember(root,p),read=p=>{if(!cache.has(p))cache.set(p,physical(p));return cache.get(p);},load=p=>{if(!parsed.has(p))parsed.set(p,JSON.parse(read(p)));return parsed.get(p);};
const reference=(path,raw=read(path))=>({path,sha256:hash(raw),bytes:raw.length});
const w=load(prefix+'worksheet.json'),line=w.line,ts=createRequire(import.meta.url)('typescript');
assert.equal(process.versions.node,load('toolchain-lock.json').repository.node);
const git=(parent,path)=>{assert.match(parent,/^[0-9a-f]{40}$/);const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};for(const n of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[n];return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:16*1024*1024});};
const originals=new Map();
for(const r of w.original_inputs){const b=[paths.frozen,paths.extra].includes(r.path)?git(w.source_parent,r.path):read(r.path);assert.equal(hash(b),r.sha256);assert.equal(b.length,r.bytes);originals.set(r.path,b);}
for(const r of w.protected_inputs)assert.deepEqual(reference(r.path),r);
const beforeFrozen=JSON.parse(originals.get(paths.frozen)),beforeExtra=JSON.parse(originals.get(paths.extra)),oldReview=load(paths.oldReview),oldRef=reference(paths.oldReview);
assert.equal(beforeFrozen.symbol_uses.length,1736);assert.equal(beforeExtra.symbol_uses.length,315);assert.equal(beforeExtra.retained_removed_additional_uses.length,2);assert.equal(oldReview.reviews.length,95);assert.equal(oldReview.line,line);
const sources=historicalContractRepairSourceSubject({root}),title=dialogTitleProductSubject({root,line}),sourceInputs=load('compatibility/rc/historical-contract-repair-source-inputs.json');
const current=scanCurrentAuthoredUses({root}),live=new Map(current.symbol_uses.map(r=>[key(r),r])),sourceHashes=new Map(current.source_files.map(r=>[r.path,r.sha256]));
assert.equal(current.source_files.length,532);assert.equal(current.symbol_uses.length,1965);for(const m of current.source_files)assert.equal(hash(read(m.path)),m.sha256,'mixed current source snapshot');read(prefix+'producer.mjs');
const beforeBySource=new Map();for(const image of sources.images.filter(r=>r.path.startsWith('projects/'))){const b=git(sourceInputs.repair_baseline_commit,image.path);assert.equal(hash(b),image.before.sha256);beforeBySource.set(image.path,b);}
const impactRef=w.original_inputs.find(r=>r.path.endsWith('dialog-title-current-source-impact.json')||r.path.endsWith('roster-title-impact.json'));assert.ok(impactRef);
const impact=load(impactRef.path),titleImpact=impact.rows.find(r=>r.line===line);assert.ok(titleImpact.all_external_imported_identifier_reference_contexts_exactly_equal);
const titleRoleComparisons=[];
function roles(path,text){const sf=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);const options={noResolve:true,noLib:true,types:[],target:ts.ScriptTarget.ES2022,experimentalDecorators:true},host=ts.createCompilerHost(options);host.getSourceFile=name=>name===path?sf:undefined;const checker=ts.createProgram([path],options,host).getTypeChecker(),out=[];
 for(const s of sf.statements){if(!ts.isImportDeclaration(s)||!s.moduleSpecifier.text.startsWith('@angular/'))continue;const bindings=s.importClause?.namedBindings;assert.ok(bindings&&ts.isNamedImports(bindings));for(const b of bindings.elements){const symbol=checker.getSymbolAtLocation(b.name);assert.ok(symbol);const uses=[];function visit(n){if(ts.isIdentifier(n)&&n!==b.name&&checker.getSymbolAtLocation(n)===symbol)uses.push({kind:ts.SyntaxKind[n.parent.kind],text:n.parent.getText(sf)});ts.forEachChild(n,visit);}visit(sf);out.push({module:s.moduleSpecifier.text,symbol:b.propertyName?.text??b.name.text,local:b.name.text,uses});}}
 return out;}
for(const image of DIALOG_TITLE_SOURCE_IMAGES){const before=git(titleImpact.before_source_parent,image.path);assert.equal(hash(before),image.before);assert.equal(before.length,image.before_bytes);beforeBySource.set(image.path,before);const a=roles(image.path,before.toString()),b=roles(image.path,read(image.path).toString());assert.deepEqual(b,a,'changed external title dependency roles');titleRoleComparisons.push({path:image.path,before_sha256:image.before,current_sha256:image.after,all_external_lexical_roles_equal:true,roles:b});}
const titleTools=load('compatibility/rc/dialog-title-current-source-reader-successors.json'),toolRow=titleTools.code_subjects.find(r=>r.path==='scripts/dialog-caller-owned-contract-boundary.mjs');assert.ok(toolRow);
const toolBefore=git(titleTools.source_parent,toolRow.path);assert.equal(hash(toolBefore),toolRow.before.sha256);assert.equal(toolBefore.length,toolRow.before.bytes);let toolExpected=toolBefore.toString();for(const e of toolRow.literal_edits){assert.equal(toolExpected.split(e.before).length,2);toolExpected=toolExpected.replace(e.before,e.after);}assert.equal(hash(toolExpected),toolRow.after.sha256);assert.equal(read(toolRow.path).toString(),toolExpected);
const seedRef=beforeFrozen.frozen_roster,seed=load(seedRef.path);assert.equal(hash(read(seedRef.path)),seedRef.sha256);assert.equal(seed.symbol_uses.length,1736);
const oldRows=new Map([...beforeFrozen.symbol_uses,...beforeExtra.symbol_uses].map(r=>[key(r),r]));assert.equal(oldRows.size,2051);
const baseCases=new Map(oldReview.reviews.map(r=>[key(r),r]));assert.equal(baseCases.size,95);
const baseEvidence=authoredUseReviewEvidence({symbol_uses:oldReview.reviews.map(r=>({file:r.file,module:r.module,symbol:r.symbol,status:'reviewed',disposition:'closed',source_review:oldRef}))},line,read,hash);assert.equal(baseEvidence.reviewed,95);assert.equal(baseEvidence.insufficient,0);
const badFrozen=authoredUseReviewEvidence(beforeFrozen,line,read,hash),badExtra=authoredUseReviewEvidence(beforeExtra,line,read,hash),bad=new Set([...badFrozen.insufficient_uses,...badExtra.insufficient_uses].map(key)),targets=new Set([...bad,...baseCases.keys()]);
const cases=[],reviews=[],retainedEvidence=[];
for(const id of [...targets].sort()){
 const oldRow=oldRows.get(id),base=baseCases.get(id),caseKey=base??oldRow;assert.ok(caseKey);let prior,priorRef;
 if(oldRow){priorRef=oldRow.source_review;assert.equal(hash(read(priorRef.path)),priorRef.sha256);const matches=load(priorRef.path).reviews.filter(r=>key(r)===id);assert.equal(matches.length,1);prior=matches[0];}
 if(base&&oldRow)assert.deepEqual(base.prior_source_review,priorRef);
 const candidateHash=sourceHashes.get('projects/ngx-material-legacy/'+caseKey.file);assert.ok(candidateHash);
 const rawCase=base??prior,oldHash=prior?.candidate_source_sha256,reasons=[];
 if(base){assert.equal(base.candidate_source_sha256,candidateHash);reasons.push('previously reviewed exact current base-class repair use');}
 else if(oldHash!==candidateHash){const p='projects/ngx-material-legacy/'+caseKey.file,image=sources.images.find(r=>r.path===p),titleImage=DIALOG_TITLE_SOURCE_IMAGES.find(r=>r.path===p);const qualified=image?sources.qualify({path:p,sha256:oldHash}):titleImage?title.qualify({path:p,sha256:oldHash}):null;assert.equal(qualified?.sha256,candidateHash,'unqualified source successor '+p);
  if(!live.has(id)){assert.ok(['removed-use','owned-replacement'].includes(prior.conclusion),'prior removed/replaced use required');const before=scanCurrentAuthoredUses({root,files:[p],readSource:()=>beforeBySource.get(p)});assert.equal(before.symbol_uses.some(r=>key(r)===id),false,'removed seed use returned in before source');reasons.push('original removed or owned-replacement obligation remains absent in authenticated before and actual current source');}
  else if(titleImage)reasons.push('external imported identifier roles identical across the exact dialog-title repair');
  else assert.fail('unreviewed live base-class dependency omitted from the original95 cases');
 }else reasons.push('entire caller source remains byte-identical to prior review');
 const evidence=new Map(),add=e=>{assert.ok(e.path!==paths.review&&e.path!=='projects/ngx-material-legacy/'+caseKey.file);const previous=evidence.get(e.path);if(previous)assert.equal(previous.sha256,e.sha256);else evidence.set(e.path,{...e});};
 for(const e of rawCase.independent_evidence)add(e);if(prior)for(const e of prior.independent_evidence)add(e);add(oldRef);if(priorRef)add(priorRef);
 let advancedTool=false;
 for(const [p,e]of evidence){const actual=read(p);if(hash(actual)!==e.sha256){assert.equal(p,toolRow.path,'unqualified changed independent evidence '+p);assert.equal(e.sha256,toolRow.before.sha256);evidence.set(p,{...e,sha256:toolRow.after.sha256,...(e.bytes===undefined?{}:{bytes:toolRow.after.bytes})});advancedTool=true;}else if(e.bytes!==undefined)assert.equal(actual.length,e.bytes);}
 if(advancedTool)reasons.push('only the authenticated dialog-title checker literal transition advances an evidence reference');
 const item={file:caseKey.file,module:caseKey.module,symbol:caseKey.symbol,candidate_source_sha256:candidateHash,conclusion:rawCase.conclusion,reviewer:'Codex primary implementer',decision:base?base.decision:('For '+caseKey.file+' '+caseKey.module+':'+caseKey.symbol+', '+reasons.join('; ')+'. The prior dependency conclusion is preserved: '+prior.decision+' This integration qualifies current source and evidence identity only. Prior native,packed,browser and floor results remain historical;no canonical SHA or G11 admission is granted.'),...(priorRef?{prior_source_review:priorRef,prior_decision:prior.decision}:{})};
 reviews.push({...item,independent_evidence:[...evidence.values()]});cases.push({file:item.file,module:item.module,symbol:item.symbol,existing_obligation:Boolean(oldRow),base_case:Boolean(base),prior_source_review:priorRef??null,prior_candidate_source_sha256:oldHash??null,current_candidate_source_sha256:candidateHash,reasons,tool_reference_advanced:advancedTool,current_import_present:live.has(id)});retainedEvidence.push({id,refs:[...evidence.values()]});
}
const newKeys=oldReview.reviews.filter(r=>!oldRows.has(key(r)));assert.equal(newKeys.length,2);assert.equal([...baseCases.keys()].filter(k=>oldRows.has(k)).length,93);
const sourceBindings=[...cache].filter(([p])=>![paths.frozen,paths.extra].includes(p)).map(([p,b])=>reference(p,b));
const preparation={schema_version:1,line,producer:reference(prefix+'producer.mjs'),source_parent:w.source_parent,scope:'Current source/review identity only; no new runtime execution',original_rosters:w.original_inputs.filter(r=>[paths.frozen,paths.extra].includes(r.path)),current_graph:{compiler:current.compiler,source_files:current.source_files.length,current_uses:current.symbol_uses.length,source_population_sha256:current.source_population_sha256},prior_invalid_reviews:{frozen:badFrozen.insufficient,additional:badExtra.insufficient},integrated_cases:cases,title_external_role_comparisons:titleRoleComparisons,exact_tool_transition:{path:toolRow.path,source_parent:titleTools.source_parent,before:toolRow.before,after:toolRow.after,literal_edits:toolRow.literal_edits},source_bindings:sourceBindings,prior_direct_dependencies_retained:true,canonical_dispositions_changed:0,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
const proofBytes=Buffer.from(json(preparation)),proofRef=reference(paths.proof,proofBytes);for(const row of reviews)row.independent_evidence.unshift(proofRef);
const review={schema_version:1,line,status:'reviewed',scope:'Current authored source identities after finite base-class/title repairs and one exact checker transition;every prior direct evidence dependency retained',reviews,g11_claim:'not-passed'},reviewBytes=Buffer.from(json(review)),reviewRef=reference(paths.review,reviewBytes),reviewKeys=new Set(reviews.map(key)),reason='Current source/evidence identity qualified through exact historical contract/title repairs;all original review dependencies and historical results retained. No broader native/packed/floor or canonical admission.';
const update=r=>!reviewKeys.has(key(r))?structuredClone(r):{...structuredClone(r),source_review_history:[...(r.source_review_history??[]),{recorded_at_utc:w.recorded_at_utc,prior_source_review:r.source_review,reason}],source_review:reviewRef};
const frozen={...structuredClone(beforeFrozen),note:beforeFrozen.note+' Current finite repair integration retains all1736keys and every prior direct review dependency.',symbol_uses:beforeFrozen.symbol_uses.map(update)};
const extra={...structuredClone(beforeExtra),recorded_at_utc:w.recorded_at_utc,current_source_population_sha256:current.source_population_sha256,current_uses:current.symbol_uses.length,current_source_files:current.source_files.length,source_snapshot_history:[...beforeExtra.source_snapshot_history,{ledger_sha256:hash(originals.get(paths.extra)),source_population_sha256:beforeExtra.current_source_population_sha256,symbol_use_count:beforeExtra.symbol_use_count,reason}],symbol_uses:beforeExtra.symbol_uses.map(r=>{const n=update(r),actual=live.get(key(r));return actual?{...n,candidate_source_sha256:actual.candidate_source_sha256,occurrences:actual.occurrences}:n;})};
for(const r of newKeys){const actual=live.get(key(r));assert.ok(actual);extra.symbol_uses.push({...actual,status:'reviewed',disposition:'closed',source_review:reviewRef});}
const frozenKeys=new Set(seed.symbol_uses.map(key)),additions=current.symbol_uses.filter(r=>!frozenKeys.has(key(r))),expected=new Map(beforeExtra.symbol_uses.map(r=>[key(r),r]));for(const r of additions)expected.set(key(r),r);
extra.symbol_use_count=expected.size;extra.live_symbol_use_count=additions.length;assert.equal(extra.symbol_use_count,317);assert.equal(extra.live_symbol_use_count,315);assert.equal(extra.symbol_uses.length,317);assert.deepEqual(extra.retained_removed_additional_uses,beforeExtra.retained_removed_additional_uses);
const virtual=new Map([[paths.review,reviewBytes],[paths.proof,proofBytes]]),evidenceRead=p=>virtual.get(p)??read(p),frozenInventory=authoredUseInventory(seed.symbol_uses,frozen),extraInventory=authoredUseInventory([...expected.values()],extra),frozenEvidence=authoredUseReviewEvidence(frozen,line,evidenceRead,hash),extraEvidence=authoredUseReviewEvidence(extra,line,evidenceRead,hash);
assert.ok(frozenInventory.complete&&extraInventory.complete);assert.equal(frozenInventory.open,0);assert.equal(extraInventory.open,0);assert.equal(frozenEvidence.insufficient,0);assert.equal(extraEvidence.insufficient,0);
const frozenBytes=Buffer.from(json(frozen)),extraBytes=Buffer.from(json(extra));
for(const [p,b]of cache)assert.ok(physical(p).equals(b),'input changed during proposal '+p);sources.assertCurrent();title.assertCurrent();
const summary={schema_version:1,line,integrated_review_cases:reviews.length,updated_frozen:beforeFrozen.symbol_uses.filter(r=>reviewKeys.has(key(r))).length,updated_additional:beforeExtra.symbol_uses.filter(r=>reviewKeys.has(key(r))).length,new_imports:newKeys.length,frozen_inventory:frozenInventory,additional_inventory:extraInventory,frozen_review_evidence:frozenEvidence,additional_review_evidence:extraEvidence,current_uses:current.symbol_uses.length,current_source_files:current.source_files.length,live_additions:additions.length,additional_obligations:expected.size,retirements:beforeExtra.retained_removed_additional_uses.length,preparation:proofRef,current_review:reviewRef,full_shipped_current_admission_qualified:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(mode==='--prepare'){
 for(const [p,b]of [[paths.proof,proofBytes],[prefix+'proposed-review.json',reviewBytes],[prefix+'proposed-frozen.json',frozenBytes],[prefix+'proposed-additional.json',extraBytes],[prefix+'proposal-qualified.json',Buffer.from(json(summary))]]){assert.equal(existsSync(p),false,'refuse to overwrite prior proposal '+p);writeFileSync(p,b);}
}else if(mode==='--apply'){
 assert.ok(readFileSync(paths.proof).equals(proofBytes));for(const [p,b]of [[paths.frozen,frozenBytes],[paths.extra,extraBytes]])assert.ok(readFileSync(p).equals(originals.get(p)),'actual roster changed before apply');assert.equal(existsSync(paths.review),false);writeFileSync(paths.review,reviewBytes);writeFileSync(paths.frozen,frozenBytes);writeFileSync(paths.extra,extraBytes);
}else{
 for(const [p,b]of [[paths.proof,proofBytes],[paths.review,reviewBytes],[paths.frozen,frozenBytes],[paths.extra,extraBytes]])assert.ok(readFileSync(p).equals(b),'actual integration differs from exact proposal '+p);const out=prefix+'current-qualified.json';assert.equal(existsSync(out),false);writeFileSync(out,json(summary));
}
console.log(JSON.stringify({mode,line,integrated_cases:reviews.length,updated_frozen:summary.updated_frozen,updated_additional:summary.updated_additional,new_imports:newKeys.length,frozen_reviewed:frozenEvidence.reviewed,additional_reviewed:extraEvidence.reviewed,current_uses:current.symbol_uses.length,full_admission_qualified:false}));
