/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Strict generated-fixture type check with the real owned date sources and public peer declarations. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,mkdtempSync,symlinkSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve,delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
import {nativeDatePackedFixture} from '../scripts/native-date-packed-fixture.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
const declared=JSON.parse(read('projects/ngx-material-legacy/package.json')),line=declared.version.startsWith('21.')?'21.x':'main';
const candidates=process.env.NGX_NATIVE_DATE_DECLARATIONS?[process.env.NGX_NATIVE_DATE_DECLARATIONS]:[join(root,'node_modules'),...(process.env.NODE_PATH||'').split(delimiter).filter(Boolean)];
const modules=candidates.find(p=>['@angular/core','@angular/cdk','@angular/material'].every(name=>existsSync(join(p,name,'package.json'))));
assert.ok(modules,'Already available minimum peer declarations required; this check never installs dependencies');
const packages=['@angular/core','@angular/cdk','@angular/material'].map(name=>{
 const path=join(modules,name,'package.json'),raw=readFileSync(path),version=JSON.parse(raw).version;
 assert.equal(version,declared.peerDependencies[name].replace(/^\^/,''),'Wrong minimum declaration context for '+name);
 return {name,version,package_json_sha256:hash(raw)};
});
const temp=mkdtempSync(join(tmpdir(),'native-date-packed-types-'));
let loadedDeclarations;
try{
 symlinkSync(realpathSync(modules),join(temp,'node_modules'),'dir');
 const owned=['native-date-adapter.ts','native-date-module.ts'].map(name=>{
  const source=read('projects/ngx-material-legacy/legacy-core/internal/datetime/'+name);writeFileSync(join(temp,name),source);
  return {path:'projects/ngx-material-legacy/legacy-core/internal/datetime/'+name,sha256:hash(source)};
 });
 const facade="export {LegacyNativeDateAdapter} from './native-date-adapter';\nexport {LegacyNativeDateModule,MatLegacyNativeDateModule} from './native-date-module';\nexport {DateAdapter as LegacyDateAdapter,MAT_DATE_LOCALE as MAT_LEGACY_DATE_LOCALE,MAT_DATE_FORMATS as MAT_LEGACY_DATE_FORMATS,MAT_NATIVE_DATE_FORMATS as MAT_LEGACY_NATIVE_DATE_FORMATS} from '@angular/material/core';\n";
 const actualFacade=read('projects/ngx-material-legacy/legacy-core/public-api.ts').toString();
 for(const binding of ['DateAdapter as LegacyDateAdapter','MAT_DATE_LOCALE as MAT_LEGACY_DATE_LOCALE','MAT_DATE_FORMATS as MAT_LEGACY_DATE_FORMATS','MAT_NATIVE_DATE_FORMATS as MAT_LEGACY_NATIVE_DATE_FORMATS'])assert.ok(actualFacade.includes(binding));
 writeFileSync(join(temp,'owned-public.ts'),facade);
 const file=join(temp,'fixture.ts'),fixture=nativeDatePackedFixture();writeFileSync(file,fixture);
 const options={strict:true,skipLibCheck:false,noEmit:true,experimentalDecorators:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,types:[],baseUrl:temp,paths:{'@ngx-compat/material-legacy/legacy-core':['owned-public.ts']}};
 if(ts.version.startsWith('6.'))options.ignoreDeprecations='6.0';
 const program=ts.createProgram([file],options),diagnostics=ts.getPreEmitDiagnostics(program);
 const format=values=>ts.formatDiagnosticsWithColorAndContext(values,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>temp,getNewLine:()=> '\n'});
 assert.equal(diagnostics.length,0,format(diagnostics));
 loadedDeclarations=program.getSourceFiles().filter(source=>source.isDeclarationFile&&!source.fileName.includes('/typescript/')).map(source=>({path:source.fileName.replace(temp+'/', '').replace(realpathSync(modules)+'/','node_modules/'),sha256:hash(source.text)}));
 // Prove the observer is actually checked against the constructor and public adapter signatures.
 for(const [before,after] of [["new LegacyNativeDateAdapter('en-US',undefined)","new LegacyNativeDateAdapter(123,undefined)"],['adapter.createDate(2024,0,2)',"adapter.createDate('wrong',0,2)"]]){
  assert.ok(fixture.includes(before));writeFileSync(file,fixture.replace(before,after));
  const invalid=ts.getPreEmitDiagnostics(ts.createProgram([file],options));assert.ok(invalid.some(row=>row.file?.fileName===file&&row.code===2345),format(invalid));
 }
 const report={schema_version:1,line,node:process.version,typescript:ts.version,packages,owned_sources:owned,strict:true,skipLibCheck:false,diagnostics:0,constructor_and_method_type_mutants_rejected:2,
  declaration_members:loadedDeclarations,generated_fixture_sha256:hash(fixture),owned_sources_copied_verbatim:true,public_alias_subset_checked:true,
  actual_Angular_compiler_or_DI_executed:false,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({...report,declaration_members:loadedDeclarations.length}));
}finally{rmSync(temp,{recursive:true,force:true});}
