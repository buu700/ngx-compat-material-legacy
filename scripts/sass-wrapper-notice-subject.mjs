/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Seven exact silent prefixes and their finite current-reader hooks only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {dialogTitleReaderSubject} from './dialog-title-source-context.mjs';

export const SASS_NOTICE_PACKET='compatibility/rc/sass-wrapper-notice-successor.json';
export const SASS_NOTICE_READERS='compatibility/rc/sass-wrapper-notice-reader-successors.json';
const header='// Copyright Google LLC All Rights Reserved.\n// Copyright (c) 2026 Ryan Lester.\n// Use of this source code is governed by the MIT license in LICENSE.\n\n';
const parent='8dccb816e63c1f417ac6f1d5b502b8ea43aae2d0';
const prefix='projects/ngx-material-legacy/';
const names=['bottom-sheet','button-toggle','divider','expansion','sidenav','sort','tree'];
const code=['scripts/autocomplete-selection-spec-subject.mjs','scripts/packed-product-source-recovery.mjs',
  'scripts/dialog-portal-failure-recovery.mjs','scripts/snack-dom-source-context.mjs','scripts/upstream-sass-inspection-admission.mjs','scripts/upstream-rules-js-build-admission.mjs'];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const pins=new Map([[SASS_NOTICE_PACKET,'5be99f3d9441057f9007868ffc7f1c9efe7d7b766b56fa0e640ba80e4cff7493'],
  [SASS_NOTICE_READERS,'9ca055d63bd19e5ef82d3c0894683190522aadb60d3bc959ef0565f788395919']]);
const objects=new Map();
function original(root,path){
  const key=root+'\0'+path;
  if(!objects.has(key)){
    const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
    for(const k of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[k];
    objects.set(key,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],
      {cwd:root,env,maxBuffer:1024*1024}));
  }
  return Buffer.from(objects.get(key));
}

export function sassWrapperNoticeSubject({root,read=p=>readEvidenceMember(root,p),line}={}){
  const actual=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
  line??=actual;assert.equal(line,actual);
  // The21.x sources already carry these notices and have no successor here.
  if(line==='21.x')return {line,bound:[],qualify:()=>null,historicalReference:ref=>({...ref}),
    qualifySassScope:scope=>structuredClone(scope),assertCurrent:()=>{},native_or_full_gate_credit:false};
  assert.equal(line,'main');
  const titleReaders=dialogTitleReaderSubject({root,read,line});
  const bound=new Map(),rows=new Map();
  function member(path,expected){
    readEvidenceMember(root,path);
    const current=titleReaders.qualify({path,...expected})??expected;
    const raw=read(path);assert.equal(hash(raw),current.sha256,'unqualified Sass notice subject '+path);
    if(current.bytes!==undefined)assert.equal(raw.length,current.bytes);
    bound.set(path,{path,sha256:hash(raw),bytes:raw.length});return raw;
  }
  const packet=JSON.parse(member(SASS_NOTICE_PACKET,{sha256:pins.get(SASS_NOTICE_PACKET)}));
  assert.equal(packet.schema_version,1);assert.equal(packet.line,line);assert.equal(packet.source_parent,parent);
  assert.equal(packet.header,header);assert.equal(packet.comment_prefix_additions,7);
  assert.equal(packet.source_code_HTML_selectors_maps_mixin_calls_or_goldens_changed,0);
  assert.equal(packet.current_artifact_or_C05_freeze_qualified,false);assert.equal(packet.g13_claim,'not-passed');
  assert.deepEqual(packet.subjects.map(row=>row.path),names.map(name=>prefix+'styles/'+name+'/_'+name+'-theme.scss'));
  for(const row of packet.subjects){
    const before=original(root,row.path);assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);
    assert.equal(row.executable_source_bytes_changed,0);assert.equal(row.line21_notice_matches,true);
    const after=Buffer.concat([Buffer.from(header),before]);assert.equal(hash(after),row.after.sha256);assert.equal(after.length,row.after.bytes);
    assert.equal(before.includes(Buffer.from('Copyright (c) 2026 Ryan Lester.')),false);
    assert.equal(member(row.path,row.after).equals(after),true,'Sass change exceeds exact silent prefix');rows.set(row.path,structuredClone(row));
  }
  const readers=JSON.parse(member(SASS_NOTICE_READERS,{sha256:pins.get(SASS_NOTICE_READERS)}));
  assert.equal(readers.schema_version,1);assert.equal(readers.line,line);assert.equal(readers.source_parent,parent);
  assert.equal(readers.unrelated_code_changes,0);assert.equal(readers.original_receipts_or_goldens_rewritten,0);
  assert.equal(readers.actual_native_packed_or_floor_executed,false);assert.equal(readers.g13_claim,'not-passed');
  assert.deepEqual(readers.code_subjects.map(row=>row.path),code);
  for(const row of readers.code_subjects){
    const before=original(root,row.path);assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);
    let after=before.toString();assert.ok(row.literal_edits.length>0);
    for(const edit of row.literal_edits){assert.equal(after.split(edit.before).length,2);after=after.replace(edit.before,edit.after);}
    assert.equal(hash(after),row.after.sha256);assert.equal(Buffer.byteLength(after),row.after.bytes);
    const current=member(row.path,row.after),historical=titleReaders.historicalReference({path:row.path,sha256:hash(current),bytes:current.length});
    if(historical)assert.deepEqual(historical,{path:row.path,...row.after});
    else assert.equal(current.toString(),after,'source hook exceeds its finite delta');
    rows.set(row.path,structuredClone(row));
  }
  const assertCurrent=()=>{titleReaders.assertCurrent();for(const ref of bound.values()){
    const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'late Sass notice subject '+ref.path);assert.equal(bytes.length,ref.bytes);
  }};
  const qualify=ref=>{
    const row=rows.get(ref.path);if(!row)return null;
    const successor=titleReaders.qualify({path:row.path,...row.after});
    if(successor?.sha256===ref.sha256){if(ref.bytes!==undefined)assert.equal(ref.bytes,successor.bytes);assertCurrent();return successor;}
    assert.ok([row.before.sha256,row.after.sha256].includes(ref.sha256),'unqualified earlier Sass notice metadata '+ref.path);
    if(ref.bytes!==undefined)assert.equal(ref.bytes,ref.sha256===row.before.sha256?row.before.bytes:row.after.bytes);
    assertCurrent();return successor??{path:ref.path,...row.after};
  };
  // Old reference metadata only. Source reads always return the real current bytes.
  const historicalReference=ref=>{const row=rows.get(ref.path);if(!row)return {...ref};qualify(ref);
    return {...ref,sha256:row.before.sha256,...(ref.bytes===undefined?{}:{bytes:row.before.bytes})};};
  const qualifySassScope=scope=>{
    assert.equal(scope.line,line);const current=structuredClone(scope);
    current.owned_scss_population=current.owned_scss_population.map(ref=>qualify(ref)??ref);
    assert.equal(scope.owned_population_sha256,hash(JSON.stringify(scope.owned_scss_population)));
    current.owned_population_sha256=hash(JSON.stringify(current.owned_scss_population));
    current.candidate.loaded_sources=current.candidate.loaded_sources.map(ref=>{
      if(ref.root!==0)return ref;
      const qualified=qualify({...ref,path:prefix+ref.path});return qualified?{...ref,sha256:qualified.sha256,bytes:qualified.bytes}:ref;
    });
    assertCurrent();return current;
  };
  assertCurrent();return {line,bound:structuredClone([...bound.values()]),qualify,historicalReference,qualifySassScope,assertCurrent,
    exact_silent_prefixes:7,current_reader_hooks:6,native_or_full_gate_credit:false};
}
