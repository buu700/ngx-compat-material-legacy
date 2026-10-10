/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {rippleDelegationLifetimeFixture} from '../scripts/ripple-delegation-lifetime-fixture.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const compilerPath=process.env.CLOSEOUT_TYPESCRIPT_ROOT?join(resolve(process.env.CLOSEOUT_TYPESCRIPT_ROOT),'lib/typescript.js'):require.resolve('typescript');
const compiler=require(compilerPath),hash=value=>createHash('sha256').update(value).digest('hex');
if(process.env.CLOSEOUT_TYPESCRIPT_ROOT)assert.equal(compiler.version,JSON.parse(readFileSync(join(process.env.CLOSEOUT_TYPESCRIPT_ROOT,'package.json'))).version);
const paths=['ripple/ripple-renderer.ts','ripple/ripple-ref.ts','ripple/ripple-event-manager.ts','internal/dom/shadow-dom.ts'];
const loaded=prepareMaterialPublicSubjects(root),results=[];
try {
 const coercionBytes=readFileSync(join(root,'compatibility/rc/ripple-coercion-type-subjects.json'));
 assert.equal(hash(coercionBytes),'83989d0ed634d110a3b1f48c4e9e5e15760e940852702f4063d22f06f9c01643');
 const coercion=JSON.parse(coercionBytes);
 for(const model of loaded.models.filter(model=>model.line!=='original')){
  const typeSubject=coercion.subjects.find(subject=>subject.line===model.line);
  assert.equal(typeSubject.version,model.packages.get('@angular/cdk').version);
  for(const member of typeSubject.members){
   const raw=gunzipSync(Buffer.from(member.gzip_base64,'base64'));assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);
   const destination=join(model.root,'node_modules/@angular/cdk',member.module_path);
   if(member.module_path==='package.json')assert.equal(hash(readFileSync(destination)),member.sha256);
   else{mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,raw);}
  }
  const base=join(model.root,'owned-ripple');
  for(const path of paths){const destination=join(base,path);mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,readFileSync(join(root,'projects/ngx-material-legacy/legacy-core',path)));}
  const header=`import {Component,ViewChild,TemplateRef,ViewContainerRef,ElementRef,NgZone,Injector,inject,signal,afterNextRender} from '@angular/core';
import {Platform} from '@angular/cdk/platform';
import {LegacyRippleRenderer} from './ripple/ripple-renderer';
import {LegacyRippleRef,LegacyRippleState} from './ripple/ripple-ref';\n`;
  const file=join(base,'fixture.ts');
  const options={strict:true,noEmit:true,skipLibCheck:false,types:[],target:compiler.ScriptTarget.ES2022,
    module:compiler.ModuleKind.ESNext,moduleResolution:compiler.ModuleResolutionKind.Bundler,experimentalDecorators:true,lib:['lib.es2022.d.ts','lib.dom.d.ts']};
  const check=source=>{writeFileSync(file,header+source);return compiler.getPreEmitDiagnostics(compiler.createProgram([file],options));};
  assert.deepEqual(check(rippleDelegationLifetimeFixture).map(d=>compiler.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
  const wrongZone=rippleDelegationLifetimeFixture.replace('private readonly zone = inject(NgZone);',"private readonly zone = 'invalid';");
  const wrongPlatform=rippleDelegationLifetimeFixture.replace('this.zone, node, this.platform)','this.zone, node, {})');
  for(const invalid of[wrongZone,wrongPlatform]){assert.notEqual(invalid,rippleDelegationLifetimeFixture);assert.ok(check(invalid).some(d=>d.code===2345));}
  results.push({line:model.line,strict_compiler:compiler.version,negative_checks:2,whole_actual_owned_renderer_ref_manager_helper_checked:true,
    genuine_public_core_and_cdk_declarations:true,legacy_declaration_protocols:false,fixture_AOT_compiled:false});
 }
 const report={schema_version:1,node:process.version,compiler:compiler.version,compiler_source_sha256:hash(readFileSync(compilerPath)),
  producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),shared_fixture_sha256:hash(rippleDelegationLifetimeFixture),
  source_bindings:paths.map(path=>({path:'projects/ngx-material-legacy/legacy-core/'+path,sha256:hash(readFileSync(join(root,'projects/ngx-material-legacy/legacy-core',path)))})),
  public_namespace_capsule_sha256:loaded.capsule_hash,results,
  coercion_type_capsule_sha256:hash(readFileSync(join(root,'compatibility/rc/ripple-coercion-type-subjects.json'))),
  scope:'Complete shared native fixture and actual whole owned renderer/ref/manager/shadow-helper TypeScript, checked under genuine minimum Core/CDK declarations. No owned declaration replacement protocols. Wrong genuine zone/platform dependencies fail. No Angular AOT or actual runtime/view/iframe/native/packed/consumer/floor execution.'};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({subjects:2,negative_checks:4,strict_compiler:compiler.version,native_or_runtime_executed:false}));
}finally{loaded.dispose();}
