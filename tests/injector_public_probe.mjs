/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {reviewInjectorUses} from '../scripts/injector-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
const review=reviewInjectorUses({root}),worker=readFileSync(join(root,'tests/injector_public_subject.mjs'),'utf8');
const sourcePath='projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-base.ts',source=readFileSync(join(root,sourcePath),'utf8');
const sourceControls=[
 source.replace('Injector,','Injector as WrongInjector,'),
 source.replace(/Injector\.create\(\{\s*parent: userInjector \|\| this\._injector,\s*providers: \[\{provide: MatSnackBarConfig, useValue: config\}\],\s*\}\)/,'Injector.create([{provide: MatSnackBarConfig, useValue: config}], userInjector || this._injector)'),
 source.replace('userInjector || this._injector','this._injector || userInjector'),
 source.replace('useValue: config','useFactory: () => config'),
 source.replace('useValue: config','useValue: {...config}'),
 source.replace('useValue: snackBarRef','useValue: {...snackBarRef}'),
 source.replace('useValue: config.data','useValue: null'),
 source.replace('    const containerPortal = new ComponentPortal(','    injector.destroy();\n    const containerPortal = new ComponentPortal('),
 source.replace("      providers: [\n        {provide: MatSnackBarRef", "      name:'unreviewed-options',\n      providers: [\n        {provide: MatSnackBarRef"),
 source.replace('      const portal = new ComponentPortal(content, undefined, injector);','      injector.destroy();\n      const portal = new ComponentPortal(content, undefined, injector);'),
];
for(const mutant of sourceControls){assert.notEqual(mutant,source);assert.throws(()=>reviewInjectorUses({root,readSource:p=>p===sourcePath?mutant:readFileSync(join(root,p),'utf8')}));}
const wrapperPath='projects/ngx-material-legacy/legacy-menu/menu-content.ts',wrapper=readFileSync(join(root,wrapperPath),'utf8');
const wrongForward=wrapper.replace('super(template, appRef, injector, viewContainerRef, document, changeDetectorRef)','super(template, injector, appRef, viewContainerRef, document, changeDetectorRef)');assert.notEqual(wrongForward,wrapper);
assert.throws(()=>reviewInjectorUses({root,readSource:p=>p===wrapperPath?wrongForward:readFileSync(join(root,p),'utf8')}));
const dialogPath='projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts',dialog=readFileSync(join(root,dialogPath),'utf8');
const wrongGet=dialog.replace('injector.get(Dialog)','injector.get(Dialog, undefined, 8)');assert.notEqual(wrongGet,dialog);
assert.throws(()=>reviewInjectorUses({root,readSource:p=>p===dialogPath?wrongGet:readFileSync(join(root,p),'utf8')}));
const fixture=`import {Injector,InjectionToken,Provider,runInInjectionContext,inject} from '@angular/core';
class Service {marker='value';}
const token=new InjectionToken<Service>('fixture'),value=new Service();
const providers:Provider[]=[{provide:token,useValue:value},{provide:Service,useValue:value}];
const parent=Injector.create({providers,name:'service'}),child=Injector.create({providers:[],parent,name:'child'});
const typed:Injector=child;const byToken:Service=typed.get(token);const byClass:Service=typed.get(Service);
const injected:Service=runInInjectionContext(child,()=>inject(token));void [byToken,byClass,injected];
// @ts-expect-error Object parent must implement the Injector contract.
Injector.create({providers:[],parent:{}});
// @ts-expect-error Generic get retains the token's result domain.
const wrong:string=child.get(token);
// @ts-expect-error Object optional flags have a Boolean domain.
child.get(token,undefined,{optional:'yes'});
// @ts-expect-error The public Injector is abstract and cannot be constructed directly.
new Injector();
`;
const loaded=prepareMaterialPublicSubjects(root),declarations=[],results=[],typeChecks=[],mutations=[];
try{for(const model of loaded.models){
 const nodes=[...model.sources].filter(([p])=>p.startsWith('@angular/core/')&&p.endsWith('.d.ts')).flatMap(([p,text])=>{const file=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true);return file.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text==='Injector').map(node=>({path:p,text,file,node}));});assert.equal(nodes.length,1);
 const declaration=nodes[0],cls=declaration.node;assert.ok(!ts.getJSDocTags(cls).some(t=>['deprecated','docs-private','experimental','breaking-change'].includes(t.tagName.text)));
 const stable=n=>!ts.getJSDocTags(n).some(t=>['deprecated','docs-private','experimental','breaking-change'].includes(t.tagName.text));
 const create=cls.members.filter(n=>n.name?.getText(declaration.file)==='create'&&stable(n));assert.equal(create.length,1);assert.equal(create[0].parameters.length,1);assert.ok(ts.isTypeLiteralNode(create[0].parameters[0].type));
 const gets=cls.members.filter(n=>n.name?.getText(declaration.file)==='get'&&stable(n));assert.equal(gets.length,3);
 declarations.push({line:model.line,path:declaration.path,sha256:hash(declaration.text),whole:cls.getText(declaration.file),stable_object_create:create[0].getText(declaration.file),stable_generic_get_overloads:gets.map(n=>n.getText(declaration.file)),create_return:model.line==='original'?'Injector':'DestroyableInjector'});
 const file=join(model.root,'injector-public-contract.mts');writeFileSync(file,fixture);const options={strict:true,noEmit:true,skipLibCheck:false,types:[],lib:['lib.es2022.d.ts','lib.dom.d.ts'],target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext};
 const program=ts.createProgram([file],options),diagnostics=ts.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,ts.formatDiagnostics(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
 const checker=program.getTypeChecker(),resolved=[];const visit=n=>{if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&['create','get'].includes(n.expression.name.text)){
  let statement=n;while(statement.parent&&!ts.isStatement(statement))statement=statement.parent;
  if(statement.getFullText().includes('@ts-expect-error'))return;
  const signature=checker.getResolvedSignature(n);assert.ok(signature);
  assert.ok(!signature.getJsDocTags().some(t=>t.name==='deprecated'),'consumer selected deprecated overload');resolved.push(n.expression.name.text);
 }ts.forEachChild(n,visit);};visit(program.getSourceFile(file));typeChecks.push({line:model.line,compiler:ts.version,strict:true,skipLibCheck:false,diagnostics:0,expected_type_errors:4,fixture_sha256:hash(fixture),nondeprecated_resolved_calls:resolved.length});
 const workerPath=join(model.root,'injector-public-subject.mjs');writeFileSync(workerPath,worker);
 for(const mode of ['development','production']){const stdout=execFileSync(process.execPath,[workerPath,model.line,mode],{cwd:model.root,encoding:'utf8',timeout:10000});results.push({...JSON.parse(stdout.trim().split('\n').at(-1)),borrowed:model.borrowed});}
 const runtimes=[...model.sources].filter(([p,text])=>p.startsWith('@angular/core/')&&p.endsWith('.mjs')&&/class Injector\s*\{/.test(text));assert.equal(runtimes.length,1);const [runtimeKey,runtime]=runtimes[0],runtimeFile=ts.createSourceFile(runtimeKey,runtime,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const runtimeClass=runtimeFile.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='Injector');assert.ok(runtimeClass);
 const method=runtimeClass.members.find(n=>ts.isMethodDeclaration(n)&&n.name.getText(runtimeFile)==='create');assert.ok(method?.body);
 const prepend=text=>runtime.slice(0,method.body.getStart(runtimeFile)+1)+text+runtime.slice(method.body.getStart(runtimeFile)+1),runtimePath=join(model.root,'node_modules',runtimeKey);
 const controls=[['discard-object-parent','\nif (!Array.isArray(options)) options = {...options, parent: undefined};\n'],
  ['clone-supplied-useValue','\nif (!Array.isArray(options)) options = {...options, providers: options.providers.map(p => p.useValue && typeof p.useValue === "object" ? {...p, useValue: {...p.useValue}} : p)};\n']];
 for(const [id,body] of controls){writeFileSync(runtimePath,prepend(body));const result=spawnSync(process.execPath,[workerPath,model.line,'development'],{cwd:model.root,encoding:'utf8',timeout:10000});assert.notEqual(result.status,0,id+' escaped');assert.match(result.stderr,/AssertionError|No provider|NG0201/,id+' did not reach contract checks');mutations.push({line:model.line,id,rejected:true});}
 writeFileSync(runtimePath,runtime);
 }
 const report={schema_version:1,line:review.line,role:'Public Injector types, actual Core hierarchy/context/value ownership protocols and exact six caller source routes',node:process.version,compiler:ts.version,source_review:review,source_negative_controls:sourceControls.length+2,public_namespace_capsule_sha256:loaded.capsule_hash,declarations,typeChecks,results,mutations,producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),worker_sha256:hash(worker),limits:['Genuine entire original/minimum Core/Compiler namespaces execute with borrowed RxJS/tslib. Supplied values and class-token targets are explicit protocols; no actual legacy components, automatic node/application provider graphs, dialogs/snack/portal behavior, native/packed/AOT or full runtime/RxJS floor qualification.','The narrower current create result exposes destroy; authentic original runtime also has it. Calling it on a locally registered useValue can invoke that supplied value hook. The owned children contain existing values and do not add a child-destroy path.'],g11_claim:'not-passed'};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({uses:review.cases.length,current_named_imports:review.current_named_imports,pending_delta_uses:review.delta_inventory.length,contexts:results.length,cases:results.reduce((n,r)=>n+r.cases.length,0),strict_type_subjects:typeChecks.length,source_negative_controls:sourceControls.length+2,runtime_mutation_rejections:mutations.length,actual_legacy_components_executed:false,native_or_packed_executed:false}));
}finally{loaded.dispose();}
