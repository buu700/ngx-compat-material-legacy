/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash,randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync,lstatSync,realpathSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';
import {readEvidenceMember,validatePackedConsumerRun} from './upstream-packed-run-evidence.mjs';
import {assertCase} from './csp-ssr-roster.mjs';
import {parseCspSsrStdout,serverObservation} from './csp-ssr-run.mjs';

const SHA='5c75bbecb24f49779baf86203a7e626d34e39f8c',PATCH='2b31e6ee1fdc01542447af016839614bf703cd142d165b96f80727ea98425c40';
const CASE='csp-ssr/main/server/dom-free-server-and-leaks/render/table-window-scroll',KIND='main-window-table-ssr-inherited';
const SCOPE='compatibility/rc/window-table-ssr-inherited-scope-main.json',SCOPE_SHA='d9953360d7d278d1285d88ff645ac715548e68e95005cb7276f4db98e3653f73';
const hash=b=>createHash('sha256').update(b).digest('hex'),need=(x,m)=>{if(!x)throw Error(m)};
const SELF='scripts/upstream-window-ssr-evidence.mjs',LOADED_IMAGE=readFileSync(fileURLToPath(import.meta.url));
export function windowSsrRequirements(sha,line){return sha===SHA&&line==='main'?{sha,patch:PATCH,kind:KIND,case_id:CASE}:null;}
function outputDirectoryOk(request){
 try{
  if(!request||typeof request.runDir!=='string'||typeof request.outputDir!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(request.invocation||''))return false;
  const base=resolve(request.runDir),expected=join(base,'evidence','upstream-audit-disposition',request.invocation);
  if(realpathSync(base)!==base||resolve(request.outputDir)!==expected)return false;
  for(const path of [base,join(base,'evidence'),join(base,'evidence','upstream-audit-disposition'),expected]){const s=lstatSync(path);if(!s.isDirectory()||s.isSymbolicLink())return false;}
  return true;
 }catch{return false;}
}
export function validateWindowSsr({root,entry,proof,request,line}){
 try{
  const expected=windowSsrRequirements(entry?.sha,line);
  need(expected&&proof?.proof_kind===KIND&&proof.diff_sha256===PATCH&&isDeepStrictEqual(proof.affected_branches,['main']),'wrong window SSR subject');
  need(proof.reachable_behavior?.kind==='executed-delegation'&&proof.reachable_behavior.id===CASE,'wrong window SSR delegation');
  const scopeBytes=readEvidenceMember(root,SCOPE);need(hash(scopeBytes)===SCOPE_SHA,'changed window SSR scope');const scope=JSON.parse(scopeBytes);
  const check=()=>{need(readEvidenceMember(root,SELF).equals(LOADED_IMAGE),'loaded window validator changed');for(const {path,sha256} of scope.members)need(hash(readEvidenceMember(root,path))===sha256,'window source changed: '+path);};check();
  const runtime=validatePackedConsumerRun({root,request});need(runtime.ok,'packed run not accepted: '+runtime.detail);need(outputDirectoryOk(request),'invalid window SSR output directory');
  const manifest=JSON.parse(readEvidenceMember(request.runDir,'run.json'));const lib=manifest.artifacts.find(x=>x.id==='library');need(lib&&typeof lib.path==='string','missing packed library');
  const tar=readEvidenceMember(request.runDir,lib.path);need(hash(tar)===runtime.library.sha256,'packed library changed');
  const nonce=randomBytes(16).toString('hex'),env={PATH:process.env.PATH,HOME:process.env.HOME,NODE_OPTIONS:'',LANG:'C.UTF-8'};
  const child=spawnSync(process.execPath,[join(root,'scripts/csp-ssr-window-producer.mjs'),join(request.runDir,lib.path),runtime.library.sha256,nonce],{cwd:root,env,encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024});
  need(child.status===0&&!child.error&&!child.signal,'window producer failed: '+String(child.error?.message||child.stderr||child.status).slice(-1000));
  const result=JSON.parse(child.stdout);need(result.kind==='window-ssr-live'&&result.nonce===nonce&&result.artifact_sha256===runtime.library.sha256&&result.case_id===CASE,'wrong live window identity');
  need(result.package_image&&isDeepStrictEqual(result.package_image.before,result.package_image.after)
    &&result.package_image.before.artifact_sha256===runtime.library.sha256&&Number.isSafeInteger(result.package_image.before.files)
    &&result.package_image.before.files>0&&/^[0-9a-f]{64}$/.test(result.package_image.before.inventory_sha256||''),'unverified installed artifact image');
  for(const mode of ['current','instrumented','mutant']){
   const bundle=result.modes?.[mode]?.bundle;
   need(bundle&&bundle.mode===mode&&bundle.peer_sha256==='67ea7cb295583cb5ccf8d0472c6631cb10d7b81092dca8d7c46c46a9272bcfb4'&&/^[0-9a-f]{64}$/.test(bundle.bundle_sha256||''),'invalid window bundle identity');
  }
  need(new Set(['current','instrumented','mutant'].map(mode=>result.modes[mode].bundle.bundle_sha256)).size===3,'window variants not distinct');
  for(const mode of ['current','instrumented']){
   const x=result.modes?.[mode];need(x&&x.status===0&&!x.signal&&!x.error,'window positive failed');
   const parsed=parseCspSsrStdout(x.stdout);const actual=serverObservation({code:x.status,...parsed});
   need(isDeepStrictEqual(actual,x.observation)&&assertCase(CASE,actual).length===0,'window positive observation invalid');
  }
  need(result.modes.instrumented.stderr.includes('__WINDOW_CTOR_GLOBAL__undefined'),'constructor global condition missing');
  const m=result.modes.mutant;need(m&&m.status===1&&!m.signal&&!m.error&&m.stderr.includes('__WINDOW_CTOR_GLOBAL__undefined')&&m.stderr.includes('ReferenceError: document is not defined')&&m.stderr.includes('new _CdkVirtualScrollableWindow'),'window mutant did not reproduce original global failure');
  check();need(hash(readEvidenceMember(request.runDir,lib.path))===runtime.library.sha256,'packed library drift after window render');
  const output='window-ssr-'+nonce+'.json',bytes=Buffer.from(JSON.stringify({run_id:request.runId,invocation_id:request.invocation,...result})+'\n');writeFileSync(join(request.outputDir,output),bytes,{flag:'wx'});
  return{ok:true,detail:'Exact public window viewport/native legacy table server composition and original-global negative executed; broader SSR remains separate.',execution:'live-packed-window-table-ssr',output,sha256:hash(bytes),nonce};
 }catch(error){return{ok:false,detail:error.message};}
}
