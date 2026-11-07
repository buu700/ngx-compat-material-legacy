/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact source-role identity; no new use closure or native qualification. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {inspectChipFocusRepair} from './chip-focus-contract.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {scanCurrentAuthoredUses,currentAuthoredUseAdmission} from './authored-current-use-inventory.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),json=v=>JSON.stringify(v,null,2)+'\n',key=r=>JSON.stringify([r.file,r.module,r.symbol]),printer=ts.createPrinter({removeComments:true});
export const CHIP_FOCUS_ROLE_PRIOR='compatibility/rc/chip-focus-role-requalification-prior.json.gz';
export const CHIP_FOCUS_ROLE_WITNESS='compatibility/rc/chip-focus-role-requalification-witness.json';
export const CHIP_FOCUS_ROLE_REVIEW='compatibility/f10/authored-use-reviews/chip-focus-role-requalification.json';
const pins={main:'a74b93b4f98d7b19b22b03d5495950c98c2bd97429a6c7e8a545b9bf58534b32','21.x':'8a64059835f0122a9554ee381247522ef63ab651084ccc83e096df51978f522a'};
function freeze(o){if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;}
const cache=new Map();
export function chipFocusRolePrior(read=p=>readFileSync(p)){
 const bytes=read(CHIP_FOCUS_ROLE_PRIOR),pin=hash(bytes),line=Object.keys(pins).find(l=>pins[l]===pin);assert.ok(line,'changed chip role prior');if(cache.has(line))return cache.get(line);
 const p=JSON.parse(gunzipSync(bytes));assert.equal(p.line,line);assert.equal(p.selected_rows.length,21);assert.equal(p.all_chip_rows.length,24);for(const m of [...p.stores,...p.reviews])assert.equal(hash(m.text),m.sha256);assert.equal(hash(p.before_source.text),p.before_source.sha256);cache.set(line,freeze(p));return cache.get(line);
}
function roleFacts(text,rows){
 const source=ts.createSourceFile('chip.ts',text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);const print=n=>printer.printNode(ts.EmitHint.Unspecified,n,source).trim(),facts=[];
 for(const row of rows){let declaration,local;
  const imports=source.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text===row.module);
  for(const node of imports)if(node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings))for(const binding of node.importClause.namedBindings.elements)if((binding.propertyName??binding.name).text===row.symbol){assert.equal(declaration,undefined);declaration=node;local=binding.name.text;}
  let owned=false;if(!declaration&&row.symbol==='BooleanInput'){const aliases=source.statements.filter(n=>ts.isTypeAliasDeclaration(n)&&n.name.text==='BooleanInput');assert.equal(aliases.length,1);declaration=aliases[0];local='BooleanInput';owned=true;}
  assert.ok(declaration,'missing imported/owned binding '+row.symbol);const references=[];const visit=n=>{if(ts.isIdentifier(n)&&n.text===local)references.push({kind:ts.SyntaxKind[n.parent.kind],syntax:print(n.parent),line:source.getLineAndCharacterOfPosition(n.getStart(source)).line+1});ts.forEachChild(n,visit);};visit(source);
  facts.push({file:row.file,module:row.module,symbol:row.symbol,local,owned_type_alias:owned,declaration:print(declaration),references});
 }
 const owner=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyChip'),focus=owner.members.find(n=>n.name?.getText()==='focus');assert.ok(focus);const matched=[];const locals=new Set(facts.map(f=>f.local));const visit=n=>{if(ts.isIdentifier(n)&&locals.has(n.text))matched.push(n.text);ts.forEachChild(n,visit);};visit(focus);assert.deepEqual(matched,[],'focus delta reaches an imported/owned binding');
 return facts;
}
const withoutLocations=facts=>facts.map(f=>({...f,references:f.references.map(({line,...r})=>r)}));
export function buildChipFocusRoleRequalification({root=process.cwd(),read=p=>readFileSync(join(root,p))}={}){
 const prior=chipFocusRolePrior(read),raw=inspectChipFocusRepair({root,readMember:read});assert.equal(hash(read(prior.current_source.path)),prior.current_source.sha256);
 for(const m of [...prior.reviews,...prior.independent_evidence])assert.equal(hash(read(m.path)),m.sha256,'changed independent role evidence '+m.path);
 const before=roleFacts(prior.before_source.text,prior.all_chip_rows),current=roleFacts(read(prior.current_source.path).toString(),prior.all_chip_rows);assert.deepEqual(withoutLocations(current),withoutLocations(before),'import/binding/reference role changed');
 const discovered=scanCurrentAuthoredUses({root}),frozen=JSON.parse(prior.stores[0].text),candidate=JSON.parse(prior.stores[1].text);assert.equal(discovered.symbol_uses.length,1958);assert.equal(discovered.source_files.length,531);
 const wanted=new Map(discovered.symbol_uses.map(r=>[key(r),r]));for(const row of candidate.symbol_uses){const actual=wanted.get(key(row));assert.ok(actual);assert.equal(actual.candidate_source_sha256,row.candidate_source_sha256);assert.deepEqual(actual.occurrences,row.occurrences);}
 assert.equal(candidate.symbol_uses.length,308);assert.equal(candidate.current_uses,1958);assert.equal(candidate.current_source_files,531);assert.equal(candidate.symbol_use_count,308);
 const witness={schema_version:1,line:prior.line,status:'reviewed',source_parent:prior.source_parent,prior:{path:CHIP_FOCUS_ROLE_PRIOR,sha256:pins[prior.line]},before_source:{path:prior.before_source.path,sha256:prior.before_source.sha256},current_source:prior.current_source,raw_focus_contract:raw,all24_chip_role_shapes_identical:true,focus_method_imported_identifier_occurrences:0,closed_roles_requalified:21,open_chip_roles_preserved:3,current_roles:current,previous_roles:before,source_inventory:{current_uses:1958,current_source_files:531,additional_uses:308,current_source_population_sha256:discovered.source_population_sha256},new_semantic_closures:0,test_imports_are_outside_production_inventory:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
 const witnessBytes=Buffer.from(json(witness)),witnessRef={path:CHIP_FOCUS_ROLE_WITNESS,sha256:hash(witnessBytes)};
 const reviews=prior.selected_rows.map(row=>{const doc=prior.reviews.find(d=>d.path===row.source_review.path),body=JSON.parse(doc.text),old=body.reviews.filter(r=>key(r)===key(row));assert.equal(old.length,1);const original=old[0];assert.equal(original.candidate_source_sha256,prior.before_source.sha256);const facts=current.find(r=>key(r)===key(row));
  return {file:row.file,module:row.module,symbol:row.symbol,conclusion:original.conclusion,reviewer:original.reviewer,candidate_source_sha256:prior.current_source.sha256,
   decision:'The previous independently evidenced source/API judgment is retained for this exact imported or owned-replacement role. Complete import/declaration and reference-parent syntax is identical before and after the separately reviewed focus-only repair,excluding only observation line numbers. The changed focus method has no reference to these imported/owned binding names;constructor,metadata,signatures and every other member are unchanged. Fresh reference locations are recorded here;locations inside the preserved prior record belong to its original source epoch. This rebinds source identity only and adds no semantic,use,peer-floor,AOT,native or G11 closure.',
   current_role_context:facts,prior_review:{path:doc.path,sha256:doc.sha256,record_sha256:hash(json(original))},preserved_prior_review_record:original,
   independent_evidence:[...original.independent_evidence,{path:doc.path,sha256:doc.sha256},witnessRef],source_scope_only:true,actual_native_packed_or_floor_qualified:false};});
 const review={schema_version:1,line:prior.line,status:'reviewed',criteria:'Exact unchanged chip import/reference roles across approved owned focus repair;no new semantic closures.',source_parent:prior.source_parent,reviews,new_semantic_closures:0,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'},reviewBytes=Buffer.from(json(review)),reviewRef={path:CHIP_FOCUS_ROLE_REVIEW,sha256:hash(reviewBytes)};
 const selected=new Set(prior.selected_rows.map(key));let changed=0;for(const row of frozen.symbol_uses)if(selected.has(key(row))){row.source_review=reviewRef;changed++;}assert.equal(changed,21);
 const snapshot={source_parent:prior.source_parent,prior_current_source_population_sha256:candidate.current_source_population_sha256,current_source_population_sha256:discovered.source_population_sha256,current_uses:1958,current_source_files:531,symbol_use_count:308,independent_evidence:witnessRef,source_scope_only:true,actual_native_packed_or_floor_qualified:false};
 candidate.current_source_population_sha256=discovered.source_population_sha256;candidate.source_snapshot_history=[...(candidate.source_snapshot_history??[]),snapshot];
 return {line:prior.line,witness,witnessBytes,review,reviewBytes,frozen,candidate,discovered,witnessRef,reviewRef,store_paths:prior.stores.map(m=>m.path)};
}
export function inspectChipFocusRoleRequalification({root=process.cwd(),read=p=>readFileSync(join(root,p))}={}){
 const prior=chipFocusRolePrior(read),built=buildChipFocusRoleRequalification({root,read});assert.deepEqual(read(CHIP_FOCUS_ROLE_WITNESS),built.witnessBytes);assert.deepEqual(read(CHIP_FOCUS_ROLE_REVIEW),built.reviewBytes);
 const frozen=JSON.parse(read(built.store_paths[0])),candidate=JSON.parse(read(built.store_paths[1]));assert.deepEqual(frozen,built.frozen);assert.deepEqual(candidate,built.candidate);
 const f=authoredUseReviewEvidence(frozen,prior.line,read,hash),c=currentAuthoredUseAdmission({root,current:built.discovered,frozen:frozen.symbol_uses,candidate,line:prior.line,readMember:read});assert.equal(f.reviewed,1446);assert.equal(f.insufficient,0);assert.equal(c.review_evidence.reviewed,178);assert.equal(c.review_evidence.insufficient,0);assert.equal(c.source_snapshot_valid,true);assert.equal(c.inventory.open,130);assert.equal(c.ready,false);
 for(const m of prior.product_members)assert.equal(hash(read(m.path)),m.sha256,'unexpected product/reference/fixture change');
 return {schema_version:1,line:prior.line,closed_role_receipts_requalified:21,all_chip_role_shapes_preserved:24,open_chip_roles_preserved:3,frozen_reviewed:1446,frozen_insufficient:0,frozen_open:290,current_reviewed:178,current_insufficient:0,current_open:130,current_source_snapshot_valid:true,current_uses:1958,current_source_files:531,additional_uses:308,current_ready:false,original_review_documents_preserved:prior.reviews.length,product_reference_fixture_members_unchanged:prior.product_members.length,new_semantic_closures:0,actual_native_packed_or_floor_qualified:false,remaining_source87_and_history_pending:true,g11_claim:'not-passed'};
}
