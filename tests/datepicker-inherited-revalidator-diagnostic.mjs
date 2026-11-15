/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import {readFileSync,writeFileSync,statSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {datepickerCaseResults} from '../scripts/datepicker-inherited-live-evidence.mjs';
const [rootArg,runArg]=process.argv.slice(2);if(!rootArg||!runArg)throw Error('usage: node test.mjs REPOSITORY FRESH_DIAGNOSTIC_DIR');const root=resolve(rootArg),runDir=resolve(runArg);if(existsSync(runDir+'/run.json'))throw Error('diagnostic directory must be fresh; never use a coordinator run');
const hash=b=>createHash('sha256').update(b).digest('hex'),obs=JSON.parse(readFileSync(runDir+'/producer.json')),nonce=obs.nonce,invocation='probe',runId='diagnostic-only',binding={source_commit:obs.source_commit,source_tree:obs.source_tree};const library={sha256:obs.artifact_sha256,bytes:statSync(runDir+'/library.tgz').size};
writeFileSync(runDir+'/run.json',JSON.stringify({artifacts:[{id:'library',path:'library.tgz',...library}]}));
const path=`evidence/upstream-audit-disposition/${invocation}/datepicker-live-${nonce}.json`,file=runDir+'/'+path,original={run_id:runId,invocation_id:invocation,binding,...obs,all_cases:datepickerCaseResults(obs.results,nonce)};
function test(label,body,expect){const bytes=Buffer.from(JSON.stringify(body)+'\n');writeFileSync(file,bytes);const record={path,sha256:hash(bytes),bytes:bytes.length};const x=spawnSync(process.execPath,[root+'/scripts/revalidate-datepicker-inherited.mjs'],{cwd:root,encoding:'utf8',input:JSON.stringify({root,runDir,record,binding,runId,invocation,library}),timeout:120000});if((x.status===0)!==expect)throw Error(label+': '+x.stderr.slice(-1000));console.log(label+': '+(expect?'accepted diagnostic':'rejected'));}
test('unchanged',original,true);
for(const [name,mutate] of [['wrong artifact',x=>x.artifact_sha256='0'.repeat(64)],['wrong profile',x=>x.toolchain_profile='wrong'],['changed peer input',x=>{const y=x.results.zoneful.bundle_inputs.find(r=>r.owner==='@angular/material');y.sha256='0'.repeat(64)}],['forged failed range',x=>x.all_cases['2d5942cb0fe86f9c3d26b1925b1d4390cfc6613b'].zoneful.baseline=true]]){const altered=structuredClone(original);mutate(altered);test(name,altered,false)}
test('restored',original,true);
