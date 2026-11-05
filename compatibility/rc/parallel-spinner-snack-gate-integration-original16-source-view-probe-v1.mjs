/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exactly ten real original-source-view compiles; no installed-environment claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,lstatSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
const root='/home/parallels/.codex/worktrees/codex-closeout-21/ngx-compat-material-legacy';
const prefix='compatibility/rc/parallel-spinner-snack-gate-integration-',hash=b=>createHash('sha256').update(b).digest('hex');
const helperSha=process.argv[2];assert.match(helperSha,/^[0-9a-f]{64}$/);
function pinned(base,ref){const raw=readFileSync(join(base,ref.path));assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);return raw;}
const preflightRef={path:prefix+'original16-source-view-preflight-v1.json',sha256:'98c994432701ae3db74507e1a9460c1a72dd13d6779420a26fa88d9dbdfc9269',bytes:58405};
const preflight=JSON.parse(pinned(root,preflightRef)),referenceRoot=realpathSync(preflight.referenceRoot),referenceEntry=realpathSync(preflight.referenceEntry);
const packetRef={path:'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json',sha256:'fd78f8c7f6e072fb7393c61aef782ccdf3a1c8d009227d08b29921ea2809e0a8',bytes:237068};
const packet=JSON.parse(pinned(root,packetRef)),sourceMap=JSON.parse(pinned(root,preflight.source_map)),lock=JSON.parse(pinned(root,preflight.lock)),provenance=JSON.parse(pinned(root,preflight.provenance));
assert.equal(existsSync(join(referenceRoot,'../package.json')),false);assert.equal(existsSync(join(referenceRoot,'../package-lock.json')),false);
const expectedSources=Object.values(sourceMap.loaded_source_sets);assert.equal(expectedSources.length,1);assert.deepEqual(preflight.loaded_members,expectedSources[0]);
function assertSources(){for(const row of preflight.loaded_members){let cursor=referenceRoot;for(const part of row.path.split('/')){cursor=join(cursor,part);assert.equal(lstatSync(cursor).isSymbolicLink(),false);}assert.equal(lstatSync(cursor).isFile(),true);const bytes=readFileSync(cursor);assert.equal(hash(bytes),row.sha256,row.path);assert.equal(bytes.length,row.bytes,row.path);}for(const key of ['material_manifest','cdk_manifest','index']){const ref=preflight[key],raw=readFileSync(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}}
assertSources();
const reports=[],rootmap={'21.x':root,main:'/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy'};
let allCompilerCalls=0;
for(const[line,currentRoot]of Object.entries(rootmap)){
 const outPath=join(root,prefix+'original16-source-view-'+(line==='21.x'?'21':'main')+'-v1.json');assert.equal(existsSync(outPath),false);
 const helperPath='scripts/sass-spinner-snack-gate-integration.mjs';assert.equal(hash(readFileSync(join(currentRoot,helperPath))),helperSha);
 const helper=await import(pathToFileURL(join(currentRoot,helperPath)).href),branch=packet.branches[line];
 for(const ref of packet.compiler_inputs)pinned(currentRoot,ref);
 const compiler=createRequire(join(currentRoot,'package.json'))('sass');assert.equal(compiler.info,branch.compiler);
 let calls=0;const compileRecords=[];
 const sass={info:compiler.info,compileString(program,options){assertSources();calls++;allCompilerCalls++;assert.ok(calls<=5&&allCompilerCalls<=10);const start=performance.now(),result=compiler.compileString(program,options);compileRecords.push({physical_program_sha256:hash(program),elapsed_ms:performance.now()-start});return result;}};
 const identity={material_version:'16.2.14',material_manifest_sha256:provenance.isolated_environment.material_manifest_sha256,lock_sha256:packet.reference_lock.sha256,material_integrity:lock.packages['node_modules/@angular/material'].integrity,expected_source:'untouched-installed-material16',candidate_source:'packed-facade',sass_version:compiler.info};
 // Invoke the actual reference measurement routine with an authenticated source view.
 // Its eventual runFunctionContracts installed-environment transport is not exercised.
 const references=helper.measureSpinnerSnackDefaultReferences({sass,referenceEntry,referenceRoot,identity});assert.equal(calls,5);assertSources();
 assert.deepEqual(Object.keys(references),helper.SPINNER_SNACK_DEFAULT_CASES);
 for(const value of Object.values(references))assert.deepEqual(value.expected.sources,preflight.loaded_members);
 let hook=null,getters=0;const read=path=>{if(hook){const fn=hook;hook=null;fn();}return readFileSync(join(currentRoot,path));};
 const context=helper.createSpinnerSnackGateContext({root:currentRoot,read}),descriptor=helper.spinnerSnackGateDescriptor(context),observations=JSON.parse(pinned(currentRoot,branch.observation));
 const css={};for(const id of helper.SPINNER_SNACK_DEFAULT_CASES){const row=observations.rows.find(r=>r.case_id===id);css[id.slice(10)]={css:row.current.css,sha256:row.current.css_sha256,actual_measurement:{css:row.current.css,css_sha256:row.current.css_sha256,css_bytes:row.current.css_bytes,program_sha256:row.current.logical_program_sha256??row.program_sha256??references[id].expected.program_sha256,line,sass_version:compiler.info,sources:structuredClone(Object.values(branch.source_sets)[0])},current_spinner_snack_bridge:structuredClone(descriptor)};}
 // These current observations and their packed envelopes are reused/modeled, not compiled here.
 const attached=helper.attachSpinnerSnackDefaultReferences({context,css,references}),controls=[];
 for(const id of helper.SPINNER_SNACK_DEFAULT_CASES){assert.ok(helper.spinnerSnackGateDefaultMatch({context,caseId:id,got:attached[id.slice(10)]}),id);controls.push('genuine original source measurement attached to reused current observation '+id);}
 for(const field of ['context','css','references']){const args={context,css,references};hook=()=>{args[field]={foreign:true};};assert.throws(()=>helper.attachSpinnerSnackDefaultReferences(args));controls.push('late attachment outer '+field);}
 for(const kind of ['nested-current','nested-original','new-symbol','getter']){
  const args={context,css:structuredClone(css),references};let restore=null;
  hook=()=>{if(kind==='nested-current')args.css['progress-spinner-color'].css+='foreign';else if(kind==='nested-original'){const expected=references['mixin-css/progress-spinner-color'].expected,old=expected.css;expected.css+='foreign';restore=()=>{expected.css=old;};}else if(kind==='new-symbol')args[Symbol('foreign')]=true;else Object.defineProperty(args,'references',{get(){getters++;return references;},enumerable:true,configurable:true});};
  assert.throws(()=>helper.attachSpinnerSnackDefaultReferences(args));if(restore)restore();controls.push('late attachment '+kind);
 }
 assert.equal(getters,0);context.assertCurrent();assertSources();
 const report={schema_version:1,role:'Authenticated original16 source-view execution of the actual five-default routine',line,helper:{path:helperPath,sha256:helperSha},preflight:preflightRef,packet:packetRef,source_map:preflight.source_map,compiler_inputs:packet.compiler_inputs,compiler_info:compiler.info,source_environment:{referenceRoot,referenceEntry,all_286_inputs_authenticated:true,package_and_lock_installed:false,installer_executed:false,contract_identity_markers:identity,identity_markers_are_not_an_installed_environment_claim:true},actual_original_source_compiles:calls,compileRecords,references,attachment_controls:controls,getter_calls:getters,current_css_recompiled:false,current_packed_envelopes_modeled:true,runFunctionContracts_installed_referenceObserver_transport_executed:false,actual_packed_assertions:0,native_or_gate_acceptance:false};
 writeFileSync(outPath,JSON.stringify(report,null,2)+'\n');reports.push({line,path:relative(root,outPath),sha256:hash(readFileSync(outPath)),bytes:readFileSync(outPath).length,actual_compiles:calls,attachment_controls:controls.length});
}
assert.equal(allCompilerCalls,10);console.log(JSON.stringify({reports,actual_compiles:allCompilerCalls,installed_transport_executed:false}));
