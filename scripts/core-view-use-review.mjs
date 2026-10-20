/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Public view contracts for35 selected uses. No ledger or runtime admission. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,lstatSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {prepareRemainingIdentitySubjects} from './remaining-identity-public-subjects.mjs';
import {installNgZonePublicSubject} from './ng-zone-public-subjects.mjs';
import {tabPortalSourceParentReader} from './tab-portal-source-context.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
const priorPath='compatibility/rc/core-view-use-prior.json.gz';
const pins={main:'6274e3d3df98c4927da387b53d62958665739493188547fd6fbb3462d6e2b2dc','21.x':'de343d2a6451acc82de6c0a67f5f8f27c4efa4d2c3ec3e369ff722685f91935b'};
export const CORE_VIEW_SYMBOLS=Object.freeze(['ApplicationRef','ComponentRef','EmbeddedViewRef','TemplateRef','Type','ViewContainerRef']);
export function coreViewPrior(root,{read=p=>readFileSync(join(root,p))}={}){
 read=tabPortalSourceParentReader({root,read});
 const bytes=read(priorPath),line=Object.keys(pins).find(line=>pins[line]===hash(bytes));assert.ok(line,'changed view-review preimages');const prior=JSON.parse(gunzipSync(bytes));assert.equal(prior.line,line);assert.equal(prior.selected.length,35);assert.equal(prior.candidate_preimages.length,22);
 for(const m of [...prior.ledger_preimages,...prior.candidate_preimages]){assert.equal(hash(m.text),m.sha256);assert.equal(hash(read(m.path)),m.sha256,'selected source/ledger changed before view review: '+m.path);const original=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',prior.source_parent+':'+m.path],{cwd:root,maxBuffer:16*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(original),m.sha256);}
 for(const m of prior.protected)assert.equal(hash(read(m.path)),m.sha256,'changed protected view-review source: '+m.path);
 return prior;
}
export function coreViewSourceInventory(root,options={}){
 const prior=coreViewPrior(root,options),rows=[];
 for(const selected of prior.selected){const member=prior.candidate_preimages.find(m=>m.path==='projects/ngx-material-legacy/'+selected.file),source=ts.createSourceFile(selected.file,member.text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);
  const imports=source.statements.filter(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text===selected.module).flatMap(n=>n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)?n.importClause.namedBindings.elements:[]).filter(n=>(n.propertyName??n.name).text===selected.symbol);assert.equal(imports.length,1);const local=imports[0].name.text,occurrences=[];
  function visit(node){if(ts.isIdentifier(node)&&node.text===local&&!ts.isImportSpecifier(node.parent)){
   let owner=node.parent;while(owner&&!ts.isClassDeclaration(owner)&&!ts.isFunctionDeclaration(owner))owner=owner.parent;
   const location=source.getLineAndCharacterOfPosition(node.getStart(source)),isType=ts.isTypeReferenceNode(node.parent)||ts.isExpressionWithTypeArguments(node.parent);
   occurrences.push({line:location.line+1,column:location.character+1,role:isType?'type-reference':'value-reference',parent_kind:ts.SyntaxKind[node.parent.kind],parent_source:node.parent.getText(source),owner:owner?.name?.text??null});
  }ts.forEachChild(node,visit);}visit(source);assert.ok(occurrences.length,'unused selected Core view import');rows.push({...selected,candidate_source_sha256:member.sha256,import_local:local,occurrences});
 }
 assert.equal(rows.filter(r=>r.ledger.includes('current-dispositions')).length,9);return {line:prior.line,source_epoch:prior.source_parent,authenticated_pre_repair_subject:true,current_source_caller_decisions_qualified:false,rows,selected_uses:35,candidate_files:22,source_conclusions_qualified:0,new_use_closures:0,actual_packed_native_or_floor_qualified:false};
}
export function prepareCoreViewSubjects(root){
 const loaded=prepareRemainingIdentitySubjects(root);
 try{for(const model of loaded.models){const zone=join(model.root,'node_modules/zone.js');assert.ok(lstatSync(zone).isSymbolicLink());rmSync(zone);model.core_view_zone=installNgZonePublicSubject(model,root);}return loaded;}catch(error){loaded.dispose();throw error;}
}
const typeSubject=String.raw`
import {ApplicationRef,ComponentRef,EmbeddedViewRef,TemplateRef,Type,ViewContainerRef,Injector,EnvironmentInjector,ElementRef,ViewRef,createEnvironmentInjector} from '@angular/core';
export function contract<C,T>(template:TemplateRef<C>,container:ViewContainerRef,component:ComponentRef<T>,
 view:EmbeddedViewRef<C>,app:ApplicationRef,type:Type<T>,context:C,injector:Injector,environment:EnvironmentInjector){
 const anchor:ElementRef<any>=template.elementRef;
 const detached:EmbeddedViewRef<C>=template.createEmbeddedView(context,injector);
 const inserted:EmbeddedViewRef<C>=container.createEmbeddedView(template,context);
 const cmp:ComponentRef<T>=container.createComponent(type,{environmentInjector:environment,injector});
 const owningInjector:Injector=container.injector;const element:ElementRef<any>=container.element;const count:number=container.length;
 const position:number=container.indexOf(inserted);const found:ViewRef|null=container.get(position);
 container.insert(detached,0);container.move(inserted,0);const taken:ViewRef|null=container.detach(0);container.remove(0);container.clear();
 const instance:T=component.instance;const componentType:Type<T>=component.componentType;
 const location:ElementRef=component.location;const nodeInjector:Injector=component.injector;const host:ViewRef=component.hostView;
 component.setInput('item','value');component.changeDetectorRef.markForCheck();component.onDestroy(()=>{});component.destroy();
 const roots:any[]=view.rootNodes;const current:C=view.context;view.context=context;
 view.detectChanges();view.markForCheck();view.onDestroy(()=>{});const dead:boolean=view.destroyed;view.destroy();
 app.attachView(cmp.hostView);app.detachView(cmp.hostView);const views:number=app.viewCount;const appInjector:EnvironmentInjector=app.injector;
 const childEnvironment:EnvironmentInjector=createEnvironmentInjector([],environment);childEnvironment.destroy();
 const value:T=new type();return {anchor,detached,inserted,cmp,owningInjector,element,count,position,found,taken,instance,componentType,location,nodeInjector,host,roots,current,dead,views,appInjector,value};
}
`;
const negativeSubject=String.raw`
import {ApplicationRef,ComponentRef,EmbeddedViewRef,TemplateRef,Type,ViewContainerRef} from '@angular/core';
declare const template:TemplateRef<{item:string}>,container:ViewContainerRef,component:ComponentRef<{item:string}>,view:EmbeddedViewRef<{item:string}>,app:ApplicationRef;
// @ts-expect-error TemplateRef does not own embedded context.
template.context;
// @ts-expect-error Root nodes belong to the created view.
template.rootNodes;
// @ts-expect-error A ComponentRef is not an embedded template.
container.createEmbeddedView(component,{item:'x'});
// @ts-expect-error The context must retain its actual shape.
template.createEmbeddedView({item:1});
// @ts-expect-error Container length is not writable.
container.length=0;
// @ts-expect-error ComponentRef state belongs to hostView.
component.destroyed;
// @ts-expect-error The public hostView is readonly.
component.hostView=view;
// @ts-expect-error View context retains its generic shape.
view.context={item:1};
// @ts-expect-error Public root nodes are readonly as a property.
view.rootNodes=[];
// @ts-expect-error A template is not an attachable public ViewRef.
app.attachView(template);
// @ts-expect-error The instance is a value, not its constructor.
const invalidType:Type<{item:string}>={item:'x'};
// @ts-expect-error No invented view-construction method is public.
container.createTemplateView(template);
`;
export function compileCoreViewTypes(model){
 const file=join(model.root,'core-view-contract.ts'),negative=join(model.root,'core-view-negative.ts');writeFileSync(file,typeSubject);writeFileSync(negative,negativeSubject);
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,strict:true,skipLibCheck:false,noEmit:true,types:[]};
 const program=ts.createProgram([file,negative],options),diagnostics=ts.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
 const checker=program.getTypeChecker(),source=program.getSourceFile(file),declaration=source.statements.find(ts.isImportDeclaration),module=checker.getSymbolAtLocation(declaration.moduleSpecifier);assert.ok(module);const exports=checker.getExportsOfModule(module),symbols=[];
 for(const name of CORE_VIEW_SYMBOLS){const exported=exports.find(s=>s.name===name);assert.ok(exported);const resolved=exported.flags&ts.SymbolFlags.Alias?checker.getAliasedSymbol(exported):exported;assert.ok(!resolved.getJsDocTags().some(t=>['deprecated','breaking-change'].includes(t.name)),'unsupported public Core type '+name);
  const declarations=resolved.declarations.map(node=>{const sf=node.getSourceFile(),key=relative(join(model.root,'node_modules'),sf.fileName).replaceAll('\\','/');assert.ok(model.sources.has(key));assert.equal(hash(sf.text),hash(model.sources.get(key)));return {path:key,source_sha256:hash(sf.text),declaration_sha256:hash(node.getText(sf)),kind:ts.SyntaxKind[node.kind]};});symbols.push({name,declarations});
 }
 const calls=[];function visit(node){if(ts.isCallExpression(node)){const signature=checker.getResolvedSignature(node);assert.ok(signature);assert.ok(!signature.getJsDocTags().some(t=>['deprecated','breaking-change'].includes(t.name)),'unsupported public Core call '+node.getText(source));calls.push(node.expression.getText(source));}ts.forEachChild(node,visit);}visit(source);
 assert.equal((negativeSubject.match(/@ts-expect-error/g)||[]).length,12);return {line:model.line,framework:model.subject.packages.find(p=>p.name==='@angular/core').version,typescript:ts.version,strict:true,skipLibCheck:false,public_symbols:symbols,checked_public_calls:calls,negative_type_checks:12,diagnostics:0,type_subject_sha256:hash(typeSubject),negative_subject_sha256:hash(negativeSubject),borrowed:model.borrowed,actual_Node_Rx_compiler_or_consumer_floor_qualified:false};
}
