/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Registration-only oracle fixtures; no historical/browser or packed execution. */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {deriveHistoricalRoster} from '../scripts/historical-case-roster.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),jc=require('jasmine-core');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const scratch=mkdtempSync(join(tmpdir(),'legacy-registration-oracle-')),candidate='projects/fixture/spec-0.spec.ts';
const inventory={rows:Array.from({length:57},(_,index)=>({candidate:`projects/fixture/spec-${index}.spec.ts`,historical_path:`src/material/legacy-fixture/spec-${index}.spec.ts`,adaptation:'synthetic-oracle-fixture'}))};
mkdirSync(join(scratch,'testing/legacy-runner'),{recursive:true});mkdirSync(join(scratch,'projects/fixture'),{recursive:true});
writeFileSync(join(scratch,'testing/legacy-runner/historical-inventory.json'),JSON.stringify(inventory));
writeFileSync(join(scratch,'testing/legacy-runner/historical-specs.json'),JSON.stringify(inventory.rows));
for(let index=1;index<57;index++)writeFileSync(join(scratch,`projects/fixture/spec-${index}.spec.ts`),`describe('other-${index}',()=>{it('kept',()=>{});});`);
function discovered(source){writeFileSync(join(scratch,candidate),source);return deriveHistoricalRoster(scratch).cases.filter(row=>row.candidate===candidate).map(row=>row.full_name);}
function jasmineNames(sources){
 const programs=sources.map(source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText);
 // Isolate Jasmine's process error hooks so an oracle exception cannot swallow
 // assertions in this probe. Only controlled fixture programs register suites;
 // their it callbacks never execute. Missing/malformed output fails the parent.
 const worker=`const jc=require(process.argv[1]);(async()=>{
  const programs=JSON.parse(require('node:fs').readFileSync(0,'utf8')),results=[];
  for(const program of programs){const jasmine=jc.core(jc),env=jasmine.getEnv(),api=jc.interface(jasmine,env),names=[],suite=[];
   env.configure({random:false,specFilter:()=>false});
   env.addReporter({suiteStarted(result){suite.push(result.description);},suiteDone(){suite.pop();},
    specDone(result){if(result.status!=='excluded')throw new Error('fixture body was not excluded');names.push([...suite,result.description].join(' > '));}});
   new Function(...Object.keys(api),program)(...Object.values(api));await env.execute();results.push(names);
  }process.stdout.write(JSON.stringify(results));
 })().catch(error=>{process.stderr.write(String(error.stack));process.exitCode=1;});`;
 const output=execFileSync(process.execPath,['-e',worker,require.resolve('jasmine-core')],{input:JSON.stringify(programs),encoding:'utf8',timeout:15000});
 const results=JSON.parse(output);assert.equal(results.length,sources.length);return results;
}
const positive=[
 ['literal-concatenation',`describe(('outer' + ' suite'),()=>{it('kept',()=>{});});`],
 ['dialog-modes-and-conditional-cases',`for(const mode of ['enabled','di-disabled'] as const){describe(\`dialog (\${mode})\`,()=>{it('common',()=>{});if(mode==='enabled'){it('motion event',()=>{});}else{it('disabled completion',()=>{});}});}`],
 ['opaque-host-factories-in-tuples',`for(const [label,host] of [['legacy',()=>class Legacy{}],['current CDK',()=>class Current{}]] as const){it('table '+label,()=>{host();});}`],
 ['nested-immutable-loops',`for(const mode of ['a','b']){for(const index of [0,1]){describe(\`\${mode}-\${index}\`,()=>{it('nested',()=>{});});}}`],
 ['scalar-alias-and-shadowing',`const label='outer';describe(label,()=>{const label='inner';for(const flag of [false,true]){const name=flag?'on':'off';it(label+' '+name,()=>{});}});`],
 ['tuple-default-and-omission',`for(const [label,,flag=false] of [['one',()=>{}],['two',()=>{},true]]){describe(label,()=>{if(flag){it('true',()=>{});}else{it('false',()=>{});}});}`],
 ['known-short-circuit',`for(const enabled of [false,true]){if(enabled||unknown()){it('enabled '+enabled,()=>{});}}`],
 ['called-local-suite-in-mode-scope',`for(const mode of ['enabled','di-disabled']){function register(){it('case '+mode,()=>{});}describe('local',()=>register());}`],
 ['repeated-values-retain-multiplicity',`for(const mode of ['same','same']){it('case '+mode,()=>{});}`],
];
// The inactive branch in this controlled fixture must not evaluate unknown().
positive[6][1]=`for(const enabled of [false,true]){if(enabled||false){it('enabled '+enabled,()=>{});}if(!enabled&&false){it('unreachable '+unknown(),()=>{});}}`;
const negative=[
 ['unknown-loop-domain',`for(const mode of getModes()){it('case '+mode,()=>{});}`,/non-static registration loop/],
 ['mutable-loop-binding',`for(let mode of ['a','b']){it('case '+mode,()=>{});}`,/non-static registration loop/],
 ['mutable-title-binding',`let label='first';label='second';it(label,()=>{});`,/non-static it/],
 ['escaped-array-domain',`const modes=['a'];modes.push('b');for(const mode of modes){it('case '+mode,()=>{});}`,/non-static registration loop/],
 ['unknown-conditional-registration',`if(getMode()){it('conditional',()=>{});}`,/non-static registration condition/],
 ['unknown-condition-called-suite',`function register(){it('called',()=>{});}if(getMode()){register();}`,/non-static registration condition/],
 ['unresolved-template-value',`describe(\`mode \${getMode()}\`,()=>{it('case',()=>{});});`,/non-static describe/],
 ['opaque-host-in-title',`for(const [label,host] of [['legacy',()=>class Host{}]]){it(\`\${label} \${host}\`,()=>{});}`,/non-static it/],
 ['eager-opaque-factory-in-domain',`for(const [label,host] of [['legacy',makeHost()]]){it(label,()=>{});}`,/non-static registration loop/],
 ['array-spread-domain',`for(const mode of ['a',...getModes()]){it('case '+mode,()=>{});}`,/non-static registration loop/],
 ['unresolved-callback-registration',`getModes().forEach(mode=>{it('case '+mode,()=>{});});`,/unsupported registration callback/],
 ['unsupported-counted-loop',`for(let index=0;index<2;index++){it('case '+index,()=>{});}`,/unsupported registration loop/],
 ['rest-binding',`for(const [label,...rest] of [['a',1]]){it(label,()=>{});}`,/non-static registration binding/],
 ['excessive-expansion',`for(const mode of [${Array.from({length:257},(_,i)=>i).join(',')}]){it('case '+mode,()=>{});}`,/finite discovery bound/],
];
const cases=[],controls=[];
try{
 const expectedNames=jasmineNames(positive.map(([,source])=>source));
 for(const [index,[id,source]]of positive.entries()){const expected=expectedNames[index],actual=discovered(source);assert.ok(expected.length>0);assert.deepEqual(actual,expected,id);cases.push({id,registered_names:expected,source_sha256:hash(source)});}
 for(const [id,source,pattern]of negative){assert.throws(()=>discovered(source),pattern,id);controls.push({id,rejected:true});}
 const report={schema_version:1,line:JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main',
  oracle:'Actual Jasmine registration for controlled synthetic fixtures; it bodies never execute',jasmine:jc.version(),typescript:ts.version,node:process.version,
  positive_fixtures:cases,negative_controls:controls,synthetic_fixture_paths:57,
  producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),parser_sha256:hash(readFileSync(join(root,'scripts/historical-case-roster.mjs'))),
  actual_historical_browser_artifact_or_floor_executed:false,g11_claim:'not-passed'};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:report.line,genuine_jasmine_registration_fixtures:cases.length,registered_names:cases.reduce((n,row)=>n+row.registered_names.length,0),negative_controls:controls.length,actual_historical_browser_artifact_or_floor_executed:false}));
}finally{rmSync(scratch,{recursive:true,force:true});}
