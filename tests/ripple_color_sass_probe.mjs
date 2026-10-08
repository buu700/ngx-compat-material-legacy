/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Bounded source diagnostic; root/scoped color expectations come from the untouched tagged model. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),sass=require('sass');
const args={};for(let i=2;i<process.argv.length;i+=2){
 assert.ok(['--reference','--report'].includes(process.argv[i])&&process.argv[i+1]);
 args[process.argv[i].slice(2)]=process.argv[i+1];
}
assert.ok(args.reference);assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'));
const ref=realpathSync(args.reference),owned=realpathSync(resolve(root,'projects/ngx-material-legacy/styles'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const identityBytes=readFileSync(resolve(root,'compatibility/rc/original16-sass-source-diagnostic-identity.json'));
const identity=JSON.parse(identityBytes),identities=new Map(Object.values(identity.loaded_source_sets).flat().map(s=>[s.path,s]));
function sourceRows(result,base,original){
 return result.loadedUrls.filter(url=>url.href!==pathToFileURL(resolve(root,'ripple-source.scss')).href).map(url=>{
  assert.equal(url.protocol,'file:');const path=realpathSync(fileURLToPath(url)),part=relative(base,path);
  assert.ok(!isAbsolute(part)&&part!=='..'&&!part.startsWith('../'),path);
  const bytes=readFileSync(path),record={path:part,sha256:sha(bytes),bytes:bytes.length};
  if(original){const expected=identities.get('@angular/material/'+part);assert.ok(expected,part);
   assert.equal(record.sha256,expected.sha256,part);assert.equal(record.bytes,expected.bytes,part);}
  return record;
 }).sort((a,b)=>a.path.localeCompare(b.path));
}
function compile(base,background,scoped,original){
 const program=`@use 'sass:map'; @use 'sass:meta';
@use '${base}/core/theming/theming' as own;
@use '${base}/core/theming/palette' as palette;
@use '${base}/core/ripple/ripple-theme' as ripple;
$primary:own.define-palette(palette.$indigo-palette);
$accent:own.define-palette(palette.$pink-palette,A200,A100,A400);
$theme:own.define-light-theme((color:(primary:$primary,accent:$accent)));
$config:map.set(own.get-color-config($theme),foreground,base,${background});
$before:meta.inspect($config);
${scoped?'.probe {':''}@include ripple.color($config);${scoped?'}':''}
@debug meta.inspect($config)==$before;
`;
 const logs=[],result=sass.compileString(program,{style:'expanded',charset:false,url:pathToFileURL(resolve(root,'ripple-source.scss')),loadPaths:[base],
  silenceDeprecations:['if-function','global-builtin','color-functions','import'],logger:{warn(){},debug(value){logs.push(value);}}});
 assert.deepEqual(logs,['true'],'consumer color map changed');
 return {program_sha256:sha(program),css:result.css,css_sha256:sha(result.css),map_unchanged:true,
  sources:sourceRows(result,base,original)};
}
const cases=[];
for(const [id,base] of [['light','#000'],['dark','#fff'],['custom','#4f7082'],['css-variable','var(--custom-foreground)']]){
 for(const scoped of [false,true]){
  const original=compile(ref,base,scoped,true),actual=compile(owned,base,scoped,false);
  const color=original.css.match(/background-color: ([^;]+);/)?.[1];assert.ok(color);
  const suffix=(scoped?'\n.probe':'\n\nhtml')+' {\n  --mat-ripple-color: '+color+';\n}';
  const expected=original.css+suffix;assert.equal(actual.css,expected,id+'/'+scoped);
  const corruptions=[original.css,expected.replace('--mat-ripple-color: '+color,'--mat-ripple-color: transparent'),
   expected.replace('background-color: '+color,'background-color: red'),expected.replace('.mat-ripple-element','.unexpected'),
   expected.replace('--mat-ripple-color','--unrelated-color'),expected.replace(scoped?'\n.probe {':'\nhtml {','\n.wrong-scope {')];
  for(const changed of corruptions)assert.notEqual(changed,expected);
  cases.push({id:id+'/'+(scoped?'scoped':'root'),base,original,actual,token:color,mutants_rejected:corruptions.length});
 }
}
const report={schema_version:1,role:'Focused source Sass diagnostic; not full Sass/packed/actual21/floor qualification',
 sass:sass.info,original_identity_sha256:sha(identityBytes),cases};
if(args.report)writeFileSync(resolve(args.report),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:cases.length,mutants_rejected:cases.reduce((n,row)=>n+row.mutants_rejected,0),sass:sass.info.split('\n')[0]}));
