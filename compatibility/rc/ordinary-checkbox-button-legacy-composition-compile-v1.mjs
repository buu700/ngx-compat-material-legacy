/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Four source-view calls, two fixed cases, no installed reference or artifact claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,readdirSync,lstatSync,copyFileSync,realpathSync,rmSync,existsSync} from 'node:fs';
import {join,relative} from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';import{tmpdir}from'node:os';
import{legacyDatepickerButtonExpectedCss}from'./ordinary-checkbox-button-legacy-composition-model-v1.mjs';
const root=process.cwd(),prefix='compatibility/rc/ordinary-checkbox-button-legacy-composition-',output=process.argv[2],hash=b=>createHash('sha256').update(b).digest('hex');assert.ok(output&&!existsSync(output));assert.equal(process.versions.node,'24.21.0');
const ref=(path,b)=>({path,sha256:hash(b),bytes:b.length}),pinned=(path,sha)=>{const b=readFileSync(path);assert.equal(hash(b),sha);return JSON.parse(b);};
const proposal=pinned('compatibility/rc/parallel-checkbox-button-public-bridge-proposed-afterimages-v3.json','31a1a4d48a06d52eacddd901953194c9631b060412e153cefc74b4f81b2ef762');
const catalog=pinned('fixtures/sass/mixin-argument-contracts.json','c1d1151a8c1fa02cea0c6fac5618bbefe11dd018bbfff1d30f5c3f35f8fc8770'),owned=pinned('fixtures/sass/owned-aggregate-contracts.json','b83f5ee9e898004e2fce2ae49719dbed923dd2b5eabf06f3f463a8ad33f24c7a');
const sass=createRequire(join(root,'package.json'))('sass');assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'));
const material=realpathSync('node_modules/@angular/material'),cdk=realpathSync('node_modules/@angular/cdk');assert.equal(JSON.parse(readFileSync(join(material,'package.json'))).version,'21.2.14');
const tmp=mkdtempSync(join(tmpdir(),'ordinary-legacy-composition-')),snapshots=new Map(),ownedRefs=[];
function clone(path,destination){const full=join(root,path),stat=lstatSync(full);assert.ok(!stat.isSymbolicLink());if(stat.isDirectory()){mkdirSync(join(destination,path),{recursive:true});for(const name of readdirSync(full).sort())if(name!=='node_modules')clone(path+'/'+name,destination);}else if(path.endsWith('.scss')){const raw=readFileSync(full);if(!snapshots.has(path)){snapshots.set(path,raw);ownedRefs.push(ref(path,raw));}copyFileSync(full,join(destination,path));}}
const beforeView=join(tmp,'before'),candidateView=join(tmp,'candidate'),rows=[],start=performance.now(),cpuStart=process.cpuUsage();
try{
 clone('projects/ngx-material-legacy',beforeView);clone('projects/ngx-material-legacy',candidateView);assert.equal(ownedRefs.length,409);
 for(const r of proposal.members){const old=readFileSync(r.target),next=readFileSync(r.after.path);assert.equal(hash(old),r.before.sha256);assert.equal(hash(next),r.after.sha256);writeFileSync(join(candidateView,r.target),next);}
 for(const[id,source]of[['mixin-argument/legacy-button-theme/custom-full-theme',catalog],['owned-aggregate/themes/repeat',owned]]){
  const entry=source.cases.find(r=>r.case_id===id);assert.ok(entry);const logical="@use '__entry__' as m;\n"+source.setup+'\n'+entry.call+'\n',measurements={};
  for(const[kind,view]of[['before',beforeView],['candidate',candidateView]]){
   const program=logical.replace("'__entry__'","'projects/ngx-material-legacy'"),url=pathToFileURL(join(view,'virtual.scss')),loaded=new Map();
   const result=sass.compileString(program,{url,loadPaths:[view,join(root,'node_modules')],style:'expanded',charset:false,silenceDeprecations:['import','if-function','global-builtin','color-functions','slash-div'],logger:{warn(){},debug(){}}});
   for(const href of result.loadedUrls){if(href.href===url.href){loaded.set('virtual',{root:'virtual',...ref('virtual.scss',Buffer.from(program))});continue;}const full=realpathSync(fileURLToPath(href)),roots=[['owned',join(view,'projects/ngx-material-legacy')],['material',material],['cdk',cdk]],base=roots.find(([,base])=>full.startsWith(base+'/'));assert.ok(base,'unexpected loaded source');const raw=readFileSync(full),r={root:base[0],...ref(relative(base[1],full).replaceAll('\\','/'),raw)};loaded.set(full,r);}
   for(const[full,r]of loaded)if(full!=='virtual'){const raw=readFileSync(full);assert.equal(hash(raw),r.sha256);assert.equal(raw.length,r.bytes);}
   measurements[kind]={css:result.css,css_sha256:hash(result.css),css_bytes:Buffer.byteLength(result.css),program_sha256:hash(logical),loaded:[...loaded.values()]};
  }
  const expected=legacyDatepickerButtonExpectedCss({caseId:id,originalCss:measurements.before.css});
  rows.push({case_id:id,call:entry.call,logical_program_sha256:hash(logical),...measurements,expected_sha256:expected===null?null:hash(expected),expected_bytes:expected===null?null:Buffer.byteLength(expected),finite_whole_raw_model_matches:expected===measurements.candidate.css});
 }
 for(const[path,raw]of snapshots)assert.equal(hash(readFileSync(join(root,path))),hash(raw));
 const cpu=process.cpuUsage(cpuStart);writeFileSync(output,JSON.stringify({schema_version:1,role:'Bounded physical before/candidate facade source-view composition observations',line:'21.x',compiler:sass.info,compile_calls:4,elapsed_ms:performance.now()-start,cpu_ms:(cpu.user+cpu.system)/1000,rows,owned_source_refs:ownedRefs,workspace_product_writes:0,actual_untouched16_installed_producer:false,artifact_or_source_admission:false},null,2)+'\n');console.log(JSON.stringify({calls:4,rows:rows.map(r=>({case_id:r.case_id,matches:r.finite_whole_raw_model_matches})),elapsed_ms:performance.now()-start}));
}finally{rmSync(tmp,{recursive:true,force:true});}
