/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Whole genuine collections namespaces; exact finite radio methods, not a component fork. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync,symlinkSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,resolve,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {prepareMaterialPublicSubjects} from './material-public-subjects.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const hash=b=>createHash('sha256').update(b).digest('hex'),moduleName='@angular/cdk/collections',className='UniqueSelectionDispatcher';
const parse=(path,text)=>{const sf=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);return sf;};
const emit=(text,kind=ts.ModuleKind.CommonJS)=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:kind,removeComments:true}}).outputText;
const tree=(node,source)=>{
  if(ts.isParenthesizedExpression(node))return tree(node.expression,source);
  const children=[];ts.forEachChild(node,child=>{children.push(tree(child,source));});
  return [ts.SyntaxKind[node.kind],children.length?children:node.getText(source)];
};
const stable=node=>assert.ok(!ts.getJSDocTags(node).some(t=>['deprecated','docs-private','experimental','breaking-change'].includes(t.tagName.text)),'unstable dispatcher contract');
const printer=ts.createPrinter({removeComments:true});
function publicDeclaration(members,entry,name,kind,chain=[]) {
  assert.ok(chain.length<8&&!chain.includes(entry+'#'+name),'cyclic dispatcher public route');const sf=parse(entry,members.get(entry));
  const local=sf.statements.filter(n=>kind(n)&&n.name?.text===name),routes=[];
  for(const statement of sf.statements.filter(ts.isExportDeclaration))if(statement.exportClause&&ts.isNamedExports(statement.exportClause))for(const binding of statement.exportClause.elements)if(binding.name.text===name)routes.push({statement,binding});
  if(local.length) {
    assert.equal(local.length,1);assert.ok(local[0].modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)||routes.some(r=>!r.statement.moduleSpecifier),'nonpublic dispatcher declaration');stable(local[0]);return {node:local[0],source:sf,chain:[...chain,entry+'#'+name]};
  }
  assert.equal(routes.length,1);stable(routes[0].statement);stable(routes[0].binding);
  let actual=(routes[0].binding.propertyName||routes[0].binding.name).text,spec=routes[0].statement.moduleSpecifier?.text;
  if(!spec) {
    const imported=sf.statements.filter(ts.isImportDeclaration).filter(n=>n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings))
      .flatMap(statement=>statement.importClause.namedBindings.elements.filter(b=>b.name.text===actual).map(binding=>({statement,binding})));
    assert.equal(imported.length,1);spec=imported[0].statement.moduleSpecifier.text;actual=(imported[0].binding.propertyName||imported[0].binding.name).text;
  }
  assert.ok(spec.startsWith('./'));const target=posix.join(posix.dirname(entry),spec.replace(/\.js$/,'.d.ts'));assert.ok(members.has(target));
  return publicDeclaration(members,target,actual,kind,[...chain,entry+'#'+name]);
}
function dispatcherContract(subject,members) {
  const pkg=JSON.parse(members.get('package.json')),entry=pkg.exports['./collections'].types.slice(2);
  const found=publicDeclaration(members,entry,className,ts.isClassDeclaration),listener=publicDeclaration(members,entry,'UniqueSelectionDispatcherListener',ts.isTypeAliasDeclaration);
  assert.equal(found.node.typeParameters?.length||0,0);assert.equal(listener.node.typeParameters?.length||0,0);
  assert.equal(found.node.members.filter(ts.isConstructorDeclaration).length,0,'new dispatcher constructor contract');
  const signatures={};
  for(const name of ['notify','listen','ngOnDestroy']) {
    const nodes=found.node.members.filter(n=>ts.isMethodDeclaration(n)&&n.name.getText(found.source)===name);assert.equal(nodes.length,1);const node=nodes[0];stable(node);
    assert.ok(!node.modifiers?.some(m=>[ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.ProtectedKeyword].includes(m.kind)));
    signatures[name]=printer.printNode(ts.EmitHint.Unspecified,node,found.source).replace(/\s+/g,'');
  }
  const runtime=[];
  for(const [path,text] of members)if(path.endsWith('.mjs')) {
    const source=parse(path,text);for(const node of source.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===className))runtime.push({source,node});
  }
  assert.equal(runtime.length,1);const bodies={};
  for(const name of ['notify','listen','ngOnDestroy']) {
    const method=runtime[0].node.members.find(n=>ts.isMethodDeclaration(n)&&n.name.getText(runtime[0].source)===name);assert.ok(method?.body);
    bodies[name]=hash(JSON.stringify(tree(method.body,runtime[0].source)));
  }
  return {line:subject.line,version:pkg.version,entry,public_chain:found.chain,signatures,
    listener_type:printer.printNode(ts.EmitHint.Unspecified,listener.node.type,listener.source).replace(/\s+/g,''),runtime_bodies:bodies,
    runtime_path:runtime[0].source.fileName,runtime_sha256:hash(runtime[0].source.text),default_scope:'qualified only by actual createApplication worker, not metadata ancestry'};
}

/** Reuse the canonical material/framework loader and canonical collections/coercion byte rosters. */
export function prepareRadioDispatcherSubjects(root=rootDefault) {
  const bytes=readFileSync(join(root,'compatibility/rc/selection-model-public-subjects.json'));assert.equal(hash(bytes),'4932727a9d031223efc0108d2d22c4a95019b81ee06e834424246173bf7998cc');
  const capsule=JSON.parse(bytes),coercionBytes=readFileSync(join(root,'compatibility/rc/coercion-public-subjects.json'));
  assert.equal(hash(coercionBytes),'be5c12b5d9829221410bb9b1ce490f247cf1992059fcd1893a1a5b7f90b86d86');
  const portableBytes=readFileSync(join(root,'compatibility/rc/coercion-portable-subjects.json'));assert.equal(hash(portableBytes),'f75ef8d0b4751f1854ecb95b940544859be3390e0f00753ec6c5d9d0490aa38f');
  const coercion=JSON.parse(coercionBytes),portable=JSON.parse(portableBytes),loaded=prepareMaterialPublicSubjects(root),models=[];
  try {
    for(const model of loaded.models) {
      const subject=capsule.subjects.find(s=>s.line===model.line);assert.ok(subject);const members=new Map();
      const put=(path,raw)=>{const target=join(model.root,'node_modules/@angular/cdk',path);if(existsSync(target))assert.deepEqual(readFileSync(target),raw);else{mkdirSync(dirname(target),{recursive:true});writeFileSync(target,raw);}};
      for(const member of subject.members) {
        const stored=readFileSync(join(root,member.path));assert.equal(hash(stored),member.stored_sha256);const raw=gunzipSync(stored);assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);
        assert.ok(!members.has(member.module_path));members.set(member.module_path,raw.toString());put(member.module_path,raw);
      }
      const pkg=JSON.parse(members.get('package.json'));assert.equal(pkg.version,subject.version);assert.equal(pkg.name,'@angular/cdk');
      assert.deepEqual(subject.roots,['package.json',pkg.exports['./collections'].default.slice(2),pkg.exports['./collections'].types.slice(2)]);
      const source=coercion.subjects.find(s=>s.line===model.line),transport=portable.subjects.find(s=>s.line===model.line);assert.ok(source&&transport);
      assert.equal(source.version,pkg.version);assert.deepEqual(transport.members.map(m=>m.source_member),source.members.map(m=>m.path));
      for(const member of source.members) {
        const ref=transport.members.find(m=>m.source_member===member.path),stored=readFileSync(join(root,ref.path));assert.equal(hash(stored),ref.gzip_sha256);const raw=gunzipSync(stored);assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);put(member.path,raw);
      }
      const zoneRoot=dirname(require.resolve('zone.js/package.json'));symlinkSync(zoneRoot,join(model.root,'node_modules/zone.js'),'dir');
      models.push({...model,collections:subject,contract:dispatcherContract(subject,members),borrowed_zone:JSON.parse(readFileSync(join(zoneRoot,'package.json'))).version});
    }
    const original=models.find(m=>m.line==='original').contract;
    for(const model of models)for(const key of ['signatures','listener_type','runtime_bodies'])assert.deepEqual(model.contract[key],original[key],'dispatcher public contract/algorithm changed');
    return {models,collections_capsule_sha256:hash(bytes),framework_capsule_sha256:loaded.capsule_hash,dispose:loaded.dispose};
  } catch(error){loaded.dispose();throw error;}
}

export function inspectRadioDispatcherUses({root=rootDefault,readSource}={}) {
  const read=p=>readSource?readSource(p):readFileSync(join(root,p),'utf8');
  const raw=readFileSync(join(root,'compatibility/rc/radio-dispatcher-tagged-subjects.json'));assert.equal(hash(raw),'9c1108b2de88d6b207a78e0cf75cf9153968d1ac44e8ba7ac6b359a265871e1b');
  const tagged=JSON.parse(raw),original=new Map();
  for(const ref of tagged.members){const compressed=readFileSync(join(root,ref.path));assert.equal(hash(compressed),ref.gzip_sha256);const bytes=gunzipSync(compressed);assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);original.set(ref.archive_member,parse(ref.archive_member,bytes.toString()));}
  const paths=['legacy-radio/radio.ts','legacy-radio/internal/radio-base.ts'],cases=[],sources=[];
  for(const path of paths) {
    const text=read('projects/ngx-material-legacy/'+path),sf=parse(path,text),options={noLib:true,noResolve:true,experimentalDecorators:true},host=ts.createCompilerHost(options);host.getSourceFile=p=>p===join(root,path)?sf:undefined;
    const checker=ts.createProgram([join(root,path)],options,host).getTypeChecker();
    const bindings=sf.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text===moduleName&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)).flatMap(n=>n.importClause.namedBindings.elements.filter(b=>(b.propertyName||b.name).text===className));assert.equal(bindings.length,1);
    const binding=bindings[0],symbol=checker.getSymbolAtLocation(binding.name);assert.deepEqual(symbol?.declarations,[binding]);assert.ok(!binding.isTypeOnly&&!binding.parent.parent.isTypeOnly);
    const references=[];function visit(n){if(ts.isIdentifier(n)&&n!==binding.name&&n!==binding.propertyName&&checker.getSymbolAtLocation(n)===symbol){assert.ok(ts.isTypeReferenceNode(n.parent)&&n.parent.typeName===n,'unreviewed dispatcher token use');references.push(sf.getLineAndCharacterOfPosition(n.getStart(sf)).line+1);}ts.forEachChild(n,visit);}visit(sf);assert.equal(references.length,1);
    const owner=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===(path.endsWith('radio.ts')?'MatLegacyRadioButton':'_MatRadioButtonBase'));assert.ok(owner);
    const constructor=owner.members.find(ts.isConstructorDeclaration);assert.equal(constructor.parameters.length,8);
    const parameter=constructor.parameters[4];assert.equal(parameter.type.getText(sf),binding.name.text);
    assert.equal(parameter.name.getText(sf),path.endsWith('radio.ts')?'radioDispatcher':'_radioDispatcher');
    if(path.endsWith('radio.ts')) {
      const statements=constructor.body.statements;assert.equal(statements.length,1);assert.ok(ts.isExpressionStatement(statements[0])&&ts.isCallExpression(statements[0].expression)&&statements[0].expression.expression.kind===ts.SyntaxKind.SuperKeyword);
      assert.deepEqual(statements[0].expression.arguments.map(a=>a.getText(sf)),constructor.parameters.map(p=>p.name.getText(sf)));
    } else assert.ok(parameter.modifiers.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword));
    cases.push({file:path,module:moduleName,symbol:className,candidate_source_sha256:hash(text),references,local_name:binding.name.text,
      constructor_parameter:parameter.name.getText(sf),constructor_parameter_index:4});sources.push({path,sf,owner});
  }
  const own=sources[1],oldSf=original.get('package/fesm2022/radio.mjs'),oldClass=oldSf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='_MatRadioButtonBase');assert.ok(oldClass);
  const methodKeys=[['get','checked'],['set','checked'],['get','value'],['method','ngOnInit'],['method','ngOnDestroy'],['method','_onInputInteraction'],['method','_emitChangeEvent']];
  const methods=methodKeys.map(([kind,name])=>{
    const select=(owner,sf)=>owner.members.filter(n=>n.name?.getText(sf)===name&&(kind==='get'?ts.isGetAccessorDeclaration(n):kind==='set'?ts.isSetAccessorDeclaration(n):ts.isMethodDeclaration(n)));
    const current=select(own.owner,own.sf),before=select(oldClass,oldSf);assert.equal(current.length,1);assert.equal(before.length,1);
    const normalize=(node,sf)=>{const out=parse('method.mjs',emit('function replay('+node.parameters.map(p=>p.name.getText(sf)).join(',')+'){'+node.body.statements.map(n=>n.getText(sf)).join('\n')+'}',ts.ModuleKind.ESNext));return tree(out.statements.find(ts.isFunctionDeclaration).body,out);};
    const expected=normalize(before[0],oldSf);assert.deepEqual(normalize(current[0],own.sf),expected,'radio dispatch method differs from tagged16: '+name);
    const code=(node,sf)=>(kind==='method'?'':kind+' ')+name+'('+node.parameters.map(p=>p.name.getText(sf)).join(',')+'){'+node.body.statements.map(n=>n.getText(sf)).join('\n')+'}';
    return {kind,name,tagged_body_sha256:hash(JSON.stringify(expected)),original:code(before[0],oldSf),candidate:code(current[0],own.sf)};
  });
  const eventCode=(sf)=>{const node=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatRadioChange');assert.ok(node);return node.getText(sf).replace(/^export\s+/,'');};
  const oldEvent=emit(eventCode(oldSf),ts.ModuleKind.ESNext),ownEvent=emit(eventCode(own.sf),ts.ModuleKind.ESNext);assert.equal(ownEvent,oldEvent,'complete historical event class changed');
  const legacy=original.get('package/fesm2022/legacy-radio.mjs'),legacyClass=legacy.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyRadioButton');assert.ok(legacyClass);
  const oldCtor=legacyClass.members.find(ts.isConstructorDeclaration),ownCtor=sources[0].owner.members.find(ts.isConstructorDeclaration);
  const ctorProgram=(node,sf)=>emit('class Derived extends Parent{constructor('+node.parameters.map(p=>p.name.getText(sf)).join(',')+'){'+node.body.statements.map(n=>n.getText(sf)).join('\n')+'}}',ts.ModuleKind.ESNext);
  const ctorShape=(node,sf)=>{const code=ctorProgram(node,sf),parsed=parse('constructor.mjs',code);return tree(parsed,parsed);};
  assert.deepEqual(ctorShape(ownCtor,sources[0].sf),ctorShape(oldCtor,legacy),'complete historical derived forwarding changed');
  const replay=variant=>emit('export '+eventCode(variant==='original'?oldSf:own.sf)+'\nexport class RadioReplay{'+methods.map(m=>m[variant]).join('\n')+'}');
  return {schema_version:1,cases,methods,original:replay('original'),candidate:replay('candidate'),event_class_emit_sha256:hash(ownEvent),
    derived_constructor_structure_sha256:hash(JSON.stringify(ctorShape(ownCtor,sources[0].sf))),tagged_capsule_sha256:hash(raw),
    limits:'Exact seven methods and pure complete event class, plus eight-argument constructor forwarding. Runtime creation is a protocol fixture, never the actual owned component/node/factory.'};
}
