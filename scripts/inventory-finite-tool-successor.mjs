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
import {fileURLToPath} from 'node:url';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
const SELF='scripts/inventory-finite-tool-successor.mjs',PACKET='compatibility/rc/parent-inventory-tool-product-successor-v2.json',PIN='7623c34a65d9600d9cecfcce53ea5ee539d990e05a3902b597e5b5848be130df';
const hash=b=>createHash('sha256').update(b).digest('hex'),image=readFileSync(fileURLToPath(import.meta.url));
export function inventoryFiniteToolSuccessor({root,line,read}){
 assert.ok(line==='21.x'||line==='main');assert.equal(typeof read,'function');const physical=p=>readEvidenceMember(root,p);assert.ok(physical(SELF).equals(image));
 const packetRaw=physical(PACKET);assert.equal(hash(packetRaw),PIN);assert.equal(packetRaw.length,12474);const packet=JSON.parse(packetRaw);assert.equal(packet.schema_version,1);assert.equal(packet.role,'inventory-tool-finite-product-successor');assert.equal(packet.source_scope_only,true);assert.equal(packet.historical_programs_executed,false);assert.equal(packet.g11_claim,'not-passed');
 const previous={path:'compatibility/rc/parent-inventory-python-product-successor-v1.json',sha256:'1dec61d2e9c5fb9abc95d4f66e23e4dc99ed3b26b8847df37950634494990043',bytes:2672};assert.deepEqual(packet.previous_packet,previous);const previousRaw=physical(previous.path);assert.equal(hash(previousRaw),previous.sha256);assert.equal(previousRaw.length,previous.bytes);const prior=JSON.parse(previousRaw),rows=packet.branches[line].transitions;assert.deepEqual(rows.map(row=>row.path),['scripts/historical_inventory_rebinding.py','scripts/inventory-reference-proposal.mjs']);assert.deepEqual(rows[0],prior.branches[line]);
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};for(const k of Object.keys(env))if(k.startsWith('GIT_')&&!['GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_TERMINAL_PROMPT'].includes(k))delete env[k];
 for(const row of rows){assert.equal(row.before.path,row.path);assert.equal(row.after.path,row.path);assert.match(row.source_parent,/^[0-9a-f]{40}$/);const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',row.source_parent+':'+row.path],{cwd:root,env,maxBuffer:1024*1024});assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);let pos=0,parts=[];for(const e of row.edits){assert.deepEqual(Object.keys(e).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(e.offset)&&e.offset>=pos);const old=Buffer.from(e.before);assert.ok(before.subarray(e.offset,e.offset+old.length).equals(old));parts.push(before.subarray(pos,e.offset),Buffer.from(e.after));pos=e.offset+old.length;}const after=Buffer.concat([...parts,before.subarray(pos)]);assert.equal(hash(after),row.after.sha256);assert.equal(after.length,row.after.bytes);}

 const bound=[{path:SELF,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:PIN,bytes:packetRaw.length},previous,...rows.map(row=>({...row.after}))];let active=false;const sweep=()=>{for(const ref of bound){const raw=physical(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}assert.ok(physical(SELF).equals(image));};const assertCurrent=()=>{assert.equal(active,false,'reentrant inventory successor');active=true;try{sweep();for(const ref of bound){const raw=physical(ref.path);const supplied=read(ref.path);assert.ok(Buffer.isBuffer(supplied));assert.ok(raw.equals(supplied),'nonphysical inventory successor');assert.ok(raw.equals(physical(ref.path)));}sweep();}finally{active=false;}};
 const qualify=ref=>{const row=rows.find(item=>item.path===ref?.path);if(!row)return null;assert.ok(ref.sha256===row.before.sha256||ref.sha256===row.after.sha256,'unknown inventory verifier predecessor');const prior=ref.sha256===row.before.sha256?row.before:row.after;if(ref.bytes!==undefined)assert.equal(ref.bytes,prior.bytes);return {...ref,sha256:row.after.sha256,...(ref.bytes===undefined?{}:{bytes:row.after.bytes})};};assertCurrent();return{bound:structuredClone(bound),qualify,assertCurrent};
}
