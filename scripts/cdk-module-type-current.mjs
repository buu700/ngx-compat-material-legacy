/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Current main source-role bridge; historic evidence is checked separately.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {cdkModuleTypePrior,cdkModuleTypeFacts,cdkModuleTypeSnippets,qualifiedCdkModuleTypeEvidence,inspectCdkModuleTypeReview,CDK_MODULE_TYPE_PRIOR} from './cdk-module-type-caller-roles.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),raw=root=>p=>readFileSync(join(root,p)),programs=new Map(),id=r=>JSON.stringify([r.file,r.module,r.symbol]),cache=new Set();
export const CURRENT_CDK_EPOCH='compatibility/rc/cdk-module-type-current-main.json';
function verifyEpoch({root,read,prior}){
 const bytes=read(CURRENT_CDK_EPOCH);assert.equal(hash(bytes),'34fc8626ff2bbe08c85452a502efee1e5dd363c2498eebaa2afd223e9d87cbe4','changed CDK epoch');const epoch=JSON.parse(bytes);
 assert.equal(prior.line,'main');assert.equal(epoch.line,'main');assert.equal(epoch.source_commit,'65015ae59f87127708e2be3c20e54a8738dd7307');assert.equal(epoch.prior_sha256,hash(read(CDK_MODULE_TYPE_PRIOR)));
 assert.deepEqual(epoch.sources.map(x=>x.path),prior.sources.map(x=>x.path));
 for(const m of epoch.sources){const b=read(m.path);assert.equal(hash(b),m.sha256,'changed current CDK source '+m.path);assert.equal(b.length,m.bytes);const k=JSON.stringify([root,epoch.source_commit,m.path,m.sha256]);if(!cache.has(k)){const original=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',epoch.source_commit+':'+m.path],{cwd:root,maxBuffer:24*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(original),m.sha256,'CDK epoch source is not Git-bound');cache.add(k);}}
 for(const m of prior.evidence)assert.equal(hash(read(m.path)),m.sha256,'changed historical CDK evidence '+m.path);
 return epoch;
}

function parse(name,text){const s=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true);assert.equal(s.parseDiagnostics.length,0);return s;}
function fullMember(node){let top=node;while(top.parent&&!ts.isSourceFile(top.parent)&&!ts.isClassDeclaration(top.parent)&&!ts.isInterfaceDeclaration(top.parent))top=top.parent;return top;}
export function currentCdkModuleTypeFacts({root=process.cwd(),read=raw(root)}={}) {
 const prior=cdkModuleTypePrior({root,read});const epoch=verifyEpoch({root,read,prior});
 // Lexical binding only; genuine peer compilation is a separate proof. Each
 // invocation freshly rehashes all inputs before an immutable program is reused.
 const key=JSON.stringify([root,prior.source_parent,ts.version,epoch.sources.map(m=>m.sha256)]);if(!programs.has(key)){const files=new Map(prior.sources.map(m=>[m.path,parse(m.path,read(m.path).toString())])),options={noResolve:true,noLib:true,types:[],target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true},host=ts.createCompilerHost(options);host.getSourceFile=path=>files.get(path.startsWith(root+'/')?path.slice(root.length+1):path);const program=ts.createProgram([...files.keys()].map(p=>join(root,p)),options,host);programs.set(key,{files,checker:program.getTypeChecker()});}const {files,checker}=programs.get(key),facts=[];
 for(const selected of prior.selected){const row=selected.original_row,path='projects/ngx-material-legacy/'+row.file,source=files.get(path),imports=source.statements.filter(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text===row.module),bindings=imports.flatMap(d=>d.importClause?.namedBindings?.elements?.filter(s=>(s.propertyName??s.name).text===row.symbol).map(specifier=>({declaration:d,specifier}))??[]);assert.equal(bindings.length,1,'ambiguous CDK module/type binding');const {declaration,specifier}=bindings[0],symbol=checker.getSymbolAtLocation(specifier.name);assert.ok(symbol?.declarations?.includes(specifier));const occurrences=[],members=new Map(),bound=new Set(),references=[];
  function member(n){const node=fullMember(n);members.set(node.getStart(source),node);}
  function visit(n){if(ts.isIdentifier(n)&&n!==specifier.name&&n!==specifier.propertyName&&checker.getSymbolAtLocation(n)===symbol){references.push(n);occurrences.push({line:source.getLineAndCharacterOfPosition(n.getStart(source)).line+1,parent_kind:ts.SyntaxKind[n.parent.kind],expression:n.parent.getText(source)});member(n);let owner=n;while(owner&&!ts.isPropertyDeclaration(owner)&&!ts.isPropertySignature(owner)&&!ts.isParameter(owner)&&!ts.isSourceFile(owner))owner=owner.parent;if(owner?.name&&ts.isIdentifier(owner.name))bound.add(owner.name.text);}ts.forEachChild(n,visit);}visit(source);
  function follow(n){if(ts.isPropertyAccessExpression(n)&&n.expression.kind===ts.SyntaxKind.ThisKeyword&&bound.has(n.name.text))member(n);ts.forEachChild(n,follow);}follow(source);
  for(const node of [...members.values()]){let owner=node;while(owner&&!ts.isClassDeclaration(owner)&&!ts.isSourceFile(owner))owner=owner.parent;if(owner&&ts.isClassDeclaration(owner)&&node.kind===ts.SyntaxKind.Decorator)members.set(owner.getStart(source),owner);}
  const complete=[...members.values()].sort((a,b)=>a.getStart(source)-b.getStart(source)).map(n=>({line:source.getLineAndCharacterOfPosition(n.getStart(source)).line+1,kind:ts.SyntaxKind[n.kind],sha256:hash(n.getText(source)),text:n.getText(source)}));
  let module_metadata;if(row.symbol.endsWith('Module')){const roles=[];let target;for(const ref of references){const array=ref.parent,property=array.parent;assert.ok(ts.isArrayLiteralExpression(array)&&ts.isPropertyAssignment(property)&&['imports','exports'].includes(property.name.text),'unsupported CDK module role');const call=property.parent.parent;assert.ok(ts.isCallExpression(call)&&call.arguments[0]===property.parent&&ts.isDecorator(call.parent));const binding=checker.getSymbolAtLocation(call.expression)?.declarations?.find(ts.isImportSpecifier);assert.ok(binding&&(binding.propertyName??binding.name).text==='NgModule'&&binding.parent.parent.parent.moduleSpecifier.text==='@angular/core','CDK module not attached through public Core NgModule');assert.ok(ts.isClassDeclaration(call.parent.parent));target=call.parent.parent.name.text;roles.push(property.name.text);}module_metadata={class_name:target,roles,public_Core_NgModule_binding:true};}
  if(!occurrences.length)assert.equal(row.file+':'+row.symbol,'legacy-tooltip/internal/tooltip-base.ts:BreakpointState','unexpected unused CDK type import');facts.push({file:row.file,module:row.module,symbol:row.symbol,ledger:selected.ledger,candidate_source_sha256:hash(source.text),binding:{local_name:specifier.name.text,type_only:!!(specifier.isTypeOnly||declaration.importClause.isTypeOnly),line:source.getLineAndCharacterOfPosition(specifier.getStart(source)).line+1,text:specifier.getText(source)},occurrences,bound_receivers:[...bound],complete_context_members:complete,...(module_metadata?{module_metadata}:{}),unused_import:!occurrences.length});
 }
 assert.equal(new Set(facts.map(id)).size,14);assert.equal(facts.filter(f=>f.symbol.endsWith('Module')).length,9);assert.equal(facts.filter(f=>f.symbol==='BreakpointState').length,3);assert.equal(facts.filter(f=>f.unused_import).length,1);assert.equal(facts.reduce((n,f)=>n+f.complete_context_members.length,0),15);return {prior,facts};
}
export function currentCdkModuleTypeSnippets(options={}) {
 const {facts}=currentCdkModuleTypeFacts(options),cache=facts.find(f=>f.symbol==='ValidatorFn'),cacheField=cache.complete_context_members.find(m=>m.text.includes('private _previousControlValidatorFn:')),cacheMethod=cache.complete_context_members.find(m=>m.text.startsWith('ngAfterContentChecked(')),tooltip=facts.find(f=>f.file==='legacy-tooltip/tooltip.ts'),stateField=tooltip.complete_context_members.find(m=>m.text.startsWith('_isHandset:')),snack=facts.find(f=>f.file==='legacy-snack-bar/internal/snack-bar-base.ts'),stateCallback=snack.complete_context_members.flatMap(m=>{const source=parse('snack-scope.ts','class Scope {'+m.text+'}'),found=[];function visit(n){if(ts.isArrowFunction(n)&&n.parameters.some(p=>p.type?.getText(source)==='BreakpointState'))found.push(n.getText(source));ts.forEachChild(n,visit);}visit(source);return found;});assert.ok(cacheField&&cacheMethod&&stateField);assert.equal(stateCallback.length,1);
 return {cache_field:cacheField.text,cache_method:cacheMethod.text,tooltip_state_field:stateField.text,snack_state_callback:stateCallback[0],modules:[...new Set(facts.filter(f=>f.symbol.endsWith('Module')).map(f=>JSON.stringify({module:f.module,symbol:f.symbol})))].map(s=>JSON.parse(s))};
}

/** Compare actual current complete caller members and lexical bindings with authenticated historic executions. */
export function inspectCurrentCdkModuleType({root=process.cwd(),read=raw(root)}={}){
 const prior=cdkModuleTypePrior({root,read}),oldBytes=new Map(prior.sources.map(m=>[m.path,Buffer.from(m.text)]));
 // The historic reader is only used to validate the historic receipt and proof.
 const historicalRead=p=>oldBytes.get(p)??read(p);
 const historic=cdkModuleTypeFacts({root,read:historicalRead}),historicProof=qualifiedCdkModuleTypeEvidence({root,read:historicalRead}),historicReview=inspectCdkModuleTypeReview({root,read:historicalRead});
 const current=currentCdkModuleTypeFacts({root,read});assert.equal(current.facts.length,14);
 const project=f=>({id:id(f),binding:{local:f.binding.local_name,type_only:f.binding.type_only,text:f.binding.text},occurrences:f.occurrences.map(x=>({parent_kind:x.parent_kind,expression:x.expression})),members:f.complete_context_members.map(x=>({kind:x.kind,sha256:x.sha256})),module_metadata:f.module_metadata??null,unused_import:f.unused_import});
 assert.deepEqual(current.facts.map(project),historic.facts.map(project),'current complete CDK role contexts differ from historical execution');
 assert.deepEqual(currentCdkModuleTypeSnippets({root,read}),cdkModuleTypeSnippets({root,read:historicalRead}),'current CDK executable/type snippets differ from historical execution');
 assert.equal(historicReview.reviews.length,14);
 return {prior,facts:current.facts,historicProof,historicReview,epoch:JSON.parse(read(CURRENT_CDK_EPOCH)),historical_contexts_identical:true};
}
