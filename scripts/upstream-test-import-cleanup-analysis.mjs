/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const ts=createRequire(import.meta.url)('typescript');
const printer=ts.createPrinter({removeComments:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const parse=(path,text)=>{const f=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(f.parseDiagnostics.length,0);return f;};
const isConfig=n=>ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&ts.isIdentifier(n.expression.expression)&&n.expression.expression.text==='TestBed'&&n.expression.name.text==='configureTestingModule'&&n.arguments.length===1&&ts.isObjectLiteralExpression(n.arguments[0]);
function normalize(file){
 let configs=0,removedProperties=0,removedHooks=0;
 const result=ts.transform(file,[context=>{
  const visit=node=>{
   if(ts.isImportDeclaration(node))return undefined;
   if(isConfig(node)){
    configs++;
    const properties=node.arguments[0].properties.filter(p=>{
     if(ts.isPropertyAssignment(p)&&p.name.getText(file)==='imports'){
      assert.ok(ts.isArrayLiteralExpression(p.initializer)&&p.initializer.elements.every(ts.isIdentifier),'nontrivial imports configuration');removedProperties++;return false;
     } return true;
    });
    if(properties.length===0)return ts.factory.createIdentifier('TestBed');
    return ts.factory.updateCallExpression(node,node.expression,node.typeArguments,[ts.factory.updateObjectLiteralExpression(node.arguments[0],properties)]);
   }
   const updated=ts.visitEachChild(node,visit,context);
   if(ts.isExpressionStatement(updated)&&ts.isIdentifier(updated.expression)&&updated.expression.text==='TestBed')return undefined;
   if(ts.isExpressionStatement(updated)&&ts.isCallExpression(updated.expression)&&ts.isIdentifier(updated.expression.expression)&&updated.expression.expression.text==='beforeEach'&&updated.expression.arguments.length===1){
    let fn=updated.expression.arguments[0];
    if(ts.isCallExpression(fn)&&ts.isIdentifier(fn.expression)&&['waitForAsync','fakeAsync'].includes(fn.expression.text)&&fn.arguments.length===1)fn=fn.arguments[0];
    if((ts.isArrowFunction(fn)||ts.isFunctionExpression(fn))&&fn.parameters.length===0&&ts.isBlock(fn.body)&&fn.body.statements.length===0){removedHooks++;return undefined;}
   }
   return updated;
  };return n=>ts.visitNode(n,visit);
 }]);
 const text=printer.printFile(result.transformed[0]);result.dispose();
 const scanner=ts.createScanner(ts.ScriptTarget.Latest,true,ts.LanguageVariant.Standard,text),tokens=[];
 for(let kind=scanner.scan();kind!==ts.SyntaxKind.EndOfFileToken;kind=scanner.scan())tokens.push([kind,scanner.getTokenText()]);
 // Formatting may preserve a trailing comma when an object becomes one line.
 // Do not discard array elisions: two commas and an opening bracket are excluded.
 const canonical=tokens.filter((t,i)=>!(t[0]===ts.SyntaxKind.CommaToken&&
  [ts.SyntaxKind.CloseBraceToken,ts.SyntaxKind.CloseBracketToken,ts.SyntaxKind.CloseParenToken].includes(tokens[i+1]?.[0])&&
  ![ts.SyntaxKind.CommaToken,ts.SyntaxKind.OpenBracketToken].includes(tokens[i-1]?.[0])));
 return {text,canonical,sha256:hash(JSON.stringify(canonical)),configs,removedProperties,removedHooks};
}
function imports(file){return file.statements.filter(ts.isImportDeclaration).map(n=>{
 assert.ok(n.importClause&&n.importClause.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)&&!n.importClause.name,'unsupported import kind');
 return {module:n.moduleSpecifier.text,typeOnly:!!n.importClause.isTypeOnly,bindings:n.importClause.namedBindings.elements.map(e=>({local:e.name.text,original:(e.propertyName||e.name).text,typeOnly:!!e.isTypeOnly}))};
});}
export function analyzeTestImportCleanup(path,before,after){
 const a=parse(path,before),b=parse(path,after),ai=imports(a),bi=imports(b);let cursor=0;const removed=[];
 for(const i of bi){
  let found=-1;for(let j=cursor;j<ai.length;j++)if(ai[j].module===i.module&&ai[j].typeOnly===i.typeOnly){found=j;break;}
  assert.ok(found>=0,'added or reordered import route');
  for(let j=cursor;j<found;j++)removed.push(...ai[j].bindings);
  const old=ai[found];assert.ok(i.bindings.every(n=>old.bindings.some(p=>JSON.stringify(p)===JSON.stringify(n))),'new import binding');
  removed.push(...old.bindings.filter(p=>!i.bindings.some(n=>JSON.stringify(p)===JSON.stringify(n))));cursor=found+1;
 }
 for(let j=cursor;j<ai.length;j++)removed.push(...ai[j].bindings);
 const na=normalize(a),nb=normalize(b);assert.ok(na.configs>=nb.configs&&na.removedProperties>nb.removedProperties,'not imports removal');
 assert.equal(nb.removedProperties,0,'remaining test imports need individual comparison');
 assert.ok(JSON.stringify(na.canonical)===JSON.stringify(nb.canonical),'non-import test program changed');
 const normalized=parse(path,nb.text),ids=new Set();const visit=n=>{if(ts.isIdentifier(n))ids.add(n.text);ts.forEachChild(n,visit);};visit(normalized);
 for(const name of removed)assert.ok(!ids.has(name.local),'removed binding still referenced');
 return {path,unchanged_test_program_sha256:na.sha256,before_config_calls:na.configs,after_config_calls:nb.configs,removed_import_properties:na.removedProperties-nb.removedProperties,removed_empty_hooks:na.removedHooks-nb.removedHooks,removed_import_bindings:removed};
}
