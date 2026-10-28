/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact test-side reconstruction of the per-file metadata guard successor. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function retainedTitleOwnerReference({root,read}){
 const path='scripts/packed-upstream-ledger-epoch.mjs';
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 const before=execFileSync('git',['--no-replace-objects','show','502e603604e9595d841c579d1e832320a58c717a:'+path],{cwd:root,env,maxBuffer:1024*1024});
 assert.equal(hash(before),'cc3f5fb9c9a65d9ec1dff90460ef4722285b478e9b34bf34f11466454bd6b38a');
 const from="  if(path===OWNER){assertTools();return Buffer.from(baseImage);}\n  if(path===TITLE_NATIVE_REGISTRY){assertTools();return Buffer.from(nativeBefore);}\n  if(path==='scripts/autocomplete-selection-native-subject.mjs'){assertTools();return original(root,path);}";
 const to="  if(path===OWNER){assert.equal(hash(read(path)),own.sha256,'changed current owner metadata source');return Buffer.from(baseImage);}\n  if(path===TITLE_NATIVE_REGISTRY){assert.equal(hash(read(path)),TITLE_NATIVE_AFTER,'changed current native metadata source');return Buffer.from(nativeBefore);}\n  if(path==='scripts/autocomplete-selection-native-subject.mjs'){\n   assert.equal(hash(read(path)),bound.find(member=>member.path===path).sha256,'changed current native-subject metadata source');return original(root,path);\n  }";
 const text=before.toString();assert.equal(text.split(from).length,2);
 let current=text.replace(from,to);
 for(const [a,b]of [
  ["function foreign(root,read){\n const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version;",
   "function foreign(root,read,allowMissing=false){\n let raw;try{raw=read('projects/ngx-material-legacy/package.json');}catch(error){if(allowMissing&&error.code==='ENOENT')return null;throw error;}\n const version=JSON.parse(raw).version;"],
  ['read=unwrap(root,read);const remote=foreign(root,read);return remote?remote.packedUpstreamLedgerRawRead({root,read}):read;',
   'read=unwrap(root,read);const remote=foreign(root,read,true);return remote?remote.packedUpstreamLedgerRawRead({root,read}):read;'],
 ]){assert.equal(current.split(a).length,2);current=current.replace(a,b);}
 for(const [a,b]of [
  ["const PACKET_HASH='87ac44ebc3d8c8fcf082803ecf4f6deac68b62ef349ce0d95c037dbb85e9cbea';",
   "const PACKET_HASH='87ac44ebc3d8c8fcf082803ecf4f6deac68b62ef349ce0d95c037dbb85e9cbea';\nconst FRAMES='compatibility/rc/21x-c04-dialog-title-replacement-retained-ledger-frames.json';\nconst FRAMES_HASH='1818801b7b603d2707fe7f2571dd5819edb7de12e259934bc71b24354c8fd456';"],
  [" assert.equal(resolve(root),ROOT,'wrong21.x canonical owner checkout');",
   " assert.equal(resolve(root),ROOT,'wrong21.x canonical owner checkout');\n const frameRaw=read(FRAMES);assert.equal(hash(frameRaw),FRAMES_HASH,'changed accepted ledger-frame catalog');\n const frames=JSON.parse(frameRaw);assert.equal(frames.schema_version,1);assert.equal(frames.line,'21.x');\n assert.equal(frames.frames.length,21);assert.equal(new Set(frames.frames.map(frame=>frame.sha256)).size,21);\n const ledgerRaw=read(LEDGER),currentHash=hash(ledgerRaw);\n assert.ok(frames.frames.some(frame=>frame.sha256===currentHash&&frame.bytes===ledgerRaw.length),'not an accepted complete ledger frame');"],
  [' const currentHash=hash(read(LEDGER)),body=JSON.parse(read(title.TITLE_REVIEW));',' const body=JSON.parse(read(title.TITLE_REVIEW));'],
  [' const bound=[own,{path:PACKET,sha256:PACKET_HASH,bytes:raw.length},...packet.source_members,packet.root_checker];',
   ' const bound=[own,{path:PACKET,sha256:PACKET_HASH,bytes:raw.length},{path:FRAMES,sha256:FRAMES_HASH,bytes:frameRaw.length},...packet.source_members,packet.root_checker];'],
  [" const bound=[{path:OWNER,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:PACKET_HASH,bytes:raw.length},...packet.source_members,packet.root_checker].map(member=>({...member,bytes:member.bytes??read(member.path).length}));",
   " const frameRaw=read(FRAMES);assert.equal(hash(frameRaw),FRAMES_HASH,'changed accepted ledger-frame catalog');\n const bound=[{path:OWNER,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:PACKET_HASH,bytes:raw.length},{path:FRAMES,sha256:FRAMES_HASH,bytes:frameRaw.length},...packet.source_members,packet.root_checker].map(member=>({...member,bytes:member.bytes??read(member.path).length}));"],
 ]){assert.equal(current.split(a).length,2);current=current.replace(a,b);}
 const expected=Buffer.from(current);assert.equal(read(path).equals(expected),true,'unreviewed owner change outside exact retained-verifier successor');
 return {path,sha256:hash(expected),bytes:expected.length};
}
