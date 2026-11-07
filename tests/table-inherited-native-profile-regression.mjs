/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,chmodSync,existsSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {extractPackageArchive} from '../scripts/safe-package-extract.mjs';
import {selectInheritedNativeProfile} from '../scripts/inherited-native-profiles.mjs';
import {tableCases,tableFaultControls,TABLE_SHAS} from '../testing/table-inherited/contracts.mjs';

// The approved interpreter, not an earlier PATH executable, must do extraction.
test('archive extraction uses selected absolute Python',()=>{
 const temp=mkdtempSync(join(tmpdir(),'table-python-control-')),old=process.env.PATH;
 try {
  const profile=selectInheritedNativeProfile(process.cwd()),marker=join(temp,'marker'),bad=join(temp,'python3');
  writeFileSync(bad,`#!/bin/sh\ntouch '${marker}'\nexit 99\n`);chmodSync(bad,0o755);process.env.PATH=temp+':'+old;
  const again=selectInheritedNativeProfile(process.cwd());assert.equal(again.python,profile.python);
  const archive=join(temp,'good.tgz');const build=spawnSync(again.python,['-c',"import tarfile,io,sys; t=tarfile.open(sys.argv[1],'w:gz'); b=b'ok'; m=tarfile.TarInfo('package/file'); m.size=len(b); t.addfile(m,io.BytesIO(b)); t.close()",archive]);assert.equal(build.status,0);
  extractPackageArchive(archive,join(temp,'out'),{pythonExecutable:again.python});
  assert.equal(readFileSync(join(temp,'out/package/file'),'utf8'),'ok');assert.equal(existsSync(marker),false);
 } finally {process.env.PATH=old;rmSync(temp,{recursive:true,force:true})}
});

test('cached table reentry rechecks browser and PATH',async()=>{
 const temp=mkdtempSync(join(tmpdir(),'table-cache-control-')),oldPath=process.env.PATH,oldChrome=process.env.CHROME_BIN;
 const profile=selectInheritedNativeProfile(process.cwd()),run=join(temp,'run'),output=join(run,'evidence/upstream-audit-disposition/abc');mkdirSync(output,{recursive:true});
 const sha='a'.repeat(64),sampleError='Error: Could not find a matching row definition for the provided row data: {"id":"A"}',sample={first:{ids:['A','B'],indices:[0,1],dom:['A','B'],peer_identity:true,owned_identity:true},empty:{ids:[],dom:[]},restored:{ids:['C'],indices:[0],dom:['C']},duplicate_error:'Error: There can only be one default row without a when predicate function. Or set `multiTemplateDataRows`.',duplicate_multi:null,missing_error:{error:sampleError,defs:2,delivery:{channel:'window-error',message:sampleError}},missing_match:{error:null,defs:2,delivery:null},standalone_compiled:true};let calls=0;
 writeFileSync(join(run,'run.json'),JSON.stringify({artifacts:[{id:'library',path:'lib.tgz'}]}));
 mock.module('../scripts/upstream-packed-run-evidence.mjs',{exports:{readEvidenceMember:(root,path)=>readFileSync(join(root,path)),validatePackedConsumerRun:()=>({ok:true,library:{sha256:sha}})}});
 mock.module('node:child_process',{exports:{spawnSync:(_node,args)=>{calls++;const nonce=args.at(-1),observation={...sample,nonce};return {status:0,stdout:JSON.stringify({kind:'table-inherited-live-native',nonce,artifact_sha256:sha,observation,browser:profile.browser_product,toolchain_profile:profile.id,source_before:{},source_after:{},tool_before:{},tool_after:{},toolchain_verified_before_and_after:true,toolchain_record_sha256:'ad74c81bd537a16a7324cd440ad3b36e9788030d21a0ad1bc1ab36772f26e503',aot_positive:0,aot_missing_module_negative:1,aot_negative_has_ng8002:true,aot_negative_diagnostic:'NG8002',aot_readonly_negative:1,aot_readonly_has_ts2339:true,aot_readonly_diagnostic:'TS2339',cases:tableCases(observation),controls:tableFaultControls(observation),controls_are_upstream_mutations:false})}}}});
 try {
  const {tableInheritedRequirements,validateTableInherited}=await import('../scripts/upstream-table-inherited-evidence.mjs');const subject=TABLE_SHAS[0],req=tableInheritedRequirements(subject,'main'),entry={sha:subject},proof={proof_kind:req.kind,diff_sha256:req.patch,affected_branches:['main'],reachable_behavior:{kind:'executed-delegation',id:'table-inherited-native/'+subject}},request={runDir:run,outputDir:output,invocation:'abc',runId:'r'};const invoke=()=>validateTableInherited({root:process.cwd(),entry,proof,request,line:'main'});
  assert.equal(invoke().ok,true);assert.equal(calls,1);assert.equal(invoke().ok,true);assert.equal(calls,1);
  process.env.CHROME_BIN=join(temp,'missing-browser');assert.equal(invoke().ok,false);assert.equal(calls,1);process.env.CHROME_BIN=oldChrome;
  process.env.PATH=temp;assert.equal(invoke().ok,false);assert.equal(calls,1);process.env.PATH=oldPath;
  assert.equal(invoke().ok,true);assert.equal(calls,1);
 } finally {process.env.PATH=oldPath;process.env.CHROME_BIN=oldChrome;mock.restoreAll();rmSync(temp,{recursive:true,force:true})}
});
