/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Focused actual source CSS;never packed,full651/498 or native qualification. */
import assert from 'node:assert/strict';import {readFileSync,writeFileSync,realpathSync} from 'node:fs';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';import {relative,isAbsolute,resolve} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),require=createRequire(import.meta.url),sass=require('sass'),sha=b=>createHash('sha256').update(b).digest('hex');
const args={};for(let i=2;i<process.argv.length;i+=2){assert.ok(['--peer-root','--line','--report'].includes(process.argv[i])&&process.argv[i+1]);args[process.argv[i].slice(2)]=process.argv[i+1];}
const line=args.line;assert.ok(args['peer-root']&&['main','21.x'].includes(line));
const {DEFAULT_AGGREGATE_CASES,defaultAggregateExpectedCss,defaultAggregateMeasurementOk,measureDefaultAggregatePeer}=await import(root+'/scripts/sass-default-aggregate-contract.mjs');
const {AGGREGATE_COLOR_THEME_CASES,aggregateColorThemeExpectedCss,aggregateColorThemeResultsMatch,measureAggregateColorThemePeer}=await import(root+'/scripts/sass-aggregate-color-theme-contract.mjs');
const {orderedAggregateExpectedCss,orderedAggregateMeasurementOk,measureOrderedAggregatePeers}=await import(root+'/scripts/sass-ordered-aggregate-contract.mjs');
const own=realpathSync(root+'/projects/ngx-material-legacy'),peerRoot=realpathSync(args['peer-root']),material=peerRoot+'/@angular/material',cdk=peerRoot+'/@angular/cdk';
const ripple=JSON.parse(readFileSync(root+'/fixtures/sass/ripple-color-contracts.json'));
const ids=[...Object.keys(DEFAULT_AGGREGATE_CASES).filter(id=>/-(colors|themes)$/.test(id)),...Object.keys(AGGREGATE_COLOR_THEME_CASES),'06-aggregate-and-companions'];assert.equal(ids.length,13);
const cache=new Map(),rows=[];
for(const id of ids){
 const e=ripple.cases[id],program=e.program.replace("'__entry__'","'"+pathToFileURL(own+'/_index.scss').href+"'");
 const result=sass.compileString(program,{loadPaths:[peerRoot],style:'expanded',silenceDeprecations:['if-function','global-builtin','color-functions','import','mixed-decls','slash-div'],logger:{warn(){},debug(){}}});
 const sources=result.loadedUrls.map(url=>{const file=realpathSync(fileURLToPath(url)),bases=[own,material,cdk],which=bases.findIndex(base=>{const p=relative(base,file);return !isAbsolute(p)&&p!=='..'&&!p.startsWith('../');});assert.ok(which>=0,file);const bytes=readFileSync(file);return {root:which,path:relative(bases[which],file).replaceAll('\\','/'),sha256:sha(bytes),bytes:bytes.length};}).sort((a,b)=>a.root-b.root||a.path.localeCompare(b.path));
 const actual={line,css:result.css,css_sha256:sha(result.css),css_bytes:Buffer.byteLength(result.css),program_sha256:e.program_sha256,sass_version:sass.info,sources};
 const options={sass,materialRoot:material,cdkRoot:cdk,line,caseId:id};let peer,expected;
 if(Object.hasOwn(DEFAULT_AGGREGATE_CASES,id)){
  const key=DEFAULT_AGGREGATE_CASES[id].profile;if(!cache.has(key))cache.set(key,measureDefaultAggregatePeer(options));peer=cache.get(key);expected=defaultAggregateExpectedCss(id,peer);
 }else if(Object.hasOwn(AGGREGATE_COLOR_THEME_CASES,id)){
  peer=measureAggregateColorThemePeer(options);expected=aggregateColorThemeExpectedCss(id,{...e.original,sources:ripple.original_source_sets[e.original.source_set]},peer);
 }else {peer=measureOrderedAggregatePeers(options);expected=orderedAggregateExpectedCss(peer,line);}
 let mismatch=null;if(expected===null||expected!==actual.css||!(Object.hasOwn(DEFAULT_AGGREGATE_CASES,id)?defaultAggregateMeasurementOk(id,actual,line):Object.hasOwn(AGGREGATE_COLOR_THEME_CASES,id)?aggregateColorThemeResultsMatch(id,{...e.original,sources:ripple.original_source_sets[e.original.source_set]},actual,peer):orderedAggregateMeasurementOk(actual,line))){let at=0;while(at<Math.min(actual.css.length,expected?.length??0)&&actual.css[at]===expected[at])at++;mismatch={at,expected:expected?.slice(Math.max(0,at-40),at+180),actual:actual.css.slice(Math.max(0,at-40),at+180)};}
 rows.push({id,actual,peer,result:mismatch?'fail':'pass',mismatch});console.log(id+' '+rows.at(-1).result);
}
const report={role:'Focused combined source Sass model check; not packed/full651/498/native qualification',line,node:process.version,sass:sass.info,rows,passed:rows.filter(r=>r.result==='pass').length,failed:rows.filter(r=>r.result!=='pass').length};
if(args.report)writeFileSync(resolve(args.report),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({line,passed:report.passed,failed:report.failed,failures:rows.filter(r=>r.result!=='pass').map(({id,mismatch})=>({id,mismatch}))},null,2));if(report.failed)process.exitCode=1;
