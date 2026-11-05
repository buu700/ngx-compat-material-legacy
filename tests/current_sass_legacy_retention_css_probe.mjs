/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,realpathSync} from 'node:fs';
import {isAbsolute,join,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createCurrentSassSource} from '../scripts/current-sass-source.mjs';
import {currentLegacyRetentionExpectedCss,currentLegacyRetentionMeasurement,compileCurrentLegacyRetentionColor} from '../scripts/current-sass-legacy-retention-css.mjs';
const root=process.argv[2],source=createCurrentSassSource({root}),sass=createRequire(import.meta.url)('sass');
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const packet=JSON.parse(readFileSync(new URL('../compatibility/rc/current-sass-legacy-retention-reference-v1.json',import.meta.url)));
const roots=[join(root,'projects/ngx-material-legacy'),join(root,'node_modules/@angular/material'),join(root,'node_modules/@angular/cdk')].map(p=>realpathSync(p));
const bound=new Map(source.bound.map(row=>[row.path,row]));let compilerCalls=0;
const cases=[];
for(const row of packet.cases){
 const compiled=sass.compileString(row.program.replace("'__entry__'",JSON.stringify(pathToFileURL(join(root,'projects/ngx-material-legacy/_index.scss')).href)),{
  style:'expanded',charset:false,loadPaths:[join(root,'node_modules')],silenceDeprecations:['import','if-function','global-builtin','color-functions','slash-div'],logger:{warn(){},debug(){}}});compilerCalls++;
 assert.equal(compiled.css,currentLegacyRetentionExpectedCss(row.case_id));
 const refs=compiled.loadedUrls.map(url=>{
  assert.equal(url.protocol,'file:');const path=realpathSync(fileURLToPath(url));
  const index=roots.findIndex(base=>{const rel=relative(base,path);return rel===''||(!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('../'));});assert.ok(index>=0);
  const rel=relative(roots[index],path),key=['projects/ngx-material-legacy/','node_modules/@angular/material/','node_modules/@angular/cdk/'][index]+rel;
  const raw=readFileSync(path),ref={path:key,sha256:hash(raw),bytes:raw.length};assert.deepEqual(ref,bound.get(key));return {root:index,path:rel,sha256:ref.sha256,bytes:ref.bytes};
 }).sort((a,b)=>a.root-b.root||(a.path<b.path?-1:a.path>b.path?1:0));
 assert.deepEqual(refs,Object.values(source.source_sets)[0]);
 const measurement=currentLegacyRetentionMeasurement(row.case_id);assert.equal(measurement.css_sha256,hash(compiled.css));assert.equal(measurement.css_bytes,Buffer.byteLength(compiled.css));
 cases.push({case_id:row.case_id,...measurement,loaded_sources:refs.length});
}
const direct=compileCurrentLegacyRetentionColor({root,body:readFileSync(join(root,'projects/ngx-material-legacy/styles/legacy-button/_button-theme.scss'),'utf8')});compilerCalls++;
assert.equal(direct.css,currentLegacyRetentionExpectedCss('direct-legacy-color/fab'));
assert.equal(direct.css_sha256,currentLegacyRetentionMeasurement('direct-legacy-color/fab').css_sha256);
assert.throws(()=>currentLegacyRetentionExpectedCss('mixin-css/unowned'));
source.assertCurrent();
console.log(JSON.stringify({line:source.line,cases,compiler_calls:compilerCalls,direct_color:true,original_hashes_unchanged:true,packed_or_full_C04_qualified:false}));
