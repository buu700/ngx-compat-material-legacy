/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Whole actual build helper and support writer; compiler/linker protocols only.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {isolatedHarnessInputs} from '../scripts/bundle-consumer-harness.mjs';
import {assertEngineFreeHarnessInputs} from '../scripts/consumer-animation-engine.mjs';
import {retainMigratedConsumer,MIGRATED_CONSUMER_SUPPORT} from '../scripts/migrated-consumer-support.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript'),esbuild=require('esbuild');
const raw=readFileSync(join(root,'scripts/check-companion-computed-styles.mjs'),'utf8'),file=ts.createSourceFile('build.mjs',raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
assert.equal(file.parseDiagnostics.length,0);
const fn=file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='buildLab');assert.ok(fn);
const scratch=mkdtempSync(join(tmpdir(),'migrated-build-protocol-'));let cases=0,negativeControls=0;
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
try{
 const consumer=join(scratch,'consumer');mkdirSync(consumer);let compilerExit=0,input='export const ready = true;',metafileRequested=false;
 const spawnSync=(command,args,options)=>{
   assert.equal(command,process.execPath);assert.deepEqual(args.slice(1),['-p','tsconfig.json']);assert.equal(options.cwd,consumer);
   const config=JSON.parse(readFileSync(join(consumer,'tsconfig.json')));assert.equal(config.compilerOptions.skipLibCheck,false);assert.equal(config.compilerOptions.strict,true);assert.equal(config.angularCompilerOptions.strictTemplates,true);
   mkdirSync(join(consumer,'out'),{recursive:true});writeFileSync(join(consumer,'out/main.js'),input);
   return {status:compilerExit,stderr:compilerExit?'injected compiler failure':'',stdout:''};
 };
 const bundled={version:esbuild.version,async build(options){metafileRequested=options.metafile;return esbuild.build({...options,plugins:[]});}};
 const createLinkerRequire=()=>name=>name==='@babel/core'?{transformSync(){throw new Error('synthetic input must need no linking');}}:name==='@angular/compiler-cli/linker/babel'?{default(){}}:{needsLinking:()=>false};
 const makeBuild=module=>new Function('mkdirSync','writeFileSync','readFileSync','join','root','spawnSync','require','createRequire','isolatedHarnessInputs','assertEngineFreeHarnessInputs','sha256','labSource',fn.getText(file).replace(/^export\s+/,'')+';return buildLab;')
   (mkdirSync,writeFileSync,readFileSync,join,root,spawnSync,()=>module,createLinkerRequire,isolatedHarnessInputs,assertEngineFreeHarnessInputs,sha256,()=>{throw new Error('explicit migrated application required');});
 const build=makeBuild(bundled),version={typescript:'6.0.3'};
 const receipt=await build(consumer,{},version,'export const migrated = true;',{strictDeclarations:true,engineFree:true});
 assert.equal(metafileRequested,true);assert.equal(receipt.input_paths_confined,true);assert.equal(receipt.bundle_sha256,sha256(readFileSync(join(consumer,'dist/app.js'))));assert.deepEqual(receipt.inputs.map(x=>x.path),['out/main.js']);cases++;
 compilerExit=1;await assert.rejects(()=>build(consumer,{},version,'export {};',{strictDeclarations:true,engineFree:true}),/ngc failed/);negativeControls++;compilerExit=0;
 await assert.rejects(()=>makeBuild({...bundled,version:'0.0.0'})(consumer,{},version,'export {};',{strictDeclarations:true,engineFree:true}),/pinned tool/);negativeControls++;
 const engine=join(consumer,'node_modules/@angular/animations');mkdirSync(engine,{recursive:true});writeFileSync(join(engine,'engine.js'),'export const forbidden = true;');
 input="import {forbidden} from '../node_modules/@angular/animations/engine.js'; console.log(forbidden);";
 await assert.rejects(()=>build(consumer,{},version,'export {};',{strictDeclarations:true,engineFree:true}),/animation engine entries/);negativeControls++;
 writeFileSync(join(scratch,'outside.js'),'export const outside=true;');input="import {outside} from '../../outside.js'; console.log(outside);";
 await assert.rejects(()=>build(consumer,{},version,'export {};',{strictDeclarations:true,engineFree:true}),/outside the consumer/);negativeControls++;
 input='export const ready = true;';await build(consumer,{},version,'export {};',{strictDeclarations:true,engineFree:true});
 for(const path of Object.values(MIGRATED_CONSUMER_SUPPORT))if(!existsSync(join(consumer,path))){mkdirSync(dirname(join(consumer,path)),{recursive:true});writeFileSync(join(consumer,path),'Synthetic support '+path);}
 const runDir=join(scratch,'run');mkdirSync(runDir);const inputRun={runDir,request:{outputDir:join(runDir,'evidence/migration-packaged/one')}};
 const support=retainMigratedConsumer(consumer,inputRun,receipt);assert.equal(Object.keys(support).length,8);
 for(const record of Object.values(support)){const bytes=readFileSync(join(runDir,record.path));assert.equal(record.sha256,sha256(bytes));assert.equal(record.bytes,bytes.length);}cases++;
 const before=readFileSync(join(runDir,support.application.path));assert.throws(()=>retainMigratedConsumer(consumer,inputRun,receipt),/EEXIST/);assert.deepEqual(readFileSync(join(runDir,support.application.path)),before);negativeControls++;
 await assert.rejects(async()=>retainMigratedConsumer(consumer,{runDir,request:{outputDir:join(scratch,'escape')}},receipt),/leaves its invocation/);negativeControls++;
 symlinkSync(join(scratch,'consumer'),join(runDir,'evidence/migration-packaged/linked'),'dir');assert.throws(()=>retainMigratedConsumer(consumer,{runDir,request:{outputDir:join(runDir,'evidence/migration-packaged/linked')}},receipt),/symlink/);negativeControls++;
 console.log(JSON.stringify({cases,negative_controls:negativeControls,compiler_protocol:true,real_esbuild:esbuild.version,scope:'Whole actual buildLab plus actual retention writer. Synthetic compiler/linker and JavaScript input; no Angular compile, artifact install, full migrated consumer or native/browser product execution.'}));
}finally{rmSync(scratch,{recursive:true,force:true});}
