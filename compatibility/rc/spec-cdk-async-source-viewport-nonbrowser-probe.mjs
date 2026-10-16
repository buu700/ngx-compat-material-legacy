/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Reproduce one inherited synthetic nonbrowser edge; no Angular SSR admission. */
import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
const root=process.argv[2],out=process.argv[3],req=createRequire(root+'/package.json'),ts=req('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),url=n=>pathToFileURL(req.resolve(n)).href;
await import(url('@angular/compiler'));assert.equal(Object.hasOwn(globalThis,'window'),false,'use a real no-window process');
async function load(text,name){const code=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText.replace(/(['"])(@angular\/[^'"]+|rxjs(?:\/operators)?)\1/g,(_,q,spec)=>JSON.stringify(url(spec==='@angular/common'?'@angular/core':spec)));return(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64')))[name];}
const paths=[['tagged','reference/material-16.2.14/viewport-sources/viewport-ruler.ts','ViewportRuler'],['owned','projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts','_LegacyViewport']],rows=[];
for(const[label,path,symbol]of paths){const text=readFileSync(root+'/'+path,'utf8'),Type=await load(text,symbol),document={defaultView:null},instance=new Type({isBrowser:false},{runOutsideAngular:run=>run()},document),row={label,path,sha256:hash(text),constructs:true,scroll:instance.getViewportScrollPosition()};assert.deepEqual(row.scroll,{top:0,left:0});for(const method of['getViewportSize','getViewportRect']){try{row[method]={value:instance[method]()};}catch(e){row[method]={error_name:e.name,message:e.message};}}instance.ngOnDestroy();rows.push(row);}
assert.deepEqual(rows.map(n=>n.getViewportSize),[{error_name:'ReferenceError',message:'window is not defined'},{error_name:'ReferenceError',message:'window is not defined'}]);
const report={schema_version:1,line:JSON.parse(readFileSync(root+'/projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',node:process.version,typescript:ts.version,rows,untouched_reference_and_owned_exhibit_same_synthetic_edge:true,actual_Angular_SSR_provider_or_floor_qualified:false,product_changed:false};writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
