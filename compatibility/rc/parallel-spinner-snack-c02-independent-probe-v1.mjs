/** Bounded existing-observation replay and modeled metadata controls, no compiler. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import * as s from '../../scripts/sass-spinner-snack-bridge-contract.mjs';
const primary='/home/parallels/.codex/worktrees/codex-closeout-21/ngx-compat-material-legacy';
const roots={'21.x':primary,main:'/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy'};
const hash=b=>createHash('sha256').update(b).digest('hex'),measured=css=>({css,css_sha256:hash(css),css_bytes:Buffer.byteLength(css)});
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const report={schema_version:1,role:'Independent direct comparator controls; existing CSS only, modeled artifact envelopes only',lines:[],fresh_compiles:0,actual_packed_assertions:0};
function independentExpected(row){
 const lines=row.historical.css.split('\n'),out=[],type={};let container;
 for(const line of lines){
  out.push(line);let m;
  if((m=/^  --mdc-circular-progress-active-indicator-color: (.+);$/.exec(line)))out.push('  --mat-progress-spinner-active-indicator-color: '+m[1]+';');
  if((m=/^  --mdc-snackbar-container-color: (.+);$/.exec(line)))container=m[1];
  if((m=/^  --mdc-snackbar-supporting-text-color: (.+);$/.exec(line)))out.push('  --mat-snack-bar-container-color: '+container+';','  --mat-snack-bar-supporting-text-color: '+m[1]+';');
  if((m=/^  --mdc-snackbar-supporting-text-(font|line-height|size|weight): (.+);$/.exec(line))){type[m[1]]=m[2];if(m[1]==='weight')for(const name of ['font','line-height','size','weight'])out.push('  --mat-snack-bar-supporting-text-'+name+': '+type[name]+';');}
 }
 return out.join('\n');
}
for(const[line,root]of Object.entries(roots)){
 const read=path=>readFileSync(join(root,path)),packet=JSON.parse(read('compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json')),branch=packet.branches[line];
 const obs=JSON.parse(read(branch.observation.path)),catalog=JSON.parse(read(packet.catalog.path)),provenance=JSON.parse(read(packet.provenance.path)),lock=JSON.parse(read(packet.reference_lock.path));
 const checks=[],caseResults=[];const check=(name,fn)=>{fn();checks.push(name);};
 assert.deepEqual(obs.rows.map(r=>r.case_id),s.SPINNER_SNACK_BRIDGE_CASES);assert.equal(obs.rows.length,15);
 for(const row of obs.rows){
  const independent=independentExpected(row),args={caseId:row.case_id,line,original:row.historical,actual:row.current};
  check('independent exact insertion '+row.case_id,()=>{assert.equal(independent,row.current.css);assert.equal(s.spinnerSnackBridgeExpectedCss(args),independent);assert.ok(s.spinnerSnackBridgeResultsMatch(args));});
  const alias=row.current.css.split('\n').find(l=>/^  --mat-(progress-spinner-active-indicator|snack-bar-(container|supporting-text))/.test(l));assert.ok(alias);
  const cssMutants={alias_missing:row.current.css.replace(alias+'\n',''),alias_duplicate:row.current.css.replace(alias,alias+'\n'+alias),alias_value:row.current.css.replace(alias,alias.replace(': ',': wrong-')),alias_first:row.current.css.replace(alias+'\n','').replace('{\n','{\n'+alias+'\n'),old_value:row.current.css.replace(/(--mdc-[^:]+: )[^;]+/,'$1wrong'),old_selector:row.current.css.replace('.mat-mdc-','.other-'),trailing:row.current.css+'\n',new_rule:row.current.css+'\n.x { color: red; }',unrelated:row.current.css.replace('{\n','{\n  color: red;\n')};
  for(const[name,css]of Object.entries(cssMutants))check('CSS '+name+' '+row.case_id,()=>assert.equal(s.spinnerSnackBridgeResultsMatch({...args,actual:measured(css)}),false));
  for(const[name,mutate]of Object.entries({old_hash:a=>a.original.css_sha256='0'.repeat(64),old_bytes:a=>a.original.css_bytes++,old_css:a=>a.original=measured(a.original.css+'\n'),actual_hash:a=>a.actual.css_sha256='0'.repeat(64),actual_bytes:a=>a.actual.css_bytes++,wrong_id:a=>a.caseId+='/other',wrong_line:a=>a.line='unknown'})){const value=structuredClone(args);mutate(value);check('measurement '+name+' '+row.case_id,()=>assert.equal(s.spinnerSnackBridgeResultsMatch(value),false));}
  caseResults.push({case_id:row.case_id,expected_sha256:hash(independent),added_declarations:row.added_declarations});
 }
 const excluded=['mixin-css/all-component-colors','mixin-css/all-component-themes','mixin-css/all-component-typographies','mixin-argument/all-component-colors/custom-full-theme','mixin-argument/all-component-colors/raw-color-config','mixin-argument/all-component-themes/custom-full-theme','mixin-argument/all-component-themes/custom-dark-theme','mixin-argument/all-component-typographies/custom-full-theme','mixin-argument/all-component-typographies/raw-typography-config','mixin-css/progress-spinner-density'];
 for(const caseId of excluded)check('excluded '+caseId,()=>assert.equal(s.spinnerSnackBridgeExpectedCss({caseId,line,original:obs.rows[0].historical}),null));
 function model(row){
  const spec=branch.cases.find(r=>r.case_id===row.case_id),manifest={run_id:'independent-modeled-'+line,source:{line,commit:'2'.repeat(40),git_tree_sha:'3'.repeat(40),content_sha256:'4'.repeat(64)},artifacts:[{id:'library',sha256:'1'.repeat(64)}]};
  const binding={run_id:manifest.run_id,source_line:line,source_commit:manifest.source.commit,source_tree:manifest.source.git_tree_sha,source_content_sha256:manifest.source.content_sha256,artifacts_sha256:hash(canonical(manifest.artifacts))},invocation='independent-modeled-invocation',active={manifest,binding};
  const def=row.case_id.startsWith('mixin-css/'),original={...measured(row.historical.css),program_sha256:spec.program_sha256,sources:[{root:0,...catalog.original_entry_identity}]},actual={...measured(row.current.css),program_sha256:spec.program_sha256,sources:structuredClone(branch.source_sets[spec.source_set_sha256])};
  const body={kind:'assertion',check_id:'sass-seal',group:'sass-api-and-values',result:'pass',exit_code:0,line,run_id:manifest.run_id,invocation_id:invocation,binding:structuredClone(binding),mutation_rejected:true,error:null,case_id:row.case_id,mixin:row.mixin,variant:row.variant,call:row.call,comparison:s.SPINNER_SNACK_BRIDGE_CONTRACT,tarball_sha256:manifest.artifacts[0].sha256,
   identity:{material_version:'16.2.14',material_manifest_sha256:provenance.isolated_environment.material_manifest_sha256,lock_sha256:packet.reference_lock.sha256,material_integrity:lock.packages['node_modules/@angular/material'].integrity,catalog:packet[def?'oracle':'catalog'].path,catalog_sha256:packet[def?'oracle':'catalog'].sha256,expected_source:'untouched-installed-material16',candidate_source:'packed-facade',sass_version:branch.compiler},
   current_spinner_snack_bridge:{contract:s.SPINNER_SNACK_BRIDGE_CONTRACT,source_line:line,source_subject:packet.source_subject,source_packet:packet.source_packet,source_modules:branch.source_modules,compiler_inputs:packet.compiler_inputs},expected:original,actual,mutation:measured(actual.css+'\n.wrong-nonempty-mixin { color: red; }\n')};
  return {body,active,invocation};
 }
 let target=null,hook=null;const callback=path=>{if(hook){const fn=hook;hook=null;fn();}return path===target?Buffer.from('fault'):read(path);};
 const context=s.createSpinnerSnackBridgeContract({root,read:callback});assert.equal(context.line,line);assert.equal(context.source_scope_only,true);assert.equal(context.gate_or_artifact_admission_granted,false);
 for(const row of obs.rows)check('modeled envelope '+row.case_id,()=>assert.ok(s.spinnerSnackBridgeAssertionOk({context,...model(row)})));
 const original=model(obs.rows[0]),foreign=line==='21.x'?'main':'21.x';
 const metadataMutants={known_line:v=>v.body.line=foreign,active_line:v=>v.active.manifest.source.line=foreign,id:v=>v.body.case_id=excluded[0],call:v=>v.body.call+=' ',mixin:v=>v.body.mixin='snack-bar-theme',variant:v=>v.body.variant='foreign',before_program:v=>v.body.expected.program_sha256='0'.repeat(64),after_program:v=>v.body.actual.program_sha256='0'.repeat(64),expected_entry:v=>v.body.expected.sources[0].sha256='0'.repeat(64),loaded_source:v=>v.body.actual.sources[0].sha256='0'.repeat(64),missing_loaded:v=>v.body.actual.sources.pop(),duplicate_loaded:v=>v.body.actual.sources.push(v.body.actual.sources[0]),foreign_loaded:v=>v.body.actual.sources[0].root=2,compiler:v=>v.body.current_spinner_snack_bridge.compiler_inputs[0].sha256='0'.repeat(64),source_modules:v=>v.body.current_spinner_snack_bridge.source_modules[0].bytes++,source_subject:v=>v.body.current_spinner_snack_bridge.source_subject.bytes++,source_packet:v=>v.body.current_spinner_snack_bridge.source_packet.sha256='0'.repeat(64),oracle:v=>v.body.identity.catalog_sha256='0'.repeat(64),lock:v=>v.body.identity.lock_sha256='0'.repeat(64),original_kind:v=>v.body.identity.expected_source='candidate',run:v=>v.body.run_id+='wrong',invocation:v=>v.body.invocation_id+='wrong',artifact:v=>v.body.tarball_sha256='0'.repeat(64),binding:v=>v.body.binding.source_tree='0'.repeat(40),active_source:v=>v.active.manifest.source.content_sha256='0'.repeat(64),active_artifact:v=>v.active.manifest.artifacts[0].sha256='0'.repeat(64),two_libraries:v=>{v.active.manifest.artifacts.push(v.active.manifest.artifacts[0]);v.active.binding.artifacts_sha256=hash(canonical(v.active.manifest.artifacts));v.body.binding=structuredClone(v.active.binding);},missing_mutant:v=>delete v.body.mutation,comparison:v=>v.body.comparison='historical-exact',alias_authority:v=>v.body.current_peer_alias={approved:true}};
 for(const[name,mutate]of Object.entries(metadataMutants)){const value=structuredClone(original);mutate(value);check('metadata '+name,()=>assert.equal(s.spinnerSnackBridgeAssertionOk({context,...value}),false));}
 check('spoofed context rejects',()=>assert.equal(s.spinnerSnackBridgeAssertionOk({context:{...context,assertCurrent(){}},...original}),false));
 const paths=[packet.oracle.path,packet.catalog.path,packet.compiler_inputs[2].path,...branch.source_modules.map(r=>r.path),packet.source_subject.path,packet.source_packet.path];
 for(const path of paths)check('cold callback '+path,()=>assert.throws(()=>s.createSpinnerSnackBridgeContract({root,read:p=>p===path?Buffer.from('fault'):read(p)})));
 for(const path of paths){target=path;check('late callback '+path,()=>assert.equal(s.spinnerSnackBridgeAssertionOk({context,...original}),false));target=null;context.assertCurrent();}
 let getters=0;
 const descriptorMutants={case_accessor:v=>Object.defineProperty(v.body,'case_id',{get(){getters++;return original.body.case_id;},enumerable:true,configurable:true}),css_accessor:v=>Object.defineProperty(v.body.actual,'css',{get(){getters++;return original.body.actual.css;},enumerable:true,configurable:true}),sources_accessor:v=>Object.defineProperty(v.body.actual,'sources',{get(){getters++;return original.body.actual.sources;},enumerable:true,configurable:true}),live_field:v=>v.body.call='foreign',live_active:v=>v.active.binding.source_tree='0'.repeat(40),live_library:v=>v.active.manifest.artifacts[0].sha256='0'.repeat(64),added_getter:v=>Object.defineProperty(v.body,'new_input',{get(){getters++;return 'foreign';},enumerable:true,configurable:true}),added_non_enumerable:v=>Object.defineProperty(v.body.actual,'new_input',{value:'foreign',enumerable:false,configurable:true})};
 for(const[name,mutate]of Object.entries(descriptorMutants)){const value=structuredClone(original);hook=()=>mutate(value);check('late descriptor '+name,()=>assert.equal(s.spinnerSnackBridgeAssertionOk({context,...value}),false));}
 assert.equal(getters,0);check('authentic restored after all faults',()=>assert.ok(s.spinnerSnackBridgeAssertionOk({context,...original})));
 // These positives document the parent boundary rather than claim packed authority.
 const extraOriginal=structuredClone(original);extraOriginal.body.expected.sources.push({root:0,path:'foreign.scss',sha256:'0'.repeat(64),bytes:1});
 check('documented original closure remains parent responsibility',()=>assert.ok(s.spinnerSnackBridgeAssertionOk({context,...extraOriginal})));
 report.lines.push({line,checks_passed:checks.length,checks,case_results:caseResults,bound_sources:context.bound.length,late_descriptor_controls:Object.keys(descriptorMutants).length,getter_calls:getters,modeled_envelope_positives:15,parent_original_closure_boundary_observed:true});
}
writeFileSync(join(primary,'compatibility/rc/parallel-spinner-snack-c02-independent-js-v1.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.lines.map(r=>({line:r.line,checks:r.checks_passed,bound:r.bound_sources,getters:r.getter_calls}))));
