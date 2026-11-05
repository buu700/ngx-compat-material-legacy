/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual isolated five-module contexts with retained CSS/modelled artifact envelopes. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createOrdinaryCardGateContext,ordinaryCardGateDescriptor,ordinaryCardGateDirectMatch,ordinaryCardGateDefaultMatch,ordinaryCardGateAssertionOk,ordinaryCardExpectedCss,ORDINARY_CARD_GATE_CASES,ORDINARY_CARD_CONTRACT} from '../scripts/sass-ordinary-card-gate.mjs';
import {compareInventory,apiCaseIds} from '../scripts/sass-api-inventory.mjs';
import {apiAssertionBody} from '../scripts/sass-seal.mjs';
const root=resolve(process.argv[2]);assert.ok(root.includes('ngx-ordinary-card-entry-'));
const read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),measured=css=>({css,css_sha256:hash(css),css_bytes:Buffer.byteLength(css)});
const packet=JSON.parse(read('compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json')),originals=JSON.parse(read('compatibility/rc/ordinary-card-public-bridge-original-cases-v1.json'));
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',branch=packet.branches[line];
const oracle=JSON.parse(read(packet.oracle.path)),catalog=JSON.parse(read(packet.catalog.path)),provenance=JSON.parse(read(packet.provenance.path)),lock=JSON.parse(read(packet.reference_lock.path));
let hook,target;const callback=p=>{if(hook){const action=hook;hook=null;action();}return p===target?Buffer.from('wrong'):read(p);};
const context=createOrdinaryCardGateContext({root,read:callback}),descriptor=ordinaryCardGateDescriptor(context),modules=new Map(descriptor.source.source_modules.map(r=>[r.path,r]));
assert.equal(modules.size,5);assert.equal(Object.hasOwn(context,'source_context'),false);
const sources=Object.values(branch.source_sets)[0].map(r=>{const c=r.root===0&&modules.get('projects/ngx-material-legacy/'+r.path);return c?{...r,sha256:c.sha256,bytes:c.bytes}:{...r};});
function model(row){
 const def=row.case_id.startsWith('mixin-css/'),spec=def?{mixin:row.mixin,variant:'default',call:row.call}:catalog.cases.find(r=>r.case_id===row.case_id);
 const program_sha256=hash("@use '__entry__' as m;\n"+(def?oracle.standard_theme:catalog.setup)+'\n'+spec.call+'\n'),css=ordinaryCardExpectedCss({caseId:row.case_id,originalCss:row.original.css});
 const original={...row.original,program_sha256,sources:structuredClone(originals.all_original_loaded_sources)},actual={...measured(css),program_sha256,sources:structuredClone(sources),line,sass_version:branch.compiler};
 const manifest={run_id:'modeled-card-'+line,source:{line,commit:'2'.repeat(40),git_tree_sha:'3'.repeat(40),content_sha256:'4'.repeat(64)},artifacts:[{id:'library',sha256:'1'.repeat(64)}]};
 const binding={run_id:manifest.run_id,source_line:line,source_commit:manifest.source.commit,source_tree:manifest.source.git_tree_sha,source_content_sha256:manifest.source.content_sha256,artifacts_sha256:hash(JSON.stringify([{id:'library',sha256:'1'.repeat(64)}]))};
 const identity={material_version:'16.2.14',material_manifest_sha256:provenance.isolated_environment.material_manifest_sha256,lock_sha256:packet.reference_lock.sha256,material_integrity:lock.packages['node_modules/@angular/material'].integrity,catalog:packet[def?'oracle':'catalog'].path,catalog_sha256:packet[def?'oracle':'catalog'].sha256,expected_source:'untouched-installed-material16',candidate_source:'packed-facade',sass_version:branch.compiler};
 const invocation='modeled-invocation',body={...spec,kind:'assertion',check_id:'sass-seal',group:'sass-api-and-values',result:'pass',exit_code:0,line,run_id:manifest.run_id,invocation_id:invocation,binding:structuredClone(binding),mutation_rejected:true,error:null,case_id:row.case_id,comparison:ORDINARY_CARD_CONTRACT,tarball_sha256:manifest.artifacts[0].sha256,identity,current_ordinary_card:structuredClone(descriptor),expected:original,actual,mutation:measured(css+'\n.wrong-nonempty-mixin { color: red; }\n')};
 if(def)Object.assign(body,{oracle:packet.oracle.path,oracle_sha256:packet.oracle.sha256,expected_sha256:original.css_sha256,expected_bytes:original.css_bytes,actual_sha256:actual.css_sha256,actual_bytes:actual.css_bytes,actual_measurement:structuredClone(actual)});
 return {context,body,active:{manifest,binding},invocation};
}
const rows=originals.cases.filter(r=>r.case_id.startsWith('mixin-css/'));assert.equal(rows.length,4);
const css=Object.fromEntries(Object.entries(oracle.members.mixins).filter(([,e])=>e.invocation.invocable).map(([name,e])=>[name,{css:'',sha256:e.invocation.css_sha256}]));
const baseline=compareInventory(oracle,oracle.members,css),cardIds=rows.map(r=>r.case_id),baselineFailures=baseline.filter(r=>r.result!=='pass').map(r=>r.case_id).sort();assert.equal(baseline.length,651);assert.deepEqual(baseline.map(r=>r.case_id),apiCaseIds(oracle));
for(const id of cardIds)assert.ok(baselineFailures.includes(id));
const models=new Map();for(const row of rows){const v=model(row);models.set(row.case_id,v);css[row.mixin]={...v.body,css:v.body.actual.css,sha256:v.body.actual.css_sha256,actual_measurement:v.body.actual};}
const current=compareInventory(oracle,oracle.members,css,{ordinaryCardContext:context});assert.equal(current.length,651);assert.deepEqual(current.map(r=>r.case_id),apiCaseIds(oracle));
assert.deepEqual(current.filter(r=>r.result!=='pass').map(r=>r.case_id).sort(),baselineFailures.filter(id=>!cardIds.includes(id)));
const emitted=[];for(const id of cardIds){const result=current.find(r=>r.case_id===id),v=models.get(id);assert.equal(result.result,'pass');const body=apiAssertionBody(result,{oracleSha256:packet.oracle.sha256,tarballSha256:v.active.manifest.artifacts[0].sha256,runId:v.active.manifest.run_id,invocationId:v.invocation,binding:v.active.binding});assert.equal(ordinaryCardGateAssertionOk({context,body,active:v.active,invocation:v.invocation}),true);emitted.push({body,active:v.active,invocation:v.invocation});}
const rejected=[];
for(const id of cardIds){const name=id.slice(10),wrong=structuredClone(css[name]);delete wrong.current_ordinary_card;assert.equal(compareInventory(oracle,oracle.members,{...css,[name]:wrong},{ordinaryCardContext:context}).find(r=>r.case_id===id).result,'fail');rejected.push('missing/'+id);}
const foreign={...css,'ripple-color':{...css['ripple-color'],current_ordinary_card:descriptor}};assert.equal(compareInventory(oracle,oracle.members,foreign,{ordinaryCardContext:context}).find(r=>r.case_id==='mixin-css/ripple-color').result,'fail');rejected.push('foreign-capsule');
const wrong=structuredClone(css['card-color']);wrong.css+='\n.extra { color: red; }';wrong.sha256=hash(wrong.css);wrong.actual_measurement={...wrong.actual_measurement,...measured(wrong.css)};wrong.mutation=measured(wrong.css+'\n.wrong-nonempty-mixin { color: red; }\n');assert.equal(compareInventory(oracle,oracle.members,{...css,'card-color':wrong},{ordinaryCardContext:context}).find(r=>r.case_id==='mixin-css/card-color').result,'fail');rejected.push('whole-css');
console.log(JSON.stringify({result:'pass',line,api_ids:651,real_card_default_routes:4,preexisting_failures_preserved:true,rejected,default_assertions:emitted,descriptor,source_population:sources.length,compiler_calls:0,actual_artifact_runs:0,g11_claim:'not-passed'}));
