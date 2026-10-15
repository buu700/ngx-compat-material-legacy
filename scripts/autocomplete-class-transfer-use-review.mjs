/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Last string-coercion call and exact class-transfer methods; no full component claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {SourceTextModule,SyntheticModule} from 'node:vm';
import {elementRefSubjects} from './element-ref-use-review.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const file='legacy-autocomplete/internal/autocomplete-base.ts',moduleName='@angular/cdk/coercion',name='coerceStringArray';
const parse=(path,text)=>{const sf=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);return sf;};
const printer=ts.createPrinter({removeComments:true}),print=(node,sf)=>printer.printNode(ts.EmitHint.Unspecified,node,sf);
const emit=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const canonical=(body,sf,local=name)=>{
  const code=emit('function replay(){'+body.statements.map(n=>n.getText(sf)).join('\n')+'}'),parsed=parse('replay.ts',code);
  const changed=ts.transform(parsed,[context=>{
    const visit=node=>ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text===local
      ? ts.factory.updateCallExpression(node,ts.factory.createIdentifier(name),node.typeArguments,node.arguments)
      : ts.visitEachChild(node,visit,context);
    return source=>ts.visitNode(source,visit);
  }]);
  try{return print(changed.transformed[0].statements.find(ts.isFunctionDeclaration).body,changed.transformed[0]);}
  finally{changed.dispose();}
};

/** Same canonical coercion subjects, portable storage, and existing genuine Core loader. */
export async function autocompleteClassSubjects(root=rootDefault) {
  const canonicalRaw=readFileSync(join(root,'compatibility/rc/coercion-public-subjects.json'));
  assert.equal(hash(canonicalRaw),'be5c12b5d9829221410bb9b1ce490f247cf1992059fcd1893a1a5b7f90b86d86');
  const canonicalSubjects=JSON.parse(canonicalRaw),portableRaw=readFileSync(join(root,'compatibility/rc/coercion-portable-subjects.json'));
  const portable=JSON.parse(portableRaw);assert.deepEqual(portable.canonical_subjects,{path:'compatibility/rc/coercion-public-subjects.json',sha256:hash(canonicalRaw)});
  assert.deepEqual(portable.subjects.map(s=>s.line),canonicalSubjects.subjects.map(s=>s.line));
  const core=await elementRefSubjects(root),models=[];
  try {for(const subject of canonicalSubjects.subjects) {
    const stored=portable.subjects.find(s=>s.line===subject.line),sources=new Map();
    assert.equal(stored.version,subject.version);assert.equal(stored.archive_sha256,subject.archive_sha256);
    assert.deepEqual(stored.members.map(m=>m.source_member),subject.members.map(m=>m.path));
    for(const member of subject.members) {
      const ref=stored.members.find(m=>m.source_member===member.path);assert.equal(ref.sha256,member.sha256);assert.equal(ref.bytes,member.bytes);
      assert.ok(ref.path.startsWith('compatibility/rc/coercion-portable-sources/')&&!ref.path.split('/').includes('..'));
      const compressed=readFileSync(join(root,ref.path));assert.equal(hash(compressed),ref.gzip_sha256);
      const bytes=gunzipSync(compressed);assert.equal(hash(bytes),member.sha256);assert.equal(bytes.length,member.bytes);sources.set(member.path,bytes.toString());
    }
    const pkg=JSON.parse(sources.get('package.json'));assert.equal(pkg.name,'@angular/cdk');assert.equal(pkg.version,subject.version);
    assert.equal(pkg.exports['./coercion'].default,'./'+subject.public_entry);assert.equal(pkg.exports['./coercion'].types,'./'+subject.public_types);
    const raw=sources.get(subject.public_entry),sf=parse(subject.public_entry,raw);
    const nodes=sf.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.equal(nodes.length,1);
    const declarations=[];
    for(const member of subject.declarations) {
      const text=readFileSync(join(root,member.path),'utf8');assert.equal(hash(text),member.sha256);
      const source=parse(member.path,text);
      for(const node of source.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name)) {
        assert.ok(!ts.getJSDocTags(node).some(t=>['deprecated','docs-private','experimental','breaking-change'].includes(t.tagName.text)));
        assert.ok(node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)||source.statements.some(n=>ts.isExportDeclaration(n)&&n.exportClause&&ts.isNamedExports(n.exportClause)&&n.exportClause.elements.some(e=>e.name.text===name)),'missing public string-coercion declaration export');
        declarations.push({generics:(node.typeParameters||[]).map(t=>t.getText(source)),parameters:node.parameters.map(p=>({type:p.type.getText(source),optional:!!p.questionToken,rest:!!p.dotDotDotToken})),returns:node.type.getText(source)});
      }
    }
    assert.equal(declarations.length,1);
    assert.ok(sf.statements.some(n=>ts.isExportDeclaration(n)&&n.exportClause&&ts.isNamedExports(n.exportClause)&&n.exportClause.elements.some(e=>e.name.text===name)));
    const framework=core.models.find(m=>m.subject.line===subject.line);assert.ok(framework);
    const bridge=new SyntheticModule(Object.keys(framework.runtime),function(){for(const key of Object.keys(framework.runtime))this.setExport(key,framework.runtime[key]);});
    const modules=new Map(),moduleFor=path=>{if(!modules.has(path)){assert.ok(sources.has(path),'missing complete coercion module');modules.set(path,new SourceTextModule(sources.get(path),{identifier:path}));}return modules.get(path);};
    const linker=(specifier,importer)=>{
      if(specifier==='@angular/core')return bridge;
      assert.ok(specifier.startsWith('./'),'unexpected coercion runtime dependency');
      const target=join(dirname(importer.identifier),specifier);assert.ok(!target.split('/').includes('..'));return moduleFor(target);
    };
    const entry=moduleFor(subject.public_entry);await entry.link(linker);await entry.evaluate();const runtime=entry.namespace;
    assert.equal(runtime[name].toString(),nodes[0].getText(sf));
    models.push({line:subject.line,version:subject.version,archive_sha256:subject.archive_sha256,
      module_sha256:hash(raw),function_source:print(nodes[0],sf),declaration:declarations[0],framework_version:framework.subject.version,
      complete_runtime_modules:[...modules.keys()].map(path=>({path,sha256:hash(sources.get(path))})),runtime});
  }
  const original=models.find(m=>m.line==='original');
  for(const model of models){assert.equal(model.function_source,original.function_source);assert.deepEqual(model.declaration,original.declaration);}
  return {models,coercion_subjects_sha256:hash(canonicalRaw),portable_subjects_sha256:hash(portableRaw),dispose:core.dispose};
  } catch(error) {core.dispose();throw error;}
}

function inspectCaller(root,read) {
  const path='projects/ngx-material-legacy/'+file,text=read(path),sf=parse(path,text);
  const options={target:ts.ScriptTarget.ES2022,noResolve:true,experimentalDecorators:true},host=ts.createCompilerHost(options),base=host.readFile.bind(host);
  host.readFile=p=>p===join(root,path)?text:base(p);
  const program=ts.createProgram([join(root,path)],options,host),source=program.getSourceFile(join(root,path)),checker=program.getTypeChecker();assert.ok(source);
  const imports=source.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text===moduleName&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings));
  const bindings=imports.flatMap(n=>n.importClause.namedBindings.elements.filter(b=>(b.propertyName||b.name).text===name));assert.equal(bindings.length,1);
  const binding=bindings[0],symbol=checker.getSymbolAtLocation(binding.name);assert.deepEqual(symbol?.declarations,[binding]);
  assert.ok(!binding.isTypeOnly&&!binding.parent.parent.isTypeOnly);
  const references=[];
  function visit(node) {
    if(ts.isIdentifier(node)&&node!==binding.name&&node!==binding.propertyName&&checker.getSymbolAtLocation(node)===symbol) {
      assert.ok(ts.isCallExpression(node.parent)&&node.parent.expression===node&&node.parent.arguments.length===1);
      assert.equal(node.parent.arguments[0].getText(source),'value');references.push(node.parent.getText(source));
    }
    ts.forEachChild(node,visit);
  }
  visit(source);assert.equal(references.length,1);
  const cls=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='_MatAutocompleteBase');assert.ok(cls);
  const taggedRaw=readFileSync(join(root,'compatibility/rc/key-manager-tagged-construction-subjects.json'));
  assert.equal(hash(taggedRaw),'50e7f14e8460bef4eab432c53de985b502678d5c1f0257b1dbcc4a2e30e1aad2');
  const entry=JSON.parse(taggedRaw).members.find(m=>m.archive_member==='package/fesm2022/autocomplete.mjs');assert.ok(entry);
  const compressed=readFileSync(join(root,entry.path));assert.equal(hash(compressed),entry.gzip_sha256);
  const tagged=gunzipSync(compressed);assert.equal(hash(tagged),entry.sha256);assert.equal(tagged.length,entry.bytes);
  const oldSf=parse(entry.archive_member,tagged.toString()),oldClass=oldSf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='_MatAutocompleteBase');assert.ok(oldClass);
  const methods=['classList','_setVisibilityClasses','_setThemeClasses'].map(method=>{
    const own=cls.members.filter(n=>n.name?.getText(sf)===method&&(ts.isSetAccessorDeclaration(n)||ts.isMethodDeclaration(n)));
    const old=oldClass.members.filter(n=>n.name?.getText(oldSf)===method&&(ts.isSetAccessorDeclaration(n)||ts.isMethodDeclaration(n)));
    assert.equal(own.length,1);assert.equal(old.length,1);assert.ok(own[0].body&&old[0].body);
    assert.equal(own[0].parameters.length,1);assert.equal(old[0].parameters.length,1);
    const original=canonical(old[0].body,oldSf);assert.equal(canonical(own[0].body,sf,binding.name.text),original,'complete class-transfer method differs: '+method);
    const extract=(node,source)=>`${ts.isSetAccessorDeclaration(node)?'set ':''}${method}(${node.parameters[0].name.getText(source)}){${node.body.statements.map(n=>n.getText(source)).join('\n')}}`;
    return {name:method,original:extract(old[0],oldSf),candidate:extract(own[0],sf),tagged_body_sha256:hash(original)};
  });
  return {file,module:moduleName,symbol:name,candidate_source_sha256:hash(text),local_name:binding.name.text,references,methods,tagged_member_sha256:entry.sha256};
}

export function exerciseStringCoercion(current,original) {
  const values=[null,undefined,true,false,0,-0,1,NaN,'',' ','a',' a\tb\n c ','a a','a\u00a0b',[' a ','b'],['a b'],[],['',' '],['a','a'],[null,undefined],{},[1,false],Symbol('direct'),[Symbol('array')]];
  const factories=values.map((value,i)=>({id:'literal-'+i,create:()=>({value,reads:[]})}));
  for(const [id,result] of [['string','  a b  '],['empty',''],['null',null],['symbol',Symbol('return')]])factories.push({id:'primitive-'+id,create(){const reads=[];return {reads,value:{[Symbol.toPrimitive](hint){reads.push(hint);return result;}}};}});
  factories.push({id:'throwing',create(){const reads=[];return {reads,value:{[Symbol.toPrimitive](hint){reads.push(hint);throw new RangeError('sentinel');}}};}});
  factories.push({id:'array-conversion-order',create(){const reads=[];return {reads,value:[{toString(){reads.push('first');return ' a ';}},{toString(){reads.push('second');return 'b c';}}]};}});
  const receipts=[];
  const observe=(fn,state)=>{try{const result=fn(state.value);assert.ok(Array.isArray(result));assert.notEqual(result,state.value,'returned caller array');return {result,error:null,reads:state.reads};}catch(error){return {error:error.name,reads:state.reads};}};
  for(const factory of factories){const expected=observe(original,factory.create()),actual=observe(current,factory.create());assert.deepEqual(actual,expected,'string coercion differs: '+factory.id);receipts.push({id:factory.id,...actual});}
  return {cases:receipts.length,receipt_sha256:hash(JSON.stringify(receipts)),authored_argument_count:1};
}

function replayClasses(caller,current,original) {
  const compile=(kind,fn)=>new Function(kind==='original'?name:caller.local_name,emit('class Replay{'+caller.methods.map(m=>m[kind]).join('\n')+'}')+';return Replay;')(fn);
  const Before=compile('original',original),After=compile('candidate',current);
  const inputs=['',' ',' alpha\tbeta\nalpha ',['one',' two '],['one two'],['mat-primary','mat-autocomplete-hidden'],'mat-primary mat-warn',['',' ']];
  const receipts=[];
  function observe(Type,value,visible,color){const host={className:'source-host'},instance=new Type();
    Object.assign(instance,{_elementRef:{nativeElement:host},_classList:{stale:true},_visibleClass:'mat-autocomplete-visible',_hiddenClass:'mat-autocomplete-hidden',showPanel:visible,_color:color});
    instance.classList=Array.isArray(value)?value.slice():value;
    const first={classes:Object.entries(instance._classList),host:host.className};
    host.className='replacement-host';instance.classList='replacement';
    return {first,replacement:{classes:Object.entries(instance._classList),host:host.className}};}
  for(const value of inputs)for(const visible of [false,true])for(const color of ['primary','accent','warn',undefined]) {
    const expected=observe(Before,value,visible,color),actual=observe(After,value,visible,color);
    assert.deepEqual(actual,expected,'class-transfer state differs');assert.equal(actual.first.host,'');
    assert.equal(actual.first.classes.find(([key])=>key==='stale'),undefined);
    receipts.push({input:value,visible,color:color??null,...actual});
  }
  return {cases:receipts.length,receipt_sha256:hash(JSON.stringify(receipts)),complete_methods:3,
    execution:'exact-source methods with explicit host className/state protocols',whole_component_or_DOM_executed:false};
}

export async function reviewAutocompleteClassTransfer({root=rootDefault,readSource,subjects,runtimeOverrides}={}) {
  const read=p=>readSource?readSource(p):readFileSync(join(root,p),'utf8'),loaded=subjects||await autocompleteClassSubjects(root);
  try {const caller=inspectCaller(root,read),original=loaded.models.find(m=>m.line==='original');assert.ok(original);
  const behaviors=[],delegations=[];
  for(const model of loaded.models) {
    const current=runtimeOverrides?.[model.line]||model.runtime[name];
    behaviors.push({line:model.line,...exerciseStringCoercion(current,original.runtime[name])});
    delegations.push({line:model.line,...replayClasses(caller,current,original.runtime[name])});
  }
  const manifest=JSON.parse(read('projects/ngx-material-legacy/package.json')),line=manifest.version.startsWith('21.')?'21.x':'main';
  assert.equal(manifest.peerDependencies['@angular/cdk'],'^'+loaded.models.find(m=>m.line===line).version);
  return {schema_version:1,line,node:process.version,typescript:ts.version,coercion_subjects_sha256:loaded.coercion_subjects_sha256,portable_subjects_sha256:loaded.portable_subjects_sha256,
    case:caller,contracts:loaded.models.map(({runtime,...model})=>model),behaviors,delegations,
    source_override_used:!!readSource,runtime_override_used:!!runtimeOverrides,
    limits:'One frozen public helper call, complete original/minimum public helper and exact original/current setter plus two helper methods. Explicit host/state protocol replay; no whole Angular component, native/overlay rendering, assistive technology, packed or runtime/compiler-floor execution. Other APIs and all upstream SHAs remain separate.',g11_claim:'not-passed'};
  } finally {if(!subjects)loaded.dispose();}
}
