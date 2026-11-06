/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual isolated six-source contexts with retained CSS/modelled artifact envelopes. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createOrdinaryCardGateContext,ordinaryCardGateDescriptor,ordinaryCardGateDirectMatch,ordinaryCardGateDefaultMatch,ordinaryCardGateAssertionOk,ordinaryCardExpectedCss,ORDINARY_CARD_GATE_CASES,ORDINARY_CARD_CONTRACT} from '../scripts/sass-ordinary-card-gate.mjs';
const root=resolve(process.argv[2]);assert.ok(root.includes('ngx-ordinary-card-gate-'));
const read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),measured=css=>({css,css_sha256:hash(css),css_bytes:Buffer.byteLength(css)});
const packet=JSON.parse(read('compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json')),originals=JSON.parse(read('compatibility/rc/ordinary-card-public-bridge-original-cases-v1.json'));
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',branch=packet.branches[line];
const oracle=JSON.parse(read(packet.oracle.path)),catalog=JSON.parse(read(packet.catalog.path)),provenance=JSON.parse(read(packet.provenance.path)),lock=JSON.parse(read(packet.reference_lock.path));
let hook,target;const callback=p=>{if(hook){const action=hook;hook=null;action();}return p===target?Buffer.from('wrong'):read(p);};
const context=createOrdinaryCardGateContext({root,read:callback}),descriptor=ordinaryCardGateDescriptor(context),modules=new Map(descriptor.source.source_modules.map(r=>[r.path,r]));
assert.equal(modules.size,6);assert.equal(Object.hasOwn(context,'source_context'),false);
const sources=Object.values(branch.source_sets)[0].map(r=>{const c=r.root===0&&modules.get('projects/ngx-material-legacy/'+r.path);return c?{...r,sha256:c.sha256,bytes:c.bytes}:{...r};});
const retained=JSON.parse(readFileSync(new URL('../compatibility/rc/ordinary-card-public-bridge-qualification-v2.json',import.meta.url))).results.find(r=>r.line===line).actual.css;
const checks=[],rejects=[],vectors=[];
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
const rows=originals.cases.filter(r=>ORDINARY_CARD_GATE_CASES.includes(r.case_id));assert.equal(rows.length,12);
for(const row of rows){
 const v=model(row);assert.equal(ordinaryCardGateAssertionOk(v),true,row.case_id);checks.push('actual-six-source/modeled-envelope/'+row.case_id);
 const index=originals.cases.indexOf(row),begin='/*! ORDINARY-CARD-BEGIN '+index+' */',end='/*! ORDINARY-CARD-END '+index+' */';assert.equal(retained.split(begin).length,2);assert.equal(retained.split(end).length,2);const segment=retained.slice(retained.indexOf(begin)+begin.length,retained.indexOf(end));assert.equal(segment,v.body.actual.css?originals.framing.leading+v.body.actual.css+originals.framing.trailing:row.raw_segment);checks.push('retained-CSS/'+row.case_id);
 vectors.push({case_id:row.case_id,css:v.body.actual.css});
 if(row.case_id.startsWith('mixin-css/')){const b=v.body,got={...b,css:b.actual.css,sha256:b.actual.css_sha256,actual_measurement:b.actual};assert.equal(ordinaryCardGateDefaultMatch({context,caseId:row.case_id,got}),true);checks.push('default-capsule/'+row.case_id);}
}
for(const row of originals.cases.filter(r=>!ORDINARY_CARD_GATE_CASES.includes(r.case_id))){assert.throws(()=>ordinaryCardExpectedCss({caseId:row.case_id,originalCss:row.original.css}));rejects.push('diagnostic/'+row.case_id);}
const fresh=()=>model(rows[0]);
const bad={line:v=>v.body.line='foreign',compiler:v=>v.body.actual.sass_version='foreign',call:v=>v.body.call+=' ',program:v=>v.body.actual.program_sha256='0'.repeat(64),source:v=>v.body.actual.sources[0].sha256='0'.repeat(64),empty_source:v=>v.body.actual.sources=[],original_source:v=>v.body.expected.sources.pop(),descriptor:v=>v.body.current_ordinary_card.source.source_modules.pop(),run:v=>v.body.run_id+='wrong',invocation:v=>v.body.invocation_id+='wrong',library:v=>v.body.tarball_sha256='0'.repeat(64),active_artifacts:v=>v.active.manifest.artifacts[0].sha256='0'.repeat(64),mutation:v=>delete v.body.mutation,extra_css:v=>{v.body.actual={...v.body.actual,...measured(v.body.actual.css+'\n.extra { color: red; }')};v.body.actual_measurement=v.body.actual;v.body.actual_sha256=v.body.actual.css_sha256;v.body.actual_bytes=v.body.actual.css_bytes;v.body.mutation=measured(v.body.actual.css+'\n.wrong-nonempty-mixin { color: red; }\n');}};
for(const [id,change]of Object.entries(bad)){const v=fresh();change(v);assert.equal(ordinaryCardGateAssertionOk(v),false,id);rejects.push('cold/'+id);}
assert.equal(ordinaryCardGateAssertionOk({...fresh(),context:{line,assertCurrent(){}}}),false);rejects.push('fake-context');
const density=model(rows.find(r=>r.dimension==='density'));density.body.actual.sources=[];density.body.actual_measurement=density.body.actual;assert.equal(ordinaryCardGateAssertionOk(density),false);rejects.push('empty-density-source');
let getters=0;
for(const [id,change]of [['late-value',v=>v.body.call+=' '],['late-outer-body',v=>v.body=structuredClone(v.body)],['late-getter',v=>Object.defineProperty(v.body.actual,'css',{enumerable:true,get(){getters++;return '';}})]]){const v=fresh();hook=()=>change(v);assert.equal(ordinaryCardGateAssertionOk(v),false,id);rejects.push(id);}
assert.equal(getters,0);
const publicBound=context.bound;publicBound.length=0;const publicDescriptor=ordinaryCardGateDescriptor(context);publicDescriptor.source.source_modules.length=0;assert.equal(ordinaryCardGateAssertionOk(fresh()),true);checks.push('public-metadata-is-copied');
target='scripts/sass-ordinary-card-gate.mjs';assert.throws(()=>context.assertCurrent());rejects.push('late-provided-tool-bytes');target=null;context.assertCurrent();
const report={result:'pass',line,checks,rejected:rejects,positive:checks.length,rejections:rejects.length,descriptor,retained_css_vectors:vectors,source_population:sources.length,actual_constructor:true,actual_source_members:5,modeled_packed_envelopes:12,fresh_compiles:0,actual_artifact_runs:0,workspace_card_applied:false,g11_claim:'not-passed'};console.log(JSON.stringify(report));
