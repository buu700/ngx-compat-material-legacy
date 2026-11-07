/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
const SELF='scripts/dialog-focus-finite-source-v6.mjs';
const PACKET='compatibility/rc/parent-dialog-focus-finite-source-successor-v5.json';
const ROSTER='compatibility/rc/parent-dialog-focus-authored-use-successor-v5.json';
const PEER_PREFIX='node_modules/@angular/core/types/';
const SOURCE_PINS={'21.x':'74890ca9a672ac9ce3114087447c7117eea0502bfac1a96d54b1ac4e327caa51',main:'c7a93f8d17e3aafb5e93297bcb4af98ba9df4d1bb88c1841fc1c7eeb4434b733'};
const ROSTER_PINS={'21.x':'9c967f9246bf68cc5e599e6a4fc12c3d8cce40018fe426f1d8db53127f01d956',main:'d244b2cacae1ac2c90898ab76f2f399eb734d2b49c07759ff14424df0cf2d3d4'};
const hash=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const image=readFileSync(fileURLToPath(import.meta.url));
const same=(a,b)=>Buffer.isBuffer(b)&&Buffer.prototype.equals.call(a,b);
export const dialogFocusFiniteLoadedImage=Object.freeze({path:SELF,sha256:hash(image),bytes:image.length});
function historical(root,commit,path){
 assert.match(commit,/^[0-9a-f]{40}$/);
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};
 for(const key of Object.keys(env))if(key.startsWith('GIT_')&&!['GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_TERMINAL_PROMPT'].includes(key))delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env,maxBuffer:2*1024*1024});
}
function publicDeclaration(body,pattern,symbol){
 const at=body.search(pattern);assert.ok(at>=0,'missing minimum declaration '+symbol);
 const opening=body.lastIndexOf('/**',at),closing=body.lastIndexOf('*/',at);
 assert.ok(opening>=0&&closing>opening,'missing declaration documentation '+symbol);
 const doc=body.slice(opening,closing);assert.match(doc,/@publicApi\b/);
 assert.doesNotMatch(doc,/@deprecated\b|@docs-private\b/);
}
export function dialogFocusFiniteSourceSuccessor({root,read,line}){
 assert.ok(line==='21.x'||line==='main');assert.equal(typeof read,'function');
 const physical=p=>p.startsWith(PEER_PREFIX)?readFileSync(join(root,p)):readEvidenceMember(root,p),version=JSON.parse(physical('projects/ngx-material-legacy/package.json')).version;
 assert.equal(line,version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null);
 assert.ok(same(physical(SELF),image),'changed loaded focus successor');
 const sourceRaw=physical(PACKET),rosterRaw=physical(ROSTER);
 assert.equal(hash(sourceRaw),SOURCE_PINS[line]);assert.equal(hash(rosterRaw),ROSTER_PINS[line]);
 const packet=JSON.parse(sourceRaw),roster=JSON.parse(rosterRaw),rows=packet.branches[line].transitions,delta=roster.branches[line];
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-dialog-focus-current-source-successor');assert.equal(packet.source_scope_only,true);assert.equal(packet.historical_programs_executed,false);assert.equal(packet.canonical_admission_granted,false);assert.equal(packet.g11_claim,'not-passed');
 assert.equal(roster.schema_version,1);assert.equal(roster.role,'finite-dialog-focus-authored-use-successor');assert.equal(roster.source_scope_only,true);assert.equal(roster.g11_claim,'not-passed');assert.equal(roster.review.status,'reviewed');assert.equal(roster.review.conclusion,'stable-public-peer');
 const v4source={path:'compatibility/rc/parent-select-dialog-menu-snack-d61-menu-finite-source-v4.json',sha256:'f8f9423c7dff2ffd5ee72fa812f137bb5db8e59a4b88b7c1868086e3bdb28777',bytes:112277};
 const v4roster={path:'compatibility/rc/parent-dialog-menu-snack-d61-menu-authored-use-successor-v4.json',sha256:'67861dc8b64cdfcd7f9792065b755084a51e25490bab46c6f71ac6b47d122e35',bytes:301398};
 assert.deepEqual(packet.previous_packet,v4source);assert.deepEqual(roster.previous_packet,v4roster);
 assert.deepEqual(rows.map(r=>r.path),['projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.ts','projects/ngx-material-legacy/legacy-dialog/dialog-container.ts']);
 const bound=[{path:SELF,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:SOURCE_PINS[line],bytes:sourceRaw.length},{path:ROSTER,sha256:ROSTER_PINS[line],bytes:rosterRaw.length},v4source,v4roster,...rows.map(r=>({path:r.after.path,sha256:r.after.sha256,bytes:r.after.bytes})),...delta.core_declarations];
 assert.equal(new Set(bound.map(r=>r.path)).size,bound.length);
 for(const ref of [v4source,v4roster]){const bytes=physical(ref.path);assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);}
 for(const row of rows){
  assert.equal(row.before.path,row.path);assert.equal(row.after.path,row.path);
  const before=historical(root,row.source_parent,row.path),after=historical(root,row.source_commit,row.path);
  assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);assert.equal(blob(before),row.before.git_blob);
  let cursor=0;const chunks=[];
  for(const edit of row.edits){assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor);const old=Buffer.from(edit.before);assert.ok(same(before.subarray(edit.offset,edit.offset+old.length),old));chunks.push(before.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+old.length;}
  chunks.push(before.subarray(cursor));const result=Buffer.concat(chunks);assert.ok(same(result,after),'focus transform differs from committed edit');assert.equal(hash(result),row.after.sha256);assert.equal(result.length,row.after.bytes);assert.equal(blob(result),row.after.git_blob);
 }
 const transitionPath='compatibility/rc/parent-main-dialog-focus-sass-source-v6.json',transitionRaw=physical(transitionPath);assert.equal(hash(transitionRaw),'bac522943f0d1ffbecfe44fd4ce85358a4b4b00870b64ce6dbc335295666fcc0');assert.equal(transitionRaw.length,32714);const t=JSON.parse(transitionRaw);assert.equal(line,'main');assert.equal(t.schema_version,1);assert.equal(t.role,'finite-dialog-focus-current-sass-source-v6');assert.equal(t.line,'main');assert.equal(t.source_scope_only,true);assert.equal(t.historical_programs_executed,false);assert.equal(t.canonical_admission_granted,false);assert.equal(t.g11_claim,'not-passed');assert.equal(t.predecessor_commit,'8baa761eca624c9d71293c3d31750a2b3fdeebf0');assert.equal(t.source_commit,'767bcbcc484722759f667dbe709ade31f5040b82');assert.equal(t.review.path,'compatibility/rc/parent-main-dialog-readiness-integration-review-v1.json');assert.deepEqual({path:t.review.path,sha256:hash(physical(t.review.path)),bytes:physical(t.review.path).length},t.review);bound.push({path:transitionPath,sha256:hash(transitionRaw),bytes:transitionRaw.length},t.review);
 const target=rows.find(r=>r.path===t.before.path);assert.deepEqual(target.after,t.before);const originalAfter=structuredClone(target.after),before=historical(root,t.predecessor_commit,t.before.path),after=historical(root,t.source_commit,t.after.path);assert.equal(hash(before),t.before.sha256);assert.equal(before.length,t.before.bytes);assert.equal(blob(before),t.before.git_blob);let cursor=0;const chunks=[];for(const e of t.edits){assert.deepEqual(Object.keys(e).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(e.offset)&&e.offset>=cursor);const old=Buffer.from(e.before);assert.ok(same(before.subarray(e.offset,e.offset+old.length),old));chunks.push(before.subarray(cursor,e.offset),Buffer.from(e.after));cursor=e.offset+old.length;}chunks.push(before.subarray(cursor));assert.ok(same(Buffer.concat(chunks),after));assert.equal(hash(after),t.after.sha256);assert.equal(after.length,t.after.bytes);assert.equal(blob(after),t.after.git_blob);target.after=t.after;const ix=bound.findIndex(r=>r.path===t.after.path);bound[ix]={path:t.after.path,sha256:t.after.sha256,bytes:t.after.bytes};
 const gitEnv=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));Object.assign(gitEnv,{GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'});for(const [a,b] of [[t.predecessor_commit,t.source_commit],[t.source_commit,'HEAD']])execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','merge-base','--is-ancestor',a,b],{cwd:root,env:gitEnv});
 assert.equal(delta.core_version,line==='21.x'?'21.2.23':'22.1.7');
 assert.equal(JSON.parse(readFileSync(join(root,'node_modules/@angular/core/package.json'))).version,delta.core_version);
 const declarations=new Map();for(const ref of delta.core_declarations){assert.ok(ref.path.startsWith('node_modules/@angular/core/types/')&&ref.path.endsWith('.d.ts'));const bytes=readFileSync(join(root,ref.path));assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);declarations.set(ref.path.split('/').at(-1),bytes.toString());}
 const core=declarations.get('core.d.ts'),discovery=declarations.get(line==='21.x'?'_discovery-chunk.d.ts':'_debug_node-chunk.d.ts'),di=declarations.get('_chrome_dev_tools_performance-chunk.d.ts');
 assert.ok(core&&discovery&&di);publicDeclaration(core,/declare function afterNextRender<E/, 'afterNextRender');publicDeclaration(discovery,/interface AfterRenderRef\s*\{/, 'AfterRenderRef');publicDeclaration(discovery,/declare class ApplicationRef\s*\{/, 'ApplicationRef');publicDeclaration(di,/declare abstract class Injector\s*\{/, 'Injector');
 assert.match(core,/mixedReadWrite\?:/);const options=core.match(/interface AfterRenderOptions\s*\{[^}]*\}/s)?.[0];assert.ok(options);assert.match(options,/manualCleanup\?: boolean;/);assert.match(options,/injector\?: Injector;/);assert.match(discovery,/interface AfterRenderRef\s*\{[^}]*destroy\(\): void;/s);
 for(const symbol of ['afterNextRender','AfterRenderRef','ApplicationRef','Injector'])assert.match(core,new RegExp('export \\{[^}]*\\b'+symbol+'\\b'));
 assert.equal(delta.source_files,532);assert.equal(delta.previous_uses,1966);assert.equal(delta.current_uses,1970);assert.equal(delta.changed_uses.length,45);assert.equal(delta.added_uses.length,4);assert.deepEqual(delta.removed_uses,[]);
 assert.deepEqual(delta.added_uses.map(r=>r.symbol).sort(),['AfterRenderRef','ApplicationRef','Injector','afterNextRender'].sort());
 const sweep=()=>{for(const ref of bound){const b=physical(ref.path);assert.equal(hash(b),ref.sha256,'changed physical focus member '+ref.path);assert.equal(b.length,ref.bytes);}assert.ok(same(physical(SELF),image));};
 let active=false,nested=false;const idle=()=>{if(active){nested=true;assert.fail('reentrant focus successor');}};
 const assertPhysical=()=>{idle();sweep();};
 const assertCurrent=()=>{idle();active=true;nested=false;try{sweep();for(const ref of bound){const b=physical(ref.path);if(!ref.path.startsWith(PEER_PREFIX)){assert.ok(same(b,read(ref.path)),'nonphysical focus input '+ref.path);sweep();assert.ok(same(b,physical(ref.path)),'focus input changed during callback '+ref.path);}else{sweep();}}assert.equal(nested,false,'reentrant focus successor');sweep();}finally{active=false;}};
 const select=(input,side)=>{idle();if(input===null||typeof input!=='object')return null;assert.equal(types.isProxy(input),false,'focus reference must not be a proxy');assert.ok(Object.getPrototypeOf(input)===Object.prototype||Object.getPrototypeOf(input)===null,'focus reference must be plain data');const descriptors=Object.getOwnPropertyDescriptors(input);assert.ok(Reflect.ownKeys(descriptors).every(k=>typeof k==='string'),'focus reference symbols');if(!Object.hasOwn(descriptors,'path'))return null;assert.ok(Object.hasOwn(descriptors.path,'value'),'focus reference path accessor');assert.equal(typeof descriptors.path.value,'string');const row=rows.find(r=>r.path===descriptors.path.value);if(!row)return null;assert.ok(Object.values(descriptors).every(d=>Object.hasOwn(d,'value')),'focus reference accessor');const value=Object.fromEntries(Object.entries(descriptors).map(([k,d])=>[k,d.value]));assert.deepEqual(Object.keys(value).sort(),value.bytes===undefined?['path','sha256']:['bytes','path','sha256']);sweep();const chosen=[row.before,...(row.path===originalAfter.path?[originalAfter]:[]),row.after].find(r=>r.sha256===value.sha256);assert.ok(chosen,'unknown focus predecessor');if(value.bytes!==undefined)assert.equal(value.bytes,chosen.bytes);return {path:row.path,sha256:row[side].sha256,...(value.bytes===undefined?{}:{bytes:row[side].bytes})};};
 assertCurrent();return {bound:structuredClone(bound),packet:structuredClone(packet),roster:structuredClone(roster),delta:structuredClone(delta),qualify:ref=>select(ref,'after'),historicalReference:ref=>select(ref,'before'),assertCurrent,assertPhysical};
}
