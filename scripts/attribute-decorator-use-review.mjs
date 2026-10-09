/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Public Attribute annotations; host node resolution remains a native obligation. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {parameterDecoratorSubjects} from './parameter-decorator-use-review.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=b=>createHash('sha256').update(b).digest('hex'),moduleName='@angular/core',symbolName='Attribute';
const printer=ts.createPrinter({removeComments:true}),print=(n,s)=>printer.printNode(ts.EmitHint.Unspecified,n,s).trim();
const emit=t=>ts.transpileModule(t,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None,experimentalDecorators:true,emitDecoratorMetadata:false,removeComments:true}}).outputText;
function parse(p,t){const s=ts.createSourceFile(p,t,ts.ScriptTarget.Latest,true);assert.equal(s.parseDiagnostics.length,0);return s;}
function one(a,label){assert.equal(a.length,1,label);return a[0];}
function stable(n){assert.ok(!ts.getJSDocTags(n).some(t=>['deprecated','docs-private','experimental','breaking-change'].includes(t.tagName.text)),'unstable Attribute declaration');}
function tokens(t){const s=parse('subject.ts',t),out=[];function visit(n){const a=n.getChildren(s);if(a.length)a.forEach(visit);else if(n.kind!==ts.SyntaxKind.EndOfFileToken)out.push([n.kind,n.getText(s)]);}visit(s);return out.filter((t,i)=>!(t[0]===ts.SyntaxKind.CommaToken&&[ts.SyntaxKind.CloseBraceToken,ts.SyntaxKind.CloseParenToken,ts.SyntaxKind.CloseBracketToken].includes(out[i+1]?.[0])));}
export async function attributeDecoratorSubjects(root=rootDefault){
 const loaded=await parameterDecoratorSubjects(root);
 try{
  for(const model of loaded.models){
   const files=[...model.sources].filter(([p])=>p.endsWith('.mjs')||p.endsWith('.d.ts')).map(([p,t])=>parse(p,t));
   const declarations={};for(const name of ['Attribute','AttributeDecorator']){
    const found=one(files.filter(s=>s.fileName.endsWith('.d.ts')).flatMap(s=>s.statements.filter(n=>ts.isInterfaceDeclaration(n)&&n.name.text===name).map(n=>({n,s}))),name+' interface');stable(found.n);found.n.members.forEach(stable);declarations[name]=print(found.n,found.s).replace(/^(?:(?:export|declare) )+/,'');
   }
   // An unrelated private event-dispatch enum also has the name Attribute; require the public type/factory shape.
   const variable=one(files.filter(s=>s.fileName.endsWith('.d.ts')).flatMap(s=>s.statements.filter(ts.isVariableStatement).flatMap(n=>n.declarationList.declarations).filter(n=>n.name.text==='Attribute'&&n.type?.getText(s)==='AttributeDecorator').map(n=>({n,s}))),'public Attribute declaration');stable(variable.n);stable(variable.n.parent.parent);
   const init=one(files.filter(s=>s.fileName.endsWith('.mjs')).flatMap(s=>s.statements.filter(ts.isVariableStatement).flatMap(n=>n.declarationList.declarations).filter(n=>n.name.text==='Attribute'&&ts.isCallExpression(n.initializer)&&n.initializer.expression.text==='makeParamDecorator').map(n=>({n,s}))),'public Attribute initializer');
   const call=init.n.initializer;assert.equal(call.arguments.length,2,'no optional parent argument');assert.equal(call.arguments[0].text,'Attribute');const props=call.arguments[1];assert.ok(ts.isArrowFunction(props));assert.deepEqual(props.parameters.map(p=>p.name.text),['attributeName']);const body=ts.isParenthesizedExpression(props.body)?props.body.expression:props.body;assert.ok(ts.isObjectLiteralExpression(body));assert.equal(body.properties.length,2);assert.ok(ts.isShorthandPropertyAssignment(body.properties[0])&&body.properties[0].name.text==='attributeName');const field=body.properties[1];assert.ok(ts.isPropertyAssignment(field)&&field.name.text==='__NG_ELEMENT_ID__'&&ts.isArrowFunction(field.initializer)&&field.initializer.parameters.length===0);const hook=field.initializer.body;assert.ok(ts.isCallExpression(hook)&&hook.expression.text==='ɵɵinjectAttribute');assert.deepEqual(hook.arguments.map(a=>a.getText(init.s)),['attributeName']);
   const shared=parse('helper.ts',model.parameter_contract.helpers.makeParamDecorator),nested=[];function find(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='ParamDecoratorFactory')nested.push(n);ts.forEachChild(n,find);}find(shared);assert.deepEqual(tokens(Function.prototype.toString.call(model.runtime.Attribute)),tokens(one(nested,'genuine public Attribute factory').getText(shared)));
   const hooks={};for(const name of ['ɵɵinjectAttribute','injectAttributeImpl']){const found=one(files.filter(s=>s.fileName.endsWith('.mjs')).flatMap(s=>s.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).map(n=>({n,s}))),name+' whole source');hooks[name]={file:found.s.fileName,source:print(found.n,found.s),sha256:hash(found.n.getText(found.s))};}
   model.attribute_contract={declarations,initializer:print(init.n,init.s),shared_factory_sha256:hash(model.parameter_contract.helpers.makeParamDecorator),shared_metadata_ctor_sha256:hash(model.parameter_contract.helpers.makeMetadataCtor),hooks,no_parent_class_argument:true,public_factory_identity:true,deferred_node_callback_only:true,ownership_check:model.parameter_contract.ownership_check};
  }
  for(const m of loaded.models)assert.deepEqual(m.attribute_contract.declarations,loaded.models[0].attribute_contract.declarations);
  for(const m of loaded.models)assert.deepEqual(tokens(m.attribute_contract.hooks['ɵɵinjectAttribute'].source),tokens(loaded.models[0].attribute_contract.hooks['ɵɵinjectAttribute'].source));
  return loaded;
 }catch(e){loaded.dispose();throw e;}
}
export function exerciseAttributeDecorator(core,api=core){
 const cases=[];
 const value=new api.Attribute('tabindex');assert.equal(value instanceof core.Attribute,true);assert.equal(value.ngMetadataName,'Attribute');assert.equal(value.attributeName,'tabindex');assert.equal(typeof value.__NG_ELEMENT_ID__,'function');cases.push('constructor-name-identity-and-deferred-node-hook');
 const decorated=api.Attribute('aria-live');assert.equal(typeof decorated,'function');assert.equal(decorated.annotation.attributeName,'aria-live');assert.equal(typeof decorated.annotation.__NG_ELEMENT_ID__,'function');cases.push('public-call-form-annotation');
 class Target{} assert.equal(decorated(Target,undefined,2),Target);const next=api.Attribute('tabindex');next(Target,undefined,2);const desc=Object.getOwnPropertyDescriptor(Target,'__parameters__');assert.deepEqual([desc.enumerable,desc.configurable,desc.writable],[false,false,false]);assert.equal(desc.value.length,3);assert.equal(desc.value[0],null);assert.equal(desc.value[1],null);assert.equal(desc.value[2][0],decorated.annotation);assert.equal(desc.value[2][1],next.annotation);cases.push('constructor-parameter-sparse-slots-order-and-descriptor');
 class Child extends Target{}const own=api.Attribute('aria-live');own(Child,undefined,0);assert.notEqual(Child.__parameters__,Target.__parameters__);assert.equal(Child.__parameters__.length,1);assert.equal(Target.__parameters__[2].length,2);assert.equal(Child.__parameters__[0][0],own.annotation);cases.push('subclass-parameter-registry-isolation');
 const fixture=new Function('Attribute',emit("class Fixture{constructor(@Attribute('tabindex') first:string,other:unknown,@Attribute('aria-live') third:string){}} return Fixture;"))(api.Attribute);assert.deepEqual(fixture.__parameters__.map(s=>s?.map(a=>a.attributeName)),[['tabindex'],undefined,['aria-live']]);cases.push('actual-typescript-emitted-parameter-metadata');
 const first=new api.Attribute('tabindex'),second=new api.Attribute('tabindex');assert.notEqual(first,second);assert.notEqual(first.__NG_ELEMENT_ID__,second.__NG_ELEMENT_ID__);cases.push('independent-metadata-and-deferred-callback-identities');
 assert.equal(new api.Attribute('').attributeName,'');assert.equal(new api.Attribute('aria-live').attributeName,'aria-live');cases.push('literal-string-values-preserved');
 function Interposed(){}api.Attribute('tabindex')(Interposed,undefined,0);Interposed.hasOwnProperty=()=>false;const extra=api.Attribute('aria-live');if(core.VERSION.full.startsWith('22.')){extra(Interposed,undefined,0);assert.equal(Interposed.__parameters__[0].length,2);}else assert.throws(()=>extra(Interposed,undefined,0),TypeError);cases.push('measured-nonordinary-constructor-ownership-difference');
 assert.equal(core.Attribute.annotation,undefined);assert.equal(value.attributeName,'tabindex');cases.push('annotation-lifetime-does-not-mutate-factory-or-input');
 return {cases,metadata_reflection_is_diagnostic:true,deferred_private_node_callbacks_invoked:false,native_host_attribute_injection_executed:false};
}
export function compileAttributeTypes(models,compilerRoot){
 const path=compilerRoot?join(compilerRoot,'lib/typescript.js'):require.resolve('typescript'),compiler=require(path),receipts=[];
 for(const m of models){const file=join(dirname(dirname(dirname(m.package_root))),'attribute-consumer.ts'),code=`import {Attribute} from '@angular/core';import type {Attribute as Metadata} from '@angular/core';
const metadata:Metadata=new Attribute('tabindex');const name:string=metadata.attributeName;new Attribute('aria-live');Attribute('');
class Fixture{constructor(@Attribute('tabindex') first:string,@Attribute('aria-live') second:string){}}
// @ts-expect-error A name is required.
Attribute();
// @ts-expect-error A constructed name is required.
new Attribute();
// @ts-expect-error Name is a string.
Attribute(1);
// @ts-expect-error Null is not a string.
new Attribute(null);
// @ts-expect-error Attribute metadata stays a string.
metadata.attributeName=undefined;
`;writeFileSync(file,code);const program=compiler.createProgram([file],{target:compiler.ScriptTarget.ES2022,module:compiler.ModuleKind.ESNext,moduleResolution:compiler.ModuleResolutionKind.Bundler,experimentalDecorators:true,strict:true,skipLibCheck:false,noEmit:true,lib:['lib.es2022.d.ts','lib.dom.d.ts']}),diagnostics=compiler.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,compiler.formatDiagnostics(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>dirname(file),getNewLine:()=> '\n'}));receipts.push({line:m.subject.line,negative_checks:5,fixture_sha256:hash(code)});}
 return {compiler:compiler.version,compiler_source_sha256:hash(readFileSync(path)),subjects:receipts};
}
export async function reviewAttributeDecoratorUses({root=rootDefault,subjects,compilerRoot,readSource,skipDiagnostics=false}={}){
 const seed=readFileSync(join(root,'compatibility/f10/authored-dependency-inventory-seed.json'));assert.equal(hash(seed),'3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');const uses=JSON.parse(seed).symbol_uses.filter(u=>u.module===moduleName&&u.symbol===symbolName);assert.equal(uses.length,9);const loaded=subjects??await attributeDecoratorSubjects(root),own=!subjects,read=p=>readSource?readSource(p):readFileSync(join(root,p),'utf8');
 try{
  const paths=execFileSync('rg',['--files','projects/ngx-material-legacy','-g','*.ts','-g','!*.spec.ts'],{cwd:root,encoding:'utf8'}).trim().split('\n'),actual=paths.filter(p=>parse(p,read(p)).statements.some(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text===moduleName&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)&&n.importClause.namedBindings.elements.some(i=>(i.propertyName||i.name).text===symbolName)));assert.equal(actual.length,9);
  const options={noResolve:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true},host=ts.createCompilerHost(options),oldRead=host.readFile.bind(host),base=join(root,'projects/ngx-material-legacy');host.readFile=p=>p.startsWith(base+'/')?read('projects/ngx-material-legacy/'+p.slice(base.length+1)):oldRead(p);const program=ts.createProgram(actual.map(p=>join(root,p)),options,host),checker=program.getTypeChecker(),cases=[];
  for(const path of actual){const source=program.getSourceFile(join(root,path)),file=path.slice('projects/ngx-material-legacy/'.length),imports=source.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text===moduleName&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)).flatMap(n=>n.importClause.namedBindings.elements.filter(i=>(i.propertyName||i.name).text===symbolName)),imported=one(imports,'missing/ambiguous Attribute import'),symbol=checker.getSymbolAtLocation(imported.name);assert.ok(symbol.declarations.length===1&&symbol.declarations[0]===imported,'Attribute import shadowed');const references=[];
   function visit(n){if(ts.isIdentifier(n)&&n!==imported.name&&n!==imported.propertyName&&checker.getSymbolAtLocation(n)===symbol){assert.ok(!imported.isTypeOnly&&!imported.parent.parent.isTypeOnly,'runtime Attribute imported type only');const call=n.parent;assert.ok(ts.isCallExpression(call)&&call.expression===n&&call.arguments.length===1&&!call.typeArguments&&ts.isDecorator(call.parent)&&ts.isParameter(call.parent.parent)&&ts.isConstructorDeclaration(call.parent.parent.parent),'unreviewed Attribute role');assert.ok(ts.isStringLiteral(call.arguments[0]),'Attribute name must remain literal');const name=call.arguments[0].text;assert.ok(['tabindex','aria-live'].includes(name),'unreviewed Attribute name');const parameter=call.parent.parent,constructor=parameter.parent,cls=constructor.parent;assert.ok(ts.isClassDeclaration(cls)&&cls.name);assert.ok(!cls.members.some(m=>m.modifiers?.some(x=>x.kind===ts.SyntaxKind.StaticKeyword)&&m.name?.getText(source)==='hasOwnProperty'),'nonordinary Attribute constructor');references.push({line:source.getLineAndCharacterOfPosition(n.getStart(source)).line+1,expression:call.getText(source),target_class:cls.name.text,parameter:parameter.name.getText(source),index:constructor.parameters.indexOf(parameter),attribute_name:name});}ts.forEachChild(n,visit);}visit(source);assert.equal(references.length,1);assert.ok(uses.some(u=>u.file===file));cases.push({file,module:moduleName,symbol:symbolName,local_name:imported.name.text,candidate_source_sha256:hash(source.text),references});
  }
  assert.equal(cases.length,9);const behaviors=[],authored=[];
  if(!skipDiagnostics)for(const m of loaded.models){behaviors.push({line:m.subject.line,...exerciseAttributeDecorator(m.runtime)});const receipts=[];for(const c of cases)for(const r of c.references){const target=new Function(c.local_name,emit(`class AttributeProtocol{};const annotation=${r.expression};const returned=annotation(AttributeProtocol,undefined,${r.index});return {target:AttributeProtocol,returned,annotation};`))(m.runtime.Attribute);assert.equal(target.returned,target.target);const slot=target.target.__parameters__[r.index];assert.equal(slot.length,1);assert.equal(slot[0],target.annotation.annotation);assert.equal(slot[0].attributeName,r.attribute_name);assert.equal(typeof slot[0].__NG_ELEMENT_ID__,'function');receipts.push({file:c.file,parameter:r.parameter,index:r.index,attribute_name:r.attribute_name,annotation_registered:true,target_is_protocol:true,native_attribute_read:false});}authored.push({line:m.subject.line,annotation_registrations:9,cases:receipts});}
  const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version,line=version.startsWith('21.')?'21.x':'main';
  return {schema_version:1,line,frozen_uses:9,current_uses:9,current_delta_uses:0,node:process.version,binding_parser:ts.version,cases,behaviors,authored_metadata:authored,rxjs:loaded.rxjs,source_override_used:!!readSource,subjects:loaded.models.map(m=>({subject:{...m.subject,members:undefined},attribute_contract:m.attribute_contract})),type_compilation:skipDiagnostics?null:compileAttributeTypes(loaded.models,compilerRoot),limits:['Public annotation/type/constructor metadata only; no private node callback invoked. All actual host node attribute resolution/native compiler/full source classes/rendering/packed/AOT/floor obligations remain separate.','Exact9 literal constructor calls replay through genuine original/minimum APIs at actual parameter indices using protocol classes. No consumer or product source edits.'],g11_claim:'not-passed'};
 }finally{if(own)loaded.dispose();}
}
