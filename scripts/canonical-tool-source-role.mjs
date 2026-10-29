/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Resolve the actual checkout owner; no guessed tool before-image is current. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROLE='scripts/canonical-tool-source-role.mjs',OWNER='scripts/packed-upstream-ledger-epoch.mjs';
const INVENTORY='compatibility/rc/c04-inventory-owner-inputs.json';
const INVENTORY_MAIN='97db675e4fda1c6dd4a7f056159bd47e2aa963dddb9dff3da1af537ae062d15a';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const roleImage=readFileSync(fileURLToPath(import.meta.url));
function physical(root,path){
 let cursor=root;assert.ok(lstatSync(root).isDirectory()&&!lstatSync(root).isSymbolicLink());
 for(const part of path.split('/')){assert.ok(part&&part!=='.'&&part!=='..');cursor=join(cursor,part);assert.equal(lstatSync(cursor).isSymbolicLink(),false);}
 assert.ok(lstatSync(cursor).isFile());return readFileSync(cursor);
}
/** Qualify only the recorded main inventory tool transition, never its ledger. */
export function qualifyMainInventoryToolReference({root,read,prior}={}){
 root=resolve(root);if(prior?.path!==OWNER)return null;
 const supplied=read(OWNER);assert.ok(Buffer.isBuffer(supplied));
 // The existing exact literal comparisons include authenticated historical
 // metadata readers. Their unchanged comparison remains the caller's job.
 if(hash(supplied)===prior.sha256){if(prior.bytes!==undefined)assert.equal(supplied.length,prior.bytes);return null;}
 const bound=[];
 const member=path=>{const actual=physical(root,path),provided=read(path);assert.ok(Buffer.isBuffer(provided));assert.ok(provided.equals(actual),'nonphysical main inventory tool input '+path);bound.push({path,sha256:hash(actual),bytes:actual.length});return actual;};
 const manifest=JSON.parse(member('projects/ngx-material-legacy/package.json'));assert.match(manifest.version,/^22\./);
 const raw=member(INVENTORY);assert.equal(hash(raw),INVENTORY_MAIN,'changed main inventory tool packet');const packet=JSON.parse(raw);
 assert.equal(packet.schema_version,1);assert.equal(packet.line,'main');assert.equal(packet.old_program_execution,false);
 for(const name of ['source_admissions_changed','canonical_dispositions_changed','product_changes'])assert.equal(packet[name],0);
 assert.equal(packet.actual_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 assert.equal(packet.before_owner.path,OWNER);assert.equal(packet.after_owner.path,OWNER);assert.equal(prior.sha256,packet.before_owner.sha256,'unknown main inventory tool reference');
 if(prior.bytes!==undefined)assert.equal(prior.bytes,packet.before_owner.bytes);
 assert.match(packet.source_parent,/^[0-9a-f]{40}$/);
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet.source_parent+':'+OWNER],{cwd:root,env,maxBuffer:1024*1024});
 assert.equal(hash(before),packet.before_owner.sha256);assert.equal(before.length,packet.before_owner.bytes);
 let expected=before.toString();assert.ok(packet.owner_literal_edits.length>0);
 for(const edit of packet.owner_literal_edits){assert.equal(expected.split(edit.before).length,2,'ambiguous main inventory tool edit');expected=expected.replace(edit.before,edit.after);}
 assert.equal(hash(expected),packet.after_owner.sha256);assert.equal(Buffer.byteLength(expected),packet.after_owner.bytes);
 const actual=member(OWNER);assert.equal(actual.toString(),expected,'unqualified main inventory tool successor');
 assert.ok(member(ROLE).equals(roleImage),'loaded and actual main tool-reference helper differ');
 const assertCurrent=()=>{for(const ref of bound){const actual=physical(root,ref.path),provided=read(ref.path);assert.ok(Buffer.isBuffer(provided)&&provided.equals(actual),'nonphysical or late main inventory tool input '+ref.path);assert.equal(hash(actual),ref.sha256,'late main inventory tool change '+ref.path);assert.equal(actual.length,ref.bytes);}};
 assertCurrent();return {reference:{path:OWNER,sha256:packet.after_owner.sha256,bytes:packet.after_owner.bytes},bound,assertCurrent,
  literal_tool_transition_only:true,historical_code_executed:false,old_tool_bytes_exposed:false,old_product_bytes_exposed:false,
  canonical_metadata_admission_granted:false,canonical_dispositions_changed:0,current_native_or_packed_qualified:false,g11_claim:'not-passed'};
}

import * as localOwner from './packed-upstream-ledger-epoch.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
export function qualifyCanonicalToolReference(args){
 const root=resolve(args.root),owner=root===ROOT?localOwner:require(join(root,'scripts/packed-upstream-ledger-epoch.mjs'));
 if(typeof owner.qualifyCanonicalToolReference==='function')return owner.qualifyCanonicalToolReference(args);
 assert.match(JSON.parse(args.read('projects/ngx-material-legacy/package.json')).version,/^22\./,'21.x requires its canonical tool owner');
 return qualifyMainInventoryToolReference({...args,root});
}
