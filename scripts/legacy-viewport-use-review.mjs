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
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');

/** Finite owned replacement bindings and exact caller surface, not caller runtime. */
export function reviewLegacyViewportUses({root=rootDefault,readSource}={}) {
  const read=path=>readSource?readSource(path):readFileSync(resolve(root,path),'utf8');
  const seed=readFileSync(resolve(root,'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(hash(seed),'3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const uses=JSON.parse(seed).symbol_uses.filter(r=>r.module==='@angular/cdk/scrolling'&&r.symbol==='ViewportRuler');
  assert.equal(uses.length,8);
  const manifest=JSON.parse(read('projects/ngx-material-legacy/package.json'));
  const line=manifest.version.startsWith('21.')?'21.x':'main';
  const parse=(path,text)=>ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);
  const exportPath='projects/ngx-material-legacy/legacy-core/public-api.ts';
  const exported=parse(exportPath,read(exportPath));
  const links=exported.statements.filter(n=>ts.isExportDeclaration(n)&&n.moduleSpecifier?.text==='./internal/legacy-viewport'&&n.exportClause&&ts.isNamedExports(n.exportClause))
    .flatMap(n=>n.exportClause.elements.filter(e=>e.name.text==='_LegacyViewport'&&(e.propertyName||e.name).text==='_LegacyViewport'));
  assert.equal(links.length,1,'shared core viewport identity missing');
  const helperPath='projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts';
  const helper=parse(helperPath,read(helperPath));
  const classes=helper.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text==='_LegacyViewport');assert.equal(classes.length,1);
  assert.ok(classes[0].modifiers.some(m=>m.kind===ts.SyntaxKind.ExportKeyword));
  assert.equal(classes[0].members.filter(ts.isPropertyDeclaration).length,0,'structural supplied-instance shape changed');
  for(const n of helper.statements.filter(ts.isImportDeclaration))assert.notEqual(n.moduleSpecifier.text,'@angular/cdk/scrolling','owned helper calls current private ruler');
  const cases=[],calls=[],sources=[];
  for(const use of uses) {
    const path='projects/ngx-material-legacy/'+use.file,text=read(path),file=parse(path,text);
    assert.equal(file.parseDiagnostics.length,0);
    const imports=file.statements.filter(ts.isImportDeclaration),matches=imports
      .filter(n=>n.moduleSpecifier.text==='@ngx-compat/material-legacy/legacy-core'&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings))
      .flatMap(n=>n.importClause.namedBindings.elements.filter(e=>e.propertyName?.text==='_LegacyViewport'&&e.name.text==='ViewportRuler'));
    assert.equal(matches.length,1,'owned viewport alias missing or ambiguous');
    for(const n of imports.filter(n=>n.moduleSpecifier.text==='@angular/cdk/scrolling'))assert.ok(!n.importClause?.namedBindings?.elements?.some(e=>(e.propertyName||e.name).text==='ViewportRuler'));
    const options={noResolve:true,noLib:true};
    const host=ts.createCompilerHost(options);host.getSourceFile=p=>p===resolve(root,path)?file:undefined;
    const checker=ts.createProgram([resolve(root,path)],options,host).getTypeChecker();
    const binding=matches[0],symbol=checker.getSymbolAtLocation(binding.name),references=[],receivers=[];
    let constructor;
    assert.ok(symbol);
    const visit=node=>{
      if(ts.isIdentifier(node)&&node.text==='ViewportRuler'&&node!==binding.name) {
        assert.ok(checker.getSymbolAtLocation(node)===symbol,'shadowed or foreign viewport type');
        assert.ok(ts.isTypeReferenceNode(node.parent)&&node.parent.typeName===node&&!node.parent.typeArguments?.length,'unsupported viewport symbol runtime use');
        assert.ok(ts.isParameter(node.parent.parent),'viewport type outside reviewed constructor parameter');
        const param=node.parent.parent;assert.ok(ts.isConstructorDeclaration(param.parent));
        constructor=param.parent;
        receivers.push(param.name.getText(file));references.push({line:file.getLineAndCharacterOfPosition(node.getStart(file)).line+1,parameter:param.name.getText(file)});
      }
      ts.forEachChild(node,visit);
    };visit(file);assert.equal(references.length,1);
    const owner=constructor.parent;
    const supplied=receivers[0];
    const propertyParameter=(constructor.parameters.find(p=>p.name.getText(file)===supplied).modifiers||[])
      .some(m=>[ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.ProtectedKeyword,ts.SyntaxKind.PublicKeyword].includes(m.kind));
    const forwarding=[];
    if(!propertyParameter && !use.file.includes('progress-spinner')){
      const visit=node=>{if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.SuperKeyword){
        const slots=node.arguments.flatMap((n,i)=>ts.isIdentifier(n)&&checker.getSymbolAtLocation(n)===checker.getSymbolAtLocation(constructor.parameters.find(p=>p.name.getText(file)===supplied).name)?[i]:[]);
        if(slots.length)forwarding.push({argument_index:slots[0],expression:node.getText(file)});
      }ts.forEachChild(node,visit);};visit(constructor);
      assert.equal(forwarding.length,1,'viewport constructor no longer forwards original supplied instance');
      const expected=use.file.includes('tab-nav-bar/tab-nav-bar.ts')?4:2;
      assert.equal(forwarding[0].argument_index,expected,'viewport constructor forwarding position changed');
    }
    const collect=node=>{
      if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)) {
        const receiver=node.expression.expression.getText(file);
        if(receivers.some(name=>receiver===name||receiver==='this.'+name)) {
          const name=node.expression.name.text;assert.ok(['change','getViewportSize','getViewportScrollPosition','getViewportRect'].includes(name));
          const args=node.arguments.map(n=>n.getText(file));
          if(name==='change')assert.deepEqual(args,use.file.includes('progress-spinner')||use.file.includes('paginated-tab-header')?['150']:[]);
          else assert.deepEqual(args,[]);
          calls.push({file:use.file,line:file.getLineAndCharacterOfPosition(node.getStart(file)).line+1,receiver,method:name,arguments:args});
        }
      }
      ts.forEachChild(node,collect);
    };collect(file);
    cases.push({...use,candidate_source_sha256:hash(text),references,forwarding,owner_class:owner.name.text,local_name:'ViewportRuler',replacement:'_LegacyViewport',replacement_module:'@ngx-compat/material-legacy/legacy-core'});
    sources.push({path,sha256:hash(text)});
  }
  const selectPath='projects/ngx-material-legacy/legacy-select/select.ts',select=parse(selectPath,read(selectPath));
  const selectCalls=[];
  const visit=node=>{
    if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(select)==='this._viewportRuler'){
      assert.ok(['change','getViewportSize'].includes(node.expression.name.text));
      assert.equal(node.arguments.length,0);
      selectCalls.push({file:'legacy-select/select.ts',line:select.getLineAndCharacterOfPosition(node.getStart(select)).line+1,receiver:'this._viewportRuler',method:node.expression.name.text,arguments:node.arguments.map(n=>n.getText(select))});
    }ts.forEachChild(node,visit);
  };visit(select);assert.deepEqual(selectCalls.map(c=>c.method).sort(),['change','getViewportSize','getViewportSize']);
  calls.push(...selectCalls);sources.push({path:selectPath,sha256:hash(read(selectPath))});
  assert.equal(calls.length,6);
  return {schema_version:1,line,cases,calls,sources,helper:{path:helperPath,sha256:hash(read(helperPath))},shared_export:{path:exportPath,sha256:hash(read(exportPath))},
    scope:'Eight exact aliases/constructor parameter bindings, shared core class export, all six direct/inherited current viewport call sites. Source review only; no component execution or packed generated DI claim.',g11_claim:'not-passed'};
}
