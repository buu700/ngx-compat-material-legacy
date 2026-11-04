/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Cold/late source and metadata controls; no fresh compiler or source edits. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {currentSpinnerSnackBridgeSourceSubject} from './parallel-spinner-snack-public-bridge-integration-source-subject.mjs';
assert.equal(process.versions.node,'24.21.0');assert.equal(process.argv.length,4);
const root=resolve(process.argv[2]),output=resolve(process.argv[3]);
const PREFIX='compatibility/rc/parallel-spinner-snack-public-bridge-integration-',SELF=PREFIX+'source-subject-probe.mjs';
const raw=path=>readFileSync(join(root,path)),hash=b=>createHash('sha256').update(b).digest('hex');
assert.ok(raw(SELF).equals(readFileSync(fileURLToPath(import.meta.url))));
const packet=JSON.parse(raw(PREFIX+'source-inputs.json')),line=JSON.parse(raw('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',subject=packet.branches[line];
const before=new Map(subject.modules.map(m=>{const bytes=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',subject.before_commit+':'+m.path],{cwd:root,env:{PATH:process.env.PATH,LANG:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'}});assert.equal(hash(bytes),m.before.sha256);return [m.path,bytes];}));
let late=null,action=null;const read=path=>{if(action){const f=action;action=null;f(path);}const actual=raw(path);return path===late?Buffer.concat([actual,Buffer.from('\n')]):actual;};
const current=currentSpinnerSnackBridgeSourceSubject({root,read}),bound=structuredClone(current.bound),rejected=[],positive=[];
for(const m of subject.modules){
 for(const [role,metadata]of [['before',m.before],['current',m.current]])for(const sized of [false,true]){
  const incoming={path:m.path,sha256:metadata.sha256,...(sized?{bytes:metadata.bytes}:{})};
  assert.deepEqual(current.qualify(incoming),{path:m.path,sha256:m.current.sha256,...(sized?{bytes:m.current.bytes}:{})});positive.push('qualify/'+m.family+'/'+role+'/'+(sized?'sized':'unsized'));
 }
 assert.equal(current.assertHistoricalSource(m.path,before.get(m.path)).exact_historical_comparison,true);positive.push('historical-comparison/'+m.family);
 for(const [id,expected]of [['current-bytes',raw(m.path)],['changed-before',Buffer.concat([before.get(m.path),Buffer.from('\n')])]]){assert.throws(()=>current.assertHistoricalSource(m.path,expected),undefined,id);rejected.push('historical/'+m.family+'/'+id);}
 for(const [id,changes]of [['unknown-hash',{sha256:'0'.repeat(64)}],['wrong-before-size',{bytes:m.before.bytes+1}],['wrong-size-type',{bytes:String(m.before.bytes)}]]){assert.throws(()=>current.qualify({path:m.path,sha256:m.before.sha256,bytes:m.before.bytes,...changes}),undefined,id);rejected.push('reference/'+m.family+'/'+id);}
 assert.equal(current.qualify({path:m.path+'/unknown',sha256:m.before.sha256,bytes:m.before.bytes}),null);positive.push('unknown-path-does-not-qualify/'+m.family);
}
assert.throws(()=>current.assertHistoricalSource('projects/ngx-material-legacy/_index.scss',''),/unknown historical/);rejected.push('historical/unknown-path');
for(const field of ['path','sha256','bytes']){
 let invoked=0;const m=subject.modules[0],incoming={path:m.path,sha256:m.before.sha256,bytes:m.before.bytes};Object.defineProperty(incoming,field,{get(){invoked++;return field==='path'?m.path:field==='sha256'?m.before.sha256:m.before.bytes;},configurable:true});
 assert.throws(()=>current.qualify(incoming),/data propert/);assert.equal(invoked,0);rejected.push('reference/initial-accessor-'+field);
}
const coldPaths=[PREFIX+'source-subject.mjs',PREFIX+'source-inputs.json',...subject.modules.map(m=>m.path),
 'projects/ngx-material-legacy/_index.scss','projects/ngx-material-legacy/styles/core/theming/_theming.scss','projects/ngx-material-legacy/styles/core/theming/_palette.scss','projects/ngx-material-legacy/styles/core/typography/_typography.scss',
 'projects/ngx-material-legacy/styles/core/tokens/m2/mdc/_circular-progress.scss','projects/ngx-material-legacy/styles/core/tokens/m2/mdc/_snack-bar.scss','projects/ngx-material-legacy/styles/core/tokens/m2/mat/_snack-bar.scss',
 'projects/ngx-material-legacy/styles/legacy-progress-spinner/_progress-spinner-theme.scss','projects/ngx-material-legacy/styles/legacy-snack-bar/_snack-bar-theme.scss',
 'node_modules/@angular/material/_index.scss','node_modules/@angular/material/progress-spinner/_progress-spinner-theme.scss','node_modules/@angular/material/snack-bar/_snack-bar-theme.scss',
 'node_modules/@angular/material/fesm2022/progress-spinner.mjs','node_modules/@angular/material/fesm2022/snack-bar.mjs',
 'node_modules/sass/package.json','node_modules/sass/sass.node.js','node_modules/sass/sass.dart.js',
 'node_modules/@angular/material/package.json','node_modules/@angular/cdk/package.json','node_modules/@angular/core/package.json',
 subject.semantic_receipt.path,'compatibility/rc/oracles/material-16.2.14-sass-api.json','fixtures/sass/mixin-argument-contracts.json'];
for(const path of coldPaths){assert.ok(bound.some(r=>r.path===path),path);assert.throws(()=>currentSpinnerSnackBridgeSourceSubject({root,read:p=>p===path?Buffer.concat([raw(p),Buffer.from('\n')]):raw(p)}),undefined,path);rejected.push('cold/callback-'+path);}
for(const m of subject.modules){assert.throws(()=>currentSpinnerSnackBridgeSourceSubject({root,read:p=>p===m.path?Buffer.from(before.get(m.path)):raw(p)}),/nonphysical/);rejected.push('cold/historical-product-callback/'+m.family);}
const crossRoot=root.includes('codex-closeout-21')?root.replace('codex-closeout-21','codex-closeout-main'):root.replace('codex-closeout-main','codex-closeout-21');
assert.notEqual(crossRoot,root);assert.throws(()=>currentSpinnerSnackBridgeSourceSubject({root,read:p=>readFileSync(join(crossRoot,p))}),/nonphysical/);rejected.push('cold/cross-root-callback');
for(const path of coldPaths){late=path;assert.throws(()=>current.assertCurrent(),undefined,path);assert.throws(()=>current.qualify({path:subject.modules[0].path,sha256:subject.modules[0].before.sha256,bytes:subject.modules[0].before.bytes}),undefined,path);assert.throws(()=>current.assertHistoricalSource(subject.modules[0].path,before.get(subject.modules[0].path)),undefined,path);rejected.push('late/three-public-routes/'+path);late=null;}
let getters=0;
const faults=[
 ['path',r=>r.path='foreign.scss'],['hash',r=>r.sha256='0'.repeat(64)],['size',r=>r.bytes++],
 ['delete-size',r=>delete r.bytes],['add-absent-size',r=>r.bytes=subject.modules[0].before.bytes],
 ['size-accessor-mutates-checked-path',r=>Object.defineProperty(r,'bytes',{configurable:true,get(){getters++;r.path='foreign.scss';return subject.modules[0].before.bytes;}})],
 ['path-accessor',r=>Object.defineProperty(r,'path',{configurable:true,get(){getters++;return subject.modules[0].path;}})],
 ['hash-accessor',r=>Object.defineProperty(r,'sha256',{configurable:true,get(){getters++;return subject.modules[0].before.sha256;}})],
];
for(const [id,mutate]of faults){const m=subject.modules[0],incoming={path:m.path,sha256:m.before.sha256,...(id==='add-absent-size'?{}:{bytes:m.before.bytes})};action=()=>mutate(incoming);assert.throws(()=>current.qualify(incoming),undefined,id);assert.equal(action,null);assert.equal(getters,0);rejected.push('live-reference/'+id);}
current.bound[0].path='foreign.scss';current.bound[0].sha256='0'.repeat(64);current.transitions[0].before.sha256='0'.repeat(64);current.transitions[0].current.sha256='0'.repeat(64);current.semantic_receipt.sha256='0'.repeat(64);
current.assertCurrent();const first=subject.modules[0];assert.equal(current.qualify({path:first.path,sha256:first.before.sha256}).sha256,first.current.sha256);positive.push('returned-metadata-mutation-cannot-change-private-guards');
for(const name of ['read','raw','metadataRead','beforeRead','preimages','historicalSource'])assert.equal(Object.hasOwn(current,name),false,name);assert.equal(current.historical_source_bytes_exposed,false);positive.push('no-before-product-reader-exposed');
const fresh=currentSpinnerSnackBridgeSourceSubject({root});fresh.assertCurrent();positive.push('cold-default-physical-reader-and-restored-authentic-reference');
assert.equal(new Set(rejected).size,rejected.length);assert.equal(getters,0);
const report={schema_version:1,line,result:'source-subject-qualified;canonical-integration-pending',node:process.versions.node,positive,rejected,rejection_count:rejected.length,cold_callback_controls:coldPaths.length+3,late_routes_per_path:3,late_paths:coldPaths.length,live_reference_descriptor_controls:faults.length,accessor_getter_invocations:getters,source_refs:subject.modules.map(m=>({path:m.path,before:m.before,current:m.current})),before_git_commit:subject.before_commit,source_input_count:bound.length,compiled_source_input_count:fresh.compiled_source_inputs,unchanged_owned_sass_before_inputs:fresh.unchanged_owned_sass_authenticated_against_before_commit,all_bound_inputs:bound,source_packet:{path:PREFIX+'source-inputs.json',sha256:hash(raw(PREFIX+'source-inputs.json'))},producer:{path:SELF,sha256:hash(raw(SELF))},subject:{path:PREFIX+'source-subject.mjs',sha256:hash(raw(PREFIX+'source-subject.mjs'))},cached_independent_Sass_emission_receipt_validated:true,prior_focused_compiler_emission_executed:true,fresh_sass_compilation_in_this_probe:false,actual_physical_product_or_dependency_mutations_executed:false,shared_readers_verifiers_goldens_exceptions_or_registry_edited:false,canonical_admissions_changed:0,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line,result:report.result,positive:positive.length,rejected:rejected.length,bound:bound.length,getter_invocations:getters,fresh_compiler_execution:false}));
