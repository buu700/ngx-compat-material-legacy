/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four remaining public normalizer boundaries; complete listener lifecycle remains separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,posix,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=b=>createHash('sha256').update(b).digest('hex'),printer=ts.createPrinter({removeComments:true});
const symbol='normalizePassiveListenerOptions',moduleName='@angular/cdk/platform';
const recipes={
 'legacy-slider/slider.ts':['activeEventOptions','legacy-slider',12],
 'legacy-tooltip/internal/tooltip-base.ts':['passiveListenerOptions','tooltip',2],
 'legacy-tabs/internal/paginated-tab-header.ts':['passiveEventListenerOptions','tabs',2],
 'legacy-menu/internal/menu-trigger-base.ts':['passiveEventListenerOptions','menu',2],
};
const parse=(path,text)=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
function canonical(node,file){
 const transformed=ts.transform(node,[context=>root=>{const visit=n=>ts.isParenthesizedExpression(n)?ts.visitNode(n.expression,visit):ts.visitEachChild(n,visit,context);return ts.visitNode(root,visit);}]);
 try{return printer.printNode(ts.EmitHint.Unspecified,transformed.transformed[0],file).replace(/\s+/g,' ').replace(/, (?=[}\]])/g,' ').trim();}finally{transformed.dispose();}
}
const stable=node=>assert.ok(!ts.getJSDocTags(node).some(t=>['deprecated','docs-private','breaking-change','experimental'].includes(t.tagName.text)),'unstable public normalizer');
const unwrap=node=>ts.isAsExpression(node)||ts.isParenthesizedExpression(node)?unwrap(node.expression):node;

export function reviewPassiveListenerUses({root=rootDefault,readSource}={}){
 const seed=readFileSync(join(root,'compatibility/f10/authored-dependency-inventory-seed.json'));assert.equal(hash(seed),'3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
 const uses=JSON.parse(seed).symbol_uses.filter(r=>r.module===moduleName&&r.symbol===symbol);assert.equal(uses.length,5);
 const bytes=readFileSync(join(root,'compatibility/rc/passive-listener-tagged-subjects.json'));assert.equal(hash(bytes),'8b4c2214a65b18a43b0157efddb679682e8e95588e533e70b63c1d97d9f11c5e');
 const capsule=JSON.parse(bytes),tagged=new Map(capsule.members.map(m=>{const compressed=readFileSync(join(root,m.path));assert.equal(hash(compressed),m.gzip_sha256);const raw=gunzipSync(compressed);assert.equal(hash(raw),m.sha256);assert.equal(raw.length,m.bytes);return [m.archive_member,parse(m.archive_member,raw.toString())];}));
 const read=path=>readSource?readSource(path):readFileSync(join(root,path),'utf8'),cases=[];
 for(const use of uses.filter(r=>r.file!=='legacy-core/ripple/ripple-renderer.ts')){
  const recipe=recipes[use.file];assert.ok(recipe,'unreviewed normalizer caller');const [constant,member,count]=recipe;
  const path='projects/ngx-material-legacy/'+use.file,text=read(path),file=parse(path,text),absolute=join(root,path),options={noResolve:true,noLib:true};
  const host=ts.createCompilerHost(options);host.getSourceFile=p=>p===absolute?file:undefined;const checker=ts.createProgram([absolute],options,host).getTypeChecker();
  const bindings=file.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text===moduleName).flatMap(n=>n.importClause?.namedBindings?.elements?.filter(e=>(e.propertyName||e.name).text===symbol)??[]);assert.equal(bindings.length,1);const binding=bindings[0],imported=checker.getSymbolAtLocation(binding.name);assert.deepEqual(imported?.declarations,[binding]);assert.ok(!binding.isTypeOnly&&!binding.parent.parent.isTypeOnly);
  const calls=[];const importedVisit=n=>{if(ts.isIdentifier(n)&&n!==binding.name&&n!==binding.propertyName&&checker.getSymbolAtLocation(n)===imported){assert.ok(ts.isCallExpression(n.parent)&&n.parent.expression===n,'normalizer value escaped');calls.push(n.parent);}ts.forEachChild(n,importedVisit);};importedVisit(file);assert.equal(calls.length,1);
  const call=calls[0];assert.equal(call.arguments.length,1);assert.ok(ts.isObjectLiteralExpression(call.arguments[0]));let initializer=call;while(ts.isAsExpression(initializer.parent)||ts.isParenthesizedExpression(initializer.parent))initializer=initializer.parent;
  const declaration=initializer.parent;assert.ok(ts.isVariableDeclaration(declaration)&&declaration.initializer===initializer&&ts.isIdentifier(declaration.name)&&declaration.name.text===constant);assert.ok(declaration.parent.flags&ts.NodeFlags.Const);assert.ok(ts.isVariableStatement(declaration.parent.parent)&&declaration.parent.parent.parent===file);
  const old=tagged.get('package/fesm2022/'+member+'.mjs'),oldDeclarations=[];const findOld=n=>{if(ts.isVariableDeclaration(n)&&n.name?.text===constant)oldDeclarations.push(n);ts.forEachChild(n,findOld);};findOld(old);assert.equal(oldDeclarations.length,1);assert.equal(canonical(call,file),canonical(unwrap(oldDeclarations[0].initializer),old),'owned normalizer options drifted from untouched tag');
  const optionsSymbol=checker.getSymbolAtLocation(declaration.name),consumers=[];
  const visit=n=>{if(ts.isIdentifier(n)&&n!==declaration.name&&checker.getSymbolAtLocation(n)===optionsSymbol){const parent=n.parent;assert.ok(ts.isCallExpression(parent)&&parent.arguments[2]===n,'normalized option escaped or mutated');let kind;
   if(ts.isPropertyAccessExpression(parent.expression)){kind=parent.expression.name.text;assert.ok(['addEventListener','removeEventListener'].includes(kind),'unreviewed normalized option receiver');}
   else {assert.ok(ts.isIdentifier(parent.expression)&&parent.expression.text==='fromEvent');kind='fromEvent';const imports=file.statements.filter(ts.isImportDeclaration).filter(x=>x.moduleSpecifier.text==='rxjs').flatMap(x=>x.importClause?.namedBindings?.elements??[]);assert.ok(imports.some(x=>x.name.text==='fromEvent'&&(x.propertyName||x.name).text==='fromEvent'&&checker.getSymbolAtLocation(x.name)===checker.getSymbolAtLocation(parent.expression)),'unreviewed fromEvent import');}
   consumers.push({kind,line:file.getLineAndCharacterOfPosition(parent.getStart(file)).line+1,expression:parent.getText(file)});
  }ts.forEachChild(n,visit);};visit(file);assert.equal(consumers.length,count);
  const kinds=Object.fromEntries(['addEventListener','removeEventListener','fromEvent'].map(kind=>[kind,consumers.filter(c=>c.kind===kind).length]));
  assert.deepEqual(kinds,use.file==='legacy-slider/slider.ts'?{addEventListener:5,removeEventListener:7,fromEvent:0}:use.file==='legacy-tabs/internal/paginated-tab-header.ts'?{addEventListener:0,removeEventListener:0,fromEvent:2}:{addEventListener:1,removeEventListener:1,fromEvent:0});
  cases.push({...use,candidate_source_sha256:hash(text),constant,call_expression:call.getText(file),call_canonical:canonical(call,file),tagged_member:old.fileName,tagged_initializer_sha256:hash(canonical(unwrap(oldDeclarations[0].initializer),old)),tagged_initializer_matches:true,option_consumer_kinds:kinds,option_consumers:consumers});
 }
 assert.equal(cases.length,4);return {schema_version:1,line:JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',cases,prior_owned_renderer_boundary_preserved:true,scope:'Four remaining frozen public normalization imports and eighteen third-argument listener/fromEvent consumers. Untouched tag option initializers match. Registration/removal counts are source observations, not whole component lifecycle/native DOM/packed/floor or upstream audit proof.',g11_claim:'not-passed'};
}

export function inspectPassiveListenerDeclarations(model){
 const bodies={},runtime_sources=[];
 for(const name of [symbol,'supportsPassiveEventListeners']){
  const found=[];for(const[path,text]of model.sources)if(path.startsWith('@angular/cdk/')&&path.endsWith('.mjs')){const source=parse(path,text);for(const node of source.statements)if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found.push({path,source,node});}
  assert.equal(found.length,1);const r=found[0];bodies[name]=canonical(r.node,r.source);runtime_sources.push({name,path:r.path,sha256:hash(r.source.text),function_source_sha256:hash(r.node.getText(r.source))});
  if(name===symbol){const cache=r.source.statements.filter(ts.isVariableStatement).flatMap(n=>n.declarationList.declarations).filter(n=>n.name.text==='supportsPassiveEvents');assert.equal(cache.length,1);assert.equal(canonical(cache[0],r.source),'supportsPassiveEvents');}
 }
 const pkg=model.packages.get('@angular/cdk'),entry='@angular/cdk/'+pkg.exports['./platform'].types.slice(2),seen=new Set(),chain=[];
 function declaration(path,name){assert.ok(!seen.has(path+'#'+name));seen.add(path+'#'+name);const source=parse(path,model.sources.get(path));chain.push({path,sha256:hash(source.text)});const fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
  if(fn){stable(fn);assert.ok(fn.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)||source.statements.some(n=>ts.isExportDeclaration(n)&&!n.moduleSpecifier&&n.exportClause?.elements?.some(e=>e.name.text===name&&(e.propertyName||e.name).text===name)));return canonical(fn,source).replace(/^export /,'');}
  const links=source.statements.filter(ts.isExportDeclaration).filter(n=>n.moduleSpecifier&&n.exportClause?.elements?.some(e=>e.name.text===name));assert.equal(links.length,1);const link=links[0],binding=link.exportClause.elements.find(e=>e.name.text===name),target=posix.normalize(posix.join(posix.dirname(path),link.moduleSpecifier.text.replace(/\.js$/,'.d.ts')));return declaration(target,(binding.propertyName||binding.name).text);
 }
 return {line:model.line,version:pkg.version,bodies,declaration:declaration(entry,symbol),public_export_chain:chain,runtime_sources};
}
