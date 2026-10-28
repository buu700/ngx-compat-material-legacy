/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Two whole-patch source reviews; no native, packed, floor or full Sass credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {replayThemingSection} from './upstream-theming-inspection-source-review.mjs';
import {reviewButtonTokenizationSource} from './upstream-button-tokenization-source-review.mjs';
const PREFIX='compatibility/rc/21x-c04-button-token-repairs-';
const ORIGINAL={path:PREFIX+'originals.json.gz',sha256:'e6cd6cbe4dc427eddf68991b4354b7f18b5b001c30aa88c9ca73c3384d61e80a',bytes:46584};
const CENSUS='compatibility/rc/upstream-complete-patch-census.json.gz';
const PATCHES={
 '1de6a3aa37118e4153fb995a8c8f4daecdf6d0b5':'3d64bbeb9cb7f65c9f8c7d8b3ee460795678a078ffcd07cbe06234d33b121415',
 '702ccbe01446502f43e6e7cb365a587ee7558504':'4874b274861e134e506402a41163219e02a3a673967479bc0655e4ec15d2df0b',
};
export const BUTTON_TOKEN_REPAIRS_SHAS=Object.freeze(Object.keys(PATCHES));
const TAGGED=[
 ['src/material/button/_button-theme.scss','3b55060891af05996680f8bd65a86d9408254415'],
 ['src/material/button/button.scss','b8e6dd6609b4825627a7a165de0ab9be0ec0e452'],
 ['src/material/legacy-button/_button-theme.scss','548e1b5c7334c2cc9c39e569726a4eb99ba66b20'],
 ['src/material/legacy-button/button.scss','05c24bfcd2081b00c5d063e21c964326668bc60f'],
 ['src/material/core/theming/_palette.scss','e2b5faada05cc4a2c00d3404cfb605b9d843db2b'],
 ['src/material/core/theming/_theming.scss','767268e8de79caa0cafc15c475853d7f2e125934'],
];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=(kind,raw)=>createHash('sha1').update(kind+' '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const image=readFileSync(fileURLToPath(import.meta.url));
const theme='src/material/button/_button-theme.scss',style='src/material/button/button.scss',tokens='src/material/core/tokens/m2/mdc/';
const judgments={
 [BUTTON_TOKEN_REPAIRS_SHAS[0]]:{
  [theme]:['Corrects all three raised primary/accent/warn maps from filled to protected tokens. This is a real post16 tokenization defect, not an irrelevant modern filename. The owned tagged16 raised variant already emits protected-theme colors through its original palette path; retain it and measure its actual output rather than porting private token inspection.'],
  [tokens+'_button-protected.scss']:['Restores dark disabled-label opacity0.5 while retaining light0.38 in the protected token map. The owned tagged color mixin already computes this exact dark/light ink rule and applies it to raised disabled styles. The dark theme CSS case and a dark-only opacity mutation test cover that historical contract without executing this upstream token module.'],
 },
 [BUTTON_TOKEN_REPAIRS_SHAS[1]]:{
  [theme]:[
   'Renames both new token module sources and their local aliases from button-filled/button-protected to filled-button/protected-button. These imports belong to the post16 model, while the owned finite facade retains its tagged imports and historical consumer namespaces.',
   'Updates all four unelevated default/primary/accent/warn color-map calls to the renamed filled module. Preserve the live tagged palette and disabled color behavior, not a new token API or consumer helper spelling.',
   'Updates all four raised color-map calls to the protected module alias, including the previously repaired primary/accent/warn calls. The tagged raised producer is already protected-theme, measured independently from its filled counterpart.',
   'Updates raised and unelevated density-map calls to the new aliases. Retain the original scoped density/touch-target contract and fourteen exact tagged/owned CSS cases, without adding a token producer.',
  ],
  [style]:[
   'Changes both token import sources and aliases in the modern structural stylesheet. The legacy add-on exports its separate legacy component resource; no modern structural component is added or forked.',
   'Renames the filled slots local variable and all its uses, changes the protected token calls while preserving the existing protected slots local binding, and updates untintable defaults. Every source, alias and variable use is reviewed; there is no inferred wholesale variable rename or legacy CSS port.',
  ],
  [tokens+'_button-filled.scss']:['Deletes the entire108-line old-name filled token module. Its replacement differs only in the declared token prefix; all original color, typography, density and slot functions are retained upstream. This deletion is part of the complete patch even though absent from the frozen five-path seed.'],
  [tokens+'_button-protected.scss']:['Deletes the entire107-line old-name protected token module, including the dark-opacity repair. Its replacement differs only in the declared prefix. Review the whole deleted behavior, not merely the added file or rename title; keep the independently owned tagged model.'],
  [tokens+'_filled-button.scss']:['Adds the complete108-line renamed filled module and changes its prefix to(mdc,filled-button). Exact before/after module comparison proves that prefix is its only body change. The owned historical MDC vendor already declares filled-button, and actual tagged CSS emits the corresponding custom properties.'],
  [tokens+'_protected-button.scss']:['Adds the complete107-line renamed protected module and changes its prefix to(mdc,protected-button). Exact comparison preserves all other body bytes, including dark0.5/light0.38 opacity. The owned tagged vendor already declares protected-button; prefix mutations must alter the measured CSS.'],
  'src/material/core/tokens/tests/test-validate-tokens.scss':[
   'Updates both test module paths and aliases to match the renamed token files. The upstream test program is reviewed as data and is not installed or executed.',
   'Updates filled/protected component names and slot calls while retaining their paired MDC light-theme references. This validates the new upstream naming model; tagged16 CSS remains the owned oracle and no golden or public facade binding is changed.',
  ],
 },
};
function verifyBlob(member,path,mode,obj){
 assert.equal(member.path,path);assert.equal(member.blob,obj);assert.equal(typeof member.body,'string');assert.equal(Buffer.byteLength(member.body),member.bytes);assert.equal(hash(member.body),member.sha256);
 if(mode==='000000'){assert.equal(obj,'0'.repeat(40));assert.equal(member.absent,true);assert.equal(member.body,'');}
 else{assert.equal(mode,'100644');assert.equal(member.absent,undefined);assert.equal(gitHash('blob',member.body),obj);}
}
/** Authenticate tree paths and absence from actual Git tree bytes, without Git execution. */
function originalTrees(original){
 const trees=new Map(),used=new Set();
 for(const row of original.authenticated_tree_objects){
  assert.equal(trees.has(row.tree),false);const raw=Buffer.from(row.base64,'base64');assert.equal(raw.toString('base64'),row.base64);assert.equal(raw.length,row.bytes);assert.equal(hash(raw),row.sha256);assert.equal(gitHash('tree',raw),row.tree);trees.set(row.tree,raw);
 }
 function member(tree,path){
  const parts=path.split('/');assert.ok(parts.every(part=>part&&part!=='.'&&part!=='..'&&!part.includes('\\')));
  for(const [index,part]of parts.entries()){
   const raw=trees.get(tree);assert.ok(raw,'missing authenticated tree '+tree);used.add(tree);let cursor=0;const names=new Map();
   while(cursor<raw.length){const space=raw.indexOf(32,cursor),zero=raw.indexOf(0,space);assert.ok(space>cursor&&zero>space&&zero+21<=raw.length);const mode=raw.subarray(cursor,space).toString(),name=raw.subarray(space+1,zero).toString(),obj=raw.subarray(zero+1,zero+21).toString('hex');assert.equal(names.has(name),false);names.set(name,{mode,obj});cursor=zero+21;}
   assert.equal(cursor,raw.length);if(!names.has(part))return null;const row=names.get(part);if(index===parts.length-1)return row;assert.equal(row.mode,'40000');tree=row.obj;
  }
 }
 return {member,assertComplete:()=>assert.equal(used.size,trees.size),count:trees.size};
}
export function verifyButtonTokenRepairsOriginals(original,census){
 assert.equal(census.commits.length,1697);assert.equal(new Set(census.commits.map(row=>row.sha)).size,1697);
 assert.equal(original.line,'21.x');assert.equal(original.original_file_occurrences,9);assert.equal(original.original_hunks,14);assert.equal(original.complete_deleted_modules,2);
 assert.deepEqual(original.actual_status_occurrences,{M:5,D:2,A:2});assert.deepEqual(original.reviews.map(row=>row.sha),BUTTON_TOKEN_REPAIRS_SHAS);
 assert.equal(original.upstream_code_executed,false);assert.equal(original.canonical_decisions_changed,0);assert.equal(original.Git_reads_only,true);assert.equal(original.project_or_shared_cache_git_mutations,0);assert.equal(original.network_or_credentials_used,false);
 assert.deepEqual(original.worksheet_at_capture.selected_sha_ids,BUTTON_TOKEN_REPAIRS_SHAS);const worksheet=original.inputs.find(ref=>ref.path===PREFIX+'source-worksheet.json');assert.ok(worksheet);const body=JSON.stringify(original.worksheet_at_capture,null,2)+'\n';assert.equal(hash(body),worksheet.sha256);assert.equal(Buffer.byteLength(body),worksheet.bytes);
 assert.equal(original.tagged_reference.tag,'16.2.14');assert.equal(original.tagged_reference.commit,'df60e733c60e572ba538f6ad0ceff3e63e527b53');assert.deepEqual(original.tagged_reference.members.map(m=>[m.path,m.blob]),TAGGED);
 for(const m of original.tagged_reference.members)verifyBlob(m,m.path,'100644',m.blob);
 const trees=originalTrees(original),reviews=[];let files=0,hunks=0,present=0,additions=0,deletions=0;
 for(const source of original.reviews){
  const row=census.commits.find(row=>row.sha===source.sha);assert.ok(row);assert.equal(gitHash('commit',source.raw_commit),source.sha);assert.equal(source.raw_commit,row.raw_commit);assert.equal(gitHash('commit',source.parent_raw_commit),source.parent);assert.deepEqual(row.parents,[source.parent]);assert.equal(/^tree ([a-f0-9]{40})\n/.exec(source.raw_commit)?.[1],row.tree);assert.equal(source.after_tree,row.tree);assert.equal(/^tree ([a-f0-9]{40})\n/.exec(source.parent_raw_commit)?.[1],source.before_tree);
  assert.equal(hash(source.diff),PATCHES[source.sha]);assert.equal(source.diff_sha256,PATCHES[source.sha]);assert.deepEqual(source.frozen_seed_paths,row.ledger_comparison.listed_paths);assert.deepEqual(source.sections.map(s=>s.path),row.complete_changed_files.map(m=>m.path));assert.equal(source.sections.map(s=>s.patch).join(''),source.diff);
  const whole=[];for(const [index,section]of source.sections.entries()){
   const member=row.complete_changed_files[index];assert.equal(section.status,member.status);assert.ok(['M','A','D'].includes(member.status));
   for(const side of ['before','after']){const mode=member[side+'_mode'],obj=member[side+'_blob'];assert.equal(section[side+'_mode'],mode);verifyBlob(section[side],section.path,mode,obj);assert.deepEqual(trees.member(source[side+'_tree'],section.path),mode==='000000'?null:{mode,obj});if(mode!=='000000')present++;}
   assert.equal(hash(section.patch),section.patch_sha256);const replayed=replayThemingSection(section),comments=judgments[source.sha][section.path];assert.equal(replayed.length,comments.length);files++;hunks+=replayed.length;if(section.status==='A')additions++;if(section.status==='D')deletions++;
   whole.push(...replayed.map((hunk,i)=>({path:section.path,index:hunk.index,header:hunk.header,sha256:hunk.sha256,technical_judgment:comments[i]})));
  }
  reviews.push({sha:source.sha,diff_sha256:PATCHES[source.sha],complete_original_paths:source.sections.map(s=>s.path),frozen_seed_paths:source.frozen_seed_paths,whole_original_hunk_reviews:whole,source_review_complete:true,proposed_final_disposition:'do-not-adopt',affected_branches:['21.x'],review_depth:'individual-compatibility',canonical_disposition_applied:false});
 }
 trees.assertComplete();assert.equal(trees.count,34);assert.equal(files,9);assert.equal(hunks,14);assert.equal(present,14);assert.equal(additions,2);assert.equal(deletions,2);
 const first=original.reviews[0],rename=original.reviews[1],section=(review,path)=>review.sections.find(s=>s.path===path);
 const prior=section(first,theme).before.body,after=section(first,theme).after.body;
 for(const name of ['primary','accent','warn']){assert.ok(prior.includes('$'+name+'-color-tokens: tokens-mdc-button-filled.get-color-tokens('));assert.ok(after.includes('$'+name+'-color-tokens: tokens-mdc-button-protected.get-color-tokens('));}
 assert.ok(section(first,tokens+'_button-protected.scss').before.body.includes('disabled-label-text-color: rgba($on-surface, 0.38)'));assert.ok(section(first,tokens+'_button-protected.scss').after.body.includes('disabled-label-text-color: rgba($on-surface, if($is-dark, 0.5, 0.38))'));
 for(const [oldName,newName]of [['button-filled','filled-button'],['button-protected','protected-button']]){const old=section(rename,tokens+'_'+oldName+'.scss'),added=section(rename,tokens+'_'+newName+'.scss');assert.equal(old.status,'D');assert.equal(added.status,'A');assert.equal(old.before.body.replace('$prefix: (mdc, '+oldName+');','$prefix: (mdc, '+newName+');'),added.after.body);}
 const omitted=rename.sections.filter(s=>!rename.frozen_seed_paths.includes(s.path));assert.equal(omitted.length,2);assert.ok(omitted.every(s=>s.status==='D'));
 return {reviews,original_files:files,original_hunks:hunks,present_original_blobs:present,tagged_blobs:6,exact_patch_replays:9,added_modules:additions,deleted_modules:deletions,authenticated_tree_objects:trees.count,authenticated_absent_members:4,frozen_seed_omitted_deletions:2,exact_prefix_only_module_moves:2,raised_color_producer_repairs:3,dark_disabled_opacity_repairs:1};
}
export function reviewButtonTokenRepairsSource({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 const shared=reviewButtonTokenizationSource({root,read}),bound=new Map(shared.bound.map(ref=>[ref.path,ref]));
 function member(ref){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed button token-repair source '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;}
 member({path:'scripts/upstream-button-token-repairs-source-review.mjs',sha256:hash(image),bytes:image.length});const original=JSON.parse(gunzipSync(member(ORIGINAL)));for(const ref of [original.producer,...original.inputs])member(ref);
 const facts=verifyButtonTokenRepairsOriginals(original,JSON.parse(gunzipSync(read(CENSUS)))),base='projects/ngx-material-legacy/styles/';
 const current=path=>read(base+path).toString();const owned=current('button/_button-theme.scss');
 assert.ok(owned.includes('@mixin _raised-button-variant($foreground, $background) {\n  @include mdc-button-protected-theme.theme(('));assert.ok(owned.includes('$disabled-ink-color: rgba($on-surface, if($is-dark, 0.5, 0.38));'));assert.equal(/tokens-mdc-|get-color-tokens|core\/tokens/.test(owned),false);
 for(const name of ['filled-button','protected-button'])assert.ok(current('vendor/mdc/button/_button-'+(name==='filled-button'?'filled':'protected')+'-theme.scss').includes("$custom-property-prefix: '"+name+"';"));
 const measurement=shared.report.button_measurement;assert.equal(measurement.case_count,14);const dark=measurement.cases.find(row=>row.mixin==='button-theme'&&row.case_id.endsWith('/custom-dark-theme'));assert.ok(dark);assert.ok(dark.expected.css.includes('rgba(255, 255, 255, 0.5)'));
 for(const row of measurement.cases.filter(row=>row.mixin==='button-color'||row.mixin==='button-theme')){for(const name of ['filled-button','protected-button'])assert.ok(row.actual.css.includes('--mdc-'+name+'-container-color'));for(const name of ['button-filled','button-protected'])assert.equal(row.actual.css.includes('--mdc-'+name+'-'),false);}
 const assertCurrent=()=>{shared.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late button token-repair source change '+ref.path);assert.equal(raw.length,ref.bytes);}};assertCurrent();
 return {report:{schema_version:1,line:'21.x',role:'Two individually reviewed whole-patch source proposals; independent historical button CSS contract',...facts,originals:ORIGINAL,current_source_bindings:structuredClone([...bound.values()]),shared_button_source_bindings:shared.bound.length,
  tagged_sass_reference:shared.report.tagged_sass_reference,reference_identity:shared.report.reference_identity,argument_catalog:shared.report.argument_catalog,compiler:shared.report.compiler,compiler_inputs:shared.report.compiler_inputs,button_measurement:measurement,
  original_sass_graph_members:71,original_locked_archive_packages:17,modern_theme_module_source_rewrites:7,legacy_theme_module_source_rewrites:5,legacy_structural_module_source_rewrites:4,namespace_or_mixin_or_selector_rewrites:0,owned_raised_producer_already_protected:true,owned_dark_disabled_opacity_already_historical:true,owned_MDC_prefixes_already_correct:true,
  absent_owned_token_or_modern_component_paths:structuredClone(shared.report.absent_owned_token_or_modern_component_paths),fresh_bounded_sass_compiler_execution:true,tagged_reference_sass_executed:true,upstream_post16_sass_or_typescript_tests_or_workflows_executed:false,package_install_or_javascript_runtime_execution:false,full_sass_gate_executed:false,canonical_decisions_changed:0,product_changes:0,consumer_HTML_CSS_SCSS_changes:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'},bound:structuredClone([...bound.values()]),assertCurrent};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3);const scope=reviewButtonTokenRepairsSource();scope.assertCurrent();writeFileSync(process.argv[2],JSON.stringify(scope.report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:'pass',original_files:9,original_hunks:14,button_cases:scope.report.button_measurement.case_count,source_bindings:scope.bound.length,canonical_decisions_changed:0}));
}
