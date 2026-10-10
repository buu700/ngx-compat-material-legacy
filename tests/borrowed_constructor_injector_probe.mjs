/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Three owned bounded contexts under authentic entire Core namespaces and strict types. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(join(root,p),'utf8');
const helperPaths=['internal/public-constructor-context.ts','legacy-table/internal/public-constructor-context.ts','legacy-tabs/internal/public-constructor-context.ts'].map(p=>'projects/ngx-material-legacy/'+p);
const sources=helperPaths.map(read);assert.ok(sources.every(source=>source===sources[0]),'shared helper copies diverged');
const productPaths=execFileSync('rg',['--files','projects/ngx-material-legacy','--glob','*.ts','--glob','!*.spec.ts'],{cwd:root,encoding:'utf8'}).trim().split('\n');
const callers=[];
for(const path of productPaths) {
  const text=read(path),source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);
  const imported=source.statements.find(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text.endsWith('/public-constructor-context'));
  if(!imported)continue;
  assert.ok(imported.importClause.namedBindings.elements.some(n=>n.name.text==='constructWithPublicDependencies'));
  const helperPath=join(dirname(path),imported.moduleSpecifier.text+'.ts');assert.ok(helperPaths.includes(helperPath));
  const visit=n=>{if(ts.isCallExpression(n)&&n.expression.getText(source)==='constructWithPublicDependencies'){
    assert.equal(n.arguments.length,3);assert.equal(n.arguments[1].getText(source),'new.target');assert.ok(ts.isArrayLiteralExpression(n.arguments[2]));
    let cls=n;while(cls&&!ts.isClassDeclaration(cls))cls=cls.parent;assert.ok(cls);
    const emitted=cls.members.filter(member=>ts.isPropertyDeclaration(member)&&!member.modifiers?.some(m=>m.kind===ts.SyntaxKind.StaticKeyword||m.kind===ts.SyntaxKind.DeclareKeyword));
    assert.equal(emitted.length,0,'object-return constructor skips owned fields');
    const ctor=cls.members.find(ts.isConstructorDeclaration);assert.ok(ctor);
    assert.ok(ctor.parameters.every(parameter=>!parameter.modifiers?.some(m=>[ts.SyntaxKind.PublicKeyword,ts.SyntaxKind.ProtectedKeyword,ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.ReadonlyKeyword].includes(m.kind))), 'parameter properties skipped');
    callers.push({file:path.slice('projects/ngx-material-legacy/'.length),source_sha256:hash(text),class:cls.name.text,helper:helperPath.slice('projects/ngx-material-legacy/'.length),parent:n.arguments[0].getText(source),providers:n.arguments[2].getText(source),constructor:ctor.getText(source)});
  }ts.forEachChild(n,visit);};visit(source);
}
assert.equal(callers.length,14);assert.equal(callers.filter(c=>c.helper.startsWith('legacy-table')).length,12);assert.equal(callers.filter(c=>c.helper.startsWith('legacy-tabs')).length,2);
const loaded=prepareMaterialPublicSubjects(root),results=[],types=[],mutants=[];
const worker=read('tests/borrowed_constructor_injector_subject.mjs');
const emit=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const before=JSON.parse(read('compatibility/rc/borrowed-constructor-injector-before-diagnostic.json'));
assert.ok(sources.every(source=>hash(emit(source))===before.source.emitted_sha256),'typing change altered runtime JavaScript');
try {for(const model of loaded.models) {
  const files=sources.map((source,index)=>{const path=join(model.root,'helper-'+index+'.ts');writeFileSync(path,source);return path;});
  const fixture=join(model.root,'borrowed-consumer.ts');writeFileSync(fixture,`import {InjectionToken,inject} from '@angular/core';
import {constructWithPublicDependencies} from './helper-0';
const token=new InjectionToken<{marker:string}>('value');
class Parent {value=inject(token);}
class Child extends Parent {}
const result:Parent=constructWithPublicDependencies(Parent,Child,[{provide:token,useValue:{marker:'supplied'}}]);
// @ts-expect-error The public parent must have a zero-argument constructor.
constructWithPublicDependencies(class Required {constructor(required:string){}},Child,[]);
// @ts-expect-error The new target is a constructor function, not an arbitrary object.
constructWithPublicDependencies(Parent,{},[]);
// @ts-expect-error The finite helper accepts value providers, not factory providers.
constructWithPublicDependencies(Parent,Child,[{provide:token,useFactory:()=>({marker:'bad'})}]);
`);
  const program=ts.createProgram([...files,fixture],{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,strict:true,noEmit:true,skipLibCheck:false,types:[],lib:['lib.es2022.d.ts','lib.dom.d.ts']});
  const diagnostics=ts.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,ts.formatDiagnostics(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
  const checker=program.getTypeChecker(),lookups=[];
  for(const file of files) {const source=program.getSourceFile(file);const visit=n=>{if(ts.isCallExpression(n)&&n.expression.getText(source)==='Injector.NULL.get'){
    const signature=checker.getResolvedSignature(n);assert.ok(signature);assert.ok(!signature.getJsDocTags().some(t=>t.name==='deprecated'),'deprecated NULL get signature');
    lookups.push({call:n.getText(source),signature:signature.getDeclaration().getText(signature.getDeclaration().getSourceFile())});
  }ts.forEachChild(n,visit);};visit(source);}
  assert.equal(lookups.length,3);types.push({line:model.line,strict:true,skipLibCheck:false,diagnostics:0,negative_types:3,nondeprecated_fallback_gets:lookups});
  const workerPath=join(model.root,'borrowed-subject.mjs');writeFileSync(workerPath,worker);
  for(const [index,source] of sources.entries())writeFileSync(join(model.root,'borrowed-helper-'+index+'.mjs'),emit(source));
  for(const mode of ['development','production'])results.push({...JSON.parse(execFileSync(process.execPath,[workerPath,model.line,mode],{cwd:model.root,encoding:'utf8',timeout:15000})),borrowed:model.borrowed});
  for(let index=0;index<3;index++) for(const [id,before,after] of [
    ['borrowed-services-destroyed','  return runInInjectionContext(context, () => Reflect.construct(parent, [], target));',
      '  const owning = Injector.create({providers});\n  try {return runInInjectionContext(owning, () => Reflect.construct(parent, [], target));} finally {owning.destroy();}'],
    ['new-target-discarded','Reflect.construct(parent, [], target)','Reflect.construct(parent, [], parent)'],
  ]) {
    const source=sources[index].replace(before,after);assert.notEqual(source,sources[index]);const path=join(model.root,'borrowed-helper-'+index+'.mjs');writeFileSync(path,emit(source));
    const result=spawnSync(process.execPath,[workerPath,model.line,'development'],{cwd:model.root,encoding:'utf8',timeout:15000});assert.notEqual(result.status,0);assert.match(result.stderr,/AssertionError/);
    mutants.push({line:model.line,helper:index,id,rejected:true});writeFileSync(path,emit(sources[index]));
  }
}
const report={schema_version:1,line:JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',node:process.version,compiler:ts.version,emitted_javascript_unchanged:true,emitted_sha256:before.source.emitted_sha256,helpers:helperPaths.map((path,index)=>({path,sha256:hash(sources[index]),source:sources[index],production_callers:callers.filter(c=>'projects/ngx-material-legacy/'+c.helper===path).map(c=>c.class)})),callers,types,results,mutants,namespace_capsule_sha256:loaded.capsule_hash,limits:['Three complete helper modules execute with genuine entire original/current Core namespaces. Parent classes and borrowed values are explicit protocols. Fourteen actual caller constructors are source-bound and have no skipped emitted instance fields/parameter properties.','No actual fourteen legacy/current parent classes, Angular node/factory/AOT, DOM paint, packed/native or complete supported runtime/compiler/RxJS floor qualification. The central helper has no production callers.'],g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({helpers:3,callers:callers.length,contexts:results.length,cases:results.reduce((n,r)=>n+r.cases.length,0),strict_type_subjects:types.length,whole_helper_mutants_rejected:mutants.length,actual_legacy_components_executed:false}));
} finally {loaded.dispose();}
