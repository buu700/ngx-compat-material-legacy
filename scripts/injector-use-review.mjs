/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact six supplied Injector routes and the two value-only child constructors. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const ts=createRequire(import.meta.url)('typescript'),rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const recipes={
 'legacy-dialog/dialog.ts':{parameter:1,forwards:[['super',1]],get:[],children:0},
 'legacy-menu/menu-content.ts':{parameter:2,forwards:[['super',2]],get:[],children:0},
 'legacy-snack-bar/snack-bar.ts':{parameter:2,forwards:[['super',2]],get:[],children:0},
 'legacy-menu/internal/menu-content-base.ts':{parameter:2,forwards:[['DomPortalOutlet',2]],get:[],children:0},
 'legacy-dialog/internal/dialog-base.ts':{parameter:1,forwards:[],get:['Dialog'],children:0},
 'legacy-snack-bar/internal/snack-bar-base.ts':{parameter:2,forwards:[],get:[],children:2},
};
const deltaFiles=[
 'internal/public-constructor-context.ts',
 'legacy-autocomplete/internal/after-legacy-render.ts',
 'legacy-form-field/form-field.ts',
 'legacy-form-field/internal/after-form-field-render.ts',
 'legacy-menu/internal/menu-item-context.ts',
 'legacy-select/internal/after-select-render.ts',
 'legacy-select/internal/select-base.ts',
 'legacy-table/internal/public-constructor-context.ts',
 'legacy-tabs/internal/after-tab-header-render.ts',
 'legacy-tabs/internal/public-constructor-context.ts',
 'legacy-tooltip/internal/after-tooltip-render.ts',
];
export function reviewInjectorUses({root=rootDefault,readSource}={}){
 const read=p=>readSource?readSource(p):readFileSync(resolve(root,p),'utf8');
 const seed=readFileSync(resolve(root,'compatibility/f10/authored-dependency-inventory-seed.json'));
 assert.equal(hash(seed),'3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
 const uses=JSON.parse(seed).symbol_uses.filter(r=>r.module==='@angular/core'&&r.symbol==='Injector');assert.equal(uses.length,6);
 const cases=[];
 for(const use of uses){
  const path='projects/ngx-material-legacy/'+use.file,text=read(path),file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);
  const bindings=file.statements.filter(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text===use.module&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings))
   .flatMap(n=>n.importClause.namedBindings.elements.filter(e=>(e.propertyName||e.name).text==='Injector'));assert.equal(bindings.length,1);
  const binding=bindings[0];assert.ok(!binding.isTypeOnly&&!binding.parent.parent.isTypeOnly,'runtime DI token required');
  const options={noResolve:true,noLib:true},host=ts.createCompilerHost(options);host.getSourceFile=p=>p===resolve(root,path)?file:undefined;
  const checker=ts.createProgram([resolve(root,path)],options,host).getTypeChecker(),imported=checker.getSymbolAtLocation(binding.name);
  const parameters=[],children=[],forwards=[],gets=[],contexts=new Map();
  const childRecipient=local=>{
   assert.ok(ts.isVariableDeclaration(local)&&ts.isIdentifier(local.name)&&local.name.text==='injector','unreviewed child storage');
   const localSymbol=checker.getSymbolAtLocation(local.name),routes=[];
   const childWalk=n=>{if(ts.isIdentifier(n)&&n!==local.name&&checker.getSymbolAtLocation(n)===localSymbol){
    assert.ok(ts.isNewExpression(n.parent)&&n.parent.expression.getText(file)==='ComponentPortal'&&n.parent.arguments.indexOf(n)===2,'unreviewed child injector ownership/escape');routes.push(n);
   }ts.forEachChild(n,childWalk);};childWalk(local.parent.parent.parent);assert.equal(routes.length,1);return 'ComponentPortal argument2';
  };
  const note=node=>{let owner=node;while(owner.parent&&!ts.isConstructorDeclaration(owner)&&!ts.isMethodDeclaration(owner))owner=owner.parent;
   contexts.set(owner.getStart(file),{line:file.getLineAndCharacterOfPosition(owner.getStart(file)).line+1,source:owner.getText(file)});};
  const importedWalk=node=>{
   if(ts.isIdentifier(node)&&node.text===binding.name.text&&node!==binding.name&&node!==binding.propertyName){
    assert.equal(checker.getSymbolAtLocation(node),imported,'shadowed imported Injector');
    const parent=node.parent;
    if(ts.isTypeReferenceNode(parent)&&parent.typeName===node){
     assert.equal(parent.typeArguments?.length||0,0);const owner=parent.parent;
     if(ts.isParameter(owner)&&ts.isConstructorDeclaration(owner.parent)){parameters.push(owner);note(owner);}
     else assert.ok(use.file==='legacy-snack-bar/internal/snack-bar-base.ts'&&ts.isMethodDeclaration(owner)&&owner.name.getText(file)==='_createInjector','unreviewed Injector type route');
    }else{
     assert.ok(ts.isPropertyAccessExpression(parent)&&parent.expression===node&&parent.name.text==='create','unreviewed static Injector route');
     const call=parent.parent;assert.ok(ts.isCallExpression(call)&&call.expression===parent&&call.arguments.length===1,'stable object constructor required');
     assert.ok(ts.isVariableDeclaration(call.parent)&&call.parent.initializer===call||ts.isReturnStatement(call.parent),'child injector must retain the reviewed variable/return route');
     const object=call.arguments[0];assert.ok(ts.isObjectLiteralExpression(object),'deprecated array constructor or dynamic options');
     assert.deepEqual(object.properties.map(p=>p.name?.getText(file)).sort(),['parent','providers']);
     const fields=Object.fromEntries(object.properties.map(p=>[p.name.getText(file),p.initializer]));
     assert.equal(fields.parent.getText(file),'userInjector || this._injector','caller injector parent priority changed');
     assert.ok(ts.isArrayLiteralExpression(fields.providers));
     const providers=fields.providers.elements.map(provider=>{
      assert.ok(ts.isObjectLiteralExpression(provider));assert.deepEqual(provider.properties.map(p=>p.name?.getText(file)),['provide','useValue']);
      return Object.fromEntries(provider.properties.map(p=>[p.name.getText(file),p.initializer.getText(file)]));
     });
     let recipient='returned-to-owned-portal-attachment';
     if(ts.isVariableDeclaration(call.parent)){
      recipient=childRecipient(call.parent);
     }
     children.push({line:file.getLineAndCharacterOfPosition(call.getStart(file)).line+1,parent:fields.parent.getText(file),providers,recipient});note(call);
    }
   }
   ts.forEachChild(node,importedWalk);
  };importedWalk(file);
  const recipe=recipes[use.file];assert.ok(recipe);assert.equal(parameters.length,1);const parameter=parameters[0];
  assert.equal(parameter.parent.parameters.indexOf(parameter),recipe.parameter);assert.ok(ts.isIdentifier(parameter.name));
  const parameterSymbol=checker.getSymbolAtLocation(parameter.name),name=parameter.name.text;
  const isReceiver=node=>ts.isIdentifier(node)&&node.text===name&&!(ts.isPropertyAccessExpression(node.parent)&&node.parent.name===node)
   ||ts.isPropertyAccessExpression(node)&&node.expression.kind===ts.SyntaxKind.ThisKeyword&&node.name.text===name;
  const receiverWalk=node=>{
   if(ts.isElementAccessExpression(node)&&node.expression.kind===ts.SyntaxKind.ThisKeyword&&ts.isStringLiteral(node.argumentExpression))assert.notEqual(node.argumentExpression.text,name,'dynamic supplied injector access');
   if(isReceiver(node)&&node!==parameter.name){
    const symbol=checker.getSymbolAtLocation(ts.isPropertyAccessExpression(node)?node.name:node);assert.ok(symbol===parameterSymbol||symbol?.declarations?.includes(parameter),'shadowed supplied injector');
    const parent=node.parent;
    if(ts.isPropertyAccessExpression(parent)&&parent.expression===node){
     assert.equal(parent.name.text,'get','unreviewed Injector member');const call=parent.parent;assert.ok(ts.isCallExpression(call)&&call.expression===parent&&call.arguments.length===1,'generic one-token get required');
     assert.equal(call.arguments[0].getText(file),'Dialog');
     assert.ok(file.statements.some(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='@angular/cdk/dialog'&&n.importClause?.namedBindings?.elements?.some(e=>e.name.text==='Dialog'&&(e.propertyName||e.name).text==='Dialog')),'dialog token import changed');
     gets.push({token:'Dialog',line:file.getLineAndCharacterOfPosition(call.getStart(file)).line+1});
    }else if(ts.isCallExpression(parent)||ts.isNewExpression(parent)){
     const kind=ts.isCallExpression(parent)&&parent.expression.kind===ts.SyntaxKind.SuperKeyword?'super':parent.expression.getText(file);
     assert.ok(kind==='super'||kind==='DomPortalOutlet','unreviewed supplied injector escape');
     forwards.push({kind,argument_index:parent.arguments.indexOf(node),arguments:parent.arguments.map(a=>a.getText(file))});
    }else{
     assert.ok(use.file==='legacy-snack-bar/internal/snack-bar-base.ts'&&ts.isBinaryExpression(parent)&&parent.operatorToken.kind===ts.SyntaxKind.BarBarToken&&parent.right===node,'unreviewed supplied injector ownership/alias');
    }
    note(node);
   }
   ts.forEachChild(node,receiverWalk);
  };receiverWalk(parameter.parent.parent);
  assert.deepEqual(forwards.map(f=>[f.kind,f.argument_index]),recipe.forwards);assert.deepEqual(gets.map(g=>g.token),recipe.get);assert.equal(children.length,recipe.children);
  if(children.length){
   assert.deepEqual(children.map(c=>c.providers),[[{provide:'MatSnackBarConfig',useValue:'config'}],[{provide:'MatSnackBarRef',useValue:'snackBarRef'},{provide:'MAT_SNACK_BAR_DATA',useValue:'config.data'}]]);
   const calls=[];const find=n=>{if(ts.isPropertyAccessExpression(n)&&n.expression.kind===ts.SyntaxKind.ThisKeyword&&n.name.text==='_createInjector'){
    assert.ok(ts.isCallExpression(n.parent)&&n.parent.expression===n);assert.deepEqual(n.parent.arguments.map(a=>a.getText(file)),['config','snackBarRef']);
    assert.equal(childRecipient(n.parent.parent),'ComponentPortal argument2');calls.push(n.parent);note(n.parent);
   }ts.forEachChild(n,find);};find(file);assert.equal(calls.length,1);children[1].recipient='ComponentPortal argument2 through _createInjector';
  }
  cases.push({...use,candidate_source_sha256:hash(text),constructor_parameter:{index:recipe.parameter,declaration:parameter.getText(file)},forwards,gets,children,contexts:[...contexts.values()]});
 }
 const paths=execFileSync('rg',['-l','\\bInjector\\b','projects/ngx-material-legacy','--glob','*.ts','--glob','!*.spec.ts'],{cwd:root,encoding:'utf8'}).trim().split('\n');
 const current=paths.filter(path=>{const file=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true);return file.statements.some(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='@angular/core'&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)&&n.importClause.namedBindings.elements.some(e=>(e.propertyName||e.name).text==='Injector'));}).map(p=>p.slice('projects/ngx-material-legacy/'.length)).sort();
 assert.deepEqual(current,[...uses.map(u=>u.file),...deltaFiles].sort(),'current Injector dependency population changed');
 const deltaInventory=deltaFiles.map(file=>({file,module:'@angular/core',symbol:'Injector',candidate_source_sha256:hash(read('projects/ngx-material-legacy/'+file)),status:'pending-individual-delta-review'}));
 return {schema_version:1,line:JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',compiler:ts.version,cases,current_named_imports:current.length,delta_inventory:deltaInventory,
  scope:'Six frozen public Injector annotation/forward/get/object-create boundaries. Two children provide existing values; there is no imported static/private/deprecated/numeric-flags constructor or child destruction call. Eleven additional current imports are inventoried separately and remain pending individual delta review. Portal/dialog/snack behavior and actual component/application/packed/native/full floors remain separate.',g11_claim:'not-passed'};
}
