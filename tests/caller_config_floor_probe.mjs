/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact readonly minimum declarations;not compiler/runtime/native qualification. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
const ts=createRequire(import.meta.url)('typescript'),arg=name=>process.argv[process.argv.indexOf(name)+1];
assert.ok(process.argv.includes('--minimum-root'));const minimum=resolve(arg('--minimum-root'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),cache=new Map();
function source(file){if(!cache.has(file)){const bytes=readFileSync(file),parsed=ts.createSourceFile(file,bytes.toString(),ts.ScriptTarget.Latest,true);assert.equal(parsed.parseDiagnostics.length,0);cache.set(file,{bytes,parsed});}return cache.get(file);}
function target(file,spec,packageRoot){
 assert.ok(spec.startsWith('.'),'declaration route is not a local public export');
 const path=resolve(dirname(file),spec.replace(/\.js$/,'.d.ts'));assert.ok(path.startsWith(packageRoot+'/'));return path;
}
function declaration(file,name,packageRoot,{local=false,visited=new Set()}={}){
 const key=file+'#'+name+'#'+local;assert.ok(!visited.has(key),'cyclic declaration route');visited.add(key);
 const {parsed}=source(file);
 if(!local){
  const direct=parsed.statements.find(n=>n.name?.text===name&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword));
  if(direct)return {file,node:direct};
  const routes=parsed.statements.filter(ts.isExportDeclaration).flatMap(n=>n.exportClause&&ts.isNamedExports(n.exportClause)?n.exportClause.elements.filter(e=>e.name.text===name).map(e=>({node:n,name:e.propertyName?.text||e.name.text})):[]);
  assert.equal(routes.length,1,'exact public named export missing: '+name);
  const route=routes[0];return declaration(route.node.moduleSpecifier?target(file,route.node.moduleSpecifier.text,packageRoot):file,route.name,packageRoot,{local:!route.node.moduleSpecifier,visited});
 }
 const node=parsed.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name);if(node)return {file,node};
 const imports=parsed.statements.filter(ts.isImportDeclaration).flatMap(n=>n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)?n.importClause.namedBindings.elements.filter(e=>e.name.text===name).map(e=>({node:n,name:e.propertyName?.text||e.name.text})):[]);
 assert.equal(imports.length,1,'declared/imported public class missing: '+name);
 return declaration(target(file,imports[0].node.moduleSpecifier.text,packageRoot),imports[0].name,packageRoot,{visited});
}
const rows=[];
for(const line of ['main','21.x'])for(const [pkg,entry,name,members]of [
 ['material','dialog','MatDialogConfig',[]],['material','snack-bar','MatSnackBarConfig',[]],
 ['cdk','overlay','Overlay',['create']],['cdk','overlay','OverlayRef',['attachments','dispose','hostElement','overlayElement']],
 ['common','common','PlatformLocation',[]],['common','common','Location',['path','go','onUrlChange']],
 ['common','testing','MockPlatformLocation',[]],
]){
 const packageRoot=join(minimum,line,'@angular',pkg),manifestFile=join(packageRoot,'package.json'),manifest=JSON.parse(readFileSync(manifestFile));
 const version=line==='main'?'22.1.7':pkg==='common'?'21.2.23':'21.2.14';assert.equal(manifest.version,version);
 const exported=manifest.exports[entry==='common'?'.':'./'+entry],root=resolve(packageRoot,exported.types);
 const found=declaration(root,name,packageRoot),parsed=source(found.file).parsed;
 const docs=node=>(node.jsDoc||[]).map(d=>d.getText(parsed)).join('\n');assert.doesNotMatch(docs(found.node),/@(?:docs-private|deprecated|breaking-change)/);
 const memberRows=members.map(member=>{
  const choices=found.node.members.filter(n=>n.name?.getText(parsed)===member);assert.equal(choices.length,1,'public member missing/overloaded: '+name+'.'+member);
  assert.ok(!choices[0].modifiers?.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword||m.kind===ts.SyntaxKind.ProtectedKeyword));
  assert.doesNotMatch(docs(choices[0]),/@(?:docs-private|deprecated|breaking-change)/);return {name:member,declaration:choices[0].getText(parsed)};
 });
 rows.push({line,package:manifest.name,version,public_entry:entry==='common'?'@angular/common':'@angular/'+pkg+'/'+entry,name,
  public_root:root,declaring_file:found.file,package_json_sha256:sha(readFileSync(manifestFile)),root_sha256:sha(source(root).bytes),declaring_sha256:sha(source(found.file).bytes),members:memberRows,public_unmarked:true});
}
const result={role:'Public config/Location/testing URL backend/overlay exports and used members at exact minima;no actual21 runtime/compiler/packed/native qualification',rows,public_names:rows.length,used_members:rows.reduce((n,r)=>n+r.members.length,0),actual21_execution:false,g02_claim:'not-passed',g11_claim:'not-passed'};
if(process.argv.includes('--report'))writeFileSync(arg('--report'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({names:result.public_names,members:result.used_members}));
