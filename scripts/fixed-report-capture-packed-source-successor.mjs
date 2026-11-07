/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite source-only projection to the unchanged packed-source predecessor. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
const moduleRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const SELF='scripts/fixed-report-capture-packed-source-successor.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const PACKET='compatibility/rc/fixed-report-capture-packed-source-inputs-v1.json';
const PIN='195bb30e616034e378ca457da964027a04ca2213f658666bde4e05da8d309811';
const PARENT='c72d88c74944463d1fea960ae718fb30944818c9',COMMIT='5b09618cde44725b8723fe4f6c63c3a4c35ad7e5';
const TARGET='scripts/packed-consumer-evidence.mjs',CATALOG='compatibility/rc/fixed-report-catalog.json';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const equal=(a,b)=>Buffer.isBuffer(b)&&Reflect.apply(Buffer.prototype.equals,a,[b]);
const ref=(path,bytes)=>({path,sha256:hash(bytes),bytes:bytes.length});
function replay(before,edits){
 let cursor=0;const parts=[];
 for(const edit of edits){
  assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor);
  const old=Buffer.from(edit.before),next=Buffer.from(edit.after);assert.ok(equal(before.subarray(edit.offset,edit.offset+old.length),old));
  parts.push(before.subarray(cursor,edit.offset),next);cursor=edit.offset+old.length;
 }
 return Buffer.concat([...parts,before.subarray(cursor)]);
}
const immutable=new Map();
function authenticated(root,packet){
 if(immutable.has(root))return immutable.get(root);
 const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'};
 const git=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:4*1024*1024});
 assert.equal(git('rev-list','--parents','-n','1',COMMIT).toString().trim(),COMMIT+' '+PARENT);
 const before=git('show',PARENT+':'+TARGET),after=git('show',COMMIT+':'+TARGET),catalog=git('show',COMMIT+':'+CATALOG);
 assert.deepEqual(ref(TARGET,before),packet.update.before);assert.deepEqual(ref(TARGET,after),packet.update.after);
 assert.ok(equal(replay(before,packet.update.edits),after));assert.deepEqual(ref(CATALOG,catalog),packet.additional_inputs[0]);
 const result={before,after,catalog};immutable.set(root,result);return result;
}
export function reverseFixedReportCapturePackedSource(member,raw,line,{readMember,root=moduleRoot}={}){
 root=resolve(root);
 if(line!=='main'||member!==TARGET)return raw;
 assert.equal(typeof raw,'string');assert.ok(readMember===undefined||typeof readMember==='function');
 const physical=path=>readEvidenceMember(root,path);
 const checked=path=>{const value=physical(path);if(readMember)assert.ok(equal(value,readMember(path)),'nonphysical capture source '+path);assert.ok(equal(value,physical(path)),'capture source changed during callback '+path);return value;};
 const packetBytes=checked(PACKET);assert.equal(hash(packetBytes),PIN);const packet=JSON.parse(packetBytes);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-fixed-report-capture-packed-source-successor');assert.equal(packet.line,'main');
 assert.equal(packet.source_parent,PARENT);assert.equal(packet.source_commit,COMMIT);assert.equal(packet.update.path,TARGET);assert.equal(packet.additional_inputs.length,1);assert.equal(packet.additional_inputs[0].path,CATALOG);
 assert.equal(packet.historical_programs_executed,false);assert.equal(packet.historical_reports_rewritten,0);assert.equal(packet.artifact_or_audit_admission_granted,false);
 const {before,after,catalog}=authenticated(root,packet),current=checked(TARGET),currentCatalog=checked(CATALOG),currentSelf=checked(SELF);
 assert.ok(equal(current,after),'unreviewed capture packed source');assert.ok(equal(currentCatalog,catalog),'changed capture catalog');assert.ok(equal(currentSelf,image),'changed loaded capture successor');
 const incoming=Buffer.from(raw);assert.ok(equal(incoming,before)||equal(incoming,after),'unknown capture packed source epoch');
 for(const [path,bytes] of [[PACKET,packetBytes],[TARGET,current],[CATALOG,currentCatalog],[SELF,currentSelf]])assert.ok(equal(physical(path),bytes),'late capture packed source '+path);
 return before.toString();
}
