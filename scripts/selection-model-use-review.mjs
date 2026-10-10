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
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');

export function reviewSelectionModelUses({root=rootDefault,readSource}={}){
 const read=path=>readSource?readSource(path):readFileSync(resolve(root,path),'utf8');
 const seed=readFileSync(resolve(root,'compatibility/f10/authored-dependency-inventory-seed.json'));assert.equal(hash(seed),'3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
 const uses=JSON.parse(seed).symbol_uses.filter(r=>r.module==='@angular/cdk/collections'&&r.symbol==='SelectionModel');assert.equal(uses.length,3);
 const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',cases=[];
 for(const use of uses){const path='projects/ngx-material-legacy/'+use.file,text=read(path),file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);
  const bindings=file.statements.filter(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text===use.module&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)).flatMap(n=>n.importClause.namedBindings.elements.filter(e=>(e.propertyName||e.name).text==='SelectionModel'));assert.equal(bindings.length,1);
  assert.ok(!bindings[0].isTypeOnly&&!bindings[0].parent.parent.isTypeOnly,'public model must remain a runtime import');
  const options={noResolve:true,noLib:true},host=ts.createCompilerHost(options);host.getSourceFile=p=>p===resolve(root,path)?file:undefined;const checker=ts.createProgram([resolve(root,path)],options,host).getTypeChecker(),symbol=checker.getSymbolAtLocation(bindings[0].name),references=[],constructors=[],calls=[],memberUses=[],receivers=use.file.includes('selection-list')?['this.selectedOptions','this.selectionList.selectedOptions']:['this._selectionModel'];
  const walk=node=>{
   if(ts.isIdentifier(node)&&node.text===bindings[0].name.text&&node!==bindings[0].name&&node!==bindings[0].propertyName){
    assert.ok(checker.getSymbolAtLocation(node)===symbol,'shadowed SelectionModel binding');
    assert.ok((ts.isTypeReferenceNode(node.parent)&&node.parent.typeName===node)||(ts.isNewExpression(node.parent)&&node.parent.expression===node),'unreviewed SelectionModel runtime use');
    references.push({line:file.getLineAndCharacterOfPosition(node.getStart(file)).line+1,kind:ts.isNewExpression(node.parent)?'constructor':'type'});
    if(ts.isNewExpression(node.parent)){const args=node.parent.arguments.map(n=>n.getText(file));assert.ok(args.length<=3,'owned model comparator is newly reachable');constructors.push({line:file.getLineAndCharacterOfPosition(node.getStart(file)).line+1,arguments:args});}
   }
   if(ts.isPropertyAccessExpression(node)&&receivers.includes(node.expression.getText(file))){
    assert.ok(['selected','changed','select','deselect','clear','isSelected','isEmpty','sort'].includes(node.name.text),'unreviewed public/private model member');
    assert.ok(!(ts.isBinaryExpression(node.parent)&&node.parent.left===node&&node.parent.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&node.parent.operatorToken.kind<=ts.SyntaxKind.LastAssignment),'model member write needs review');
    assert.ok(!ts.isDeleteExpression(node.parent)&&!ts.isPostfixUnaryExpression(node.parent)&&!(ts.isPrefixUnaryExpression(node.parent)&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(node.parent.operator)),'model member mutation needs review');
    memberUses.push({line:file.getLineAndCharacterOfPosition(node.getStart(file)).line+1,receiver:node.expression.getText(file),member:node.name.text,kind:ts.isCallExpression(node.parent)&&node.parent.expression===node?'call':'read'});
    if(ts.isCallExpression(node.parent)&&node.parent.expression===node)calls.push({line:file.getLineAndCharacterOfPosition(node.getStart(file)).line+1,receiver:node.expression.getText(file),method:node.name.text,arguments:node.parent.arguments.map(n=>n.getText(file))});
   }
   if(ts.isElementAccessExpression(node))assert.ok(!receivers.includes(node.expression.getText(file)),'dynamic model member access');
   ts.forEachChild(node,walk);
  };walk(file);
  const expected=use.file.includes('chip-list')?[['this.multiple','undefined','false']]:use.file.includes('select-base')?[['this.multiple']]:[['this._multiple','this.selectedOptions.selected'],['this._multiple']];assert.deepEqual(constructors.map(c=>c.arguments),expected);
  const methods=[];const name=use.file.includes('chip-list')?'_selectValue':use.file.includes('select-base')?'_selectOptionByValue':'_setOptionsFromValues';
  const collect=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(file)===name)methods.push(node.getText(file));ts.forEachChild(node,collect);};collect(file);assert.equal(methods.length,1);
  cases.push({...use,candidate_source_sha256:hash(text),references,constructors,calls,member_uses:memberUses,comparison_method:{name,source:methods[0]},publicly_exposed_model:use.file.includes('selection-list')});
 }
 const deltaPath='projects/ngx-material-legacy/legacy-select/select.ts',deltaText=read(deltaPath),deltaFile=ts.createSourceFile(deltaPath,deltaText,ts.ScriptTarget.Latest,true),deltaReads=[];
 assert.equal(deltaFile.parseDiagnostics.length,0);
 const deltaWalk=node=>{
  if(ts.isIdentifier(node)&&node.text==='_selectionModel'){
   const receiver=node.parent;assert.ok(ts.isPropertyAccessExpression(receiver)&&receiver.name===node&&receiver.expression.kind===ts.SyntaxKind.ThisKeyword,'unreviewed inherited model binding');
   const member=receiver.parent;assert.ok(ts.isPropertyAccessExpression(member)&&member.expression===receiver&&member.name.text==='selected','unreviewed inherited model member');
   assert.ok(ts.isElementAccessExpression(member.parent)&&member.parent.expression===member&&ts.isNumericLiteral(member.parent.argumentExpression)&&member.parent.argumentExpression.text==='0','unreviewed inherited model selection access');
   deltaReads.push({line:deltaFile.getLineAndCharacterOfPosition(member.getStart(deltaFile)).line+1,source:member.parent.getText(deltaFile)});
  }
  ts.forEachChild(node,deltaWalk);
 };deltaWalk(deltaFile);assert.equal(deltaReads.length,2);
 return {schema_version:1,line,cases,delta_sources:[{path:deltaPath,sha256:hash(deltaText),reads:deltaReads}],scope:'Exact3 public model imports/4 constructor recipes and current call surface, with comparator resolution method context and2 inherited first-selected reads. No whole legacy caller execution/native/AOT/packed/floor/security pass.',g11_claim:'not-passed'};
}
