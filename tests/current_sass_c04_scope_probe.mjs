/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite metadata models on an actual candidate fixture; no compiler or C04 tool constructor. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createCurrentSassSource} from '../scripts/current-sass-source.mjs';
import {inspectOwnedMaterialBoundary} from '../scripts/measure-sass-inspection-scope.mjs';
import {assertCurrentSassInspectionScopeSuccessor, captureCurrentSassMetadata} from '../scripts/current-sass-inspection-scope.mjs';

const root=resolve(process.argv[2]);assert.ok(root.includes('ngx-current-sass-source-test-'));
const hash=v=>createHash('sha256').update(v).digest('hex'),read=p=>readFileSync(join(root,p));
const source=createCurrentSassSource({root});
const historical=JSON.parse(gunzipSync(read('compatibility/rc/upstream-sass-inspection-current-scope.json.gz'))).actual;
const rows=new Map(source.transitions.map(r=>[r.path,r]));
const noticeBytes=source.line==='main'?read('compatibility/rc/sass-wrapper-notice-successor.json'):null;
if(noticeBytes)assert.equal(hash(noticeBytes),'5be99f3d9441057f9007868ffc7f1c9efe7d7b766b56fa0e640ba80e4cff7493');
const notices=new Map(noticeBytes?JSON.parse(noticeBytes).subjects.map(row=>[row.path,row]):[]);
const qualify=(ref,prefix='')=>{const row=rows.get(prefix+ref.path),notice=notices.get(prefix+ref.path);
 if(row)return {...ref,sha256:row.current.sha256,bytes:row.current.bytes};
 if(notice){assert.ok([notice.before.sha256,notice.after.sha256].includes(ref.sha256));return {...ref,sha256:notice.after.sha256,bytes:notice.after.bytes};}
 return structuredClone(ref);};
const census=historical.owned_scss_population.map(r=>qualify(r));
const bridgePath='projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss';
assert.equal(historical.boundaries.filter(r=>r.path===bridgePath).length,1);
assert.equal(source.transitions.filter(r=>r.path===bridgePath).length,1);
const changed=source.transitions.map(r=>inspectOwnedMaterialBoundary(r.path,read(r.path)));
assert.equal(changed.length,6);assert.equal(changed.filter(r=>r.path!==bridgePath).length,5);
const boundaries=[...structuredClone(historical.boundaries).map(r=>r.path===bridgePath?changed.find(row=>row.path===bridgePath):r),
 ...changed.filter(r=>r.path!==bridgePath)].sort((a,b)=>a.path.localeCompare(b.path));
const mixins=[...historical.public_override_mixins,'progress-spinner-overrides','snack-bar-overrides','checkbox-overrides','button-overrides','card-overrides'].sort();
const candidate=structuredClone(historical.candidate),peer=structuredClone(historical.current);
candidate.program=candidate.program.replace('owned-material16-inspection-scope','projects/ngx-material-legacy');candidate.program_sha256=hash(candidate.program);
candidate.loaded_sources=candidate.loaded_sources.map(r=>r.root===0?qualify(r,'projects/ngx-material-legacy/'):r);
peer.program=peer.program.slice(0,peer.program.indexOf("@debug 'override/"))+mixins.map(n=>`@debug 'override/${n}/#{meta.mixin-exists('${n}',peer)}';`).join('\n');peer.program_sha256=hash(peer.program);
peer.messages=[...historical.inspection_names.map(n=>'inspection/'+n+'/true'),...mixins.map(n=>'override/'+n+'/true')];
const current={schema_version:1,line:source.line,result:'pass',role:'Five-module current compiler visibility only; historical receipts remain unchanged',
 owned_scss_population:census,owned_population_sha256:hash(JSON.stringify(census)),boundaries,public_override_mixins:mixins,
 candidate,current:peer,inspection_names:historical.inspection_names,current_source:source.descriptor,compiler:historical.sass,compile_calls:2,
 historical_physical_constructor_executed:false,css_or_artifact_admission_granted:false,
 producer:{path:'scripts/current-sass-inspection-scope.mjs',sha256:hash(read('scripts/current-sass-inspection-scope.mjs'))},g11_claim:'not-passed'};
const checks=[],check=(name,operation)=>{operation();checks.push(name);};
check('exact independently assembled five-module scope model',()=>assert.equal(assertCurrentSassInspectionScopeSuccessor({root,historical,current}).current_boundaries,9));
const mutants={
 old_boundary_count:v=>v.boundaries.splice(4),old_override_count:v=>v.public_override_mixins.pop(),
 historical_bridge_afterimage:v=>v.boundaries.find(r=>r.path===bridgePath).sha256=historical.boundaries.find(r=>r.path===bridgePath).sha256,
 unknown_material_import:v=>v.boundaries.find(r=>r.path===bridgePath).peer_url='@angular/material/private',
 widened_mixin_roster:v=>v.public_override_mixins.push('unowned-overrides'),
 historical_owned_hash:v=>v.owned_scss_population.find(r=>r.path.includes('/checkbox/_checkbox-theme')).sha256='0'.repeat(64),
 unrelated_owned_hash:v=>v.owned_scss_population.find(r=>r.path.includes('/legacy-checkbox/')).sha256='0'.repeat(64),
 candidate_program:v=>v.candidate.program+=' ',candidate_program_hash:v=>v.candidate.program_sha256='0'.repeat(64),
 peer_program:v=>v.current.program+=' ',candidate_exports:v=>v.candidate.functions.pop(),peer_exports:v=>v.current.mixins.pop(),
 candidate_loaded:v=>v.candidate.loaded_sources[0].sha256='0'.repeat(64),peer_loaded:v=>v.current.loaded_sources[0].sha256='0'.repeat(64),
 descriptor:v=>v.current_source.source_modules.pop(),compiler:v=>v.compiler='foreign',CSS:v=>v.candidate.css_bytes=1,
 old_constructor:v=>v.historical_physical_constructor_executed=true,artifact_claim:v=>v.css_or_artifact_admission_granted=true,
 extra:v=>v.approved=true,
};
for(const[name,mutate]of Object.entries(mutants)){const value=structuredClone(current);mutate(value);check('reject '+name,()=>assert.throws(()=>assertCurrentSassInspectionScopeSuccessor({root,historical,current:value})));}
if(source.line==='main'){
 check('value-identical raw historical key order remains irrelevant',()=>assert.equal(assertCurrentSassInspectionScopeSuccessor({root,historical:Object.fromEntries(Object.entries(historical).reverse()),current}).independently_qualified_notice_prefixes,7));
 const noticeOnly=(ref,prefix='')=>{const n=notices.get(prefix+ref.path);return n?{...ref,sha256:n.after.sha256,bytes:n.after.bytes}:ref;};
 const old=structuredClone(historical);old.owned_scss_population=old.owned_scss_population.map(r=>noticeOnly(r));old.owned_population_sha256=hash(JSON.stringify(old.owned_scss_population));old.candidate.loaded_sources=old.candidate.loaded_sources.map(r=>r.root===0?noticeOnly(r,'projects/ngx-material-legacy/'):r);
 check('exact maintained notice-qualified historical form',()=>assert.equal(assertCurrentSassInspectionScopeSuccessor({root,historical:old,current}).independently_qualified_notice_prefixes,7));
}
check('historical receipt metadata cannot change',()=>{const old=structuredClone(historical);old.full_sass_gate_executed=true;assert.throws(()=>assertCurrentSassInspectionScopeSuccessor({root,historical:old,current}));});
let getters=0;const getter=structuredClone(current);Object.defineProperty(getter.current_source,'source_packet',{get(){getters++;return source.descriptor.source_packet;},enumerable:true});
check('descriptor getter rejected without execution',()=>assert.throws(()=>assertCurrentSassInspectionScopeSuccessor({root,historical,current:getter})));
check('symbol rejected',()=>{const value=structuredClone(current);value[Symbol('extra')]=true;assert.throws(()=>assertCurrentSassInspectionScopeSuccessor({root,historical,current:value}));});
check('proxy rejected without traps',()=>assert.throws(()=>captureCurrentSassMetadata(new Proxy({}, {ownKeys(){getters++;return [];}}))));
check('array subclass rejected',()=>{class Foreign extends Array{}assert.throws(()=>captureCurrentSassMetadata(new Foreign()));});
check('data __proto__ cannot change clone prototype',()=>{const value=JSON.parse('{"__proto__":{"x":1}}'),copy=captureCurrentSassMetadata(value);assert.equal(Object.getPrototypeOf(copy),Object.prototype);assert.ok(Object.hasOwn(copy,'__proto__'));});
check('no metadata getters',()=>assert.equal(getters,0));
console.log(JSON.stringify({line:source.line,checks,checks_passed:checks.length,owned_rows:409,boundaries:9,public_mixins:21,historical_functions:25,
 modeled_measurement_only:true,fresh_compiles:0,old_physical_constructor_executed:false,full_C04_tool_constructor_executed:false,
 full_C04_tool_constructor_pending:'parent finite current tool manifest is not finalized',getter_calls:getters}));
