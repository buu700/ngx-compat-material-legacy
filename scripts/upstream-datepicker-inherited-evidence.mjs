/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash,randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {lstatSync,readFileSync,realpathSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual as eq} from 'node:util';
import {readEvidenceMember,validatePackedConsumerRun} from './upstream-packed-run-evidence.mjs';
import {datepickerInheritedRequirements,checkOriginalPatch,checkSourceProposals} from './datepicker-inherited-identities.mjs';
import {selectInheritedNativeProfile} from './inherited-native-profiles.mjs';
import {evaluateDatepickerRows} from '../testing/datepicker-inherited/contracts-fixture.mjs';
import {datepickerCaseResults} from './datepicker-inherited-live-evidence.mjs';
const image=readFileSync(fileURLToPath(import.meta.url));
const prior=Object.freeze({
 '0d36e863ba6752596b6cee5810b5d953d536a9a9':'8e6aa4f0a4db8289c5eaac8fec682cc28a168f45c33e777f49875000781e8f0d',
 '2d5942cb0fe86f9c3d26b1925b1d4390cfc6613b':'d7b66e9e7cca9f60e151dc430b7232f5a05bf28caf49cebf1cb201d581ffe8b2',
 '5db8dca18b5967c203a5898dfa713ff03d9e7134':'b7690b2926974219224396e1bbb3a99ddf7c1efd36c38c5f36baf9e8c8f2fe81',
 'e8b28fa6ba15f536e72d13c0b22765924efaf1f6':'ad4407ba7328d17e0ef9bfb09b0ff2cc4cd3f9793cb62b2dee4dc068821a0c01',
});
const cache=new Map(),hash=x=>createHash('sha256').update(x).digest('hex'),need=(v,m)=>{if(!v)throw Error(m)};
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
export {datepickerInheritedRequirements};
export function validateDatepickerInherited({root,entry,proof,request,line}){
 try{
  const subject=datepickerInheritedRequirements(entry?.sha,line);need(subject,'unknown datepicker SHA or line');
  need(proof?.proof_kind==='main-datepicker-inherited-native'&&eq(proof.affected_branches,['main'])&&proof.diff_sha256===subject.patch&&entry.diff_sha256===subject.patch,'wrong finite proof');
  need(proof.reachable_behavior?.kind==='executed-delegation'&&proof.reachable_behavior.id==='datepicker-inherited-native/'+entry.sha,'wrong case delegation');
  need(hash(Buffer.from(stable(entry.prior_disposition_record)))===prior[entry.sha],'prior source judgment changed');
  checkOriginalPatch(root,entry.sha,line,readEvidenceMember);checkSourceProposals(root,readEvidenceMember);
  need(readEvidenceMember(root,'scripts/upstream-datepicker-inherited-evidence.mjs').equals(image),'loaded validator changed');
  const runtime=validatePackedConsumerRun({root,request});need(runtime.ok,'current packed run rejected: '+runtime.detail);
  need(typeof request.invocation==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(request.invocation),'invalid coordinator invocation');
  const runDir=resolve(request.runDir),outDir=join(runDir,'evidence','upstream-audit-disposition',request.invocation);need(realpathSync(runDir)===runDir&&resolve(request.outputDir)===outDir,'wrong coordinator output directory');for(const p of [runDir,join(runDir,'evidence'),join(runDir,'evidence','upstream-audit-disposition'),outDir]){const st=lstatSync(p);need(st.isDirectory()&&!st.isSymbolicLink(),'invalid coordinator output directory');}
  const profile=selectInheritedNativeProfile(root),key=JSON.stringify([runDir,request.runId,request.invocation,request.binding,runtime.library,profile.id]);let live=cache.get(key);
  if(!live){
   const run=JSON.parse(readEvidenceMember(runDir,'run.json')),lib=run.artifacts.find(x=>x.id==='library'),nonce=randomBytes(32).toString('hex');
   const child=spawnSync(process.execPath,[join(root,'scripts/datepicker-inherited-native-run.mjs'),join(runDir,lib.path),runtime.library.sha256,outDir,nonce],{cwd:root,env:{PATH:process.env.PATH,HOME:process.env.HOME,CHROME_BIN:profile.browser,NODE_PATH:'',NODE_OPTIONS:'',LANG:'C.UTF-8'},encoding:'utf8',timeout:720000,maxBuffer:24*1024*1024});
   need(child.status===0&&!child.signal&&!child.error,'datepicker producer failed: '+String(child.error?.message||child.stderr||child.status).slice(-1500));const observation=JSON.parse(child.stdout);
   need(observation.kind==='datepicker-inherited-live-native'&&observation.nonce===nonce&&observation.artifact_sha256===runtime.library.sha256&&observation.source_commit===request.binding.source_commit&&observation.source_tree===request.binding.source_tree&&observation.toolchain_profile===profile.id&&observation.fixture_exit_code===0&&observation.fixture_signal===null,'wrong producer/run binding');
   need(eq(Object.keys(observation.results).sort(),['zoneful','zoneless'])&&Object.values(observation.results).every(r=>r.browser===profile.browser_product&&r.rows?.nonce===nonce),'wrong browser observations');
   const all_cases=datepickerCaseResults(observation.results,nonce);
   const output=`datepicker-live-${nonce}.json`,bytes=Buffer.from(JSON.stringify({run_id:request.runId,invocation_id:request.invocation,binding:request.binding,...observation,all_cases})+'\n');writeFileSync(join(outDir,output),bytes,{flag:'wx'});
   live={output,sha256:hash(bytes),bytes:bytes.length,nonce,run_id:request.runId,invocation_id:request.invocation,library:runtime.library,results:observation.results,all_cases};cache.set(key,live);
  }
  need(hash(readFileSync(join(outDir,live.output)))===live.sha256,'live evidence changed');
  // Only this subject is decided: a failed range cell must not fan out.
  const cases=Object.fromEntries(['zoneless','zoneful'].map(mode=>[mode,evaluateDatepickerRows(entry.sha,live.results[mode].rows,live.nonce)]));
  const passed=Object.values(cases).every(x=>x.baseline===true&&x.negative===true);
  need(readEvidenceMember(root,'scripts/upstream-datepicker-inherited-evidence.mjs').equals(image),'loaded validator changed');
  return {ok:passed,execution:'live-packed-native-datepicker',detail:passed?'Named datepicker observations passed in this current packed run; fixture faults are controls, not upstream mutations. Full browser, audit, security and G11 remain separate.':'Subject-specific browser/type contract failed; raw evidence retained.',output:live.output,sha256:live.sha256,bytes:live.bytes,nonce:live.nonce,run_id:live.run_id,invocation_id:live.invocation_id,library:live.library,cases};
 }catch(error){return {ok:false,detail:error.message};}
}
