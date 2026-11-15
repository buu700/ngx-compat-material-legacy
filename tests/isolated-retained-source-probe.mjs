/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Run mutation probes in a private source image with its own fixed Git HEAD. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {copyFileSync,cpSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,realpathSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {basename,dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {retainedCurrentContextIdentity} from '../scripts/retained-current-context-identity.mjs';
import {retainedCurrentBuildContext} from '../scripts/retained-current-build-context.mjs';
import {retainedF10BuildSourceContext} from '../scripts/retained-f10-build-source-context.mjs';
import {inspectHarnessPreparation} from '../scripts/harness-animation-preparation-evidence.mjs';

const cleanEnvironment=()=>{const env={};for(const [key,value]of Object.entries(process.env))if(!key.startsWith('GIT_')&&key!=='RETAINED_SOURCE_PROBE_NONCE')env[key]=value;env.GIT_CONFIG_GLOBAL='/dev/null';env.GIT_CONFIG_SYSTEM='/dev/null';env.GIT_NO_REPLACE_OBJECTS='1';env.GIT_NO_LAZY_FETCH='1';env.GIT_TERMINAL_PROMPT='0';return env;};
const markerName='.retained-source-probe.json';
function verifyChild(mode,script){
 const root=realpathSync(process.cwd()),tmp=realpathSync(tmpdir()),nonce=process.env.RETAINED_SOURCE_PROBE_NONCE;
 assert.equal(dirname(root),tmp,'child must use a private temporary root');assert.match(basename(root),/^retained-source-probe-[a-zA-Z0-9]+$/);
 assert.match(nonce??'',/^[a-f0-9]{64}$/);const st=lstatSync(root),markerPath=join(root,markerName),markerStat=lstatSync(markerPath),gitDir=join(root,'.git'),gitStat=lstatSync(gitDir);
 assert.ok(st.isDirectory()&&!st.isSymbolicLink());assert.equal(st.mode&0o777,0o700);assert.ok(markerStat.isFile()&&!markerStat.isSymbolicLink());assert.equal(markerStat.mode&0o777,0o600);assert.ok(gitStat.isDirectory()&&!gitStat.isSymbolicLink());
 if(process.getuid){assert.equal(st.uid,process.getuid());assert.equal(markerStat.uid,process.getuid());}
 const marker=JSON.parse(readFileSync(markerPath));assert.deepEqual(Object.keys(marker).sort(),['head','mode','nonce','script']);assert.equal(marker.nonce,nonce);assert.equal(marker.mode,mode);assert.equal(marker.script,script);assert.match(marker.head,/^[a-f0-9]{40}$/);
 const env=cleanEnvironment(),args=['--git-dir',gitDir,'--work-tree',root,'rev-parse'];assert.equal(execFileSync('git',[...args,'HEAD'],{cwd:root,env,encoding:'utf8'}).trim(),marker.head);assert.equal(realpathSync(execFileSync('git',[...args,'--git-common-dir'],{cwd:root,env,encoding:'utf8'}).trim()),gitDir);
}
export function runInIsolatedCheckout(mode,script,additionalDiscover){
 if(process.argv.includes('--isolated-retained-child')){verifyChild(mode,script);return false;}
 const root=process.cwd(),seen=new Set(),read=p=>{seen.add(p);return readFileSync(join(root,p));},env=cleanEnvironment();
 const git=(args,opts={})=>execFileSync('git',args,{cwd:root,env,encoding:'utf8',...opts}).trim();
 const head=git(['rev-parse','HEAD']),common=resolve(root,git(['rev-parse','--git-common-dir']));
 if(mode==='harness')inspectHarnessPreparation(read);
 else{
  const current=retainedCurrentContextIdentity({root,read}),currentProductPaths=current.products.map(r=>r.path);
  if(mode==='build'){
   const body=JSON.parse(read('compatibility/rc/packed-upstream-source-build-main-e184.json'));
   retainedCurrentBuildContext({root,read,body,currentProductPaths}).assertCurrent();
  }else if(mode==='f10'){
   const body=JSON.parse(read('compatibility/f10/disposition-ledger/evidence/closeout-fourteen-build-scope-review.json'));
   const scope=retainedF10BuildSourceContext({root,read,body,currentProductPaths}),ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
   const entry=ledger.entries.find(e=>e.sha==='ff4f9a093715b9552f2c2dfa1cb69656c70db182');scope.assertEntry(entry.sha,entry);
  }else throw new Error('unknown isolated retained probe '+mode);
 }
 if(additionalDiscover!==undefined){assert.equal(typeof additionalDiscover,'function');additionalDiscover(read);}
 if(git(['rev-parse','HEAD'])!==head)throw new Error('source HEAD changed during fixture discovery');
 const scratch=mkdtempSync(join(realpathSync(tmpdir()),'retained-source-probe-'));
 try{
  for(const dir of ['scripts','tests','testing','projects/ngx-material-legacy'])cpSync(join(root,dir),join(scratch,dir),{recursive:true,verbatimSymlinks:true});
  symlinkSync(join(root,'node_modules'),join(scratch,'node_modules'),'dir');
  for(const path of seen){const target=join(scratch,path);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(root,path),target);}
  const gitDir=join(scratch,'.git'),gitArgs=['--git-dir',gitDir,'--work-tree',scratch];
  execFileSync('git',[...gitArgs,'init','--quiet'],{cwd:scratch,env});mkdirSync(join(gitDir,'objects/info'),{recursive:true});writeFileSync(join(gitDir,'objects/info/alternates'),join(common,'objects')+'\n');
  execFileSync('git',[...gitArgs,'update-ref','HEAD',head],{cwd:scratch,env});
  const nonce=randomBytes(32).toString('hex');writeFileSync(join(scratch,markerName),JSON.stringify({head,mode,nonce,script}),{mode:0o600,flag:'wx'});
  const output=execFileSync(process.execPath,[script,'--isolated-retained-child'],{cwd:scratch,env:{...env,RETAINED_SOURCE_PROBE_NONCE:nonce},encoding:'utf8',maxBuffer:16*1024*1024});process.stdout.write(output);
 }finally{rmSync(scratch,{recursive:true,force:true});}
 return true;
}
