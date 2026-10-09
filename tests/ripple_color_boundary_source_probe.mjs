/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Independent boundary reproduction using only untouched16 source; not a candidate/golden rewrite. */
import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {readFileSync,realpathSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {dirname,resolve,relative,isAbsolute} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import '../scripts/sass-ripple-color-contract.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),sass=createRequire(import.meta.url)('sass'),sha=b=>createHash('sha256').update(b).digest('hex');
const args={};for(let i=2;i<process.argv.length;i+=2){assert.ok(['--reference','--report'].includes(process.argv[i])&&process.argv[i+1]);args[process.argv[i].slice(2)]=process.argv[i+1];}assert.ok(args.reference);
const reference=realpathSync(args.reference),catalog=JSON.parse(readFileSync(resolve(root,'fixtures/sass/ripple-color-contracts.json'))),boundary=catalog.reference_boundary_model;
const rows=boundary.rows.map(row=>{
 const program=row.program.replaceAll('__reference__',reference),result=sass.compileString(program,{loadPaths:[reference],style:'expanded',silenceDeprecations:['if-function','global-builtin','color-functions','import'],logger:{warn(){},debug(){}}});
 assert.equal(result.css,row.binding);
 const sources=result.loadedUrls.map(url=>{assert.equal(url.protocol,'file:');const file=realpathSync(fileURLToPath(url)),part=relative(reference,file);assert.ok(!isAbsolute(part)&&part!=='..'&&!part.startsWith('../'));const bytes=readFileSync(file);return {path:part.replaceAll('\\','/'),sha256:sha(bytes),bytes:bytes.length};});
 assert.equal(sources.length,row.sources.length);assert.ok(row.sources.every(s=>sources.some(v=>v.path===s.path&&v.sha256===s.sha256&&v.bytes===s.bytes)));
 return {scoped:row.scoped,extra_after_boundary:row.extra_after_boundary,program_sha256:row.program_sha256,sources,pass:true};
});
const report={role:boundary.role,node:process.version,sass:sass.info,rows,candidate_read:false,reference_changed:false};
if(args.report)writeFileSync(resolve(args.report),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:rows.length,candidate_read:false,reference_changed:false}));
