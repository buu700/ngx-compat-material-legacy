/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact six public key-manager caller boundaries; full owned/native component behavior remains separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SourceTextModule,SyntheticModule} from 'node:vm';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {keyManagerPublicSubjects} from './key-manager-public-subjects.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),moduleName='@angular/cdk/a11y';
const names=['FocusKeyManager','ActiveDescendantKeyManager','ListKeyManager'],printer=ts.createPrinter({removeComments:true});
const parse=(path,text)=>{const source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);return source;};
const print=(node,source)=>printer.printNode(ts.EmitHint.Unspecified,node,source).trim();
const stable=node=>assert.ok(!ts.getJSDocTags(node).some(t=>['deprecated','docs-private','breaking-change','experimental'].includes(t.tagName.text)),'unstable public key-manager/member');
const modifier=(node,kind)=>node.modifiers?.some(m=>m.kind===kind);
const strip=node=>{while(ts.isParenthesizedExpression(node)||ts.isNonNullExpression(node))node=node.expression;return node;};

function optionInstanceShapeProof(read){
 const paths=['projects/ngx-material-legacy/legacy-core/public-api.ts','projects/ngx-material-legacy/legacy-core/option/index.ts','projects/ngx-material-legacy/legacy-core/option/option.ts','projects/ngx-material-legacy/legacy-core/option/option-base.ts'];
 const sources=paths.map(path=>parse(path,read(path))),[api,index,derived,base]=sources;
 assert.ok(api.statements.some(n=>ts.isExportDeclaration(n)&&!n.exportClause&&n.moduleSpecifier?.text==='./option/index'));
 assert.ok(index.statements.some(n=>ts.isExportDeclaration(n)&&!n.exportClause&&n.moduleSpecifier?.text==='./option'));
 assert.ok(index.statements.some(n=>ts.isExportDeclaration(n)&&n.moduleSpecifier?.text==='./option-base'&&n.exportClause?.elements?.some(e=>e.name.text==='_MatLegacyOptionBase'&&e.propertyName?.text==='_MatOptionBase')));
 const cls=derived.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyOption');assert.ok(cls&&cls.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword));
 assert.ok(base.statements.some(n=>ts.isClassDeclaration(n)&&n.name?.text==='_MatOptionBase'&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)));
 assert.equal(cls.members.length,1);assert.ok(ts.isConstructorDeclaration(cls.members[0]),'derived option adds an instance contract');
 assert.equal(cls.heritageClauses?.length,1);assert.equal(cls.heritageClauses[0].token,ts.SyntaxKind.ExtendsKeyword);assert.equal(cls.heritageClauses[0].types[0].getText(derived),'_MatOptionBase<T>');
 assert.ok(derived.statements.some(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='./option-base'&&n.importClause?.namedBindings?.elements?.some(e=>e.name.text==='_MatOptionBase'&&!e.propertyName)));
 return {scope:'Actual owned base and constructor-only derived option share the complete inherited instance type; constructors/static Angular metadata do not add instance members.',sources:paths.map((path,i)=>({path,sha256:hash(sources[i].text)}))};
}

export function verifyKeyManagerPublicUses(cases,contracts){
 for(const row of cases)for(const use of row.public_api_uses){
  const current=contracts.members[row.symbol].get(use.name);assert.ok(current,'unknown or private peer member '+use.name);
  if(use.receiver_method){const receiver=contracts.members[row.symbol].get(use.receiver_method);assert.ok(receiver?.every(s=>s.endsWith(': this;')),'non-fluent manager return value used as a manager');}
 }
}

export function verifyTaggedKeyManagerConstruction(cases,root=rootDefault){
 const path='compatibility/rc/key-manager-tagged-construction-subjects.json',bytes=readFileSync(join(root,path));assert.equal(hash(bytes),'50e7f14e8460bef4eab432c53de985b502678d5c1f0257b1dbcc4a2e30e1aad2');
 const capsule=JSON.parse(bytes),sources=capsule.members.map(m=>{const compressed=readFileSync(join(root,m.path));assert.equal(hash(compressed),m.gzip_sha256);const raw=gunzipSync(compressed);assert.equal(hash(raw),m.sha256);assert.equal(raw.length,m.bytes);return parse(m.archive_member,raw.toString());});
 const emit=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
 const canonical=text=>{const source=parse('canonical.mjs',emit('function initialize(){'+text+';}'));const fn=source.statements.find(ts.isFunctionDeclaration);assert.ok(fn?.body);return print(fn.body.statements[0].expression,source);};
 const results=[];
 for(const row of cases){
  const ownerName=row.owner,found=[];
  for(const source of sources)for(const cls of source.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===ownerName)){
   const visit=n=>{if(ts.isNewExpression(n)&&n.expression.getText(source)===row.symbol){let value=n;while(ts.isPropertyAccessExpression(value.parent)&&ts.isCallExpression(value.parent.parent))value=value.parent.parent;assert.ok(ts.isBinaryExpression(value.parent));found.push({source,cls,assignment:value.parent});}ts.forEachChild(n,visit);};visit(cls);
  }
  assert.equal(found.length,1,'missing or ambiguous authentic tagged constructor '+ownerName);const original=found[0];
  const tagged=canonical(original.assignment.getText(original.source)),candidate=canonical(row.constructor_expression);assert.equal(candidate,tagged,'owned construction/configuration differs from untouched tag');
  let predicate=null;
  if(row.predicate_source){const old=original.cls.members.find(n=>ts.isMethodDeclaration(n)&&n.name?.getText(original.source)==='_skipPredicate');assert.ok(old?.body);const own=parse('owned-predicate.mjs',emit('class Predicate{'+row.predicate_source+'}')),cls=own.statements.find(ts.isClassDeclaration);assert.ok(cls);assert.equal(print(cls.members[0].body,own),print(old.body,original.source),'owned key-manager predicate differs from tagged body');predicate={tagged_body_sha256:hash(print(old.body,original.source)),owned_body_matches_tag:true};}
  results.push({file:row.file,tagged_archive_member:original.source.fileName,tagged_class:ownerName,construction_body_sha256:hash(tagged),owned_construction_matches_tag:true,predicate});
 }
 return results;
}

export function inspectPublicKeyManagerDeclarations(model){
 const definitions={};
 for(const extension of ['.mjs','.d.ts']){
  const found={};
  for(const [path,text]of model.sources)if(path.startsWith('@angular/cdk/')&&path.endsWith(extension)){
   const source=parse(path,text);
   for(const node of source.statements)if(ts.isClassDeclaration(node)&&names.includes(node.name?.text)){assert.ok(!found[node.name.text],'ambiguous class definition');found[node.name.text]={path,source,node};}
  }
  assert.deepEqual(Object.keys(found).sort(),[...names].sort());definitions[extension]=found;
 }
 const members={};
 for(const name of names){
  const type=definitions['.d.ts'][name];stable(type.node);
  const own=type.node.members.filter(n=>!modifier(n,ts.SyntaxKind.PrivateKeyword)&&!modifier(n,ts.SyntaxKind.ProtectedKeyword));own.forEach(stable);
  const body=definitions['.mjs'][name];assert.equal(model.runtime[name].toString(),body.node.getText(body.source),'public class identity differs from authenticated body');
  const flat=new Map();
  if(name!=='ListKeyManager')for(const n of definitions['.d.ts'].ListKeyManager.node.members.filter(n=>n.name&&!modifier(n,ts.SyntaxKind.PrivateKeyword)&&!modifier(n,ts.SyntaxKind.ProtectedKeyword)))flat.set(n.name.getText(definitions['.d.ts'].ListKeyManager.source),[]);
  for(const [owner,def]of [['ListKeyManager',definitions['.d.ts'].ListKeyManager],[name,type]])for(const n of def.node.members.filter(n=>n.name&&!modifier(n,ts.SyntaxKind.PrivateKeyword)&&!modifier(n,ts.SyntaxKind.ProtectedKeyword))){
   const key=n.name.getText(def.source);
   if(!flat.has(key))flat.set(key,[]);
   const text=print(n,def.source);if(!flat.get(key).includes(text))flat.get(key).push(text);
  }
  members[name]=flat;
 }
 return {members,classes:Object.fromEntries(names.map(name=>[name,{runtime_path:definitions['.mjs'][name].path,runtime_class_sha256:hash(definitions['.mjs'][name].node.getText(definitions['.mjs'][name].source)),type_path:definitions['.d.ts'][name].path,
  generic_and_heritage_contract:[...(definitions['.d.ts'][name].node.typeParameters??[]),...(definitions['.d.ts'][name].node.heritageClauses??[])].map(n=>print(n,definitions['.d.ts'][name].source)),
  public_member_names:[...members[name].keys()].sort(),constructors:definitions['.d.ts'].ListKeyManager.node.members.filter(ts.isConstructorDeclaration).map(n=>print(n,definitions['.d.ts'].ListKeyManager.source))}]))};
}

export function inspectKeyManagerCallers({root=rootDefault,readSource}={}){
 const seed=readFileSync(join(root,'compatibility/f10/authored-dependency-inventory-seed.json'));assert.equal(hash(seed),'3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
 const uses=JSON.parse(seed).symbol_uses.filter(r=>r.module===moduleName&&['FocusKeyManager','ActiveDescendantKeyManager'].includes(r.symbol));assert.equal(uses.length,6);
 const authoredRoot=join(root,'projects/ngx-material-legacy'),read=path=>readSource?readSource(path):readFileSync(join(root,path),'utf8');
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true};const host=ts.createCompilerHost(options),fallback=host.readFile.bind(host);
 host.readFile=path=>path.startsWith(authoredRoot+'/')?read('projects/ngx-material-legacy/'+path.slice(authoredRoot.length+1)):fallback(path);
 const productionPaths=execFileSync('rg',['--files','--hidden','--no-ignore','projects/ngx-material-legacy','--glob','*.ts','--glob','!*.spec.ts'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean).sort();
 const routePaths=productionPaths.filter(path=>read(path).includes('_keyManager'));
 const program=ts.createProgram([...new Set([...uses.map(r=>join(authoredRoot,r.file)),...routePaths.map(p=>join(root,p))])],options,host),checker=program.getTypeChecker(),cases=[],managerFields=new Set();
 const routeSources=routePaths.map(path=>({path,source:program.getSourceFile(join(root,path))}));
 assert.ok(routeSources.every(r=>r.source&&r.source.parseDiagnostics.length===0));
 for(const use of uses){
  const source=program.getSourceFile(join(authoredRoot,use.file));assert.ok(source);assert.equal(source.parseDiagnostics.length,0);
  const imports=source.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text===moduleName).flatMap(n=>n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)?n.importClause.namedBindings.elements.filter(e=>(e.propertyName||e.name).text===use.symbol):[]);assert.equal(imports.length,1,'missing or ambiguous public constructor import');
  const binding=imports[0],symbol=checker.getSymbolAtLocation(binding.name),classReferences=[],constructors=[];assert.ok(symbol);
  const visitClass=n=>{
   if(ts.isIdentifier(n)&&n!==binding.name&&n!==binding.propertyName&&checker.getSymbolAtLocation(n)===symbol){
    let role;
    if(ts.isTypeReferenceNode(n.parent)&&n.parent.typeName===n)role='erased-type';
    else if(ts.isNewExpression(n.parent)&&n.parent.expression===n){assert.ok(!binding.isTypeOnly&&!binding.parent.parent.isTypeOnly,'runtime constructor imported as type only');constructors.push(n.parent);role='public-construction';}
    else assert.fail('unreviewed constructor class use: '+n.parent.getText(source));
    classReferences.push({role,line:source.getLineAndCharacterOfPosition(n.getStart(source)).line+1});
   }ts.forEachChild(n,visitClass);
  };visitClass(source);assert.equal(constructors.length,1,'exact constructor population changed');assert.equal(classReferences.filter(r=>r.role==='erased-type').length,1);
  const ctor=constructors[0];assert.equal(ctor.arguments?.length,1,'legacy constructor route must remain one QueryList');const collection=strip(ctor.arguments[0]);assert.ok(ts.isPropertyAccessExpression(collection)&&collection.expression.kind===ts.SyntaxKind.ThisKeyword,'unsupported collection expression');
  let expression=ctor;const configuration=[];
  while(ts.isPropertyAccessExpression(expression.parent)&&expression.parent.expression===expression&&ts.isCallExpression(expression.parent.parent)&&expression.parent.parent.expression===expression.parent){configuration.push({name:expression.parent.name.text,args:expression.parent.parent.arguments.map(a=>a.getText(source))});expression=expression.parent.parent;}
  assert.ok(ts.isBinaryExpression(expression.parent)&&expression.parent.operatorToken.kind===ts.SyntaxKind.EqualsToken&&expression.parent.right===expression,'constructor value escaped its owned field');
  const assignment=expression.parent,left=strip(assignment.left);assert.ok(ts.isPropertyAccessExpression(left)&&left.expression.kind===ts.SyntaxKind.ThisKeyword&&left.name.text==='_keyManager');
  const fieldSymbol=checker.getSymbolAtLocation(left.name);assert.ok(fieldSymbol);const field=fieldSymbol.declarations?.find(ts.isPropertyDeclaration);assert.ok(field&&ts.isClassDeclaration(field.parent));const owner=field.parent;
  managerFields.add(fieldSymbol);
  assert.ok(field.type&&ts.isTypeReferenceNode(field.type)&&checker.getSymbolAtLocation(field.type.typeName)===symbol&&field.type.typeArguments?.length===1,'owned field no longer retains the exact public manager/item type');
  const queryImport=source.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text==='@angular/core').flatMap(n=>n.importClause?.namedBindings?.elements?.filter(e=>(e.propertyName||e.name).text==='QueryList')??[]);assert.equal(queryImport.length,1);
  const querySymbol=checker.getSymbolAtLocation(queryImport[0].name),collectionMembers=owner.members.filter(n=>n.name?.getText(source)===collection.name.text);assert.equal(collectionMembers.length,1,'collection declaration needs separate ownership proof');const collectionMember=collectionMembers[0];
  const queryType=collectionMember.type&&ts.isTypeReferenceNode(collectionMember.type)?collectionMember.type.typeName:null;
  const queryNew=collectionMember.initializer&&ts.isNewExpression(collectionMember.initializer)?collectionMember.initializer.expression:null;
  assert.ok((queryType&&checker.getSymbolAtLocation(queryType)===querySymbol)||(queryNew&&checker.getSymbolAtLocation(queryNew)===querySymbol),'constructor input is not the genuine public Core QueryList boundary');
  const itemType=field.type.typeArguments[0].getText(source),queryItem=(queryType?collectionMember.type:collectionMember.initializer).typeArguments?.[0];
  let itemTypeProof=null;
  if(queryItem?.getText(source)!==itemType){
   assert.equal(use.file,'legacy-select/internal/select-base.ts');assert.equal(itemType,'MatOption');assert.equal(queryItem?.getText(source),'_MatOptionBase');
   const imports=source.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text==='@ngx-compat/material-legacy/legacy-core').flatMap(n=>n.importClause?.namedBindings?.elements??[]);
   assert.ok(imports.some(e=>e.name.text==='MatOption'&&e.propertyName?.text==='MatLegacyOption'));assert.ok(imports.some(e=>e.name.text==='_MatOptionBase'&&e.propertyName?.text==='_MatLegacyOptionBase'));
   itemTypeProof=optionInstanceShapeProof(read);
  }
  if(ctor.typeArguments?.length){assert.equal(ctor.typeArguments.length,1);assert.equal(ctor.typeArguments[0].getText(source),itemType,'explicit constructor/item types diverge');}
  const aliases=new Map();const isField=n=>ts.isPropertyAccessExpression(n)&&checker.getSymbolAtLocation(n.name)===fieldSymbol;
  const collectAliases=n=>{if(ts.isVariableDeclaration(n)&&n.initializer&&isField(strip(n.initializer))){assert.ok(ts.isIdentifier(n.name)&&ts.isVariableDeclarationList(n.parent)&&(n.parent.flags&ts.NodeFlags.Const),'mutable or destructured manager alias');aliases.set(checker.getSymbolAtLocation(n.name),n);}ts.forEachChild(n,collectAliases);};routeSources.forEach(r=>collectAliases(r.source));
  const references=[],api=[];
  function classify(value){
   let node=value;while(ts.isParenthesizedExpression(node.parent)||ts.isNonNullExpression(node.parent))node=node.parent;
   const parent=node.parent,referenceSource=value.getSourceFile(),referenceFile=referenceSource.fileName.slice(authoredRoot.length+1);let role;
   if(ts.isPropertyAccessExpression(parent)&&parent.expression===node){
    role='public-member';let property=parent,receiverMethod=null;
    while(true){
     const called=ts.isCallExpression(property.parent)&&property.parent.expression===property;
     api.push({name:property.name.text,file:referenceFile,line:referenceSource.getLineAndCharacterOfPosition(property.name.getStart(referenceSource)).line+1,called,receiver_method:receiverMethod,call_expression:called?property.parent.getText(referenceSource):null});
     if(!called||!ts.isPropertyAccessExpression(property.parent.parent)||property.parent.parent.expression!==property.parent)break;
     receiverMethod=property.name.text;property=property.parent.parent;
    }
   }
   else if(ts.isVariableDeclaration(parent)&&parent.initializer===node&&aliases.has(checker.getSymbolAtLocation(parent.name)))role='const-alias';
   else if(ts.isBinaryExpression(parent)&&parent.operatorToken.kind===ts.SyntaxKind.EqualsToken&&parent.left===node&&parent===assignment)role='constructor-assignment';
   else if((ts.isIfStatement(parent)&&parent.expression===node)||(ts.isConditionalExpression(parent)&&parent.condition===node)||(ts.isPrefixUnaryExpression(parent)&&parent.operator===ts.SyntaxKind.ExclamationToken)||(ts.isBinaryExpression(parent)&&[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken].includes(parent.operatorToken.kind)))role='truthiness-guard';
   else assert.fail('unreviewed manager value or computed/private route: '+parent.getText(referenceSource));
   references.push({role,file:referenceFile,line:referenceSource.getLineAndCharacterOfPosition(value.getStart(referenceSource)).line+1,expression:node.getText(referenceSource)});
  }
  const visit=n=>{
   if(isField(n))classify(n);
   else if(ts.isIdentifier(n)&&aliases.has(checker.getSymbolAtLocation(n))&&n!==aliases.get(checker.getSymbolAtLocation(n)).name)classify(n);
   ts.forEachChild(n,visit);
  };routeSources.forEach(r=>visit(r.source));
  for(const cfg of configuration)api.push({name:cfg.name,line:source.getLineAndCharacterOfPosition(ctor.getStart(source)).line+1,called:true,configuration:true});
  const predicate=configuration.some(c=>c.args.includes('this._skipPredicate'))?owner.members.find(n=>ts.isMethodDeclaration(n)&&n.name?.text==='_skipPredicate'):null;
  if(predicate){assert.ok(predicate.body&&!predicate.body.getText(source).includes('this.'));}
  const relatedSources=routeSources.filter(r=>r.source!==source&&references.some(ref=>ref.file===r.path.slice('projects/ngx-material-legacy/'.length))).map(r=>({path:r.path,sha256:hash(r.source.text)}));
  cases.push({...use,candidate_source_sha256:hash(source.text),local_name:binding.name.text,owner:owner.name.text,collection:collection.name.text,collection_declaration:print(collectionMember,source),item_type_proof:itemTypeProof,class_references:classReferences,constructor_expression:print(assignment,source)+';',constructor_expression_sha256:hash(assignment.getText(source)),configuration,manager_aliases:aliases.size,manager_references:references,public_api_uses:api,public_member_names:[...new Set(api.map(a=>a.name))].sort(),related_sources:relatedSources,predicate_source:predicate?print(predicate,source):null,type_argument:ctor.typeArguments?.[0]?.getText(source)??null});
 }
 for(const {source}of routeSources){const visit=n=>{if((ts.isIdentifier(n)||ts.isStringLiteral(n))&&n.text==='_keyManager'){
   assert.ok(ts.isIdentifier(n)&&((ts.isPropertyDeclaration(n.parent)&&n.parent.name===n)||(ts.isPropertyAccessExpression(n.parent)&&n.parent.name===n))&&managerFields.has(checker.getSymbolAtLocation(n)),'unclassified/computed/unknown manager route');
  }ts.forEachChild(n,visit);};visit(source);}
 return cases;
}

export function compileKeyManagerConsumers(models,cases,root=rootDefault){
 const results=[],rxjsRoot=realpathSync(dirname(require.resolve('rxjs/package.json'))),rxjs=JSON.parse(readFileSync(join(rxjsRoot,'package.json')));
 for(const model of models){
  const virtual=join(root,'__key_manager_declarations__',model.subject.line),files=new Map(),packages=new Map(model.packages);const corePackage=JSON.parse(model.framework.sources.get('package.json'));packages.set('@angular/core',corePackage);
  for(const [path,text]of model.sources)if(path.endsWith('.d.ts')||path.endsWith('/package.json'))files.set(join(virtual,'node_modules',path),text);
  for(const [path,text]of model.framework.sources)if(path.endsWith('.d.ts')||path==='package.json')files.set(join(virtual,'node_modules/@angular/core',path),text);
  const paths={};for(const [name,pkg]of packages)for(const [route,value]of Object.entries(pkg.exports)){if(typeof value?.types==='string'){const target=join(virtual,'node_modules',name,value.types.replace(/^\.\//,''));if(files.has(target))paths[name+(route==='.'?'':route.slice(1))]=[target];}}
  for(const route of ['.','./operators'])paths['rxjs'+(route==='.'?'':route.slice(1))]=[join(rxjsRoot,rxjs.exports[route].types)];
  const chunks=[`import {QueryList,ElementRef} from '@angular/core';import {FocusKeyManager,ActiveDescendantKeyManager,FocusableOption,Highlightable,ListKeyManager} from '${moduleName}';
interface Item extends FocusableOption,Highlightable{id:string;readonly elementRef:ElementRef;}
type MatLegacyChip=Item;type MatLegacyListOption=Item;type MatPaginatedTabHeaderItem=Item;type MatMenuItem=Item;type MatOption=Item;type _MatOptionBase=Item;
declare const query:QueryList<Item>;declare const items:Item[];declare const event:KeyboardEvent;
const list=new ListKeyManager(query);const array=new FocusKeyManager(items);const active=new ActiveDescendantKeyManager(query);
const chained:typeof active=active.cancelTypeahead();const activeIndex:number|null=active.activeItemIndex;const activeItem:Item|null=active.activeItem;
active.onKeydown(event);active.setActiveItem(0);active.setActiveItem(items[0]);active.updateActiveItem(0);active.updateActiveItem(items[0]);active.isTyping();active.destroy();
// @ts-expect-error Invalid collections are not a key-manager contract.
new FocusKeyManager('invalid');
// @ts-expect-error Horizontal direction has a finite literal/null domain.
active.withHorizontalOrientation('up');
// @ts-expect-error Modifier names retain their exact public key domain.
active.withAllowedModifierKeys(['control']);
// @ts-expect-error Debounce intervals remain numeric.
active.withTypeAhead('fast');
// @ts-expect-error Private state is not an authored public dependency.
active._activeItemIndex;
// @ts-expect-error Active item is a readonly public getter.
active.activeItem=items[0];
// @ts-expect-error Item values must match the generic option type.
active.setActiveItem('invalid');
// @ts-expect-error Query events retain KeyboardEvent structure.
active.onKeydown({keyCode:40});`];
  for(const [i,row]of cases.entries())chunks.push(`class Caller${i}{_keyManager!:${row.symbol}<Item>;${row.collection}=query;_dir:{value:'ltr'|'rtl'}|undefined;_typeaheadDebounceInterval=5;_isRtl(){return false;}_getLayoutDirection():'ltr'|'rtl'{return 'ltr';}_skipPredicate(item:Item){return !!item.disabled;}initialize(){${row.constructor_expression}}}`);
  const entry=join(virtual,'consumer.ts'),code=chunks.join('\n');files.set(entry,code);const options={strict:true,skipLibCheck:false,noEmit:true,types:[],target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,paths,lib:['lib.es2022.d.ts','lib.dom.d.ts']};
  const host=ts.createCompilerHost(options),read=host.readFile.bind(host),exists=host.fileExists.bind(host);host.readFile=path=>files.get(path)??read(path);host.fileExists=path=>files.has(path)||exists(path);host.directoryExists=path=>[...files.keys()].some(p=>p.startsWith(path+'/'))||ts.sys.directoryExists(path);
  const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram([entry],options,host));assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>virtual,getNewLine:()=> '\n'}));
  results.push({line:model.subject.line,compiler:ts.version,strict:true,skip_lib_check:false,negative_controls:8,exact_constructor_chains:cases.length,fixture_sha256:hash(code),scope:'Complete genuine public a11y/Core/Common/platform-browser type closure; exact owned constructor expressions in explicit item/context protocols, not whole owned classes/AOT/packed/floor consumer'});
 }
 return results;
}

async function replayCaller(model,row,direction){
 const code=`import {${row.symbol}${row.local_name===row.symbol?'':' as '+row.local_name}} from '${moduleName}';export function initialize(){${row.constructor_expression}}export class PredicateContext{${row.predicate_source??''}}`;
 const output=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 const bridge=new SyntheticModule(Object.keys(model.runtime),function(){for(const name of Object.keys(model.runtime))this.setExport(name,model.runtime[name]);});const module=new SourceTextModule(output);await module.link(spec=>{assert.equal(spec,moduleName);return bridge;});await module.evaluate();
 const events=[],items=['Alpha','Beta','Gamma'].map((text,index)=>({index,disabled:index===1,getLabel(){return text;},focus(origin){events.push(['focus',index,origin]);},setActiveStyles(){events.push(['active',index]);},setInactiveStyles(){events.push(['inactive',index]);}}));const query=new model.framework.runtime.QueryList();query.reset(items);query.notifyOnChanges();
 const context={[row.collection]:query,_dir:{value:direction},_isRtl(){return direction==='rtl';},_getLayoutDirection(){return direction;},_typeaheadDebounceInterval:5,
  ...(row.predicate_source?{_skipPredicate:module.namespace.PredicateContext.prototype._skipPredicate}:{})};
 try{
  module.namespace.initialize.call(context);const manager=context._keyManager;assert.ok(manager instanceof model.runtime[row.symbol]);manager.setFirstItemActive();manager.setNextItemActive();const afterDown=manager.activeItemIndex;const key={keyCode:direction==='rtl'?37:39,key:'',altKey:false,ctrlKey:false,metaKey:false,shiftKey:false,preventDefault(){}};manager.onKeydown(key);
  const result={direction,after_next:afterDown,after_horizontal:manager.activeItemIndex,events:[...events],constructor_outside_DI:true};
  let completed=0;manager.change.subscribe({complete(){completed++;}});manager.tabOut.subscribe({complete(){completed++;}});manager.destroy();assert.equal(completed,2);result.destroy_completed=completed;return result;
 }finally{context._keyManager?.destroy();query.destroy();}
}

async function replayOwnedCancellation(model,cases){
 const select=cases.find(r=>r.file==='legacy-select/internal/select-base.ts'),use=select.public_api_uses.filter(u=>u.name==='cancelTypeahead');assert.equal(use.length,1);
 const code=ts.transpileModule('export function cancel(){return '+use[0].call_expression+';}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 const module=new SourceTextModule(code);await module.link(()=>assert.fail('cancellation expression acquired a new dependency'));await module.evaluate();
 const callbacks=[],items=['Alpha','Beta'].map((label,index)=>({disabled:false,getLabel(){return label;},setActiveStyles(){callbacks.push(index);},setInactiveStyles(){}})),query=new model.framework.runtime.QueryList();query.reset(items);query.notifyOnChanges();
 const manager=new model.runtime.ActiveDescendantKeyManager(query).withTypeAhead(5),context={_keyManager:manager};
 try{
  manager.onKeydown({keyCode:66,key:'b',altKey:false,ctrlKey:false,metaKey:false,shiftKey:false,preventDefault(){}});assert.equal(manager.isTyping(),true);
  assert.equal(module.namespace.cancel.call(context),manager,'cancelTypeahead lost fluent identity');assert.equal(manager.isTyping(),false);await new Promise(resolve=>setTimeout(resolve,40));assert.deepEqual(callbacks,[]);assert.equal(manager.activeItem,null);
  manager.setActiveItem(0);assert.deepEqual(callbacks,[0]);
  return {actual_owned_call_expression:use[0].call_expression,fluent_identity_preserved:true,pending_typeahead_callback_cancelled:true,later_explicit_selection_retained:true,native_execution:false};
 }finally{manager.destroy();query.destroy();}
}

export async function reviewKeyManagerCallers({root=rootDefault}={}){
 const subjects=await keyManagerPublicSubjects(root);
 try{
  const cases=inspectKeyManagerCallers({root}),models=subjects.models.map(model=>({model,contracts:inspectPublicKeyManagerDeclarations(model)}));
  const original=models.find(m=>m.model.subject.line==='original');const declarationPreservation=[];
  for(const {model,contracts}of models){
   let preserved=0,additions=0;
   for(const name of names){assert.deepEqual(contracts.classes[name].generic_and_heritage_contract,original.contracts.classes[name].generic_and_heritage_contract);for(const [member,signatures]of original.contracts.members[name]){
    const current=contracts.members[name].get(member);assert.ok(current,'removed historical public member '+member);
    for(const signature of signatures){assert.ok(current.includes(signature),'changed historical public signature '+name+'.'+member);preserved++;}
    additions+=current.filter(s=>!signatures.includes(s)).length;
   }}
   declarationPreservation.push({line:model.subject.line,historical_public_signatures_preserved:preserved,added_overload_signatures:additions});
   verifyKeyManagerPublicUses(cases,contracts);
  }
  const observations=[];for(const {model,contracts}of models){const callers=[];for(const row of cases){const profiles=[];for(const direction of ['ltr','rtl'])profiles.push(await replayCaller(model,row,direction));callers.push({file:row.file,symbol:row.symbol,profiles});}
   if(observations.length)assert.deepEqual(callers,observations[0].callers,'exact owned constructor/configuration expression differs from authentic tag');observations.push({line:model.subject.line,contracts:contracts.classes,callers,owned_cancellation:await replayOwnedCancellation(model,cases)});}
  const manifest=JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json')));return {schema_version:1,line:manifest.version.startsWith('21.')?'21.x':'main',cases,tagged_construction:verifyTaggedKeyManagerConstruction(cases,root),observations,declaration_preservation:declarationPreservation,strict_types:compileKeyManagerConsumers(subjects.models,cases,root),subject_capsule_sha256:subjects.capsule_sha256,rxjs:subjects.rxjs,node:process.version,limits:['Exact public import/constructor/member/alias boundaries and constructor expression replays only; contexts/items/events are protocols. Whole owned methods, Angular/native views, packed/floor consumers, upstream SHA semantics and complete audit remain open.'],g11_claim:'not-passed'};
 }finally{subjects.dispose();}
}
