/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Seven public import roles; real legacy rendering remains a separate required test. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, join, resolve, posix} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {prepareMenuItemPublicSubjects} from '../scripts/menu-item-public-subjects.mjs';
import {scanCurrentAuthoredUses} from '../scripts/authored-current-use-inventory.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'), ts=createRequire(import.meta.url)('typescript');
const read=path=>readFileSync(join(root,path)), hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const inputPath='compatibility/rc/table-virtual-helper-use-inputs.json', raw=read(inputPath);
assert.equal(hash(raw),{main:'c70ee1b8b6b82ff0a2a2edd8993a885ea6c17d7ba0f3c60c53fe4af759ff6faf','21.x':'de0bc627c5fd5be117c39f80d803c9f3e51d68d3f8cfee4b19aa708e47fb58d5'}[line]);
const inputs=JSON.parse(raw), source=read(inputs.helper.path).toString();
assert.equal(hash(source),inputs.helper.sha256);assert.equal(inputs.helper.sha256,'9edd40a3915297b0ad36f6cc812649979c7a00bf8e40eabfc363aecdf6ea6771');
for(const member of inputs.evidence)assert.equal(hash(read(member.path)),member.sha256,'changed retained evidence '+member.path);
const parse=(path,text)=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
const stable=node=>assert.ok(!ts.getJSDocTags(node).some(tag=>['deprecated','docs-private','experimental','breaking-change'].includes(tag.tagName.text)),'unstable public declaration');
const file=parse(inputs.helper.path,source), imports=file.statements.filter(ts.isImportDeclaration).flatMap(node=>{
 assert.ok(node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings));
 return node.importClause.namedBindings.elements.map(binding=>({module:node.moduleSpecifier.text,symbol:(binding.propertyName||binding.name).text,type_only:binding.isTypeOnly||node.importClause.isTypeOnly}));
});
assert.equal(imports.length,7);assert.deepEqual(imports.filter(row=>row.type_only).map(row=>row.symbol).sort(),['InjectOptions','ProviderToken']);
const uses=scanCurrentAuthoredUses({root}).symbol_uses.filter(row=>row.file==='legacy-table/internal/table-construction-context.ts');
assert.equal(uses.length,7);
for(const use of uses){const imported=imports.find(row=>row.module===use.module&&row.symbol===use.symbol);assert.ok(imported);assert.equal(use.occurrences.length,1);assert.equal(use.occurrences[0].type_only,imported.type_only);}
const repair=JSON.parse(read('compatibility/rc/table-virtual-context-source-proof.json'));
assert.equal(repair.source_members.find(row=>row.path===inputs.helper.path).sha256,hash(source));
assert.equal(repair.native_regression.executed,false);
assert.equal(repair.actual_minimum_constructor_diagnostics.results.filter(row=>row.mode==='owned'&&row.exception_context_restored&&row.consumer_subclass_fields_preserved).length,2);
const loaded=prepareMenuItemPublicSubjects(root), results=[], declarations=[], types=[], mutants=[];
function publicType(model,spec,name){
 const parts=spec.split('/'),pkg=parts.slice(0,2).join('/'),suffix=parts.slice(2).join('/');
 const manifest=model.packages.get(pkg),entry=manifest.exports[suffix?'./'+suffix:'.'];assert.ok(entry?.types);
 const start=pkg+'/'+entry.types.replace(/^\.\//,''),seen=new Set(),chain=[];
 function find(path,binding){
  assert.ok(!seen.has(path+'#'+binding),'public export cycle');seen.add(path+'#'+binding);
  const text=model.sources.get(path);assert.ok(text,'uncaptured public declaration '+path);const sf=parse(path,text);
  const named=sf.statements.flatMap(node=>ts.isVariableStatement(node)?node.declarationList.declarations:[node]).filter(node=>node.name?.text===binding);
  if(named.length){
   assert.ok(named.length===1||named.every(ts.isFunctionDeclaration),'ambiguous public declaration');
   const available=named.filter(node=>!ts.getJSDocTags(node).some(tag=>['deprecated','docs-private','experimental','breaking-change'].includes(tag.tagName.text)));
   assert.ok(available.length,'no stable public overload');stable(available[0]);
   if(ts.isVariableDeclaration(available[0]))stable(available[0].parent.parent);
   return {source:sf,node:available[0],chain,overloads:named.map(node=>({declaration:node.getText(sf),markers:ts.getJSDocTags(node).map(tag=>tag.tagName.text)}))};
  }
  for(const node of sf.statements){
   const clause=ts.isExportDeclaration(node)?node.exportClause:ts.isImportDeclaration(node)?node.importClause?.namedBindings:null;
   if(!clause||!(ts.isNamedExports(clause)||ts.isNamedImports(clause)))continue;
   const item=clause.elements.find(item=>item.name.text===binding);if(!item)continue;stable(item);
   const next=(item.propertyName||item.name).text;
   if(!node.moduleSpecifier){chain.push({path,binding,next});return find(path,next);}
   assert.ok(node.moduleSpecifier.text.startsWith('./'));
   const target=posix.join(posix.dirname(path),node.moduleSpecifier.text.replace(/\.js$/,'.d.ts'));
   chain.push({path,binding,target,next});return find(target,next);
  }
  assert.fail('missing public declaration '+spec+'#'+name);
 }
 const entryFile=parse(start,model.sources.get(start));
 assert.ok(entryFile.statements.some(node=>node.name?.text===name&&node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)||ts.isExportDeclaration(node)&&node.exportClause&&ts.isNamedExports(node.exportClause)&&node.exportClause.elements.some(item=>item.name.text===name)),'not a public root export');
 return find(start,name);
}
function compileHelper(core,viewport,Parent,text=source){
 const sf=parse('helper.ts',text),body=sf.statements.filter(node=>!ts.isImportDeclaration(node)).map(node=>node.getText(sf)).join('\n');
 const output=ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 return new Function('exports','Injector','inject','runInInjectionContext','CdkTable','CDK_VIRTUAL_SCROLL_VIEWPORT',output+';return {LegacyTableConstructorInjector,preserveLegacyTableViewport};')({},core.Injector,core.inject,core.runInInjectionContext,Parent,viewport);
}
function exercise(core,viewport,text=source){
 const token=new core.InjectionToken('borrowed value'),other=new core.InjectionToken(viewport.toString().replace(/^InjectionToken /,''));
 const observed=[],fallback={kind:'fallback'},value={kind:'unchanged return'},optionRows=[undefined,...Array.from({length:16},(_,bits)=>({optional:!!(bits&1),self:!!(bits&2),skipSelf:!!(bits&4),host:!!(bits&8)}))];
 const forwarded={get(...args){observed.push(args);return value;}};
 const direct=compileHelper(core,viewport,class {},text),injector=new direct.LegacyTableConstructorInjector(forwarded);
 for(const candidate of [token,other,core.Injector])for(const options of optionRows){
  const before=observed.length;assert.equal(injector.get(candidate,fallback,options),value);assert.equal(observed.length,before+1);
  assert.deepEqual(observed.at(-1),[candidate,fallback,options]);assert.equal(observed.at(-1)[2],options);
 }
 const calls=observed.length;assert.equal(injector.get(viewport,fallback,{optional:true}),null);assert.equal(observed.length,calls);
 let destroyed=0,constructed=0;const borrowed={ngOnDestroy(){destroyed++;}},ancestor={kind:'ancestor viewport'},sentinel=Error('controlled parent throw');
 const environment=core.Injector.create({providers:[{provide:token,useValue:borrowed},{provide:viewport,useValue:ancestor}]});
 const inner=core.Injector.create({providers:[{provide:token,useValue:'inner'}]});
 let fail=false;
 class Parent {
  constructor(argument){
   constructed++;this.argument=argument;this.target=new.target;this.value=core.inject(token);this.node=core.inject(core.Injector);
   assert.equal(core.inject(viewport,{optional:true}),null);assert.equal(this.value,borrowed);assert.equal(this.node,environment);
   assert.equal(core.runInInjectionContext(inner,()=>core.inject(token)),'inner');assert.equal(core.inject(viewport,{optional:true}),null);
   if(fail)throw sentinel;
  }
 }
 const helper=compileHelper(core,viewport,Parent,text);
 class Owned extends Parent {own='own';}
 helper.preserveLegacyTableViewport(Owned);
 class Derived extends Owned {derived='derived';viewportAfter=core.inject(viewport);}
 try{
  core.runInInjectionContext(environment,()=>{
   const argument={kind:'same arguments'},instance=new Derived(argument);assert.equal(constructed,1);
   assert.ok(instance instanceof Derived&&instance instanceof Owned&&instance instanceof Parent);assert.equal(instance.target,Derived);
   assert.equal(instance.argument,argument);assert.equal(instance.own,'own');assert.equal(instance.derived,'derived');
   assert.equal(instance.viewportAfter,ancestor);assert.equal(instance.node.get(viewport),ancestor);assert.equal(core.inject(viewport),ancestor);
   assert.equal(destroyed,0);fail=true;assert.throws(()=>new Derived(),error=>error===sentinel);
   assert.equal(core.inject(viewport),ancestor);assert.equal(core.inject(token),borrowed);assert.equal(destroyed,0);
  });
  assert.throws(()=>core.inject(token),/NG0203|injection context/);assert.equal(destroyed,0);
 }finally{inner.destroy();environment.destroy();}
 assert.equal(destroyed,1,'only the external owner destroys its registered value');
 return {direct_forwarding_cases:calls,same_description_token_forwarded:true,only_exact_viewport_masked:true,arguments_and_new_target_preserved:true,
 derived_fields_and_later_viewport_preserved:true,nested_and_throwing_contexts_restored:true,borrowed_value_owned_only_by_external_injector:true,
 parent_and_service_values_are_protocols:true,actual_legacy_rendering_executed:false};
}
try{
 for(const model of loaded.models){
  const peerRequire=createRequire(join(model.root,'package.json'));
  await import(pathToFileURL(peerRequire.resolve('@angular/compiler')));
  const core=await import(pathToFileURL(peerRequire.resolve('@angular/core'))),scrolling=await import(pathToFileURL(peerRequire.resolve('@angular/cdk/scrolling')));
  const resolved=[];
  for(const row of imports.filter(row=>row.symbol!=='CdkTable')){
   const found=publicType(model,row.module,row.symbol);resolved.push({...row,path:found.source.fileName,member:found.node.getText(found.source),chain:found.chain,complete_overload_set:found.overloads});
  }
  const tableProof=JSON.parse(read('compatibility/rc/table-public-module-import-source-proof.json')).subjects.find(row=>row.line===model.line);
  const tableMember=tableProof.members.find(row=>row.path.endsWith('.d.ts'));assert.equal(hash(read(tableMember.path)),tableMember.sha256);
  const sf=parse(tableMember.path,read(tableMember.path).toString()),cls=sf.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='CdkTable');assert.ok(cls);stable(cls);
  const exported=sf.statements.some(node=>ts.isExportDeclaration(node)&&node.exportClause&&ts.isNamedExports(node.exportClause)&&node.exportClause.elements.some(item=>item.name.text==='CdkTable'));assert.ok(exported);
  const ctor=cls.members.find(ts.isConstructorDeclaration);assert.ok(ctor);stable(ctor);
  assert.equal(ctor.getText(sf),model.line==='21.x'?'constructor(...args: unknown[]);':'constructor();');
  const runtimeMember=tableProof.members.find(row=>row.path.endsWith('.mjs'));assert.equal(hash(read(runtimeMember.path)),runtimeMember.sha256);
  const runtimeFile=parse(runtimeMember.path,read(runtimeMember.path).toString()),runtimeClass=runtimeFile.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='CdkTable');
  assert.equal(runtimeClass.members.find(ts.isConstructorDeclaration).parameters.length,0);
  resolved.push({module:'@angular/cdk/table',symbol:'CdkTable',path:tableMember.path,member_sha256:hash(cls.getText(sf)),public_constructor_declaration:ctor.getText(sf),
   public_zero_argument_call_supported:true,actual_constructor_parameters:0,depends_on_ignored_compatibility_arguments:false,whole_declaration_member_sha256:tableMember.sha256});
  declarations.push({line:model.line,framework:core.VERSION.full,cdk:tableProof.version,imports:resolved});
  const fixture=join(model.root,'table-helper-core-contract.ts');
  const coreSource=source.replace("import {CdkTable} from '@angular/cdk/table';","class CdkTable {constructor() {}}")
   .replace("import {CDK_VIRTUAL_SCROLL_VIEWPORT} from '@angular/cdk/scrolling';","import {InjectionToken} from '@angular/core';\nconst CDK_VIRTUAL_SCROLL_VIEWPORT=new InjectionToken<unknown>('type protocol');");
  writeFileSync(fixture,coreSource+`\n// @ts-expect-error Public options flags require booleans.\nconst bad: InjectOptions={optional:'true'};\n// @ts-expect-error Objects without a public token shape are not ProviderToken.\nconst badToken: ProviderToken<unknown>={bad:true};\n`);
  const options={strict:true,noEmit:true,skipLibCheck:false,types:[],target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,lib:['lib.es2022.d.ts','lib.dom.d.ts']};
  const program=ts.createProgram([fixture],options),diagnostics=ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length,0,ts.formatDiagnostics(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
  const checker=program.getTypeChecker(),selected=[];const typed=program.getSourceFile(fixture);
  function visit(node){if(ts.isCallExpression(node)&&['this.parent.get','inject','runInInjectionContext'].includes(node.expression.getText(typed))){
   const signature=checker.getResolvedSignature(node);assert.ok(signature);assert.ok(!signature.getJsDocTags().some(tag=>tag.name==='deprecated'));
   const decl=signature.getDeclaration();stable(decl);selected.push({call:node.expression.getText(typed),declaration:decl.getText(decl.getSourceFile())});
  }ts.forEachChild(node,visit);}visit(typed);assert.equal(selected.length,3);
  types.push({line:model.line,compiler:ts.version,strict:true,skipLibCheck:false,negative_types:2,selected_stable_core_signatures:selected,cdk_dependencies_are_type_protocols:true,
   whole_actual_minimum_helper_compilation_retained_in:'compatibility/rc/table-virtual-context-source-proof.json'});
  results.push({line:model.line,...exercise(core,scrolling.CDK_VIRTUAL_SCROLL_VIEWPORT)});
  for(const [id,before,after]of [
   ['all-tokens-masked','token === CDK_VIRTUAL_SCROLL_VIEWPORT','true'],
   ['token-description-instead-of-identity','token === CDK_VIRTUAL_SCROLL_VIEWPORT','token.toString() === CDK_VIRTUAL_SCROLL_VIEWPORT.toString()'],
   ['fallback-lost','this.parent.get(token, notFoundValue, options)','this.parent.get(token, null, options)'],
   ['options-lost','this.parent.get(token, notFoundValue, options)','this.parent.get(token, notFoundValue, undefined)'],
   ['borrowed-value-cloned','this.parent.get(token, notFoundValue, options)','({...this.parent.get(token, notFoundValue, options)})'],
   ['target-discarded','Reflect.construct(parent, args, newTarget)','Reflect.construct(parent, args, parent)'],
   ['arguments-discarded','Reflect.construct(parent, args, newTarget)','Reflect.construct(parent, [], newTarget)'],
   ['constructor-context-omitted','runInInjectionContext(injector, () => Reflect.construct(parent, args, newTarget))','Reflect.construct(parent, args, newTarget)'],
  ]){
   const changed=source.replace(before,after);assert.notEqual(changed,source,id);
   assert.throws(()=>exercise(core,scrolling.CDK_VIRTUAL_SCROLL_VIEWPORT,changed),/AssertionError|NG0203/,id+' escaped');mutants.push({line:model.line,id,rejected:true});
  }
 }
 const report={schema_version:1,line,source_parent:inputs.source_parent,input_capsule_sha256:hash(raw),helper:inputs.helper,uses,
  declarations,types,results,mutants,namespace_capsule_sha256:loaded.capsule_hash,base_namespace_capsule_sha256:loaded.base_capsule_hash,
  producer_sha256:hash(read('tests/table_virtual_helper_use_probe.mjs')),node:process.version,compiler:ts.version,
  retained_actual_constructor_evidence:inputs.evidence[0],
  limits:['This finite import review executes the complete owned helper with genuine minimum Core and public scrolling token. Parent/service objects and CDK type placeholders in the new Core signature fixture are explicit protocols.',
   'The exact preceding whole-helper/minimum declaration and genuine CdkTable node-constructor receipts retain their original limited scope. No new actual legacy view, actual viewport, compiler21, DOM/browser, packed artifact, minimum toolchain/RxJS floor, upstream SHA or whole G11 qualification.'],
  actual_native_or_packed_or_floor_qualified:false,g11_claim:'not-passed'};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line,public_imports:uses.length,minimum_namespaces:results.length,direct_forwarding_cases:results.reduce((n,row)=>n+row.direct_forwarding_cases,0),stable_selected_signatures:types.reduce((n,row)=>n+row.selected_stable_core_signatures.length,0),helper_mutants_rejected:mutants.length,actual_native_or_packed_or_floor_qualified:false}));
}finally{loaded.dispose();}
