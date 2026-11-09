/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {installConsumer,compile,parseCspSsrStdout,serverObservation} from './csp-ssr-run.mjs';
import {assertCase} from './csp-ssr-roster.mjs';
import {bundleWindowServer} from './csp-ssr-window-bundle.mjs';
import {verifyWindowInstalledArtifact} from './csp-ssr-window-artifact-image.mjs';
import {npmToolingOptions} from './npm-tooling-options.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),hash=b=>createHash('sha256').update(b).digest('hex');
const id='csp-ssr/main/server/dom-free-server-and-leaks/render/table-window-scroll';
export async function runWindowConsumer(consumer,env){
 mkdirSync(join(consumer,'src'),{recursive:true});writeFileSync(join(consumer,'src/render-table-window-scroll.ts'),readFileSync(join(root,'testing/csp-ssr/window-table.ts')));
 compile(consumer,env,['src/render-table-window-scroll.ts'],'server-out');
 const preload=join(consumer,'window-preload.mjs');writeFileSync(preload,'globalThis.__cspDocumentBefore=typeof globalThis.document;\nglobalThis.__cspWindowBefore=typeof globalThis.window;\n');
 const modes={};
 for(const mode of ['current','instrumented','mutant']){
  const outfile=join(consumer,'window-'+mode+'.mjs'),bundle=await bundleWindowServer(consumer,mode,outfile);
  const child=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,outfile],{cwd:consumer,env,encoding:'utf8',timeout:30000});
  const parsed=parseCspSsrStdout(child.stdout||'');modes[mode]={bundle,status:child.status,signal:child.signal,error:child.error?.message||null,stdout:child.stdout||'',stderr:child.stderr||'',observation:serverObservation({code:child.status??1,...parsed})};
 }
 const current=modes.current,instrumented=modes.instrumented,mutant=modes.mutant;
 if(current.status!==0||instrumented.status!==0||assertCase(id,current.observation).length||assertCase(id,instrumented.observation).length||
  !instrumented.stderr.includes('__WINDOW_CTOR_GLOBAL__undefined')||mutant.status===0||mutant.status===null||mutant.signal||mutant.error||
  !mutant.stderr.includes('__WINDOW_CTOR_GLOBAL__undefined')||!mutant.stderr.includes('ReferenceError: document is not defined')||!mutant.stderr.includes('new _CdkVirtualScrollableWindow'))throw Error('window SSR positive or source-bound negative failed: '+JSON.stringify({current:{status:current.status,error:current.error,problems:assertCase(id,current.observation)},instrumented:{status:instrumented.status,error:instrumented.error,problems:assertCase(id,instrumented.observation),stderr:instrumented.stderr.slice(0,300)},mutant:{status:mutant.status,error:mutant.error,signal:mutant.signal,stderr:mutant.stderr.slice(0,500)}}));
 return{case_id:id,modes};
}
export async function executeWindowSsr(tarball,expectedSha,nonce){
 if(!/^[0-9a-f]{64}$/.test(expectedSha||'')||!/^[0-9a-f]{32}$/.test(nonce||'')||hash(readFileSync(tarball))!==expectedSha)throw Error('unbound artifact or nonce');
 if(process.versions.node!=='24.21.0')throw Error('wrong Node toolchain');
 const npm=spawnSync('npm',['--version'],npmToolingOptions({cwd:root,env:process.env,encoding:'utf8'},['--version']));
 if(npm.status!==0||npm.stdout.trim()!=='11.19.0')throw Error('wrong npm toolchain');
 const {consumer,env}=await installConsumer(tarball);
 for(const name of ['cdk','common','compiler','compiler-cli','core','forms','material','platform-browser','platform-browser-dynamic','platform-server']){
  const version=JSON.parse(readFileSync(join(consumer,'node_modules/@angular',name,'package.json'),'utf8')).version;
  if(version!=='22.1.7')throw Error('wrong peer '+name);
 }
 for(const [name,expected] of [['rxjs','7.8.2'],['tslib','2.8.1'],['typescript','6.0.3'],['zone.js','0.16.3']]){
  const version=JSON.parse(readFileSync(join(consumer,'node_modules',name,'package.json'),'utf8')).version;
  if(version!==expected)throw Error('wrong dependency '+name);
 }
 const imageBefore=verifyWindowInstalledArtifact(tarball,consumer,expectedSha);
 const result=await runWindowConsumer(consumer,env);
 const imageAfter=verifyWindowInstalledArtifact(tarball,consumer,expectedSha);
 if(JSON.stringify(imageBefore)!==JSON.stringify(imageAfter))throw Error('installed package image drift');
 if(hash(readFileSync(tarball))!==expectedSha||hash(readFileSync(join(consumer,'library.tgz')))!==expectedSha)throw Error('artifact drift');
 return{kind:'window-ssr-live',nonce,artifact_sha256:expectedSha,package_image:{before:imageBefore,after:imageAfter},...result};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 try{console.log(JSON.stringify(await executeWindowSsr(process.argv[2],process.argv[3],process.argv[4])));}catch(e){console.error(e.stack||String(e));process.exit(1);}
}
