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
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const defaultRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const NAME='ControlValueAccessor',MODULE='@angular/forms';

/** Closes only the erased public interface binding, never forms runtime behavior. */
export function reviewControlValueAccessorTypes({root=defaultRoot,readSource,readBytes,subjectData,compilerRoot}={}){
 const require=createRequire(import.meta.url),compilerPath=compilerRoot?resolve(compilerRoot,'lib/typescript.js'):require.resolve('typescript'),ts=require(compilerPath);
 const read=path=>readSource?readSource(path):readFileSync(resolve(root,path),'utf8');
 const seed=readFileSync(resolve(root,'compatibility/f10/authored-dependency-inventory-seed.json'));
 assert.equal(hash(seed),'3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
 const manifest=JSON.parse(read('projects/ngx-material-legacy/package.json')),line=manifest.version.startsWith('21.')?'21.x':'main';
 const subjects=subjectData||JSON.parse(read('compatibility/rc/control-value-accessor-declaration-subjects.json'));
 assert.deepEqual(subjects.subjects.map(s=>s.line),['original','main','21.x']);
 const parse=(path,text)=>ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true),printer=ts.createPrinter({removeComments:true});
 const textOf=cap=>{const compressed=readBytes?readBytes(cap.path):readFileSync(resolve(root,cap.path));assert.equal(hash(compressed),cap.sha256,'compressed declaration changed');assert.equal(compressed.length,cap.bytes);const b=gunzipSync(compressed);assert.equal(hash(b),cap.member_sha256,'declaration subject changed');assert.equal(b.length,cap.member_bytes);return b.toString('utf8');};
 const models=subjects.subjects.map(subject=>{
  assert.equal(subject.package,MODULE);assert.equal(subject.module,MODULE);assert.equal(subject.archive_sri_verified,true);
  if(subject.line===line||subject.line==='original')assert.equal(hash(read(subject.lock_path)),subject.lock_sha256,'subject lock changed');
  if(subject.line===line)assert.equal(manifest.peerDependencies[MODULE],'^'+subject.version);
  const pkg=JSON.parse(textOf(subject.package_manifest)),source=textOf(subject.source);assert.equal(pkg.name,MODULE);assert.equal(pkg.version,subject.version);
  assert.equal(pkg.exports['.'].types.replace(/^\.\//,''),subject.entrypoint,'public forms package entry changed');
  assert.equal(subject.source.archive_member,'package/'+subject.entrypoint);
  const file=parse(subject.source.path,source);assert.equal(file.parseDiagnostics.length,0);
  const declarations=file.statements.filter(n=>ts.isInterfaceDeclaration(n)&&n.name.text===NAME);assert.equal(declarations.length,1,'missing/ambiguous interface');const node=declarations[0];
  assert.ok(!ts.getJSDocTags(node).some(t=>['deprecated','docs-private','experimental','breaking-change'].includes(t.tagName.text)),'private/deprecated interface');
  assert.equal(node.typeParameters?.length||0,0,'generic interface');assert.equal(node.heritageClauses?.length||0,0,'interface heritage changed');
  const publicExports=file.statements.filter(ts.isExportDeclaration).filter(n=>!n.moduleSpecifier&&n.exportClause&&ts.isNamedExports(n.exportClause)).flatMap(n=>[...n.exportClause.elements]).filter(n=>n.name.text===NAME);
  const exported=node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword);
  assert.ok(exported||publicExports.length===1,'interface not publicly exported');
  if(publicExports.length){assert.equal(publicExports.length,1);assert.equal(publicExports[0].propertyName?.text||publicExports[0].name.text,NAME,'public interface export changed');}
  for(const member of node.members)assert.ok(!ts.getJSDocTags(member).some(t=>['deprecated','docs-private','experimental','breaking-change'].includes(t.tagName.text)),'private/deprecated interface member');
  const shape=node.members.map(n=>printer.printNode(ts.EmitHint.Unspecified,n,file)).join('\n');
  return {line:subject.line,version:subject.version,path:subject.source.path,member_sha256:subject.source.member_sha256,shape,shape_sha256:hash(shape)};
 });
 for(const m of models.slice(1))assert.equal(m.shape,models[0].shape,'historical interface shape changed');
 const fixture=resolve(root,'__cva_interface_diagnostic__.ts'),chunks=['type Equal<A,B>=(<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2)?true:false;','type Assert<T extends true>=T;'];
 models.forEach((m,i)=>chunks.push(`interface Subject${i}{${m.shape}}`));
 for(const i of [1,2])chunks.push(`declare const original${i}:Subject0;const forward${i}:Subject${i}=original${i};declare const current${i}:Subject${i};const backward${i}:Subject0=current${i};type Exact${i}=Assert<Equal<Subject0,Subject${i}>>;`);
 for(const i of [0,1,2])chunks.push(`const optional${i}:Subject${i}={writeValue(obj:any):void{},registerOnChange(fn:any):void{},registerOnTouched(fn:any):void{}};const disabled${i}:Subject${i}={...optional${i},setDisabledState(isDisabled:boolean):void{}};`,`// @ts-expect-error Required change-registration member missing.\nconst missing${i}:Subject${i}={writeValue(obj:any):void{},registerOnTouched(fn:any):void{}};`,`// @ts-expect-error The disabled-state argument is boolean.\nconst wrong${i}:Subject${i}={...optional${i},setDisabledState(isDisabled:string):void{}};`);
 const options={strict:true,noEmit:true,types:[],lib:['lib.es2022.d.ts'],target:ts.ScriptTarget.ES2022},host=ts.createCompilerHost(options),hostRead=host.readFile.bind(host);host.readFile=path=>path===fixture?chunks.join('\n'):hostRead(path);
 const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram([fixture],options,host));assert.equal(diagnostics.length,0,'strict interface contract failed: '+ts.formatDiagnostics(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}));
 const uses=JSON.parse(seed).symbol_uses.filter(r=>r.module===MODULE&&r.symbol===NAME);assert.equal(uses.length,8);const sources=[],cases=[];
 const emit=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true,emitDecoratorMetadata:false}}).outputText;
 for(const use of uses){
  const path='projects/ngx-material-legacy/'+use.file,source=read(path),file=parse(path,source);assert.equal(file.parseDiagnostics.length,0);
  const bindings=file.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text===MODULE&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)).flatMap(node=>node.importClause.namedBindings.elements.filter(e=>(e.propertyName||e.name).text===NAME).map(binding=>({node,binding})));
  assert.equal(bindings.length,1,'missing/ambiguous interface import');const {node,binding}=bindings[0],references=[];
  const symbolHost=ts.createCompilerHost({...options,noResolve:true});symbolHost.getSourceFile=name=>name===resolve(root,path)?file:undefined;
  const checker=ts.createProgram([resolve(root,path)],{...options,noResolve:true},symbolHost).getTypeChecker(),symbol=checker.getSymbolAtLocation(binding.name);assert.ok(symbol);
  const visit=n=>{if(ts.isIdentifier(n)&&n.text===binding.name.text&&n!==binding.name&&n!==binding.propertyName){assert.ok(checker.getSymbolAtLocation(n)===symbol,'shadowed interface reference');assert.ok(ts.isExpressionWithTypeArguments(n.parent)&&n.parent.expression===n&&ts.isHeritageClause(n.parent.parent)&&n.parent.parent.token===ts.SyntaxKind.ImplementsKeyword,'runtime/unsupported interface reference');assert.equal(n.parent.typeArguments?.length||0,0,'generic authored interface');references.push({line:file.getLineAndCharacterOfPosition(n.getStart(file)).line+1,role:'erased-implements-interface',owner:n.parent.parent.parent.name.text});}ts.forEachChild(n,visit);};visit(file);assert.equal(references.length,1,'missing/ambiguous implements reference');
  const names=node.importClause.namedBindings,kept=names.elements.filter(e=>e!==binding),[start,end,replacement]=!kept.length&&!node.importClause.name?[node.getStart(file),node.end,'']:[names.getStart(file),names.end,'{'+kept.map(e=>e.getText(file)).join(', ')+(names.elements.hasTrailingComma?',':'')+'}'];
  const original=emit(source),erased=emit(source.slice(0,start)+replacement+source.slice(end));assert.equal(original,erased,'interface import changed runtime emit');
  sources.push({path,sha256:hash(source),bytes:Buffer.byteLength(source),emit_sha256:hash(original),emit_without_interface_sha256:hash(erased)});
  cases.push({...use,candidate_source_sha256:hash(source),local_name:binding.name.text,references});
 }
 return {schema_version:1,line,node:process.version,compiler:ts.version,compiler_source_sha256:hash(readFileSync(compilerPath)),compiler_root:compilerRoot||null,role:'Eight erased ControlValueAccessor interface bindings; runtime model/touch/disabled/provider behavior remains open.',models,sources,cases,strict_equalities:2,strict_assignments:4,optional_disabled_positives:6,negative_type_assignments:6,limitations:['Actual public complete interface and exact authored implements bindings only.','Diagnostic emitDecoratorMetadata:false; full Angular compilation/NG_VALUE_ACCESSOR selection/native/forms/RxJS/packed qualification unexecuted.','No runtime control method body or upstream SHA/security clearance.'],g11_claim:'not-passed'};
}
