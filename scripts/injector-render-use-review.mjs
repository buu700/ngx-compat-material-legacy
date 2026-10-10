/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Seven current Injector dependencies; actual component/DI acceptance is separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ts = createRequire(import.meta.url)('typescript');
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export const renderInjectorRecipes = [
  {file:'legacy-autocomplete/internal/after-legacy-render.ts', helper:'afterLegacyRender', optional:false, event:'onStable', render:'afterNextRender', once:true, family:'autocomplete'},
  {file:'legacy-form-field/internal/after-form-field-render.ts', helper:'afterFormFieldRender', optional:true, event:'onStable', render:'afterEveryRender', once:false, family:'form-field'},
  {file:'legacy-select/internal/after-select-render.ts', helper:'afterSelectRender', optional:true, event:'onStable', render:'afterNextRender', once:true, family:'select'},
  {file:'legacy-tabs/internal/after-tab-header-render.ts', helper:'afterTabHeaderRender', optional:false, nullable:true, event:'onStable', render:'afterNextRender', once:true, capture:true, family:'tab-header'},
  {file:'legacy-tooltip/internal/after-tooltip-render.ts', helper:'afterTooltipRender', optional:false, event:'onMicrotaskEmpty', render:'afterNextRender', once:true, family:'tooltip'},
];
const owners = [
  {file:'legacy-form-field/form-field.ts', type:'MatLegacyFormField', index:7, helper:'afterFormFieldRender', family:'form-field'},
  {file:'legacy-select/internal/select-base.ts', type:'_MatSelectBase', index:14, helper:'afterSelectRender', family:'select', consumer:'legacy-select/select.ts'},
];

export function reviewRenderInjectorUses({root=defaultRoot, readSource}={}) {
  const read = file => readSource ? readSource('projects/ngx-material-legacy/'+file)
    : readFileSync(resolve(root,'projects/ngx-material-legacy',file),'utf8');
  const cases=[];
  const parse = (file,text) => {const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
    assert.equal(source.parseDiagnostics.length,0);return source;};
  const tokenImport = (source,typeOnly) => {
    const imports=source.statements.filter(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='@angular/core');
    const bindings=imports.flatMap(n=>n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)
      ?n.importClause.namedBindings.elements.filter(e=>(e.propertyName||e.name).text==='Injector'):[]);
    assert.equal(bindings.length,1);assert.equal(bindings[0].name.text,'Injector');
    assert.equal(Boolean(bindings[0].isTypeOnly||bindings[0].parent.parent.isTypeOnly),typeOnly);
  };
  for(const recipe of renderInjectorRecipes) {
    const text=read(recipe.file),source=parse(recipe.file,text);tokenImport(source,!recipe.capture);
    const fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===recipe.helper);
    assert.ok(fn);assert.equal(fn.parameters.length,2);const parameter=fn.parameters[1];
    assert.equal(parameter.name.text,'injector');assert.equal(Boolean(parameter.questionToken),recipe.optional);
    assert.equal(parameter.type.getText(source),recipe.nullable?'Injector | null':recipe.optional?'Injector | null':'Injector');
    const gets=[],renders=[],destroy=[],factories=[];
    const visit=node=>{
      if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(source)==='injector') {
        assert.equal(node.expression.name.text,'get','unreviewed supplied injector member');
        assert.deepEqual(node.arguments.map(n=>n.getText(source)),['ApplicationRef','null']);
        assert.equal(Boolean(node.expression.questionDotToken),recipe.optional||!!recipe.nullable);
        gets.push(node.getText(source));
      }
      if(ts.isCallExpression(node)&&node.expression.getText(source)===recipe.render) {
        assert.equal(node.arguments.length,2);assert.equal(node.arguments[1].getText(source),'{injector}');
        renders.push(node.getText(source));
      }
      if(ts.isCallExpression(node)&&node.expression.getText(source)==='rendered?.destroy')destroy.push(node.getText(source));
      if(ts.isCallExpression(node)&&node.expression.getText(source)==='Injector.create')factories.push(node);
      ts.forEachChild(node,visit);
    };visit(fn);
    assert.equal(gets.length,1);assert.equal(renders.length,1);assert.equal(destroy.length,1);assert.equal(factories.length,0);
    assert.ok(fn.getText(source).includes('zone.'+recipe.event+'.subscribe'));
    assert.ok(fn.getText(source).includes('if (zone.isStable)'));
    assert.ok(fn.getText(source).includes(recipe.event==='onStable'?'stable.unsubscribe();':'empty.unsubscribe();'));
    if(recipe.capture) {
      const capture=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='tabHeaderRenderInjector');
      assert.ok(capture);assert.equal(capture.type.getText(source),'Injector | null');
      assert.ok(capture.getText(source).includes('assertInInjectionContext(tabHeaderRenderInjector)'));
      assert.ok(capture.getText(source).includes('return inject(Injector);'));
      assert.ok(capture.getText(source).includes('return null;'));
    }
    cases.push({file:recipe.file,module:'@angular/core',symbol:'Injector',family:recipe.family,
      candidate_source_sha256:hash(text),helper:fn.getText(source),gets,renders,
      ownership:'Borrow supplied injector; only the returned render registration is destroyed',capture:!!recipe.capture});
  }
  for(const recipe of owners) {
    const text=read(recipe.file),source=parse(recipe.file,text);tokenImport(source,false);
    const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===recipe.type);assert.ok(cls);
    const ctor=cls.members.find(ts.isConstructorDeclaration);assert.ok(ctor);assert.equal(ctor.parameters.length,recipe.index+1);
    const parameter=ctor.parameters[recipe.index];assert.equal(parameter.name.text,'_injector');
    assert.ok(parameter.questionToken);assert.equal(parameter.type.getText(source),'Injector');
    const consumerFile=recipe.consumer||recipe.file,consumer=parse(consumerFile,read(consumerFile)),calls=[];
    const visit=node=>{if(ts.isPropertyAccessExpression(node)&&node.expression.kind===ts.SyntaxKind.ThisKeyword&&node.name.text==='_injector') {
      assert.ok(ts.isCallExpression(node.parent)&&node.parent.expression.getText(consumer)===recipe.helper);
      assert.deepEqual(node.parent.arguments.map(n=>n.getText(consumer)),['this._ngZone','this._injector']);calls.push(node.parent.getText(consumer));
    }ts.forEachChild(node,visit);};visit(consumer);assert.equal(calls.length,1);
    cases.push({file:recipe.file,module:'@angular/core',symbol:'Injector',family:recipe.family,
      candidate_source_sha256:hash(text),constructor_parameter:{index:recipe.index,declaration:parameter.getText(source)},
      consumer:{file:consumerFile,sha256:hash(read(consumerFile)),calls},ownership:'Optional trailing borrowed field forwarded unchanged to the family render helper'});
  }
  return {schema_version:1,cases,scope:'Seven current public Injector type/capture/get/forward contracts; helper registrations and complete source-member replay have separate runtime evidence. Actual legacy Angular factories/node DI, packed/native and complete consumer/runtime floors are not qualified.'};
}
