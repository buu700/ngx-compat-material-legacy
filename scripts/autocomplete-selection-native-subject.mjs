/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Authenticate the exact finite registry addition; no execution admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {autocompleteSelectionSpecSubject} from './autocomplete-selection-spec-subject.mjs';
import {autocompleteSelectionHistoricalScopes} from './autocomplete-selection-native-scopes.mjs';
import {qualifyCanonicalToolReference} from './canonical-tool-source-role.mjs';

export const SELECTION_NATIVE_PACKET='compatibility/rc/autocomplete-selection-native-contract-proposal.json';
export const SELECTION_NATIVE_REGISTRY='scripts/upstream-historical-behavior-evidence.mjs';
export const SELECTION_NATIVE_SHAS=Object.freeze([
  'd5d468a29a2db4c0676c57d60bc8431ed4fd6e18',
  '13629b0cd814ccc5fa01cf670b8b3001bc0021ff',
  'cf868a5089a4c9eaddd4a55fd18b952fb96d5c19',
]);
const pins={main:'f53ca24623f8876b28f6af99a4e2ad80ecc3934073aed5931fb59aa641a7d0e7',
  '21.x':'9807d4a66c303445a1af43a2c4bb66217b7391af9ee62ab33f290c3b9bb066ba'};
const harnessPins={main:'c0857010621e8db535417b52bb5876d9a927708f0aee2dce8d28e8755990eb69','21.x':'aaa534b6523e7865b3d0725b2781541b61dc607068b384e1be8db4aa9c3196f8'};
const hash=value=>createHash('sha256').update(value).digest('hex');
const objectHash=(kind,value)=>createHash('sha1').update(kind+' '+Buffer.byteLength(value)+'\0').update(value).digest('hex');
const ts=createRequire(import.meta.url)('typescript');
const nativeCase=(p,index,full_name)=>({case_id:'historical-legacy-artifact/original-and-shared-cases/src/material/'+p+'#'+index,
  historical_path:'src/material/'+p,candidate:'projects/ngx-material-legacy/'+p,full_name});

export function autocompleteSelectionNativeSubject({root,read=p=>readEvidenceMember(root,p),line}={}){
  const spec=autocompleteSelectionSpecSubject({root,read,line});line=spec.line;
  const bound=new Map(spec.bound.map(ref=>[ref.path,{...ref}]));
  let titleNative=null;
  function member(ref){
    readEvidenceMember(root,ref.path);
    const raw=read(ref.path);
    if(ref.path===SELECTION_NATIVE_REGISTRY){
      const successor=qualifyCanonicalToolReference({root,read,prior:ref});
      if(successor){titleNative=successor;for(const member of titleNative.bound)bound.set(member.path,{...member});ref=titleNative.reference;}
    }
    assert.equal(hash(raw),ref.sha256,'changed selection native subject '+ref.path);
    if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);
    bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return raw;
  }
  const raw=read(SELECTION_NATIVE_PACKET);assert.equal(hash(raw),pins[line]);
  member({path:SELECTION_NATIVE_PACKET,sha256:hash(raw),bytes:raw.length});
  const packet=JSON.parse(raw);assert.equal(packet.schema_version,1);assert.equal(packet.line,line);
  assert.equal(packet.registry.path,SELECTION_NATIVE_REGISTRY);
  assert.equal(packet.production_registry_activated,false,'the proposal is an immutable pre-activation receipt');
  assert.equal(packet.canonical_SHA_decisions_changed,0);assert.equal(packet.existing_named_historical_cases,2236);
  assert.equal(packet.new_or_renamed_case_IDs,0);assert.equal(packet.existing_source_or_validator_bodies_changed,0);
  assert.equal(packet.actual_native_browser_artifact_or_floor_executed,false);assert.equal(packet.g11_claim,'not-passed');
  assert.deepEqual(packet.native_spec_successor,spec.bound[0]);
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
  const original=p=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet.source_parent+':'+p],
    {cwd:root,env,maxBuffer:1024*1024});
  const before=original(SELECTION_NATIVE_REGISTRY);
  assert.equal(hash(before),packet.registry.before_sha256);assert.equal(before.length,packet.registry.before_bytes);
  assert.deepEqual(packet.literal_edits,[
    {before:"import {createHash} from 'node:crypto';",after:"import {createHash} from 'node:crypto';\nimport {autocompleteSelectionHistoricalScopes} from './autocomplete-selection-native-scopes.mjs';"},
    {before:'const scopes = new Map([\n',after:'const scopes = new Map([\n  ...autocompleteSelectionHistoricalScopes(commonMembers,nativeCase),\n'},
  ]);
  let after=before.toString();
  for(const edit of packet.literal_edits){assert.equal(after.split(edit.before).length,2);after=after.replace(edit.before,edit.after);}
  assert.equal(hash(after),packet.registry.after_sha256);assert.equal(Buffer.byteLength(after),packet.registry.after_bytes);
  const registryAfter={sha256:hash(after),bytes:Buffer.byteLength(after)};
  const registryBefore={sha256:hash(before),bytes:before.length};
  member({path:SELECTION_NATIVE_REGISTRY,...registryAfter});
  member(packet.scope_module);assert.equal(packet.scope_module.path,'scripts/autocomplete-selection-native-scopes.mjs');
  assert.deepEqual(packet.current_product_subjects.map(ref=>ref.path),[
    'projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts',
    'projects/ngx-material-legacy/legacy-autocomplete/autocomplete-trigger.ts',spec.path,
    'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.html','projects/ngx-material-legacy/legacy-autocomplete/autocomplete.scss',
  ]);
  for(const ref of packet.current_product_subjects){const previous=original(ref.path);assert.equal(hash(previous),ref.sha256);assert.equal(previous.length,ref.bytes);member(ref);}
  const proposals=JSON.parse(member(packet.source_proposals));
  const originals=JSON.parse(gunzipSync(member(packet.original_subjects)));
  assert.deepEqual(packet.subjects.map(row=>row.sha),SELECTION_NATIVE_SHAS);
  assert.deepEqual(proposals.reviews.map(row=>row.sha),SELECTION_NATIVE_SHAS);
  const syntax=ts.createSourceFile('before-registry.mjs',before.toString(),ts.ScriptTarget.Latest,true);assert.equal(syntax.parseDiagnostics.length,0);
  const common=syntax.statements.filter(ts.isVariableStatement).flatMap(row=>[...row.declarationList.declarations])
    .find(row=>row.name.getText(syntax)==='commonMembers')?.initializer;
  assert.ok(common&&ts.isArrayLiteralExpression(common));assert.ok(common.elements.every(ts.isStringLiteral));
  const requirements=autocompleteSelectionHistoricalScopes(Object.freeze(common.elements.map(row=>row.text)),nativeCase);
  assert.deepEqual(requirements.map(([sha])=>sha),SELECTION_NATIVE_SHAS);
  for(const [i,subject]of packet.subjects.entries()){
    const source=originals.commits.find(row=>row.sha===subject.sha),review=proposals.reviews[i],definition=requirements[i][1];
    assert.equal(objectHash('commit',source.raw_commit),subject.sha);assert.equal(hash(source.diff),definition.patch);
    assert.equal(subject.diff_sha256,definition.patch);assert.equal(review.diff_sha256,definition.patch);
    assert.equal(source.original_files,subject.original_files);assert.equal(source.original_hunks,subject.original_hunks);
    assert.equal(review.complete_original_hunk_reviews.length,subject.original_hunks);
    assert.deepEqual(subject.named_cases.map(row=>row.index),[[46],[37,38,39,172],[37,39,42,46]][i]);
    assert.deepEqual(definition.cases,subject.named_cases.map(({case_id,historical_path,candidate,full_name})=>({case_id,historical_path,candidate,full_name})));
  }
  const controlsPath='compatibility/rc/autocomplete-selection-native-contract-controls.json';
  const controlsRaw=read(controlsPath),controls=JSON.parse(controlsRaw);
  member({path:controlsPath,sha256:hash(controlsRaw),bytes:controlsRaw.length});
  assert.deepEqual(controls.proposal,{path:SELECTION_NATIVE_PACKET,sha256:hash(raw),bytes:raw.length});
  assert.equal(controls.line,line);assert.equal(controls.node,process.version);assert.equal(controls.typescript,ts.version);
  assert.equal(controls.prior_scopes_preserved,11);assert.equal(controls.prior_validator_and_regression_requirements_unchanged,true);
  assert.equal(controls.full_historical_cases,2236);assert.equal(controls.synthetic_rejections,72);
  assert.equal(controls.actual_browser_artifact_or_floor_executed,false);assert.equal(controls.g11_claim,'not-passed');
  const harnessPath='compatibility/rc/autocomplete-selection-native-harness-successor.json',harnessRaw=read(harnessPath);
  assert.equal(hash(harnessRaw),harnessPins[line]);member({path:harnessPath,sha256:hash(harnessRaw),bytes:harnessRaw.length});
  const harness=JSON.parse(harnessRaw);assert.equal(harness.line,line);assert.equal(harness.path,'tests/autocomplete_selection_native_contract_probe.mjs');
  assert.equal(harness.native_validator_or_case_assertions_changed,0);assert.equal(harness.actual_native_browser_artifact_or_floor_executed,false);
  const oldHarness=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',harness.source_parent+':'+harness.path],
    {cwd:root,env,maxBuffer:1024*1024});
  assert.equal(hash(oldHarness),harness.before.sha256);assert.equal(oldHarness.length,harness.before.bytes);assert.equal(harness.before.sha256,controls.producer_sha256);
  let newHarness=oldHarness.toString();assert.equal(harness.literal_edits.length,1);
  for(const edit of harness.literal_edits){assert.equal(newHarness.split(edit.before).length,2);newHarness=newHarness.replace(edit.before,edit.after);}
  assert.equal(hash(newHarness),harness.after.sha256);assert.equal(Buffer.byteLength(newHarness),harness.after.bytes);
  member({path:harness.path,...harness.after});
  assert.deepEqual(controls.subjects.map(row=>row.sha),SELECTION_NATIVE_SHAS);
  for(const [i,row]of controls.subjects.entries()){
    assert.equal(row.complete_synthetic_admission_passed,true);assert.equal(row.rejected.length,[20,26,26][i]);
    assert.equal(new Set(row.rejected.map(c=>c.id)).size,row.rejected.length);
    assert.deepEqual(row.named_native_cases,requirements[i][1].cases);
  }
  const qualify=ref=>{
    if(ref.path!==SELECTION_NATIVE_REGISTRY)return null;
    const current=titleNative?.reference??registryAfter;
    assert.ok([registryBefore.sha256,registryAfter.sha256,current.sha256].includes(ref.sha256),'unqualified earlier native registry reference');
    if(ref.bytes!==undefined)assert.equal(ref.bytes,ref.sha256===registryBefore.sha256?registryBefore.bytes:ref.sha256===registryAfter.sha256?registryAfter.bytes:current.bytes);
    return {path:ref.path,...current};
  };
  const assertCurrent=()=>{spec.assertCurrent();for(const ref of bound.values()){const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'late selection native subject '+ref.path);assert.equal(bytes.length,ref.bytes);}};
  assertCurrent();return {line,packet:structuredClone(packet),before:{...registryBefore},after:{...(titleNative?.reference??registryAfter)},
    requirements:structuredClone(requirements),proposals:structuredClone(proposals),originals:structuredClone(originals),
    bound:structuredClone([...bound.values()]),qualify,assertCurrent,native_artifact_floor_or_G11_credit:false};
}
