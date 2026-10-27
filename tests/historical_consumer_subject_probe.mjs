/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite immutable subject selection and rejection; no historical programs run here. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,rmSync,symlinkSync,unlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {historicalConsumerSubject} from '../scripts/run-historical-consumer-probe.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(join(root,path));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const catalogPath='compatibility/rc/historical-consumer-source-subjects.json',catalog=JSON.parse(read(catalogPath));
const positives=[];
for(const entry of catalog.entries){
  const actual=historicalConsumerSubject({root,family:entry.id});assert.deepEqual(actual.subject,entry);
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
  const original=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','show',entry.reference_commit+':'+entry.probe],{cwd:root,env,maxBuffer:1024*1024});
  assert.equal(hash(original),entry.probe_sha256);assert.equal(original.equals(read(entry.probe)),true);
  positives.push({family:entry.id,reference_commit:entry.reference_commit,original_probe_bytes_equal:true});
}
assert.equal(positives.length,23);
const first=catalog.entries[0],stager='scripts/historical-consumer-reference-fixture.py';
const files=new Map([catalogPath,'projects/ngx-material-legacy/package.json',first.probe,stager].map(path=>[path,read(path)]));
const controls=[];
function reject(id,mutate,pattern){
  const temporary=mkdtempSync(join(tmpdir(),'ngx-consumer-subject-control-'));
  const put=(path,raw)=>{mkdirSync(dirname(join(temporary,path)),{recursive:true});writeFileSync(join(temporary,path),raw);};
  try{
    for(const [path,raw]of files)put(path,raw);
    assert.equal(historicalConsumerSubject({root:temporary,family:first.id}).subject.id,first.id);
    const family=mutate({temporary,put})??first.id;
    assert.throws(()=>historicalConsumerSubject({root:temporary,family}),pattern,id);
    controls.push({id,result:'rejected'});
  }finally{rmSync(temporary,{recursive:true,force:true});}
}
for(const [id,mutate]of [
  ['catalog-entry-removed',data=>data.entries.pop()],
  ['catalog-reference-replaced',data=>{data.entries[0].reference_commit='0'.repeat(40);}],
  ['catalog-line-replaced',data=>{data.line=data.line==='main'?'21.x':'main';}],
])reject(id,({put})=>{const data=structuredClone(catalog);mutate(data);put(catalogPath,JSON.stringify(data));},/catalog changed/);
reject('original-probe-drift',({put})=>put(first.probe,Buffer.concat([files.get(first.probe),Buffer.from('\n')])),/probe changed/);
reject('staging-code-drift',({put})=>put(stager,Buffer.concat([files.get(stager),Buffer.from('\n')])),/staging code changed/);
reject('unsupported-line',({put})=>put('projects/ngx-material-legacy/package.json',JSON.stringify({version:'23.0.0'})),/unregistered historical consumer line/);
for(const [id,path]of [['missing-probe',first.probe],['missing-stager',stager]])
  reject(id,({temporary})=>unlinkSync(join(temporary,path)),/ENOENT/);
for(const [id,path]of [['linked-catalog',catalogPath],['linked-probe',first.probe],['linked-stager',stager]])
  reject(id,({temporary,put})=>{put(path+'.original',files.get(path));unlinkSync(join(temporary,path));symlinkSync(path.split('/').at(-1)+'.original',join(temporary,path));},/symbolic|symlink|regular|linked/i);
reject('unknown-family',()=> 'unregistered-consumer',/unknown historical consumer family/);
assert.equal(controls.length,12);
const report={schema_version:1,line:catalog.line,original_subjects_verified:23,positive_cases:positives,
  negative_controls:12,controls,historical_programs_executed:0,current_source_qualified:false,
  producer:{path:'tests/historical_consumer_subject_probe.mjs',sha256:hash(read('tests/historical_consumer_subject_probe.mjs'))},
  actual_native_artifact_browser_or_floor_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
