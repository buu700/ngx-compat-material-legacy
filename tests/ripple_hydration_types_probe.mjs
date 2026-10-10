/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installHydrationServerPublicSubject} from '../scripts/hydration-server-public-subjects.mjs';
import {rippleHydrationComponentFixture} from '../scripts/ripple-hydration-component-fixture.mjs';
import {rippleHydrationApplication} from '../scripts/ripple-hydration-application.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const compilerPath=process.env.CLOSEOUT_TYPESCRIPT_ROOT?join(resolve(process.env.CLOSEOUT_TYPESCRIPT_ROOT),'lib/typescript.js'):require.resolve('typescript');
const compiler=require(compilerPath),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
if(process.env.CLOSEOUT_TYPESCRIPT_ROOT)assert.equal(compiler.version,JSON.parse(readFileSync(join(process.env.CLOSEOUT_TYPESCRIPT_ROOT,'package.json'))).version);
const paths=['ripple/ripple-renderer.ts','ripple/ripple-ref.ts','ripple/ripple-event-manager.ts','internal/dom/shadow-dom.ts'];
const loaded=prepareMaterialPublicSubjects(root),results=[];
try{
 const readCapsule=(path,expected)=>{const bytes=readFileSync(join(root,path));assert.equal(hash(bytes),expected);return JSON.parse(bytes);};
 const sdk=readCapsule('compatibility/rc/hydration-sdk-type-subjects.json','de0fab6095ea145c49686644e2aa64ffb84199deda6f16ce0637450a765ec3ed');
 const node=readCapsule('compatibility/rc/hydration-node-type-subjects.json','767c3604118e09b7150470179182ee65db03c40081d1fe805ec018ec8ddff2d7');
 const install=(model,subject)=>{assert.equal(subject.archive_sri_verified,true);for(const member of subject.members){
   assert.ok(!member.module_path.split('/').includes('..')&&!member.module_path.startsWith('/'));
   const raw=gunzipSync(Buffer.from(member.gzip_base64,'base64'));assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);
   const file=join(model.root,'node_modules',subject.name,member.module_path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,raw);
  }};
 const bytes=readFileSync(join(root,'compatibility/rc/ripple-coercion-type-subjects.json'));assert.equal(hash(bytes),'83989d0ed634d110a3b1f48c4e9e5e15760e940852702f4063d22f06f9c01643');
 const coercion=JSON.parse(bytes);
 for(const model of loaded.models.filter(model=>model.line!=='original')){
  const server=installHydrationServerPublicSubject(model,root);
  for(const subject of sdk.subjects.filter(subject=>subject.line===model.line))install(model,subject);
  for(const subject of node.subjects)install(model,subject);
  for(const member of coercion.subjects.find(subject=>subject.line===model.line).members){
   const raw=gunzipSync(Buffer.from(member.gzip_base64,'base64'));assert.equal(hash(raw),member.sha256);
   const file=join(model.root,'node_modules/@angular/cdk',member.module_path);
   if(member.module_path==='package.json')assert.equal(hash(readFileSync(file)),member.sha256);
   else{mkdirSync(dirname(file),{recursive:true});writeFileSync(file,raw);}
  }
  const base=join(model.root,'owned-hydration');
  for(const path of paths){const file=join(base,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,readFileSync(join(root,'projects/ngx-material-legacy/legacy-core',path)));}
  const header=`import {Component,ViewChild,ElementRef,NgZone,inject,signal,provideZonelessChangeDetection} from '@angular/core';
import {Platform} from '@angular/cdk/platform';
import {MatRipple as MatLegacyRipple,MatRippleModule as MatLegacyRippleModule} from '@angular/material/core';
import {LegacyRippleRenderer} from './ripple/ripple-renderer';
import {legacyGetEventTarget} from './internal/dom/shadow-dom';
import {bootstrapApplication,provideClientHydration,withEventReplay} from '@angular/platform-browser';
import {renderApplication,provideServerRendering} from '@angular/platform-server';\n`;
  const tail=`
const bootstrap= (context: import('@angular/platform-browser').BootstrapContext) => bootstrapApplication(RippleHydrationLab,
 {providers:[provideServerRendering(),provideClientHydration(withEventReplay()),provideZonelessChangeDetection()]},context);
renderApplication(bootstrap,{document:'<ripple-hydration-lab></ripple-hydration-lab>',url:'http://127.0.0.1:9999/',allowedHosts:['127.0.0.1']});\n`;
  const file=join(base,'fixture.ts'),options={strict:true,noEmit:true,skipLibCheck:false,types:[],target:compiler.ScriptTarget.ES2022,
    module:compiler.ModuleKind.ESNext,moduleResolution:compiler.ModuleResolutionKind.Bundler,experimentalDecorators:true,lib:['lib.es2022.d.ts','lib.dom.d.ts']};
  const check=source=>{writeFileSync(file,header+source+tail);return compiler.getPreEmitDiagnostics(compiler.createProgram([file],options));};
  assert.deepEqual(check(rippleHydrationComponentFixture).map(d=>compiler.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
  const invalid=rippleHydrationComponentFixture.replace('down(event: MouseEvent)','down(event: string)');assert.notEqual(invalid,rippleHydrationComponentFixture);
  assert.ok(check(invalid).some(d=>d.code===2345));
  const app=rippleHydrationApplication(model.line,'zoneless'),files=[];
  for(const[path,original]of Object.entries(app.files))if(path.endsWith('.ts')){
   const out=join(base,path);mkdirSync(dirname(out),{recursive:true});
   const source=path==='src/component.ts'?header+original.slice(original.indexOf('@Component')):original;
   // Source copies retain actual owned business classes; these imports change only their test location.
   const rewritten=source.replace("from './ripple/ripple-renderer'","from '../ripple/ripple-renderer'")
     .replace("from './internal/dom/shadow-dom'","from '../internal/dom/shadow-dom'");
   writeFileSync(out,rewritten);files.push(out);
  }
  const appOptions={...options,types:['node'],typeRoots:[join(model.root,'node_modules/@types')]};
  assert.deepEqual(compiler.getPreEmitDiagnostics(compiler.createProgram(files,appOptions))
    .map(d=>compiler.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
  const serverFile=join(base,'src/server.ts'),actualServer=readFileSync(serverFile,'utf8');
  writeFileSync(serverFile,actualServer.replace("allowedHosts: ['127.0.0.1']","allowedHosts: [42]"));
  assert.ok(compiler.getPreEmitDiagnostics(compiler.createProgram(files,appOptions)).some(d=>d.code===2322));
  results.push({line:model.line,compiler:compiler.version,server_subject:server,whole_owned_sources_and_genuine_core_cdk_material_server_types:true,
    whole_generated_browser_server_application_types:true,legacy_declaration_protocols:false,negative_checks:2,actual_AOT_compiled:false});
 }
 const report={schema_version:1,node:process.version,compiler:compiler.version,compiler_source_sha256:hash(readFileSync(compilerPath)),
  producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),shared_component_sha256:hash(rippleHydrationComponentFixture),results,
  generated_application_sha256:hash(readFileSync(join(root,'scripts/ripple-hydration-application.mjs'))),
  sdk_type_capsule_sha256:hash(readFileSync(join(root,'compatibility/rc/hydration-sdk-type-subjects.json'))),
  node_type_capsule_sha256:hash(readFileSync(join(root,'compatibility/rc/hydration-node-type-subjects.json'))),
  scope:'Strict complete shared component, owned renderer/ref/manager/helper and generated browser/config/server-bootstrap/Node server source under genuine current-minimum public Core/CDK/Material/Browser/Server/SSR/router and complete Node/Undici/Beasties declarations. Actual bootstrap context, replay providers and allowed-host types are checked; wrong event and host types fail. The existing MatLegacyRipple class/module identity is mapped to its independently proven public alias. No packed library, Angular AOT, client/browser/replay or full floors.'};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({subjects:2,negative_checks:4,compiler:compiler.version,native_AOT_or_packed_qualified:false}));
}finally{loaded.dispose();}
