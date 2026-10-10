/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Six exact renderer import boundaries; native behavior and all upstream SHA decisions remain separate. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from './material-public-subjects.mjs';
import {inventoryNgZoneUses} from './ng-zone-use-inventory.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const file='legacy-core/ripple/ripple-renderer.ts',prefix='projects/ngx-material-legacy/',hash=b=>createHash('sha256').update(b).digest('hex');
const dependencies=[['@angular/core','NgZone'],['@angular/cdk/platform','Platform'],['@angular/cdk/platform','normalizePassiveListenerOptions'],
 ['@angular/cdk/a11y','isFakeMousedownFromScreenReader'],['@angular/cdk/a11y','isFakeTouchstartFromScreenReader'],['@angular/cdk/coercion','coerceElement']];
const parse=(name,text)=>{const sf=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);return sf;};
const stable=node=>assert.ok(!ts.getJSDocTags(node).some(tag=>['deprecated','docs-private','experimental','breaking-change'].includes(tag.tagName.text)),'Unstable renderer peer API');
const printer=ts.createPrinter({removeComments:true});
function print(node,sf){const transformed=ts.transform(node,[context=>root=>{const visit=node=>ts.isParenthesizedExpression(node)?ts.visitNode(node.expression,visit):ts.visitEachChild(node,visit,context);return ts.visitNode(root,visit);}]);
 try{return printer.printNode(ts.EmitHint.Unspecified,transformed.transformed[0],sf).replace(/\s+/g,' ').replace(/, (?=[}\]])/g,' ').trim();}finally{transformed.dispose();}}
export function reviewRippleRendererUses({root=rootDefault,readSource}={}) {
 const seedBytes=readFileSync(join(root,'compatibility/f10/authored-dependency-inventory-seed.json'));
 assert.equal(hash(seedBytes),'3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
 const seed=JSON.parse(seedBytes).symbol_uses.filter(row=>row.file===file&&dependencies.some(([module,symbol])=>row.module===module&&row.symbol===symbol));
 assert.equal(seed.length,6);
 const read=path=>readSource?readSource(path):readFileSync(join(root,path),'utf8'),text=read(prefix+file);
 const absolute=join(root,prefix+file),options={noResolve:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext};
 const host=ts.createCompilerHost(options),oldRead=host.readFile.bind(host);host.readFile=path=>path===absolute?text:oldRead(path);
 const program=ts.createProgram([absolute],options,host),checker=program.getTypeChecker(),source=program.getSourceFile(absolute),cases=[];
 for(const[module,symbol]of dependencies){
  const bindings=source.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text===module&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings))
   .flatMap(n=>n.importClause.namedBindings.elements.filter(item=>(item.propertyName||item.name).text===symbol));
  assert.equal(bindings.length,1,'Missing/ambiguous renderer import');const binding=bindings[0],bound=checker.getSymbolAtLocation(binding.name),refs=[];
  assert.deepEqual(bound.declarations,[binding],'Renderer import shadowed or redeclared');
  function visit(node){if(ts.isIdentifier(node)&&node!==binding.name&&node!==binding.propertyName&&checker.getSymbolAtLocation(node)===bound){
    const parent=node.parent;
    if(ts.isTypeReferenceNode(parent)&&parent.typeName===node){assert.ok(['NgZone','Platform'].includes(symbol));assert.equal(parent.typeArguments,undefined);assert.ok(ts.isParameter(parent.parent));
      refs.push({role:'constructor-input',expression:parent.parent.getText(source)});
    }else{assert.ok(!binding.isTypeOnly&&!binding.parent.parent.isTypeOnly);assert.ok(ts.isCallExpression(parent)&&parent.expression===node,'Unsupported renderer import escape');
      refs.push({role:'public-call',expression:parent.getText(source)});}
   }ts.forEachChild(node,visit);}
  visit(source);cases.push({file,module,symbol,candidate_source_sha256:hash(text),references:refs});
 }
 const expected={NgZone:['private _ngZone: NgZone'],Platform:['private _platform: Platform'],
  normalizePassiveListenerOptions:['normalizePassiveListenerOptions({ passive: true, capture: true, })'],
  isFakeMousedownFromScreenReader:['isFakeMousedownFromScreenReader(event)'],isFakeTouchstartFromScreenReader:['isFakeTouchstartFromScreenReader(event)'],
  coerceElement:['coerceElement(elementOrElementRef)','coerceElement(elementOrElementRef)']};
 for(const row of cases)assert.deepEqual(row.references.map(r=>r.expression.replace(/\s+/g,' ').trim()),expected[row.symbol],'Renderer dependency caller changed: '+row.symbol);
 const inventory=inventoryNgZoneUses({root,readSource});const owner=inventory.cases.find(row=>row.file===file);
 assert.equal(owner.frozen,true);
 const forwarding=inventory.forwarding.filter(row=>row.file===file);
 assert.deepEqual(forwarding.map(({target,argument,kind})=>({target,argument,kind})),[
   {target:'LegacyRippleRenderer._eventManager.addHandler',argument:'this._ngZone',kind:'call'}]);
 const zoneCalls=inventory.accesses.filter(row=>row.file===file);assert.equal(zoneCalls.length,3);assert.ok(zoneCalls.every(row=>row.member==='runOutsideAngular'));
 const classNode=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='LegacyRippleRenderer');
 const parameter=classNode.members.find(ts.isConstructorDeclaration).parameters.find(n=>n.type?.getText(source)==='Platform');assert.ok(parameter);
 const platformReads=[];function platformVisit(node){
   if(ts.isIdentifier(node)&&node!==parameter.name&&checker.getSymbolAtLocation(node)?.declarations?.includes(parameter)){
     const receiver=ts.isPropertyAccessExpression(node.parent)&&node.parent.name===node?node.parent:node;
     assert.ok(ts.isPropertyAccessExpression(receiver.parent)&&receiver.parent.expression===receiver,'Unsupported Platform receiver escape');
     platformReads.push(receiver.parent.name.text);
   }
   ts.forEachChild(node,platformVisit);
 }
 platformVisit(classNode);assert.deepEqual(platformReads,['isBrowser','isBrowser'],'Renderer reads new platform contract');
 const loaded=prepareMaterialPublicSubjects(root),subjects=[];
 try{
  const bytes=readFileSync(join(root,'compatibility/rc/ripple-coercion-type-subjects.json'));assert.equal(hash(bytes),'83989d0ed634d110a3b1f48c4e9e5e15760e940852702f4063d22f06f9c01643');const coercion=JSON.parse(bytes);
  for(const model of loaded.models){if(model.line!=='original')for(const member of coercion.subjects.find(s=>s.line===model.line).members){const raw=gunzipSync(Buffer.from(member.gzip_base64,'base64'));assert.equal(hash(raw),member.sha256);model.sources.set('@angular/cdk/'+member.module_path,raw.toString());}
   const bodies={},declarations={},whole_members=[];
   for(const name of ['normalizePassiveListenerOptions','supportsPassiveEventListeners','isFakeMousedownFromScreenReader','isFakeTouchstartFromScreenReader','coerceElement','Platform','NgZone']){
    const runtime=[],types=[];
    for(const[path,text]of model.sources){if(!path.startsWith(name==='NgZone'?'@angular/core/':'@angular/cdk/'))continue;const sf=parse(path,text);
     for(const node of sf.statements)if((ts.isClassDeclaration(node)||ts.isFunctionDeclaration(node))&&node.name?.text===name){
      if(path.endsWith('.mjs'))runtime.push({path,sf,node});else if(path.endsWith('.d.ts'))types.push({path,sf,node});}
    }
    assert.equal(runtime.length,1,'Ambiguous/missing whole public runtime '+name);const r=runtime[0];
    whole_members.push({symbol:name,kind:'runtime',path:r.path,sha256:hash(r.sf.text)});
    if(name==='Platform'){
      const field=r.node.members.find(n=>ts.isPropertyDeclaration(n)&&n.name?.getText(r.sf)==='isBrowser');
      const constructor=r.node.members.find(ts.isConstructorDeclaration);
      const assignment=constructor?.body?.statements.find(n=>ts.isExpressionStatement(n)&&ts.isBinaryExpression(n.expression)&&n.expression.left.getText(r.sf)==='this.isBrowser');
      assert.ok(field||assignment,'Platform browser decision missing');
      bodies[name]=print(field?.initializer||assignment.expression.right,r.sf).replaceAll('this._platformId','_platformId');
    }else if(name==='NgZone'){
      const method=r.node.members.find(n=>n.name?.getText(r.sf)==='runOutsideAngular');assert.ok(method?.body);
      bodies[name]=print(method,r.sf);
    }else bodies[name]=print(r.node,r.sf);
    if(name!=='supportsPassiveEventListeners'){
      assert.equal(types.length,1,'Missing complete public declaration '+name);const d=types[0];stable(d.node);
      whole_members.push({symbol:name,kind:'types',path:d.path,sha256:hash(d.sf.text)});
      if(name==='Platform'){const field=d.node.members.find(n=>n.name?.getText(d.sf)==='isBrowser');assert.ok(field&&!field.modifiers?.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword));assert.equal(field.type.kind,ts.SyntaxKind.BooleanKeyword);declarations[name]='public isBrowser:boolean';}
      else if(name==='NgZone'){const method=d.node.members.find(n=>n.name?.getText(d.sf)==='runOutsideAngular');assert.ok(method);stable(method);declarations[name]=print(method,d.sf);}
      else declarations[name]=print(d.node,d.sf).replace(/^export /,'');
    }
   }
   subjects.push({line:model.line,cdk_version:model.packages.get('@angular/cdk').version,bodies,declarations,whole_members});
  }
  for(const subject of subjects){assert.deepEqual(subject.bodies,subjects[0].bodies,'Public renderer dependency bodies differ');assert.deepEqual(subject.declarations,subjects[0].declarations,'Public renderer dependency declaration differs');}
 }finally{loaded.dispose();}
 return {schema_version:1,cases,public_zone_accesses:zoneCalls,owned_zone_forwarding:forwarding,platform_member_reads:platformReads,subjects,
  stable_public_functions_and_consumed_platform_field:true,source_override_used:!!readSource,
  scope:'Six exact frozen owned renderer import contracts. Complete tagged/minimum CDK function bodies and public declarations plus consumed Platform.isBrowser match; supportsPassive implementation inspected within public module, never imported by product. NgZone public proof/runtime is separate; constructor acquisition differences do not authorize manual current Platform construction outside DI. Native/browser hydration, whole consumer/full floors and all SHA audits remain separate.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=reviewRippleRendererUses();if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({cases:report.cases.length,subjects:report.subjects.length,zone_accesses:report.public_zone_accesses.length}));
}
