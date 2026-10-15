/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {compileOwnedOptionIdentityModules,prepareOptionIdentitySubjects,optionIdentityEntries,optionIdentityRepairs,reverseOptionIdentitySource} from '../scripts/option-identity-construction.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),hash=b=>createHash('sha256').update(b).digest('hex');
const args=process.argv.slice(2),before=args[0]==='--before';if(before)args.shift();const stage=before?'before':'after';
const resources=['option.html','optgroup.html','option.scss','optgroup.scss'].map(name=>{const path='projects/ngx-material-legacy/legacy-core/option/'+name,raw=readFileSync(join(root,path));return {url:name,path,text:raw.toString(),sha256:hash(raw),bytes:raw.length};});
const read=path=>readFileSync(join(root,path),'utf8'),variants=before?[{id:'before',edits:new Map()}]:[{id:'after',edits:new Map()},...optionIdentityRepairs.map(([path,old,value],i)=>({id:i?'old-optgroup-id':'old-option-id',edits:new Map([[path,read(path).replace(value,old)]])})),{id:'before',edits:new Map(optionIdentityRepairs.map(([path])=>[path,reverseOptionIdentitySource(path,read(path))]))}];
const sourceControls=[];if(!before)for(const [path,old,value] of optionIdentityRepairs){assert.ok(reverseOptionIdentitySource(path,read(path)));for(const changed of [read(path)+'\n// unrelated byte\n',read(path).replace(value,old),read(path)+value]){assert.throws(()=>reverseOptionIdentitySource(path,changed));sourceControls.push(path);}if(path.endsWith('optgroup-base.ts')){assert.throws(()=>reverseOptionIdentitySource(path,read(path).replace(' * Copyright (c) 2026 Ryan Lester.\n','')));sourceControls.push(path);}}
const compilations=new Map(variants.map(v=>[v.id,compileOwnedOptionIdentityModules({root,readSource:path=>v.edits.get(path)??read(path)})])),compiled=compilations.get(variants[0].id),loaded=prepareOptionIdentitySubjects(root),worker=readFileSync(join(root,'tests/option_identity_construction_subject.mjs')),results=[];
try{for(const model of loaded.models){
 for(const variant of variants)for(const module of compilations.get(variant.id).modules){const path=join(model.root,'owned',variant.id,module.path.replace(/\.ts$/,'.mjs'));mkdirSync(dirname(path),{recursive:true});writeFileSync(path,module.compiled);}
 writeFileSync(join(model.root,'worker.mjs'),worker);writeFileSync(join(model.root,'resources.json'),JSON.stringify(resources));
 for(const variant of model.line==='original'?[variants[0]]:variants)for(const order of ['legacy-first','peer-first']){
  const child=spawnSync(process.execPath,[join(model.root,'worker.mjs'),model.line,order,variant.id,...optionIdentityEntries.map(path=>join(model.root,'owned',variant.id,path.replace(/\.ts$/,'.mjs')))],{cwd:model.root,encoding:'utf8',timeout:20000});
  assert.equal(child.status,0,child.stderr||String(child.error));assert.equal(child.stderr,'','constructor subject emitted diagnostics');const result=JSON.parse(child.stdout);
  const expected=model.line==='original'||variant.id==='after'?{option:true,group:true}:variant.id==='old-option-id'?{option:false,group:true}:variant.id==='old-optgroup-id'?{option:true,group:false}:{option:false,group:false};
  assert.equal(result.option_ids_unique,expected.option);assert.equal(result.optgroup_label_ids_unique,expected.group);
  assert.deepEqual(result.resource_requests.map(row=>row.url).sort(),model.line==='original'?[]:resources.map(r=>r.url).sort());
  assert.equal(result.explicit_option_input_preserved,true);assert.equal(result.actual_public_peer_constructors,true);results.push(result);
 }
}}finally{loaded.dispose();}
const report={schema_version:1,source_requalification_negatives:sourceControls.length,line:JSON.parse(readFileSync(join(root,'compatibility/rc/option-identity-worksheet.json'))).line,stage,node:process.version,compiler:compiled.compiler,producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),worker_sha256:hash(worker),helper_sha256:hash(readFileSync(join(root,'scripts/option-identity-construction.mjs'))),owned_resource_protocol:resources.map(({text,...m})=>m),raw_SCSS_is_not_compiled_or_rendered:true,compiled_owned_modules:compiled.modules.map(({compiled,...m})=>m),tagged_legacy_core_capsule:loaded.tagged_legacy_core_capsule,subjects:loaded.models.map(m=>({line:m.line,packages:m.subject.packages,borrowed:m.borrowed,borrowed_zone:m.borrowed_zone})),results,limits:[compiled.limits,'Actual complete owned and genuine public constructors use unchanged local HTML/raw SCSS as an explicit resource-text protocol (no Sass compilation), plus explicit PLATFORM_ID server/document/renderer/element/change detector protocols in real public applications. No real owned Angular node/template/factory, native/packed or runtime/compiler/RxJS floor claim.'],g11_claim:'not-passed'};
if(args.length){assert.equal(args.length,2);assert.equal(args[0],'--report');assert.equal(existsSync(args[1]),false);writeFileSync(args[1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({line:report.line,stage,contexts:results.length,source_requalification_negatives:sourceControls.length,owned_modules:compiled.modules.length,option_collisions:results.filter(r=>!r.option_ids_unique).length,optgroup_label_collisions:results.filter(r=>!r.optgroup_label_ids_unique).length,actual_angular_nodes_or_native_or_packed_qualified:false}));
