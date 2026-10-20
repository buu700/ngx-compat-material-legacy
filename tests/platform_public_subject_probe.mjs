/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Independent complete declaration/public-service evidence for Platform callers. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),ts=createRequire(import.meta.url)('typescript'),loaded=prepareMaterialPublicSubjects(root);
const contract=`import {Injector,PLATFORM_ID,ProviderToken,inject,runInInjectionContext} from '@angular/core';
import {Platform} from '@angular/cdk/platform';
export function calls(platform:Platform,injector:Injector){
 const token:ProviderToken<Platform>=Platform,browser:boolean=platform.isBrowser;
 const created=Injector.create({providers:[Platform,{provide:PLATFORM_ID,useValue:'browser'}]});
 const optional:Platform|null=runInInjectionContext(created,()=>inject(Platform,{optional:true}));
 const direct:Platform|null=injector.get(Platform,null);
 return {token,browser,optional,direct};
}
export function retainedHistoricalSlot(platform?:Platform){return platform;}
`;
const result={schema_version:1,line:JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',node:process.version,typescript:ts.version,type_subjects:[],runtime_subjects:[],inputs:[],actual_full_peer_component_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
try{
 for(const model of loaded.models){
  const file=join(model.root,'platform-contract.ts');writeFileSync(file,contract);
  const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,strict:true,skipLibCheck:false,noEmit:true,types:[]},program=ts.createProgram([file],options),diagnostics=ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
  const checker=program.getTypeChecker(),source=program.getSourceFile(file),binding=source.statements.find(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='@angular/cdk/platform').importClause.namedBindings.elements[0],symbol=checker.getAliasedSymbol(checker.getSymbolAtLocation(binding.name)),declarations=symbol.getDeclarations();assert.equal(symbol.name,'Platform');assert.equal(declarations.length,1);assert.ok(ts.isClassDeclaration(declarations[0]));
  assert.ok(!symbol.getJsDocTags(checker).some(t=>['deprecated','docs-private','breaking-change'].includes(t.name)));
  const field=checker.getPropertyOfType(checker.getDeclaredTypeOfSymbol(symbol),'isBrowser');assert.ok(field);assert.ok(!field.getJsDocTags(checker).some(t=>['deprecated','docs-private','breaking-change'].includes(t.name)));
  const property=field.getDeclarations()[0];assert.ok(!property.modifiers?.some(m=>[ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.ProtectedKeyword].includes(m.kind)));assert.equal(checker.typeToString(checker.getTypeOfSymbolAtLocation(field,property)),'boolean');
  const calls=[];let explicitConstructors=0;
  function visit(node){if(ts.isNewExpression(node)&&node.expression.getText(source)==='Platform')explicitConstructors++;if(ts.isCallExpression(node)){
   const sig=checker.getResolvedSignature(node);assert.ok(sig);const d=sig.declaration;if(d?.getSourceFile().fileName.includes('/node_modules/@angular/')){const tags=sig.getJsDocTags();assert.ok(!tags.some(t=>['deprecated','breaking-change'].includes(t.name)),'unsupported public call '+node.expression.getText(source));calls.push({expression:node.expression.getText(source),declaration_sha256:hash(d.getText(d.getSourceFile()))});}
  }ts.forEachChild(node,visit);}visit(source);assert.equal(explicitConstructors,0);
  result.type_subjects.push({line:model.line,Core:model.packages.get('@angular/core').version,CDK:model.packages.get('@angular/cdk').version,strict:true,skipLibCheck:false,diagnostics:0,public_class_sha256:hash(declarations[0].getText(declarations[0].getSourceFile())),public_isBrowser_sha256:hash(property.getText(property.getSourceFile())),public_isBrowser_type:'boolean',public_class_and_member_nondeprecated:true,explicit_Platform_constructor_calls:0,public_calls:calls});
  const worker=join(model.root,'platform-public-subject.mjs');writeFileSync(worker,read('tests/platform_caller_roles_public_subject.mjs'));
  const child=spawnSync(process.execPath,[worker],{cwd:model.root,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});assert.equal(child.status,0,(child.stdout+'\n'+child.stderr).slice(-9000));const runtime=JSON.parse(child.stdout.trim().split('\n').at(-1));assert.equal(runtime.cases.length,13);assert.equal(runtime.explicit_Platform_constructor_calls,0);result.runtime_subjects.push({line:model.line,...runtime});
  if(model.line==='original'){
   const text=model.sources.get('@angular/material/fesm2022/core.mjs'),source=ts.createSourceFile('tagged-core.mjs',text,ts.ScriptTarget.Latest,true),cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='NativeDateAdapter');assert.ok(cls);const ctor=cls.members.find(ts.isConstructorDeclaration);assert.ok(ctor);assert.equal(ctor.parameters.length,2);assert.equal(ctor.parameters[1].name.getText(source),'_platform');let references=0;const scan=n=>{if(ts.isIdentifier(n)&&n.text==='_platform')references++;ts.forEachChild(n,scan);};scan(ctor);assert.equal(references,1);result.untouched_original_date_parameter={source:'@angular/material/fesm2022/core.mjs',version:model.packages.get('@angular/material').version,file_sha256:hash(text),constructor_sha256:hash(ctor.getText(source)),parameter:'_platform',body_references:0};
  }
 }
 const tagged=result.runtime_subjects.find(s=>s.line==='original');for(const current of result.runtime_subjects.filter(s=>s!==tagged))assert.equal(isDeepStrictEqual(current.cases,tagged.cases),true,'public Platform observations differ '+current.line);
 const capsule=JSON.parse(read('compatibility/rc/material-public-subjects.json')),paths=[...new Set(['compatibility/rc/material-public-subjects.json','compatibility/rc/element-ref-public-subjects.json','scripts/material-public-subjects.mjs','tests/platform_public_subject_probe.mjs','tests/platform_caller_roles_public_subject.mjs',...capsule.subjects.flatMap(s=>s.members.map(m=>m.path))])];result.inputs=paths.map(path=>({path,sha256:hash(read(path))}));
 result.public_factory_cases=39;result.original_comparison='Actual untouched16.2.14 public service observations,not candidate expectations.';result.borrowed_runtime=loaded.models.map(m=>({line:m.line,borrowed:m.borrowed}));result.scope='Public service token identity,isBrowser field and ordinary provider resolution only. No compatibility constructor invocation,application,component,viewport/dialog/date behavior,native,packed or full consumer/Node/Rx/compiler/peer-floor qualification.';
 const out=process.argv[2];assert.ok(out);writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line:result.line,strict_models:3,genuine_public_factory_cases:39,original_date_parameter_ignored:true,explicit_compatibility_constructor_calls:0,full_floor_qualified:false}));
}finally{loaded.dispose();}
