/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Readonly exact minimum public-token declarations;not floor runtime qualification. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const at=process.argv.indexOf('--minimum-root');assert.ok(at>=0&&process.argv[at+1]);const minimumRoot=resolve(process.argv[at+1]);
const sha=b=>createHash('sha256').update(b).digest('hex');
function publicDeclarations(path,names){
 const bytes=readFileSync(path),file=ts.createSourceFile(path,bytes.toString(),ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);
 const exported=new Set(file.statements.filter(ts.isExportDeclaration).flatMap(n=>n.exportClause&&ts.isNamedExports(n.exportClause)?n.exportClause.elements.map(e=>e.name.text):[]));
 const rows=[];
 for(const name of names){
  const declaration=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name)||file.statements.filter(ts.isVariableStatement).find(n=>n.declarationList.declarations.some(d=>d.name.getText(file)===name));assert.ok(declaration,name+' declaration missing');
  assert.ok(exported.has(name)||declaration.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword),name+' public root export missing');
  const docs=(declaration.jsDoc||[]).map(d=>d.getText(file)).join('\n');assert.doesNotMatch(docs,/@(?:docs-private|deprecated|breaking-change)/);
  rows.push({name,public_root_export:true,declaration_markers:[],declaration:declaration.getText(file)});
 }
 return {sha256:sha(bytes),bytes:bytes.length,rows};
}
const original=[];
for(const [path,names,digest]of [
 ['reference/material-16.2.14/material-inherited-constructors/menu.d.ts',['MatMenuItem'],'f1c4c4a656aec1dafc93dbcc92507418b1a80abefd3a64fa85938ec8f9332b0a'],
 ['reference/material-16.2.14/cdk-inherited-constructors/table.d.ts',['CdkTable','CdkColumnDef','TEXT_COLUMN_OPTIONS'],'94789cae5567000d4f23d9634ce006670e3fca4c5db427ce129026da62002c2d'],
 ]){const observed=publicDeclarations(join(root,path),names);assert.equal(observed.sha256,digest);original.push({path,...observed});}
const current=[];
for(const [line,version]of [['main','22.1.7'],['21.x','21.2.14']])for(const [pkg,entry,names]of [
 ['material','menu',['MatMenuItem']],['cdk','table',['CdkTable','CdkColumnDef','TEXT_COLUMN_OPTIONS']],
 ]){
 const packageRoot=join(minimumRoot,line,'@angular',pkg),manifestFile=join(packageRoot,'package.json'),manifest=JSON.parse(readFileSync(manifestFile));assert.equal(manifest.version,version);
 const types=manifest.exports['./'+entry].types;assert.equal(types,'./types/'+entry+'.d.ts');const file=join(packageRoot,types),observed=publicDeclarations(file,names);
 current.push({line,package:'@angular/'+pkg,version,public_entry:'@angular/'+pkg+'/'+entry,package_json_sha256:sha(readFileSync(manifestFile)),types,...observed});
}
const oldItemPath='reference/material-16.2.14/menu-item-sources/legacy-menu-item.ts',newItemPath='projects/ngx-material-legacy/legacy-menu/menu-item.ts';
const providers=[oldItemPath,newItemPath].map(path=>{
 const bytes=readFileSync(join(root,path)),file=ts.createSourceFile(path,bytes.toString(),ts.ScriptTarget.Latest,true),leaf=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyMenuItem');assert.ok(leaf);
 const binding=file.statements.filter(ts.isImportDeclaration).find(n=>n.moduleSpecifier.text==='@angular/material/menu').importClause.namedBindings.elements.find(n=>n.propertyName?.text==='MatMenuItem');assert.ok(binding);
 assert.equal(leaf.heritageClauses[0].types[0].expression.getText(file),binding.name.text);
 const metadata=ts.getDecorators(leaf).find(n=>n.expression.expression.getText(file)==='Component').expression.arguments[0];
 const value=metadata.properties.find(p=>p.name.getText(file)==='providers').initializer;assert.equal(value.elements.length,1);
 const fields=Object.fromEntries(value.elements[0].properties.map(p=>[p.name.getText(file),p.initializer.getText(file)]));assert.deepEqual(fields,{provide:binding.name.text,useExisting:'MatLegacyMenuItem'});
 return {path,sha256:sha(bytes),genuine_public_parent_binding:true,provider_alias_to_owned_instance:true};
});
const result={role:'Authenticated original exports/provider role plus exact minimum declaration checks;no actual21/native/packed/floor execution',original,current,menu_provider_roles:providers,consumer_style_changes:false,deprecated_constructor_overloads_invoked:false};
const out=process.argv.indexOf('--report');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({original_public_tokens:4,current_minimum_public_tokens:8,menu_provider_aliases:2}));
