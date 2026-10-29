/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact tool literals only. Comparison bytes never form a current public reader. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {readHistoricalContractRepairMember} from './historical-contract-repair-source.mjs';
const SELF='scripts/historical-contract-repair-readers.mjs',INPUTS='compatibility/rc/historical-contract-repair-reader-inputs.json';
const PINS={'21.x':'076e4161b01dd12d4c8e3f36b49e84ce9004c7323c9b36cd3ec7a3ec47271254',main:'dcb191270119f875a2d58e77a333839f4368658a41c0e39f8f3a1c58f9c1657c'};
const image=readFileSync(fileURLToPath(import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex'),originals=new Map();
/** This extra installed tooling root is required by the pinned table source checker. */
export function readHistoricalContractRepairOwnerMember(root,path){
 const compiler=path.match(/^node_modules\/@angular\/compiler-cli\/(.+)$/);
 if(compiler){
  let file=realpathSync(join(root,'node_modules/@angular/compiler-cli'));
  for(const part of compiler[1].split('/')){assert.ok(part&&part!=='.'&&part!=='..');file=join(file,part);assert.equal(lstatSync(file).isSymbolicLink(),false);}
  assert.ok(lstatSync(file).isFile());return readFileSync(file);
 }
 return readHistoricalContractRepairMember(root,path);
}
function original(root,parent,path){
 assert.match(parent,/^[0-9a-f]{40}$/);const key=JSON.stringify([root,parent,path]);
 if(!originals.has(key)){
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
  originals.set(key,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:2*1024*1024}));
 }return Buffer.from(originals.get(key));
}
export function historicalContractRepairReaderSubject({root=process.cwd(),read=path=>readHistoricalContractRepairOwnerMember(root,path)}={}){
 root=resolve(root);const bound=new Map();
 const member=(path,expected)=>{
  const actual=readEvidenceMember(root,path),provided=read(path);assert.ok(Buffer.isBuffer(provided)&&provided.equals(actual),'nonphysical repaired reader input '+path);
  const ref={path,sha256:hash(actual),bytes:actual.length};if(expected){assert.equal(ref.sha256,expected.sha256,'changed repaired reader member '+path);if(expected.bytes!==undefined)assert.equal(ref.bytes,expected.bytes);}
  if(bound.has(path))assert.deepEqual(ref,bound.get(path));else bound.set(path,ref);return actual;
 };
 const version=JSON.parse(member('projects/ngx-material-legacy/package.json')).version,line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);
 const raw=member(INPUTS,{sha256:PINS[line]}),data=JSON.parse(raw);assert.equal(data.schema_version,1);assert.equal(data.line,line);
 assert.equal(data.canonical_dispositions_changed,0);assert.equal(data.product_changes,0);assert.equal(data.old_programs_executed,false);assert.equal(data.actual_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(data.g11_claim,'not-passed');
 member(SELF,{sha256:hash(image),bytes:image.length});member(data.unchanged_source_subject.path,data.unchanged_source_subject);
 const transitions=new Map();
 for(const row of data.tool_transitions){
  assert.ok(/^(?:scripts\/[^/]+\.(?:mjs|cjs)|tests\/[^/]+\.(?:py|mjs))$/.test(row.path),'non-tool reader transition');assert.equal(transitions.has(row.path),false);
  const before=original(root,data.source_parent,row.path);assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);
  let expected=before.toString();assert.ok(row.literal_edits.length>0);for(const edit of row.literal_edits){assert.equal(expected.split(edit.before).length,2,'ambiguous repaired reader literal '+row.path);expected=expected.replace(edit.before,edit.after);}
  assert.equal(hash(expected),row.after.sha256);assert.equal(Buffer.byteLength(expected),row.after.bytes);const after=member(row.path,row.after);assert.equal(after.toString(),expected);
  transitions.set(row.path,{before:{...row.before},after:{...row.after},beforeBytes:Buffer.from(before),afterBytes:Buffer.from(after)});
 }
 assert.equal(transitions.size,line==='21.x'?9:2);
 const ownsReference=ref=>{const row=transitions.get(ref.path);return Boolean(row&&[row.before.sha256,row.after.sha256].includes(ref.sha256));};
 const side=(ref,target)=>{
  const row=transitions.get(ref.path);if(!row)return null;
  const prior=ref.sha256===row.before.sha256?row.before:ref.sha256===row.after.sha256?row.after:null;if(!prior)return null;
  if(ref.bytes!==undefined)assert.equal(ref.bytes,prior.bytes,'wrong repaired tool reference length');
  member(ref.path,row.after);return {...ref,sha256:row[target].sha256,...(ref.bytes===undefined?{}:{bytes:row[target].bytes})};
 };
 const qualify=ref=>side(ref,'after'),predecessorReference=ref=>side(ref,'before');
 const comparisonBytes=ref=>{assert.ok(ownsReference(ref),'unsupported reader comparison');qualify(ref);const row=transitions.get(ref.path);return Buffer.from(ref.sha256===row.before.sha256?row.beforeBytes:row.afterBytes);};
 const assertCurrent=()=>{for(const ref of bound.values())member(ref.path,ref);};
 assertCurrent();return {line,bound:structuredClone([...bound.values()]),transitions:structuredClone(data.tool_transitions.map(row=>({path:row.path,before:row.before,after:row.after}))),ownsReference,qualify,predecessorReference,comparisonBytes,assertCurrent,
  old_code_executed:false,old_product_bytes_exposed:false,old_tool_bytes_exposed_as_current:false,current_read_route_returned:false,canonical_admission_granted:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
}
