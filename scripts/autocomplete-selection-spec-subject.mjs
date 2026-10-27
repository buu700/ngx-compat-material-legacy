/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Authenticate one additive native-test source delta; no report/ledger credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';

export const AUTOCOMPLETE_SELECTION_SPEC='projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts';
export const AUTOCOMPLETE_SELECTION_SPEC_PACKET='compatibility/rc/autocomplete-selection-spec-successor.json';
export const AUTOCOMPLETE_SELECTION_SPEC_BEFORE='09a96761ccbb96309989dfc13517170c3600fb2bd57b3fb7e9c9cb02f788d423';
const readersPath='compatibility/rc/autocomplete-selection-source-reader-successors.json';
const readerPins={main:'bf806c5628500798e6045d40858b0523b6744656cf582ee1d263847d4f1cdcf3',
  '21.x':'1dadb7cc8ebc65a9a89aff7bbfca28daf0a546e9757957d8af3deae0792dfaeb'};
const pins={main:'bf629b45cf65bc93a98a43a9f7fc2d0fb9cf720cc72c07d9c8545c60ee1e10a3',
  '21.x':'7351ca1bb38ed03c8487db227d73194d94383941ca310a64604b0516188e33a5'};
const hash=raw=>createHash('sha256').update(raw).digest('hex'),ts=createRequire(import.meta.url)('typescript');
const targets=['prepareRequiredSelection','should retain the selected model while typing when selection is required',
  'should reset unmatched required-selection text once on outside click',
  'should update the control back to a string if user types after an option is selected',
  'should clear the text field if value is reset programmatically'];

export function autocompleteSelectionSpecSubject({root,read=p=>readEvidenceMember(root,p),line}={}){
  const manifest=JSON.parse(read('projects/ngx-material-legacy/package.json'));
  const actualLine=manifest.version.startsWith('21.')?'21.x':manifest.version.startsWith('22.')?'main':null;
  assert.ok(actualLine);line??=actualLine;assert.equal(line,actualLine);
  assert.equal(process.versions.node,JSON.parse(read('toolchain-lock.json')).repository.node);
  assert.equal(ts.version,JSON.parse(read('package.json')).devDependencies.typescript);
  const raw=read(AUTOCOMPLETE_SELECTION_SPEC_PACKET);assert.equal(hash(raw),pins[line]);
  const packet=JSON.parse(raw);assert.equal(packet.schema_version,1);assert.equal(packet.line,line);
  assert.equal(packet.path,AUTOCOMPLETE_SELECTION_SPEC);assert.equal(packet.before.sha256,AUTOCOMPLETE_SELECTION_SPEC_BEFORE);
  assert.equal(packet.original_tokens_or_assertions_removed,0);assert.equal(packet.new_or_renamed_case_ids,0);
  assert.equal(packet.complete_historical_cases,2236);assert.equal(packet.semantic_typecheck_executed,false);
  assert.equal(packet.actual_Angular_native_browser_or_artifact_execution,false);assert.equal(packet.g11_claim,'not-passed');
  assert.deepEqual(packet.insertions.map(row=>row.target),targets);
  assert.match(packet.source_parent,/^[0-9a-f]{40}$/);
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
  const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet.source_parent+':'+packet.path],
    {cwd:root,env,maxBuffer:1024*1024});
  assert.equal(hash(before),packet.before.sha256);assert.equal(before.length,packet.before.bytes);
  let end=0;const chunks=[];
  for(const edit of [...packet.insertions].sort((a,b)=>a.byte_offset-b.byte_offset)){
    assert.ok(Number.isSafeInteger(edit.byte_offset)&&edit.byte_offset>=end&&edit.byte_offset<before.length);
    assert.ok(typeof edit.text==='string'&&edit.text.length>30);
    chunks.push(before.subarray(end,edit.byte_offset),Buffer.from(edit.text));end=edit.byte_offset;
  }
  chunks.push(before.subarray(end));const after=Buffer.concat(chunks);
  assert.equal(after.length,packet.after.bytes);assert.equal(hash(after),packet.after.sha256);
  // Enforce regular current source paths even when a test supplies a read callback.
  readEvidenceMember(root,AUTOCOMPLETE_SELECTION_SPEC);readEvidenceMember(root,AUTOCOMPLETE_SELECTION_SPEC_PACKET);
  assert.equal(hash(read(AUTOCOMPLETE_SELECTION_SPEC)),packet.after.sha256,'unqualified autocomplete native test source');
  const configPath='projects/ngx-material-legacy/tsconfig.lib.json',configRaw=read(configPath);
  const config=ts.parseConfigFileTextToJson(configPath,configRaw.toString());assert.equal(config.error,undefined);
  assert.ok(config.config.exclude.includes('**/*.spec.ts'));
  const bound=[{path:AUTOCOMPLETE_SELECTION_SPEC_PACKET,sha256:hash(raw),bytes:raw.length},
    {path:AUTOCOMPLETE_SELECTION_SPEC,sha256:packet.after.sha256,bytes:packet.after.bytes},
    {path:configPath,sha256:hash(configRaw),bytes:configRaw.length}];
  const assertCurrent=()=>{for(const ref of bound){const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'late native test source change '+ref.path);assert.equal(bytes.length,ref.bytes);}};
  assertCurrent();return {line,path:AUTOCOMPLETE_SELECTION_SPEC,before:{...packet.before},after:{...packet.after},
    packet:structuredClone(packet),bound:structuredClone(bound),assertCurrent,
    original_source:Buffer.from(before),current_source:Buffer.from(after),native_or_full_source_admission_credit:false};
}

/** Exact code hooks only. No source bytes from the before-image are exposed
 * through a current reader, and no historical report is silently rewritten. */
export function autocompleteSelectionReaderSubject({root,read=p=>readEvidenceMember(root,p),line}={}){
  const spec=autocompleteSelectionSpecSubject({root,read,line});line=spec.line;
  readEvidenceMember(root,readersPath);
  const raw=read(readersPath);assert.equal(hash(raw),readerPins[line]);
  const packet=JSON.parse(raw);assert.equal(packet.schema_version,1);assert.equal(packet.line,line);
  assert.equal(packet.source_parent,spec.packet.source_parent);
  assert.equal(packet.unrelated_code_changes,0);assert.equal(packet.original_source_reports_rewritten,0);
  assert.equal(packet.upstream_SHA_dispositions_changed,0);assert.equal(packet.native_artifact_or_floor_execution,false);
  assert.equal(packet.g11_claim,'not-passed');
  assert.deepEqual(packet.code_subjects.map(row=>row.path),['scripts/upstream-rules-js-build-admission.mjs','scripts/autocomplete-landscape-source-judgment.mjs','scripts/upstream-testing-api-21x-admission.mjs','scripts/packed-product-source-recovery.mjs','scripts/packed-cva-source-requalification.mjs','scripts/dialog-portal-failure-recovery.mjs','scripts/snack-dom-source-context.mjs']);
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
  const bound=[...spec.bound,{path:readersPath,sha256:hash(raw),bytes:raw.length}];
  for(const row of packet.code_subjects){
    let text=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet.source_parent+':'+row.path],
      {cwd:root,env,maxBuffer:1024*1024}).toString();
    assert.equal(hash(text),row.before.sha256);assert.equal(Buffer.byteLength(text),row.before.bytes);
    for(const edit of row.literal_edits){assert.equal(text.split(edit.before).length,2);text=text.replace(edit.before,edit.after);}
    assert.equal(hash(text),row.after.sha256);assert.equal(Buffer.byteLength(text),row.after.bytes);
    readEvidenceMember(root,row.path);
    assert.equal(hash(read(row.path)),row.after.sha256,'unqualified native spec source-reader change');
    bound.push({path:row.path,...row.after});
  }
  const qualify=ref=>{
    if(ref.path===spec.path){
      assert.ok([spec.before.sha256,spec.after.sha256].includes(ref.sha256));
      if(ref.bytes!==undefined)assert.equal(ref.bytes,ref.sha256===spec.before.sha256?spec.before.bytes:spec.after.bytes);
      return {path:ref.path,...spec.after};
    }
    const row=packet.code_subjects.find(row=>row.path===ref.path);if(!row)return null;
    assert.ok([row.before.sha256,row.after.sha256].includes(ref.sha256));
    if(ref.bytes!==undefined)assert.equal(ref.bytes,ref.sha256===row.before.sha256?row.before.bytes:row.after.bytes);
    return {path:ref.path,...row.after};
  };
  const assertCurrent=()=>{spec.assertCurrent();for(const ref of bound){const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'late native source-reader change');assert.equal(bytes.length,ref.bytes);}};
  const publicSpec={...spec,before:{...spec.before},after:{...spec.after},packet:structuredClone(spec.packet),bound:structuredClone(spec.bound)};
  // Reconstruct immutable prior report metadata only; never return old code bytes.
  const historicalMetadataReference=path=>{assertCurrent();const row=packet.code_subjects.find(row=>row.path===path);assert.ok(row);return {path,sha256:row.before.sha256};};
  assertCurrent();return {spec:publicSpec,bound:structuredClone(bound),qualify,assertCurrent,historicalMetadataReference,native_or_full_source_admission_credit:false};
}
