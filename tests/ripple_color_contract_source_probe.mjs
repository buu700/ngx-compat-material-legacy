/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Bounded actual Sass source check; neither packed nor whole651/498 qualification. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {RIPPLE_COLOR_BINDING_CASES,RIPPLE_COLOR_CONTROL_CASES,RIPPLE_COLOR_DEFAULT_CASES,RIPPLE_COLOR_ARGUMENT_CASES,RIPPLE_COLOR_OWNED_CASES,RIPPLE_COLOR_ORDERED_CASES,rippleColorExpectedCss,rippleColorResultsMatch,rippleColorMeasurementOkay,measureRippleColorPeer} from '../scripts/sass-ripple-color-contract.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),sass=require('sass');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const args={};for(let i=2;i<process.argv.length;i+=2){assert.ok(['--peer-root','--line','--report'].includes(process.argv[i])&&process.argv[i+1]);args[process.argv[i].slice(2)]=process.argv[i+1];}
assert.ok(args['peer-root']&&['main','21.x'].includes(args.line));
const catalog=JSON.parse(readFileSync(resolve(root,'fixtures/sass/ripple-color-contracts.json'))),owned=realpathSync(resolve(root,'projects/ngx-material-legacy'));
const peerRoot=realpathSync(args['peer-root']),material=realpathSync(resolve(peerRoot,'@angular/material')),cdk=realpathSync(resolve(peerRoot,'@angular/cdk'));
assert.equal(JSON.parse(readFileSync(resolve(material,'package.json'))).version,args.line==='main'?'22.1.7':'21.2.14');
const cases={...RIPPLE_COLOR_DEFAULT_CASES,...RIPPLE_COLOR_ARGUMENT_CASES,...RIPPLE_COLOR_OWNED_CASES,...RIPPLE_COLOR_ORDERED_CASES,...RIPPLE_COLOR_CONTROL_CASES};
assert.equal(Object.keys(cases).length,29);
const peerCache=new Map(),rows=[];
for(const [id,e] of Object.entries(cases)){
 const original={...e.original,sources:catalog.original_source_sets[e.original.source_set]};
 const program=e.program.replace("'__entry__'","'"+pathToFileURL(resolve(owned,'_index.scss')).href+"'");
 const result=sass.compileString(program,{loadPaths:[peerRoot],style:'expanded',silenceDeprecations:['if-function','global-builtin','color-functions','import','mixed-decls','slash-div'],logger:{warn(){},debug(){}}});
 const bases=[owned,material,cdk],sources=result.loadedUrls.map(url=>{assert.equal(url.protocol,'file:');const file=realpathSync(fileURLToPath(url)),which=bases.findIndex(base=>{const p=relative(base,file);return !isAbsolute(p)&&p!=='..'&&!p.startsWith('../');});assert.ok(which>=0,file);const bytes=readFileSync(file);return {root:which,path:relative(bases[which],file).replaceAll('\\','/'),sha256:sha(bytes),bytes:bytes.length};}).sort((a,b)=>a.root-b.root||a.path.localeCompare(b.path));
 const actual={line:args.line,css:result.css,css_sha256:sha(result.css),css_bytes:Buffer.byteLength(result.css),program_sha256:e.program_sha256,sass_version:sass.info,sources};
 let expected,peer=null,measurement_ok=true;
 if(Object.hasOwn(RIPPLE_COLOR_BINDING_CASES,id)){
  if(!peerCache.has(e.peer_program))peerCache.set(e.peer_program,measureRippleColorPeer({sass,materialRoot:material,cdkRoot:cdk,caseId:id,line:args.line}));
  peer=peerCache.get(e.peer_program);expected=rippleColorExpectedCss(id,original,peer);measurement_ok=rippleColorMeasurementOkay(id,actual,args.line);
 }else expected=original.css;
 const match=measurement_ok&&expected!==null&&result.css===expected;
 const wrong={...actual,css:result.css+'\n.unrelated-regression {color:red;}'};wrong.css_sha256=sha(wrong.css);wrong.css_bytes=Buffer.byteLength(wrong.css);
 const mutation_rejected=peer?!rippleColorResultsMatch(id,original,wrong,peer):wrong.css!==expected;
 let mismatch=null;if(!match){let offset=0;while(offset<Math.min(result.css.length,expected?.length??0)&&result.css[offset]===expected[offset])offset++;mismatch={offset,expected:expected?.slice(Math.max(0,offset-30),offset+170),actual:result.css.slice(Math.max(0,offset-30),offset+170)};}
 rows.push({id,result:match&&mutation_rejected?'pass':'fail',original_css_sha256:original.css_sha256,actual,peer,measurement_ok,mutation_rejected,mismatch});
 if(rows.length%6===0)console.log('checked source cases '+rows.length+'/29');
}
const report={schema_version:1,role:'Bounded actual source Sass and public override check; no packed/native/full651/498 qualification',line:args.line,node:process.version,sass:sass.info,rows,passed:rows.filter(r=>r.result==='pass').length,failed:rows.filter(r=>r.result!=='pass').length,packed_execution:false,native_execution:false,g02_claim:'not-passed',g11_claim:'not-passed'};
if(args.report)writeFileSync(resolve(args.report),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({line:args.line,passed:report.passed,failed:report.failed,failures:rows.filter(r=>r.result!=='pass').map(r=>({id:r.id,measurement_ok:r.measurement_ok,mismatch:r.mismatch}))},null,2));
if(report.failed)process.exitCode=1;
