/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine constructors, both orders, precise field reversions and local type ownership. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {compileRemainingIdentityGraph,remainingIdentityEntries,remainingIdentityLiteralEdits,remainingIdentityBeforeHashes,reverseRemainingIdentitySource,inspectTabPanelTypeOwnership} from '../scripts/remaining-identity-construction.mjs';
import {prepareRemainingIdentitySubjects} from '../scripts/remaining-identity-public-subjects.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(join(root,path),'utf8'),hash=b=>createHash('sha256').update(b).digest('hex');
const compiled=compileRemainingIdentityGraph({root}),loaded=prepareRemainingIdentitySubjects(root),worker=readFileSync(join(root,'tests/remaining_identity_construction_subject.mjs')),results=[];
const families=['autocomplete','menu','select','snack-bar','tab-link','tab-panel'],roles=['autocomplete','menu-panel','select','select-value','snack-live','tab-link','tab-panel'],roleFamilies=['autocomplete','menu','select','select','snack-bar','tab-link','tab-panel'];
const variants=remainingIdentityLiteralEdits.map(([path,before,after],index)=>({id:'old-'+roles[index],family:roleFamilies[index],role:roles[index],modules:compileRemainingIdentityGraph({root,readSource:p=>p===path?read(p).replace(after,before):read(p)}).modules}));
let sourceNegatives=0;for(const path of Object.keys(remainingIdentityBeforeHashes)){assert.ok(reverseRemainingIdentitySource(path,read(path)));assert.throws(()=>reverseRemainingIdentitySource(path,read(path)+'\n// foreign source byte\n'));sourceNegatives++;}for(const [path,before,after] of remainingIdentityLiteralEdits){assert.throws(()=>reverseRemainingIdentitySource(path,read(path).replace(after,before)));sourceNegatives++;}
const ownership=inspectTabPanelTypeOwnership({root});assert.equal(ownership.kind,'InterfaceDeclaration');const beforeOwnership=JSON.parse(read('compatibility/rc/remaining-identity-tab-panel-before-ownership.json'));assert.deepEqual(ownership.instance_fields,beforeOwnership.instance_fields);assert.deepEqual(ownership.public_exports,beforeOwnership.public_exports);
const base=ownership.source,pub=ownership.public_barrel,ownershipControls=[
 [base,read(base)+'\nconst unexpectedRuntimeValue=MatTabNavPanel;\n'],
 [pub,read(pub)+"\nexport type {MatTabNavPanel} from './internal/tab-nav-bar-base';\n"],
 [base,read(base).replace('export interface MatTabNavPanel {\n  id: string;','export interface MatTabNavPanel {\n  id: number;')],
 [base,read(base).replace('export interface MatTabNavPanel {\n  id: string;','export interface MatTabNavPanel {\n  extra(): void;\n  id: string;')],
];for(const [path,text] of ownershipControls){assert.notEqual(text,read(path));assert.throws(()=>inspectTabPanelTypeOwnership({root,readSource:p=>p===path?text:read(p)}));}
try{for(const model of loaded.models){
 for(const variant of [{id:'after',modules:compiled.modules},...variants])for(const module of variant.modules){const target=join(model.root,'owned',variant.id,module.path.replace(/\.ts$/,'.mjs'));mkdirSync(dirname(target),{recursive:true});writeFileSync(target,module.compiled);}
 writeFileSync(join(model.root,'worker.mjs'),worker);writeFileSync(join(model.root,'resources.json'),JSON.stringify(compiled.resources));
 const cases=[...families.flatMap(family=>['legacy-first','peer-first'].map(order=>({id:'after',family,order}))),...(model.line==='original'?[]:variants.map(v=>({id:v.id,family:v.family,order:'legacy-first',role:v.role})))];
 for(const item of cases){const entry=remainingIdentityEntries[item.family.startsWith('tab-')?'tabs':item.family],child=spawnSync(process.execPath,[join(model.root,'worker.mjs'),model.line,item.family,item.order,join(model.root,'owned',item.id,entry.replace(/\.ts$/,'.mjs'))],{cwd:model.root,encoding:'utf8',timeout:20000});assert.equal(child.status,0,child.stderr||String(child.error));assert.equal(child.stderr,'','constructor emitted diagnostics');const result=JSON.parse(child.stdout);assert.equal(result.actual_public_peer_constructors,true);assert.equal(result.actual_angular_nodes_or_native_or_packed_qualified,false);
  for(const value of result.values){const expected=model.line==='original'?value.role!=='tab-panel':item.id==='after'||value.role!==item.role;assert.equal(value.unique,expected,JSON.stringify({line:model.line,...item,value}));}results.push({...result,variant:item.id,status:'observed'});
 }
}}finally{loaded.dispose();}
const report={schema_version:1,line:JSON.parse(read('compatibility/rc/remaining-identity-worksheet.json')).line,node:process.version,compiler:compiled.compiler,producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),worker_sha256:hash(worker),compiler_helper_sha256:hash(read('scripts/remaining-identity-construction.mjs')),public_subject_loader_sha256:hash(read('scripts/remaining-identity-public-subjects.mjs')),runtime_capsule:loaded.runtime_capsule,owned_modules:compiled.modules.map(({compiled,...m})=>m),resources:compiled.resources.map(({text,...r})=>r),type_ownership:ownership,type_ownership_negative_controls:ownershipControls.length,source_requalification_negatives:sourceNegatives,results,reference_tab_panel_collision_is_preexisting:true,limits:[compiled.limits,'Genuine current target constructors use real applications with explicit element/document/renderer, focus/live/viewport and raw local resource protocols. No private ID generator replacement/import.','The original tab-panel collision is retained as reference evidence, not relabeled a new regression or hidden by changing an oracle. Opaque default IDs are isolated to fulfill documented uniqueness and required coexistence.','No Angular owned node/DOM/ARIA/factory/native/packed/runtime/compiler/RxJS-floor pass. The aggregate packed identity regression remains required.'],g11_claim:'not-passed'};
const args=process.argv.slice(2);if(args.length){assert.equal(args.length,2);assert.equal(args[0],'--report');assert.equal(existsSync(args[1]),false);writeFileSync(args[1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({line:report.line,contexts:results.length,current_positive_contexts:results.filter(r=>r.line!=='original'&&r.variant==='after').length,individual_reversion_contexts:results.filter(r=>r.variant!=='after').length,tagged_reference_contexts:12,tagged_reference_tab_panel_collision_contexts:2,source_requalification_negatives:sourceNegatives,type_ownership_negative_controls:ownershipControls.length,owned_modules:compiled.modules.length,owned_resources:compiled.resources.length,public_export_names_unchanged:true,actual_owned_nodes_or_native_or_packed_qualified:false}));
