/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const names=['RC_CHECK_ID','RC_RUN_ID','RC_INVOCATION_ID','RC_EVIDENCE_BINDING','RC_ASSERTION_OUTPUT_DIR'];
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!names.includes(key)));
const scratch=mkdtempSync(join(tmpdir(),'packed-consumer-source-'));
const cwd=join(scratch,'source');
const git=args=>{const r=spawnSync('git',['-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
const report={schema_version:1,role:'Real shared coordinator-request helper with a tiny committed copied-source Git fixture; no Angular install/build/interaction/packed product qualification.',cases:[],native_executed:false};
try{
 for(const p of ['scripts/packed-consumer-evidence.mjs','projects/ngx-material-legacy/package.json','compatibility/rc/fixed-report-catalog.json']){const dest=join(cwd,p);mkdirSync(dirname(dest),{recursive:true});copyFileSync(join(root,p),dest);}
 const manifest=JSON.parse(readFileSync(join(cwd,'projects/ngx-material-legacy/package.json'))),line=manifest.version.startsWith('21.')?'21.x':'main';report.line=line;
 writeFileSync(join(cwd,'scripts/request.mjs'),`import {coordinatorRequest} from './packed-consumer-evidence.mjs';import {writeFileSync} from 'node:fs';const request=coordinatorRequest(process.argv[2]);if(request?.error){console.error(request.error);process.exit(2);}if(request){writeFileSync(request.outputDir+'/producer-reached.txt','Valid request reached downstream producer');}console.log(JSON.stringify(request));`);
 git(['init','--quiet']);git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','--quiet','-m','Synthetic consumer coordinator fixture']);
 const binding={run_id:'source-fixture',source_commit:git(['rev-parse','HEAD']),source_tree:git(['rev-parse','HEAD^{tree}']),source_line:line,source_clean:true};
 for(const checkId of ['packed-consumer','engine-free-consumer']){
  let sequence=0;
  function run(id,changes={},expected=0,pattern){
   const invocation='identity-'+sequence++,out=join(scratch,checkId,id,'evidence',checkId,invocation);mkdirSync(out,{recursive:true});
   const r=spawnSync(process.execPath,['scripts/request.mjs',checkId],{cwd,encoding:'utf8',env:{...env,RC_CHECK_ID:checkId,RC_RUN_ID:binding.run_id,RC_INVOCATION_ID:invocation,RC_EVIDENCE_BINDING:JSON.stringify({...binding,...changes}),RC_ASSERTION_OUTPUT_DIR:out}});
   assert.equal(r.status,expected,id+': '+r.stderr);if(pattern)assert.match(r.stderr,pattern,id);assert.equal(existsSync(join(out,'producer-reached.txt')),expected===0,id+' must stop before downstream producer');report.cases.push({check_id:checkId,id,result:'pass',exit_code:r.status,producer_reached:expected===0});
  }
  run('clean-current-line');
  run('opposite-line',{source_line:line==='main'?'21.x':'main'},2,/source line/);
  run('false-clean-binding',{source_clean:false},2,/clean/);
  run('omitted-clean-binding',{source_clean:undefined},2,/clean/);
  const dirty=join(cwd,'untracked-source.txt');writeFileSync(dirty,'Uncommitted source');run('actual-untracked-dirty-source',{},2,/dirty/);rmSync(dirty);
  const tracked=join(cwd,'projects/ngx-material-legacy/package.json'),original=readFileSync(tracked);writeFileSync(tracked,Buffer.concat([original,Buffer.from('\n')]));run('actual-tracked-dirty-source',{},2,/dirty/);writeFileSync(tracked,original);
  run('clean-source-after-fixture-repair');
 }
 assert.equal(report.cases.length,14);
 const at=process.argv.indexOf('--report');if(at>=0){assert.equal(existsSync(process.argv[at+1]),false);writeFileSync(process.argv[at+1],JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({line:report.line,cases:report.cases.length,rejected:report.cases.filter(x=>x.exit_code===2).length,native_executed:false}));
}finally{rmSync(scratch,{recursive:true,force:true});}
