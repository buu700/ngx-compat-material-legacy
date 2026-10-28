/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current graph and real title lifecycle on synthetic DOM; no native credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,realpathSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {componentConfigGraph} from './component-config-caller-contracts.mjs';
import {inspectDialogTitleOriginalSubject} from './dialog-title-original-subject.mjs';
import {measureDialogTitleReplacement} from './dialog-title-replacement-contract.mjs';
const SOURCE=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const SOURCE_TOOLS=[
 'scripts/dialog-title-original-subject.mjs','scripts/component-config-caller-contracts.mjs',
 'scripts/dialog-title-replacement-contract.mjs','scripts/dialog-title-source-context.mjs',
 'scripts/upstream-dialog-title-native-evidence.mjs',
 'scripts/upstream-browser-run-evidence.mjs','scripts/upstream-packed-run-evidence.mjs',
 'scripts/dialog-title-lifetime-fixture.mjs','scripts/browser-required-cells.mjs',
 'scripts/browser-required-probe.js','scripts/browser-matrix-acceptance.mjs',
 'scripts/browser-matrix-roster.mjs','scripts/browser-peer-versions.mjs',
 'scripts/packed-consumer-evidence.mjs','scripts/rc-verify.py',
 'compatibility/rc/matrices/full-verify.json','testing/legacy-runner/historical-inventory.json',
];

export async function measureDialogTitleCanonicalSource({root=SOURCE}={}){
 assert.equal(resolve(root),SOURCE,'title source measurement must use its own checkout');
 const bound=new Map(),read=path=>{
  const raw=readFileSync(join(root,path));
  bound.set(path,{path,sha256:hash(raw),bytes:raw.length});return raw;
 };
 const lock=JSON.parse(read('toolchain-lock.json'));assert.equal(process.version,'v'+lock.repository.node);
 const original=inspectDialogTitleOriginalSubject({root,read});
 // Use the existing dialog owner's18 selected callers. The general component
 // and configuration-impact captures describe different source populations.
 const priorRaw=read('compatibility/rc/dialog-caller-prior.json.gz');
 assert.equal(hash(priorRaw),'ffd0915b98cba04e203fb0ef2b5ea4ce64c0601737e080ee9e833d111deea5d5');
 const prior=JSON.parse(gunzipSync(priorRaw));assert.equal(prior.line,'21.x');assert.equal(prior.selected.length,18);
 const graph=componentConfigGraph({root,read,selected:prior.selected});assert.equal(graph.sources.size,49);
 const lifecycle=await measureDialogTitleReplacement({root});assert.equal(lifecycle.line,'21.x');
 const recordedPath='compatibility/rc/21x-c04-dialog-title-replacement-measurement-21x.json';
 assert.deepEqual(lifecycle,JSON.parse(read(recordedPath)),'fresh title lifecycle differs from reviewed execution');
 for(const member of [...lifecycle.input_members,lifecycle.producer,...original.bound]){
  const raw=read(member.path);assert.equal(hash(raw),member.sha256);if(member.bytes!==undefined)assert.equal(raw.length,member.bytes);
 }
 for(const path of SOURCE_TOOLS)read(path);
 // Bind the resolved public entry programs actually used by the diagnostic.
 // This is finite runtime-source identity, not whole peer-package certification.
 const require=createRequire(join(root,'package.json'));
 for(const [specifier,pkg]of [
  ['@angular/core','@angular/core'],['@angular/compiler','@angular/compiler'],
  ['@angular/cdk/a11y','@angular/cdk'],['@angular/cdk/platform','@angular/cdk'],
  ['@angular/cdk/dialog','@angular/cdk'],['@angular/cdk/portal','@angular/cdk'],
  ['@angular/material/dialog','@angular/material'],['rxjs','rxjs'],
  ['rxjs/operators','rxjs'],['typescript','typescript'],
 ]){
  const base=realpathSync(join(root,'node_modules',pkg)),entry=realpathSync(require.resolve(specifier));
  const tail=relative(base,entry);assert.ok(tail&&!tail.startsWith('../')&&!tail.startsWith('/'));
  read('node_modules/'+pkg+'/'+tail);read('node_modules/'+pkg+'/package.json');
 }
 const producer='scripts/dialog-title-canonical-source.mjs';read(producer);
 for(const member of bound.values()){const raw=readFileSync(join(root,member.path));assert.equal(hash(raw),member.sha256,'changed during title measurement '+member.path);assert.equal(raw.length,member.bytes);}
 original.assertCurrent();
 return {schema_version:1,line:'21.x',result:'pass',node:process.version,
  scope:'Whole original patch plus fresh current source graph and synthetic title lifecycle; native and complete semantic/floor qualification remain separate',
  original:original.result,graph:{source_members:[...graph.sources].map(([path,text])=>({path,sha256:hash(text),bytes:Buffer.byteLength(text)})),
   routes:[...graph.routes],metadata:graph.metadata,edges:graph.edges,peers:graph.peers},
  lifecycle,input_members:[...bound.values()],canonical_decisions_changed:0,
  fresh_lifecycle_executed:true,complete_49_member_semantic_program_executed:false,
  actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await measureDialogTitleCanonicalSource();
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 else console.log(JSON.stringify(result));
}
