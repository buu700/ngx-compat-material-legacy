/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact current tool references. Historical programs are authenticated as data. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';

const SELF='scripts/current-sass-tool-references.mjs';
const INPUTS='compatibility/rc/current-sass-tool-reference-inputs-v1.json';
const INPUTS_SHA='ffb8fb98babb084a86e4d49f13ef17069f784eb732365c566f6c764efd62e64f';
const image=readFileSync(fileURLToPath(import.meta.url));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const reference=(path,raw)=>({path,sha256:hash(raw),bytes:raw.length});
const bufferEquals=Buffer.prototype.equals;
const equalBytes=(a,b)=>Buffer.isBuffer(b)&&Reflect.apply(bufferEquals,a,[b]);
const toolPath=path=>typeof path==='string'&&/^(?:scripts|tests)\/[a-zA-Z0-9_.-]+\.(?:mjs|cjs|py)$/.test(path);

function plain(value){
 if(value===null||['string','boolean'].includes(typeof value))return value;
 if(typeof value==='number'){assert.ok(Number.isSafeInteger(value));return value;}
 assert.ok(value&&typeof value==='object'&&!types.isProxy(value));const array=Array.isArray(value);assert.equal(Object.getPrototypeOf(value),array?Array.prototype:Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(value),out=array?[]:{};
 for(const key of Reflect.ownKeys(descriptors)){
  assert.equal(typeof key,'string');if(array&&key==='length')continue;const d=descriptors[key];assert.ok(Object.hasOwn(d,'value')&&d.enumerable);
  if(array)assert.match(key,/^(?:0|[1-9][0-9]*)$/);Object.defineProperty(out,key,{value:plain(d.value),enumerable:true,writable:true,configurable:true});
 }
 if(array){assert.equal(out.length,descriptors.length.value);assert.equal(Object.keys(out).length,out.length);}return out;
}

function metadata(value){
 assert.ok(value&&typeof value==='object'&&!types.isProxy(value));assert.equal(Object.getPrototypeOf(value),Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(value),out={};
 for(const key of ['path','sha256','bytes']){
  const d=descriptors[key];if(key==='bytes'&&!d)continue;
  assert.ok(d&&Object.hasOwn(d,'value')&&d.enumerable,'tool reference requires data properties');out[key]=d.value;
 }
 assert.equal(typeof out.path,'string');assert.match(out.sha256,/^[0-9a-f]{64}$/);
 if(Object.hasOwn(out,'bytes'))assert.ok(Number.isSafeInteger(out.bytes)&&out.bytes>=0);
 return out;
}
function matches(raw,ref){assert.equal(hash(raw),ref.sha256);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}
function gitImages(root,requests){
 const unique=[...new Map(requests.map(r=>[r.commit+':'+r.path,r])).values()];
 for(const r of unique){assert.match(r.commit,/^[0-9a-f]{40}$/);assert.ok(r.path&&!r.path.includes('..')&&!r.path.includes('\n')&&!r.path.includes('\0')&&!r.path.startsWith('/'));}
 const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'};
 const raw=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','cat-file','--batch'],{cwd:root,env,input:unique.map(r=>r.commit+':'+r.path).join('\n')+'\n',maxBuffer:32*1024*1024});
 const out=new Map();let cursor=0;
 for(const r of unique){
  const end=raw.indexOf(10,cursor);assert.ok(end>cursor);const[blob,kind,sizeText]=raw.subarray(cursor,end).toString().split(' '),size=Number(sizeText);
  assert.equal(kind,'blob');assert.ok(Number.isSafeInteger(size)&&size>=0);const bytes=raw.subarray(end+1,end+1+size);
  assert.equal(bytes.length,size);assert.equal(raw[end+1+size],10);
  assert.equal(createHash('sha1').update('blob '+size+'\0').update(bytes).digest('hex'),blob);
  out.set(r.commit+':'+r.path,Buffer.from(bytes));cursor=end+size+2;
 }
 assert.equal(cursor,raw.length);return out;
}
function edited(before,edits){
 assert.ok(Array.isArray(edits)&&edits.length);let cursor=0;const parts=[];
 for(const edit of edits){
  assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor);
  assert.equal(typeof edit.before,'string');assert.equal(typeof edit.after,'string');assert.ok(edit.before!==edit.after);
  const old=Buffer.from(edit.before),next=Buffer.from(edit.after);assert.ok(equalBytes(before.subarray(edit.offset,edit.offset+old.length),old));
  parts.push(before.subarray(cursor,edit.offset),next);cursor=edit.offset+old.length;
 }
 parts.push(before.subarray(cursor));return Buffer.concat(parts);
}

export function currentSassToolReferenceSubject({root=process.cwd(),read:providedRead}={}){
 root=resolve(root);assert.ok(lstatSync(root).isDirectory()&&!lstatSync(root).isSymbolicLink());assert.ok(providedRead===undefined||typeof providedRead==='function');const bound=new Map();
 const read=path=>{
  const actual=readEvidenceMember(root,path),ref=reference(path,actual);
  if(bound.has(path))assert.deepEqual(ref,bound.get(path));else bound.set(path,ref);
  if(providedRead!==undefined)assert.ok(equalBytes(actual,providedRead(path)),'nonphysical current tool input '+path);
  assert.ok(equalBytes(actual,readEvidenceMember(root,path)),'current tool changed during callback '+path);return actual;
 };
 const member=ref=>{const raw=read(ref.path);matches(raw,ref);return raw;};
 const assertPhysical=()=>{for(const ref of bound.values())assert.deepEqual(reference(ref.path,readEvidenceMember(root,ref.path)),ref,'late physical current tool input '+ref.path);};
 assert.ok(equalBytes(read(SELF),image));const raw=member({path:INPUTS,sha256:INPUTS_SHA}),packet=JSON.parse(raw);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-current-sass-tool-reference-successor');
 assert.deepEqual(packet.product_paths,[]);assert.equal(packet.historical_programs_executed,false);assert.equal(packet.historical_reports_rewritten,0);assert.equal(packet.artifact_or_audit_admission_granted,false);
 const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version,line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);
 const branch=packet.branches[line];assert.ok(branch);const archived=branch.historical_registry;
 assert.equal(new Set(branch.updates.map(r=>r.path)).size,branch.updates.length);assert.equal(new Set(branch.additional_inputs.map(r=>r.path)).size,branch.additional_inputs.length);
 const registryBytes=gitImages(root,[{commit:archived.source_parent,path:archived.path}]).get(archived.source_parent+':'+archived.path);matches(registryBytes,archived);
 // The unchanged registry remains physically present. Its source programs are never run.
 assert.ok(equalBytes(member(archived),registryBytes));const historical=JSON.parse(registryBytes);
 assert.equal(historical.line,line);assert.equal(historical.extension_kind,'spinner-snack-c04-source');assert.ok(historical.gate_tool_successor);
 assert.equal(historical.tool_transitions.length,line==='21.x'?45:17);
 assert.equal(historical.canonical_dispositions_changed,0);assert.equal(historical.product_changes,0);assert.equal(historical.old_programs_executed,false);assert.equal(historical.g11_claim,'not-passed');
 const originalRequests=historical.tool_transitions.map(r=>({commit:r.source_parent??historical.source_parent,path:r.path}));
 originalRequests.push(...branch.intermediate_inputs.map(r=>({commit:r.source_parent,path:r.path})),...branch.updates.map(r=>({commit:archived.source_parent,path:r.path})));
 const originals=gitImages(root,originalRequests),rows=new Map();
 const addIdentity=(row,ref,bytes)=>{matches(bytes,ref);const prior=row.identities.get(ref.sha256);if(prior)assert.ok(equalBytes(prior,bytes));else row.identities.set(ref.sha256,Buffer.from(bytes));};
 for(const input of historical.tool_transitions){
  assert.ok(toolPath(input.path));assert.equal(rows.has(input.path),false);
  const before=originals.get((input.source_parent??historical.source_parent)+':'+input.path);matches(before,input.before);
  let after=before.toString();assert.ok(input.literal_edits.length);
  for(const edit of input.literal_edits){assert.equal(after.split(edit.before).length,2);after=after.replace(edit.before,edit.after);}
  const row={path:input.path,before:{...input.before},after:{...input.after},identities:new Map()};
  addIdentity(row,input.before,before);addIdentity(row,input.after,Buffer.from(after));rows.set(input.path,row);
 }
 for(const input of branch.intermediate_inputs){
  const row=rows.get(input.path);assert.ok(row);addIdentity(row,input,originals.get(input.source_parent+':'+input.path));
 }
 const baselineSupport=new Map(historical.support_inputs.map(r=>[r.path,r]));
 for(const update of branch.updates){
  assert.ok(toolPath(update.path));const before=originals.get(archived.source_parent+':'+update.path);matches(before,update.before);
  const prior=rows.get(update.path);if(prior)assert.deepEqual(update.before,{path:update.path,...prior.after});
  else if(baselineSupport.has(update.path))assert.deepEqual(update.before,baselineSupport.get(update.path));
  const after=edited(before,update.edits);matches(after,update.after);assert.ok(equalBytes(member(update.after),after));
  const row=prior??{path:update.path,before:{sha256:update.before.sha256,bytes:update.before.bytes},identities:new Map()};
  addIdentity(row,update.before,before);addIdentity(row,update.after,after);row.after={sha256:update.after.sha256,bytes:update.after.bytes};rows.set(update.path,row);
 }
 member(historical.unchanged_source_subject);
 for(const input of historical.support_inputs)if(!branch.updates.some(r=>r.path===input.path))member(input);
 for(const input of branch.additional_inputs){assert.ok(toolPath(input.path)||input.path.startsWith('compatibility/rc/'));member(input);}
 for(const row of rows.values())member({path:row.path,...row.after});
 const assertCurrent=()=>{for(const ref of [...bound.values()])member(ref);assertPhysical();};
 const ownsReference=incoming=>{try{const ref=metadata(incoming),row=rows.get(ref.path),raw=row?.identities.get(ref.sha256);return Boolean(raw&&(ref.bytes===undefined||ref.bytes===raw.length));}catch{return false;}};
 const side=(incoming,target)=>{
  const snapshot=plain(incoming),ref=metadata(snapshot),row=rows.get(ref.path);if(!row)return null;
  const prior=row.identities.get(ref.sha256);if(!prior)return null;matches(prior,ref);member({path:row.path,...row.after});
  const result={...snapshot,sha256:row[target].sha256,...(ref.bytes===undefined?{}:{bytes:row[target].bytes})};
  assert.deepEqual(plain(incoming),snapshot);assertPhysical();return result;
 };
 const comparisonBytes=incoming=>{
  const snapshot=plain(incoming),ref=metadata(snapshot),row=rows.get(ref.path);assert.ok(row&&row.identities.has(ref.sha256));const result=Buffer.from(row.identities.get(ref.sha256));matches(result,ref);
  member({path:row.path,...row.after});assert.deepEqual(plain(incoming),snapshot);assertPhysical();return result;
 };
 const transitions=[...rows.values()].map(r=>({path:r.path,before:{...r.before},after:{...r.after}}));
 const result=Object.freeze({line,get bound(){return structuredClone([...bound.values()]);},get transitions(){return structuredClone(transitions);},ownsReference,qualify:ref=>side(ref,'after'),predecessorReference:ref=>side(ref,'before'),comparisonBytes,assertCurrent,
  old_code_executed:false,old_product_bytes_exposed:false,old_tool_bytes_exposed_as_current:false,current_read_route_returned:false,canonical_admission_granted:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'});
 assertCurrent();return result;
}
