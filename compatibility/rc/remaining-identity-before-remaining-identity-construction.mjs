/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),alias='@ngx-compat/material-legacy/';
export const remainingIdentityEntries={autocomplete:'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.ts',menu:'projects/ngx-material-legacy/legacy-menu/menu.ts',select:'projects/ngx-material-legacy/legacy-select/select.ts','snack-bar':'projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.ts',tabs:'projects/ngx-material-legacy/legacy-tabs/tab-nav-bar/tab-nav-bar.ts'};
export function compileRemainingIdentityGraph({root=rootDefault,readSource}={}){
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,paths:{'@ngx-compat/material-legacy/*':[join(root,'projects/ngx-material-legacy/*/public-api.ts')]},experimentalDecorators:true,useDefineForClassFields:false,noLib:true,noEmitOnError:false};
 const host=ts.createCompilerHost(options),baseRead=host.readFile.bind(host);host.readFile=file=>file.startsWith(join(root,'projects/ngx-material-legacy')+'/')&&readSource?readSource(relative(root,file)):baseRead(file);
 const program=ts.createProgram(Object.values(remainingIdentityEntries).map(p=>join(root,p)),options,host),emitted=new Map(),result=[],seen=new Set(),resources=new Map();assert.equal(program.getSyntacticDiagnostics().length,0);program.emit(undefined,(file,text)=>emitted.set(file,text));
 function visit(file){if(seen.has(file))return;seen.add(file);assert.ok(file.startsWith(join(root,'projects/ngx-material-legacy')+'/'));let compiled=emitted.get(file.slice(0,-3)+'.js');assert.equal(typeof compiled,'string','missing complete owned module '+file);const source=ts.createSourceFile(file,compiled,ts.ScriptTarget.Latest,true),edits=[],resourceRewrites=[];
  for(const node of source.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){const spec=node.moduleSpecifier.text;let target;if(spec.startsWith('.')){const base=resolve(dirname(file),spec);target=[base+'.ts',join(base,'index.ts')].find(existsSync);assert.ok(target);}else if(spec.startsWith(alias)){const base=join(root,'projects/ngx-material-legacy',spec.slice(alias.length)),config=JSON.parse(readFileSync(join(base,'ng-package.json')));target=join(base,config.lib.entryFile);assert.ok(existsSync(target));}if(target){visit(target);const route=relative(dirname(file),target).replace(/\.ts$/,'.mjs');edits.push([node.moduleSpecifier.getStart(source),node.moduleSpecifier.end,JSON.stringify(route.startsWith('.')?route:'./'+route)]);}}
  function resource(node){if(ts.isPropertyAssignment(node)&&['templateUrl','styleUrl','styleUrls'].includes(node.name.getText(source))){const values=ts.isArrayLiteralExpression(node.initializer)?node.initializer.elements:[node.initializer];for(const value of values){assert.ok(ts.isStringLiteral(value));const target=resolve(dirname(file),value.text);assert.ok(target.startsWith(join(root,'projects/ngx-material-legacy')+'/'));const raw=readFileSync(target),url=pathToFileURL(target).href,row={url,path:relative(root,target),sha256:hash(raw),bytes:raw.length,text:raw.toString(),raw_stylesheet_source:target.endsWith('.scss')};if(resources.has(url))assert.deepEqual(resources.get(url),row);else resources.set(url,row);edits.push([value.getStart(source),value.end,JSON.stringify(url)]);resourceRewrites.push({original:value.text,resource_url:url,resource_sha256:row.sha256});}}ts.forEachChild(node,resource);}resource(source);
  for(const [start,end,text] of edits.sort((a,b)=>b[0]-a[0]))compiled=compiled.slice(0,start)+text+compiled.slice(end);const raw=Buffer.from(readSource?readSource(relative(root,file)):readFileSync(file));result.push({path:relative(root,file),sha256:hash(raw),bytes:raw.length,compiled,resource_url_rewrites:resourceRewrites});
 }
 for(const path of Object.values(remainingIdentityEntries))visit(join(root,path));return {modules:result.sort((a,b)=>a.path.localeCompare(b.path)),resources:[...resources.values()].sort((a,b)=>a.path.localeCompare(b.path)),compiler:ts.version,limits:'Complete owned module graph syntax/emit and constructors only. Own aliases/import suffixes and resource URLs are resolved to their exact local source bytes. Raw stylesheet text is not Sass compilation or rendering. External declarations and actual Angular nodes/templates/factories/native/packed/runtime/compiler/RxJS floors remain unqualified.'};
}
