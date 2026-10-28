/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Two complete original reviews; proposals only, with no canonical admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {inspectOwnedMaterialBoundary} from './measure-sass-inspection-scope.mjs';

const PREFIX='compatibility/rc/21x-c04-theming-inspection-';
const ORIGINAL={path:PREFIX+'originals.json.gz',sha256:'a7e73ad848ad03ad6d4ecf6434c4d10acd95fa1ec3c74e44ad0f74354be5d018'};
const CENSUS={path:'compatibility/rc/upstream-complete-patch-census.json.gz',sha256:'806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'};
const SCOPE={path:'compatibility/rc/upstream-sass-inspection-current-scope.json.gz',sha256:'b0a8f0d0d2ce8cb41943a0585ccdcc25fd6bb0d30c9339f80501ef86c65726f4'};
const PATCHES=Object.freeze({
 a7dbf08148467ce7b2f132eba32f9517e39e336f:'9ec928921c615a0e24cba91977d1c9107f28f43a55d6cde7624e2da4d2437f93',
 b6e50c631b8f8131f494d57b0b806777da8d4efd:'826acc540b82cce67fe5e5d6a76865198997e512a354535ffb2fbe2f78a80667',
});
export const THEMING_INSPECTION_SHAS=Object.freeze(Object.keys(PATCHES));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=(kind,raw)=>createHash('sha1').update(kind+' '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const image=readFileSync(fileURLToPath(import.meta.url));
const taggedBlobs=['53d2b2f165ff2f5813b6030aa685909b7e51bb28','e2b5faada05cc4a2c00d3404cfb605b9d843db2b','767268e8de79caa0cafc15c475853d7f2e125934','5daff39e7c045ba4b4f9bbaf4ba5761d8aca4ca4'];
const strip=raw=>raw.toString().replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
const decisions={
 'src/material/_index.scss':[
  'Adds an explicitly private, in-development theme-version inspection export. The owned facade preserves the tagged25-function surface and does not expose or call this private API; adding it would expand the historical contract.',
 ],
 'src/material/core/theming/tests/BUILD.bazel':[
  'Reorganizes the upstream Bazel test source roster. This add-on owns its test/tooling graph; the complete old mixin test is authenticated as an unchanged relocation, and no production Sass behavior is supplied by this build-list edit.',
  'Adds the experimental Material Sass package as upstream test data for the new mixed M2/M3 inspection suite. The add-on does not inherit upstream Bazel automation or experimental theme construction APIs.',
 ],
 'src/material/core/theming/tests/theming-api.spec.ts':[
  'Deletes the old test pathname only. Its287-line body is byte-identical to the newly added mixin test, so no historical mixin assertion is removed by the whole upstream patch; this is not a reason to drop owned legacy Sass tests.',
 ],
 'src/material/core/theming/tests/theming-inspection-api.spec.ts':[
  'Adds M2/M3 fixtures that call the newly private theme-version getter and expect versions0/1. The legacy facade owns an M2 model and its original function map, not the experimental M3 model or private version getter. Those new APIs remain absent while mixed-peer coexistence remains required.',
 ],
 'src/material/core/theming/tests/theming-mixin-api.spec.ts':[
  'Adds the old mixin suite under a new name with the exact same Git blob. Duplication warnings, direct historical color-map overrides and density scoping assertions are unchanged; the add-on keeps its independently owned tests and tagged oracles.',
 ],
 'src/material-experimental/theming/_config-validation.scss':[
  'Introduces recursive error-path rewriting and an M3 palette-shape validator that calls private Material validation helpers. The owned M2 facade imports neither this experimental module nor these private helpers; its public peer calls remain finite override mixins.',
  'Changes experimental theme-map diagnostic text and routes nested color/typography/density errors through the new path rewriter. This does not define the historical M2 primary/accent/warn map contract, whose owned implementation and exports remain unchanged.',
  'Validates experimental light/dark theme type and primary/secondary/tertiary M3 palettes including neutral-variant keys. Historical M2 palettes use numbered hues and contrast maps; importing the new rules would change accepted legacy consumer maps.',
  'Changes experimental brand/plain family and weight-key diagnostics. The owned historical typography constructors, level names and consumer namespace bindings are separate and are not replaced with this M3 validation surface.',
  'Adds experimental density.scale enumeration and diagnostics. Historical M2 density configuration remains owned; this change is not adopted or used to narrow accepted consumer maps. The literal upstream list is preserved as source evidence, not executed or silently corrected.',
 ],
 'src/material-experimental/theming/_definition.scss':[
  'Parenthesizes the experimental M3 plain-family fallback list. That constructor is not exported or called by the owned M2 facade. The tagged historical typography defaults are retained rather than mirroring a modern theme constructor.',
 ],
 'src/material-experimental/theming/_m3-palettes.scss':[
  'Adds tone100 to the yellow M3 neutral-variant map. The owned Material16 palette model has distinct M2 hue/contrast maps; no M3 palette is copied into or substituted for a consumer legacy palette.',
 ],
 'src/material/core/style/_validation.scss':[
  'Adds validate-required-values to support experimental M3 palette-shape checks. The owned facade neither forwards this helper nor calls it, and all direct Material calls are authenticated public override mixins. No private helper dependency or new legacy validation rule is introduced.',
 ],
 'src/material/core/theming/tests/theming-definition-api.spec.ts':[
  'Adds303 lines of experimental theme construction/default/token/error tests, including internal M3 storage, typography families, density and invalid palette checks. The add-on does not implement that experimental constructor or internal token map; its Material16 model and native-M3 non-goal are preserved.',
 ],
};

function blob(value,path,absent){
 assert.equal(value.path,path);assert.equal(typeof value.body,'string');
 assert.equal(Buffer.byteLength(value.body),value.bytes);assert.equal(hash(value.body),value.sha256);
 if(absent){assert.equal(value.blob,'0'.repeat(40));assert.equal(value.absent,true);assert.equal(value.body,'');}
 else{assert.equal(value.absent,undefined);assert.equal(gitHash('blob',value.body),value.blob);}
}

/** Reconstruct M/A/D after-images with exact positions and no patch fuzz. */
export function replayThemingSection(section){
 const before=section.before.body?section.before.body.split('\n'):[];
 if(before.length)assert.equal(before.pop(),'');
 const starts=[...section.patch.matchAll(/^@@ .*$/gm)],output=[],hunks=[];let cursor=0;
 assert.ok(section.patch.startsWith(`diff --git a/${section.path} b/${section.path}\n`));
 assert.equal(starts.length,section.hunks.length);
 for(const [index,start]of starts.entries()){
  const text=section.patch.slice(start.index,starts[index+1]?.index??section.patch.length),lines=text.split('\n');assert.equal(lines.pop(),'');
  const header=lines.shift(),range=/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?: .*)?$/.exec(header);assert.ok(range);
  const oldCount=Number(range[2]??1),newCount=Number(range[4]??1);
  const oldStart=Number(range[1])-(oldCount?1:0),newStart=Number(range[3])-(newCount?1:0);
  assert.ok(oldStart>=cursor&&oldStart<=before.length);output.push(...before.slice(cursor,oldStart));cursor=oldStart;
  assert.equal(output.length,newStart);let removed=0,added=0;
  for(const line of lines){assert.ok([' ','-','+'].includes(line[0]));
   if(line[0]!=='+'){assert.equal(before[cursor++],line.slice(1));removed++;}
   if(line[0]!=='-'){output.push(line.slice(1));added++;}}
  assert.equal(removed,oldCount);assert.equal(added,newCount);hunks.push({index,header,text,sha256:hash(text)});
 }
 output.push(...before.slice(cursor));assert.equal(output.join('\n')+(output.length?'\n':''),section.after.body);
 assert.deepEqual(hunks,section.hunks);return hunks;
}

/** Pure original-data authentication, independent of current compiler receipts. */
export function verifyThemingOriginalData(original,census){
 assert.equal(census.commits.length,1697);assert.equal(new Set(census.commits.map(row=>row.sha)).size,1697);
 assert.equal(original.line,'21.x');assert.equal(original.original_file_occurrences,11);assert.equal(original.original_hunks,16);
 assert.deepEqual(original.actual_status_occurrences,{M:7,D:1,A:3});
 assert.deepEqual(original.reviews.map(row=>row.sha),THEMING_INSPECTION_SHAS);
 assert.equal(original.canonical_decisions_changed,0);assert.equal(original.upstream_code_executed,false);
 const reviews=[];let files=0,hunks=0,blobs=0;
 for(const source of original.reviews){
  const row=census.commits.find(item=>item.sha===source.sha);assert.ok(row);
  assert.equal(gitHash('commit',source.raw_commit),source.sha);assert.equal(source.raw_commit,row.raw_commit);
  assert.deepEqual(row.parents,[source.parent]);assert.equal(hash(source.diff),PATCHES[source.sha]);assert.equal(source.diff_sha256,PATCHES[source.sha]);
  assert.deepEqual(source.sections.map(s=>s.path),row.complete_changed_files.map(s=>s.path));
  assert.deepEqual(source.frozen_seed_paths,row.ledger_comparison.listed_paths);
  assert.equal(source.sections.map(s=>s.patch).join(''),source.diff);
  const whole=[];
  for(const [index,section]of source.sections.entries()){
   const member=row.complete_changed_files[index];assert.equal(section.status,member.status);
   for(const side of ['before','after']){
    assert.equal(section[side+'_mode'],member[side+'_mode']);assert.equal(section[side].blob,member[side+'_blob']);
    blob(section[side],section.path,member[side+'_mode']==='000000');if(member[side+'_mode']!=='000000')blobs++;
   }
   assert.equal(hash(section.patch),section.patch_sha256);const replayed=replayThemingSection(section);files++;hunks+=replayed.length;
   const judgments=decisions[section.path];assert.ok(judgments);
   // BUILD.bazel has two distinct upstream versions; the later patch only adds its test.
   const chosen=source.sha===THEMING_INSPECTION_SHAS[1]&&section.path.endsWith('BUILD.bazel')?['Registers the new experimental M3 theme-definition test alongside the existing inspection and mixin suites. It changes the upstream test graph only; the add-on retains its own legacy Sass tests and does not inherit experimental theme APIs or Bazel test automation.']:judgments;
   assert.equal(chosen.length,replayed.length);
   whole.push(...replayed.map((hunk,i)=>({path:section.path,index:hunk.index,header:hunk.header,sha256:hunk.sha256,technical_judgment:chosen[i]})));
  }
  reviews.push({sha:source.sha,diff_sha256:PATCHES[source.sha],complete_original_paths:source.sections.map(s=>s.path),frozen_seed_paths:source.frozen_seed_paths,whole_original_hunk_reviews:whole,
   source_review_complete:true,proposed_final_disposition:'do-not-adopt',affected_branches:['21.x'],review_depth:'individual-compatibility',canonical_disposition_applied:false});
 }
 assert.equal(files,11);assert.equal(hunks,16);assert.equal(blobs,18);
 const first=original.reviews[0],deleted=first.sections.find(s=>s.status==='D'),moved=first.sections.find(s=>s.path.endsWith('/theming-mixin-api.spec.ts'));
 assert.equal(deleted.before.blob,moved.after.blob);assert.equal(deleted.before.body,moved.after.body);
 assert.equal(original.tagged_reference.tag,'16.2.14');assert.equal(original.tagged_reference.commit,'df60e733c60e572ba538f6ad0ceff3e63e527b53');
 assert.deepEqual(original.tagged_reference.members.map(m=>m.path),['src/material/_index.scss','src/material/core/theming/_palette.scss','src/material/core/theming/_theming.scss','src/material/core/typography/_typography.scss']);
 for(const [index,member]of original.tagged_reference.members.entries()){blob(member,member.path,false);assert.equal(member.blob,taggedBlobs[index]);}
 assert.equal(/private-get-theme-version|validate-required-values/.test(original.tagged_reference.members[0].body),false);
 return {reviews,original_files:files,original_hunks:hunks,present_original_blobs:blobs,tagged_blobs:4,exact_patch_replays:11,byte_identical_test_relocations:1};
}

export function inspectOwnedThemingMember(path,raw){
 const text=strip(raw);
 assert.equal(/\b(?:private-)?(?:validate-required-values|validate-theme-config|validate-color-config|define-theme)\s*\(/.test(text),false,'post16 construction/validation in owned source '+path);
 if(path==='projects/ngx-material-legacy/_index.scss'){
  for(const match of text.matchAll(/@forward\s+(['"])([^'"]+)\1/g))assert.ok(match[2].startsWith('./styles/'),'non-owned facade forward');
 }
 return inspectOwnedMaterialBoundary(path,raw);
}

export function reviewThemingInspectionSource({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 root=realpathSync(root);const bound=new Map();
 function member(ref){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed theming source subject '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;}
 member({path:'scripts/upstream-theming-inspection-source-review.mjs',sha256:hash(image),bytes:image.length});
 member({path:'scripts/upstream-candidate-source-evidence.mjs',sha256:'c40eed4ebaa6492abd92bbe9676e3b256fc7d0c2661336b8b97e005f0ff8a078'});
 const original=JSON.parse(gunzipSync(member(ORIGINAL))),census=JSON.parse(gunzipSync(member(CENSUS))),packet=JSON.parse(gunzipSync(member(SCOPE)));
 const originalFacts=verifyThemingOriginalData(original,census),scope=packet.actual;
 assert.equal(scope.line,'21.x');assert.equal(scope.result,'pass');assert.equal(scope.entry_override_used,false);
 assert.equal(scope.candidate_entry,'projects/ngx-material-legacy/_index.scss');member(scope.producer);
 const oracle=JSON.parse(member(scope.oracle));assert.equal(scope.oracle.material_version,'16.2.14');
 member({path:oracle.provenance.lock_path,sha256:oracle.provenance.lock_sha256});
 assert.deepEqual(scope.candidate.functions,Object.keys(oracle.members.functions).sort());assert.equal(scope.candidate.functions.length,25);
 for(const name of ['private-get-theme-version','validate-required-values','private-validate-required-values','define-theme'])assert.equal(scope.candidate.functions.includes(name),false);
 const owned=candidateProductSourcePaths(root).filter(path=>path.endsWith('.scss')).sort();assert.equal(owned.length,409);
 assert.deepEqual(owned,scope.owned_scss_population.map(ref=>ref.path).sort());
 const boundaries=[];for(const ref of scope.owned_scss_population){const value=member(ref),boundary=inspectOwnedThemingMember(ref.path,value);if(boundary)boundaries.push(boundary);}
 assert.deepEqual(boundaries,scope.boundaries);
 for(const [path,version]of [['projects/ngx-material-legacy/package.json','21.'],['node_modules/@angular/material/package.json','21.2.14'],['node_modules/@angular/cdk/package.json','21.2.14']]){
  const raw=read(path),manifest=JSON.parse(raw);assert.equal(path.startsWith('projects/')?manifest.version.startsWith(version):manifest.version===version,true);bound.set(path,{path,sha256:hash(raw),bytes:raw.length});
 }
 assert.equal(hash(read('node_modules/@angular/material/package.json')),scope.peer.package_json_sha256);
 for(const [program,roots]of [[scope.candidate,['projects/ngx-material-legacy','node_modules/@angular/material','node_modules/@angular/cdk']],[scope.current,['node_modules/@angular/material','node_modules/@angular/cdk']]]){
  for(const ref of program.loaded_sources){assert.ok(Number.isInteger(ref.root)&&ref.root>=0&&ref.root<roots.length);assert.ok(ref.path.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!part.includes('\\')));member({...ref,path:roots[ref.root]+'/'+ref.path});}
 }
 const assertCurrent=()=>{for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late theming source change '+ref.path);assert.equal(raw.length,ref.bytes);}
  assert.deepEqual(candidateProductSourcePaths(root).filter(path=>path.endsWith('.scss')).sort(),owned);};
 assertCurrent();return {report:{schema_version:1,line:'21.x',role:'Two individual whole-patch source proposals; not canonical admission or a fresh full Sass gate',...originalFacts,
  originals:ORIGINAL,source_census:CENSUS,retained_compiler_scope:SCOPE,historical_exported_functions:25,owned_scss_members:409,public_override_boundaries:boundaries.length,
  current_source_bindings:structuredClone([...bound.values()]),
  current_owned_sources_and_loaded_peers_match_retained_measurement:true,fresh_compiler_execution_this_review:false,canonical_decisions_changed:0,source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'},bound:structuredClone([...bound.values()]),assertCurrent};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3);const review=reviewThemingInspectionSource();review.assertCurrent();writeFileSync(process.argv[2],JSON.stringify(review.report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({result:'pass',original_files:11,original_hunks:16,proposed_individual_source_decisions:2,canonical_decisions_changed:0}));
}
