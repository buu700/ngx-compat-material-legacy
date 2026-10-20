/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact caller-container repair; genuine public parents, explicit host/DOM protocols. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {prepareCoreViewSubjects} from './core-view-use-review.mjs';
const ts=createRequire(import.meta.url)('typescript');
export const digest=b=>createHash('sha256').update(b).digest('hex');
export const TAB_BODY='projects/ngx-material-legacy/legacy-tabs/tab-body.ts';
export const TAB_ADAPTER='projects/ngx-material-legacy/legacy-tabs/internal/tab-portal-construction-context.ts';
const priorPath='compatibility/rc/tab-portal-explicit-container-prior.json.gz';
const priorPins={main:'16683654c95bb2aadce2486d30fb8db08dfd9caca339a028b3e122adae6f4b43','21.x':'89f33221f1877f713d0ba552cb616db9607463f2aa551742fab03e452547e1ff'};
const declarations='compatibility/rc/tab-portal-explicit-container-declarations.json';
const repairedBody='bb9cbef0831ea50ebe4577e4bc50b5ea4d0e9b25f332aad6d872a7fdc5cec004';
const repairedAdapter='6e2047cb3efe6a8a26db692928c0f9f97d4cbc5fb701ae275ee23ad3850221d2';
const declarationPin='12015435c1e036f3ecc6511d2cfc253c441a16b02e887b450b27a568719e80af';
export function tabPortalPrior(root,{read=p=>readFileSync(join(root,p))}={}){
 const bytes=read(priorPath),line=Object.keys(priorPins).find(k=>priorPins[k]===digest(bytes));assert.ok(line,'changed tab portal preimages');const prior=JSON.parse(gunzipSync(bytes));assert.equal(prior.line,line);assert.equal(prior.preimages.length,6);
 for(const m of prior.preimages){assert.equal(digest(m.text),m.sha256);const original=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',prior.source_parent+':'+m.path],{cwd:root,maxBuffer:1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(digest(original),m.sha256);if(m.path!==TAB_BODY)assert.equal(digest(read(m.path)),m.sha256,'changed protected tab review source: '+m.path);}
 return prior;
}
export function portalClass(text,name='MatLegacyTabBodyPortal'){
 const source=ts.createSourceFile('portal.ts',text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0,'invalid portal source');const node=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name);assert.ok(node);const identifiers=new Set();function visit(n){if(ts.isIdentifier(n))identifiers.add(n.text);ts.forEachChild(n,visit);}visit(node);
 const imports=source.statements.filter(ts.isImportDeclaration).filter(n=>n.importClause?.namedBindings?.elements?.some(e=>identifiers.has(e.name.text))).map(n=>n.getText(source));
 return {source,node,text:imports.join('\n')+'\n'+node.getText(source)};
}
export function tabPortalSourceReview(root,options={}){
 const read=options.read??(p=>readFileSync(join(root,p))),prior=tabPortalPrior(root,{read}),before=prior.preimages.find(m=>m.path===TAB_BODY).text,after=read(TAB_BODY).toString(),old=portalClass(before),now=portalClass(after),helper=read(TAB_ADAPTER).toString();
 assert.equal(digest(after),repairedBody,'changed repaired tab portal source');assert.equal(digest(helper),repairedAdapter,'changed repaired constructor adapter');
 const importLine="import {constructLegacyTabBodyPortal} from './internal/tab-portal-construction-context';\n";
 assert.equal(after.split(importLine).length,2);assert.equal(after.replace(importLine,'').replace(now.node.getText(now.source),old.node.getText(old.source)),before,'unbounded tab source delta');
 const methods=n=>n.members.filter(ts.isMethodDeclaration).map(m=>m.getText());assert.deepEqual(methods(now.node),methods(old.node),'changed tab lifecycle methods');assert.equal(now.node.heritageClauses[0].getText(),'extends CdkPortalOutlet');
 const constructor=now.node.members.find(ts.isConstructorDeclaration);assert.equal(constructor.parameters.length,3);assert.ok(constructor.getText().includes('constructLegacyTabBodyPortal('));assert.ok(constructor.getText().includes('new.target, viewContainerRef, _document'));
 for(const name of ['_host','_centeringSub','_leavingSub'])assert.ok(constructor.getText().includes('outlet.'+name+' = '),'uninitialized returned-object field '+name);
 assert.ok(helper.includes('container.injector'));assert.ok(helper.includes('return this.parent.get(token, notFoundValue, options);'));assert.ok(helper.includes('Reflect.construct(CdkPortalOutlet, [], target)'));assert.ok(!helper.includes('destroy('));
 return {line:prior.line,source_parent:prior.source_parent,source_members:[TAB_BODY,TAB_ADAPTER].map(path=>({path,sha256:digest(read(path))})),unchanged_methods:methods(now.node).length,constructor_arguments:3,unchanged_style_members:prior.preimages.filter(m=>/\.(html|scss)$/.test(m.path)).map(({path,sha256})=>({path,sha256})),actual_legacy_parent_native_packed_or_floor_qualified:false};
}
export function prepareTabPortalSubjects(root){
 const loaded=prepareCoreViewSubjects(root);
 try{const raw=readFileSync(join(root,declarations));assert.equal(digest(raw),declarationPin);const capsule=JSON.parse(raw);assert.equal(capsule.subjects.length,3);
  for(const model of loaded.models){const subject=capsule.subjects.find(s=>s.line===model.line);assert.ok(subject);assert.deepEqual(subject.package,model.subject.packages.find(p=>p.name==='@angular/cdk'));
   for(const member of subject.members){assert.equal(member.path,'compatibility/rc/tab-portal-explicit-container-declarations/'+member.sha256+'.gz');const stored=readFileSync(join(root,member.path));assert.equal(digest(stored),member.stored_sha256);const bytes=gunzipSync(stored);assert.equal(digest(bytes),member.sha256);assert.equal(bytes.length,member.bytes);assert.equal(member.key,'@angular/cdk/'+member.archive_member.slice('package/'.length));const target=join(model.root,'node_modules',member.key);if(existsSync(target))assert.equal(digest(readFileSync(target)),member.sha256);else{mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);}if(model.sources.has(member.key))assert.equal(digest(model.sources.get(member.key)),member.sha256);else model.sources.set(member.key,bytes.toString());}
   model.tab_portal_declarations=subject;
  }return loaded;
 }catch(error){loaded.dispose();throw error;}
}
export function writeTabPortalRuntime(root,model){
 const prior=tabPortalPrior(root),current=portalClass(readFileSync(join(root,TAB_BODY),'utf8')).text,old=portalClass(prior.preimages.find(m=>m.path===TAB_BODY).text).text,helper=readFileSync(join(root,TAB_ADAPTER),'utf8');
 const compilerOptions={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true,emitDecoratorMetadata:false};
 const compile=(text,file)=>{const result=ts.transpileModule(text,{compilerOptions,reportDiagnostics:true});assert.equal(result.diagnostics.length,0);writeFileSync(join(model.root,file),result.outputText);};
 compile(current,'portal-code.cjs');compile(old,'portal-before.cjs');compile(helper,'portal-adapter.cjs');
 const variants=[['ambient-constructor',current.replace(/const outlet = constructLegacyTabBodyPortal\([\s\S]*?\) as MatLegacyTabBodyPortal;/,'const outlet = Reflect.construct(CdkPortalOutlet, [], new.target) as MatLegacyTabBodyPortal;')],['lost-host',current.replace('outlet._host = _host;','outlet._host = {..._host, preserveContent: false};')],['lost-preserve-content',current.replace('if (!this._host.preserveContent) {','if (true) {')],['lost-detach',current.replace('this.detach();','void 0;')],['lost-destroy',current.replace('super.ngOnDestroy();','void 0;')],['lost-unsubscribe',current.replace('this._centeringSub.unsubscribe();','void 0;').replace('this._leavingSub.unsubscribe();','void 0;')],['lost-new-target',current.replace('new.target, viewContainerRef, _document','MatLegacyTabBodyPortal, viewContainerRef, _document')]];
 for(const [id,text]of variants){assert.notEqual(text,current);compile(text,'portal-mutant-'+id+'.cjs');}
 const helperVariants=[['ambient-parent',helper.replace('container.injector','Injector.NULL')],['lost-document',helper.replace('if (token === DOCUMENT) return this.document;','')]];
 for(const[id,text]of helperVariants){assert.notEqual(text,helper);compile(text,'adapter-mutant-'+id+'.cjs');}
 const prelude=readFileSync(join(root,'tests/core_view_use_subject.mjs'),'utf8').split('const run=(id,fn)=>')[0];assert.ok(prelude.includes('function withOwner(fn)'));writeFileSync(join(model.root,'tab-portal-subject.mjs'),prelude+readFileSync(join(root,'tests/tab_portal_explicit_container_subject.mjs'),'utf8'));
 return {source_sha256:digest(current),helper_sha256:digest(helper),class_mutants:variants.map(([id])=>id),adapter_mutants:helperVariants.map(([id])=>id)};
}
export function compileTabPortalTypes(root,model){
 const original=model.line==='original',prior=tabPortalPrior(root),text=original?prior.preimages.find(m=>m.path.endsWith('component-motion-sources/tabs/tab-body.ts')).text:readFileSync(join(root,TAB_BODY),'utf8'),name=original?'MatTabBodyPortal':'MatLegacyTabBodyPortal',host=original?'MatTabBody':'MatLegacyTabBody';
 const extracted=portalClass(text,name),subject=extracted.text+`\ndeclare class ${host} { _beforeCentering: import('rxjs').Observable<boolean>; _afterLeavingCenter: import('rxjs').Observable<void>; _position: string; _isCenterPosition(position:string):boolean; preserveContent:boolean; _content: import('@angular/cdk/portal').TemplatePortal; }\n`;
 const argumentsList=original?'factory,container,host,document':'container,host,document';
 const negative=`\ndeclare const ${original?"factory: import('@angular/core').ComponentFactoryResolver, ":''}container: import('@angular/core').ViewContainerRef, host: ${host}, document:any;\n// @ts-expect-error No extra constructor argument is accepted.\nnew ${name}(${argumentsList},'extra');\n// @ts-expect-error The historical explicit document remains required.\nnew ${name}(${original?'factory,container,host':'container,host'});\n// @ts-expect-error An Injector cannot replace the supplied ViewContainerRef.\nnew ${name}(${original?'factory,':''}importedInjector,host,document);\ndeclare const importedInjector: import('@angular/core').Injector;\n`;
 const file=join(model.root,'tab-body.ts');writeFileSync(file,subject+negative);if(!original){const helper=join(model.root,'internal/tab-portal-construction-context.ts');mkdirSync(dirname(helper),{recursive:true});writeFileSync(helper,readFileSync(join(root,TAB_ADAPTER)));}
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,experimentalDecorators:true,strict:true,skipLibCheck:false,noEmit:true,types:[]},program=ts.createProgram([file],options),diagnostics=ts.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
 const checker=program.getTypeChecker(),checked=[];for(const source of program.getSourceFiles().filter(s=>s.fileName===file||s.fileName.endsWith('/internal/tab-portal-construction-context.ts'))){function visit(n){if(ts.isCallExpression(n)||ts.isNewExpression(n)){const sig=checker.getResolvedSignature(n);assert.ok(sig);const declaration=sig.declaration;if(declaration?.getSourceFile().fileName.includes('/node_modules/@angular/')){assert.ok(!sig.getJsDocTags().some(t=>['deprecated','breaking-change'].includes(t.name)),'unsupported call '+n.expression.getText(source));checked.push(n.expression.getText(source));}}ts.forEachChild(n,visit);}visit(source);}
 return {line:model.line,typescript:ts.version,strict:true,skipLibCheck:false,diagnostics:0,complete_actual_owned_portal_and_adapter_checked:!original,untouched_reference_portal_checked:original,host_type_protocol:true,negative_type_checks:3,checked_public_calls:checked,declarations:model.tab_portal_declarations.members.map(({key,sha256})=>({key,sha256})),actual_full_product_AOT_or_floor_qualified:false};
}
