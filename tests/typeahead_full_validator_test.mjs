/** @license Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE. */
// Synthetic complete graph and coordinator evidence; this is not product execution.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, lstatSync, realpathSync, symlinkSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, relative, resolve} from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {allConsumerCaseIds, loadExportKeys} from '../scripts/packed-consumer-evidence.mjs';
import {TYPEAHEAD_CASES, TYPEAHEAD_KIND, TYPEAHEAD_SHA, typeaheadBehaviorRequirements, validateTypeaheadBehavior} from '../scripts/upstream-typeahead-evidence.mjs';
import {typeaheadRunDigest} from '../scripts/typeahead-run-projection.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x && typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const digest=x=>sha(canonical(x));
const out=mkdtempSync(join(tmpdir(),'typeahead-validator-')), root=join(out,'root'), runDir=join(out,'run');
const oldPath=process.env.PATH;
const write=(path,value)=>{mkdirSync(resolve(path,'..'),{recursive:true});writeFileSync(path,typeof value==='string'?value:JSON.stringify(value));};
const snapshot=p=>{const result={};function visit(dir,parts=[]){for(const name of readdirSync(dir).sort()){if(name==='out')continue;const path=join(dir,name), next=[...parts,name], st=lstatSync(path);if(st.isSymbolicLink())continue;if(st.isDirectory())visit(path,next);else if(st.isFile())result[next.join('/')]=sha(readFileSync(path));}}visit(p);return result;};
try {
 for (const path of ['projects/ngx-material-legacy','testing/legacy-runner','compatibility/rc/typeahead-fixture','compatibility/rc/typeahead-runner','compatibility/rc/matrices/full-verify.json','compatibility/rc/matrices/library-exports.json','scripts/run-typeahead-execution.py','scripts/revalidate-typeahead.mjs','scripts/upstream-typeahead-evidence.mjs','scripts/typeahead-run-projection.mjs','scripts/upstream-packed-run-evidence.mjs','scripts/packed-consumer-evidence.mjs']) {mkdirSync(resolve(root,path,'..'),{recursive:true});cpSync(resolve(path),join(root,path),{recursive:true});}
 const originalModules=realpathSync('node_modules'), originalPeer=realpathSync('node_modules/@angular/cdk');
 const peerRelative=relative(originalModules,originalPeer);
 mkdirSync(join(root,'node_modules',peerRelative,'..'),{recursive:true});
 cpSync(originalPeer,join(root,'node_modules',peerRelative),{recursive:true});
 mkdirSync(join(root,'node_modules/@angular'),{recursive:true});
 symlinkSync(relative(join(root,'node_modules/@angular'),join(root,'node_modules',peerRelative)),join(root,'node_modules/@angular/cdk'));
 const bin=join(out,'bin');mkdirSync(bin);const commit='a'.repeat(40),tree='b'.repeat(40);
 write(join(bin,'git'),`#!/bin/sh\ncase "$*" in *'HEAD^{tree}'*) echo ${tree};; *'rev-parse HEAD'*) echo ${commit};; *status*) :;; *) exit 1;; esac\n`);execFileSync('chmod',['+x',join(bin,'git')]);process.env.PATH=bin+':'+oldPath;
 mkdirSync(join(out,'artifact/package/fesm2022'),{recursive:true});write(join(out,'artifact/package/fesm2022/a.mjs'),'export const value=1;');
 mkdirSync(runDir);execFileSync('tar',['-czf',join(runDir,'library.tgz'),'-C',join(out,'artifact'),'package']);
 const tar=readFileSync(join(runDir,'library.tgz')), library={id:'library',path:'library.tgz',sha256:sha(tar),bytes:tar.length};
 const run={schema_version:1,template:false,run_id:'synthetic',stage:'draft',purpose:'candidate',created_at:'now',source:{line:'main',commit,git_tree_sha:tree,content_sha256:'c'.repeat(64),clean:true},environment:{mode:'host-nix'},oracles:{},artifacts:[library],expected_matrix:{},execution_inputs:{line:'main',commit,tree,inputs_sha256:'d'.repeat(64),clean:true},pack_execution:{a:1},pack_metadata:{a:2},reports:[],summary:{}};
 const matrix=readFileSync(join(root,'compatibility/rc/matrices/full-verify.json'));
 const binding={run_id:run.run_id,source_line:'main',source_commit:commit,source_tree:tree,source_content_sha256:run.source.content_sha256,source_clean:true,input_clean:true,inputs_sha256:run.execution_inputs.inputs_sha256,artifacts_sha256:digest(run.artifacts),environment_sha256:digest(run.environment),oracles_sha256:digest(run.oracles),pack_execution_sha256:digest(run.pack_execution),pack_metadata_sha256:digest(run.pack_metadata),matrix_sha256:sha(matrix)};
 const ids=allConsumerCaseIds(loadExportKeys()), packedInv='packed',typeInv='focused';
 const packedPath=`evidence/packed-consumer/${packedInv}/consumer-observations.json`;
 const packedObs={kind:'packed-consumer-observations',check_id:'packed-consumer',run_id:run.run_id,invocation_id:packedInv,library_sha256:library.sha256,cases:ids.map(case_id=>({case_id,result:'pass'}))};write(join(runDir,packedPath),packedObs);
 const packedBytes=readFileSync(join(runDir,packedPath)),packedOutput={path:packedPath,sha256:sha(packedBytes),bytes:packedBytes.length};
 const report={schema_version:1,template:false,check_id:'packed-consumer',line:'main',run_id:run.run_id,invocation_id:packedInv,binding,result:'pass',coverage:'complete',exit_code:0,subject_kind:'artifact',subject_ids:['library'],artifacts:{library:{sha256:library.sha256,bytes:library.bytes}},expected_case_ids:ids,discovered_case_ids:ids,executed_case_ids:ids,passed_case_ids:ids,passed:ids.length,failed:0,skipped:0,failed_case_ids:[],skipped_case_ids:[],unresolved_case_ids:[],exceptions:[],outputs:[packedOutput],case_results:ids.map(case_id=>({case_id,result:'pass',kind:'assertion',output_paths:[packedPath]}))};write(join(runDir,'reports/packed-consumer.json'),report);
 const peer=realpathSync(join(root,'node_modules/@angular/cdk')),modules=realpathSync(join(root,'node_modules'));
 const peers={'fesm2022/_list-key-manager-chunk.mjs':'63042ad0a8264bfedfaac1c03d2b0eee450bcd7890a09792dc83256195e00057','fesm2022/_typeahead-chunk.mjs':'c26eed04140a44b175020b75b3a16bf73c2913a064ae61c79dc744d5fa3e4622'};
 const dir=join(runDir,`evidence/typeahead-execution/${typeInv}`);mkdirSync(dir,{recursive:true});const files={};
 function put(name,value){write(join(dir,name),value);const b=readFileSync(join(dir,name));files[name]={sha256:sha(b),bytes:b.length};}
 const selected=TYPEAHEAD_CASES.map(full_name=>({full_name,skipped:false,success:true})),totals={executed:496,passed:9,failed:0,skipped:487};
 let raw={subject_mode:'artifact',mode:'normal',run_id:run.run_id,artifact_sha256:library.sha256,totals,failures:[],specs:[...selected,...Array.from({length:487},(_,i)=>({full_name:`other ${i}`,skipped:true}))]};
 put('raw-report.json',raw);put('commands.json',['testing/legacy-runner/build.mjs','testing/legacy-runner/build.mjs','node_modules/karma/bin/karma'].map(x=>({command:['node',x],exit_code:0})));
 const initial={fixture:snapshot(join(root,'compatibility/rc/typeahead-fixture')),runner:snapshot(join(root,'compatibility/rc/typeahead-runner')),base_runner:snapshot(join(root,'testing/legacy-runner')),project:snapshot(join(root,'projects/ngx-material-legacy')),peer:peers,peer_manifest:sha(readFileSync(join(peer,'package.json'))),producer:sha(readFileSync(join(root,'scripts/run-typeahead-execution.py'))),manifest:typeaheadRunDigest(run),artifact:library.sha256};put('inputs-before.json',initial);
 const entry='generated entry';put('entry.generated.ts',entry);put('bundle.js','synthetic bundle');
 const artifactBytes=readFileSync(join(out,'artifact/package/fesm2022/a.mjs'));
 let rows=[{key:'artifact/package/fesm2022/a.mjs',origin:'artifact',path:'package/fesm2022/a.mjs',sha256:sha(artifactBytes),bytes:artifactBytes.length},{key:'testing/legacy-runner/out/entry.generated.ts',origin:'generated',path:'entry.generated.ts',sha256:sha(entry),bytes:Buffer.byteLength(entry)}];
 for(const p of Object.keys(peers)){const path=relative(modules,join(peer,p)), bytes=readFileSync(join(peer,p));rows.push({key:'node_modules/'+path,origin:'dependency',path,sha256:sha(bytes),bytes:bytes.length});}
 const sourcePath='projects/ngx-material-legacy/package.json',sourceBytes=readFileSync(join(root,sourcePath));rows.push({key:sourcePath,origin:'source',path:sourcePath,sha256:sha(sourceBytes),bytes:sourceBytes.length});
 const graph=()=>{put('metafile.json',{inputs:Object.fromEntries(rows.map(r=>[r.key,{}]))});put('bundle-inputs.json',{schema_version:1,inputs:rows});};graph();
 let obs={schema_version:1,kind:'typeahead-execution',sha:TYPEAHEAD_SHA,run_id:run.run_id,line:'main',invocation_id:typeInv,binding,library:{sha256:library.sha256,bytes:library.bytes},peer_version:'22.1.7',peer_members:peers,extracted_files:1,inputs_unchanged:true,files,selected_cases:selected,counts:totals};
 function request(){write(join(dir,'observation.json'),obs);const b=readFileSync(join(dir,'observation.json'));return {line:'main',runId:run.run_id,runDir,binding,packedConsumerExecution:{run_id:run.run_id,invocation_id:packedInv,exit_code:0},typeaheadExecution:{run_id:run.run_id,invocation_id:typeInv,exit_code:0,output:{path:`evidence/typeahead-execution/${typeInv}/observation.json`,sha256:sha(b),bytes:b.length}}};}
 const req=typeaheadBehaviorRequirements(TYPEAHEAD_SHA,'main'),proof={proof_kind:TYPEAHEAD_KIND,diff_sha256:req.patch,affected_branches:['main'],reachable_behavior:{kind:'executed-delegation',id:'public-list-menu-select-typeahead'},typeahead_behavior:{kind:req.kind,case_ids:req.case_ids}};
 const replay=(provided=request())=>spawnSync(process.execPath,[join(root,'scripts/revalidate-typeahead.mjs')],{input:JSON.stringify({root,request:provided}),encoding:'utf8'});
 const check=(provided)=>{const r=replay(provided);return r.status===0?JSON.parse(r.stdout):{ok:false,detail:r.stderr};};
 write(join(runDir,'run.json'),run);assert.deepEqual(check().ok,true,JSON.stringify(check()));
 const driftProbe = `import {readFileSync,writeFileSync} from 'node:fs';
 import {pathToFileURL} from 'node:url';
 const [modulePath,root,checker] = process.argv.slice(1);
 const loaded = await import(pathToFileURL(modulePath));
 const before=readFileSync(checker);
 try { writeFileSync(checker,Buffer.concat([before,Buffer.from('\\n// after module load\\n')]));
   const result=loaded.validateTypeaheadBehavior({root});
   if(result.ok || !result.detail.includes('validated input changed')) throw Error(JSON.stringify(result));
 } finally {writeFileSync(checker,before);}`;
 const drift=spawnSync(process.execPath,['--input-type=module','-e',driftProbe,join(root,'scripts/upstream-typeahead-evidence.mjs'),root,join(root,'scripts/revalidate-typeahead.mjs')],{encoding:'utf8'});
 assert.equal(drift.status,0,drift.stderr);
 let replayed=replay();assert.equal(replayed.status,0,replayed.stderr);const validation=JSON.parse(replayed.stdout);assert.equal(validation.ok,true);
 const inventory=new Map(validation.validated_files.map(row=>[row.path,row]));
 for(const path of [sourcePath,'scripts/revalidate-typeahead.mjs','scripts/upstream-typeahead-evidence.mjs','scripts/typeahead-run-projection.mjs','scripts/upstream-packed-run-evidence.mjs','scripts/packed-consumer-evidence.mjs','compatibility/rc/matrices/library-exports.json','scripts/run-typeahead-execution.py']) assert.ok(inventory.has(path),path);
 for(const p of Object.keys(peers)) assert.equal(inventory.get('node_modules/'+relative(modules,join(peer,p))).sha256,peers[p]);
 assert.equal(inventory.get(sourcePath).sha256,sha(sourceBytes));
 assert.equal(inventory.size,validation.validated_files.length);
 run.execution_record={path:'execution-record.json',sha256:'e'.repeat(64),bytes:10};write(join(runDir,'run.json'),run);assert.equal(check().ok,true);
 Object.assign(run,{stage:'sealed',finished_at:'then',reports:[],preseal_manifest_sha256:'f'.repeat(64),evidence_files:[]});write(join(runDir,'run.json'),run);assert.equal(check().ok,true);
 const old=run.source.content_sha256;run.source.content_sha256='z'.repeat(64);write(join(runDir,'run.json'),run);assert.equal(check().ok,false);run.source.content_sha256=old;write(join(runDir,'run.json'),run);
 const source=join(root,sourcePath);write(source,'changed');assert.equal(check().ok,false);writeFileSync(source,sourceBytes);
 const dependency=join(peer,Object.keys(peers)[0]),dependencyBytes=readFileSync(dependency);writeFileSync(dependency,'changed');assert.equal(check().ok,false);writeFileSync(dependency,dependencyBytes);
 rows[0].sha256='0'.repeat(64);graph();assert.equal(check().ok,false);assert.notEqual(replay().status,0);rows[0].sha256=sha(artifactBytes);graph();
 rows[2].sha256='0'.repeat(64);graph();assert.equal(check().ok,false);rows[2].sha256=peers[Object.keys(peers)[0]];graph();
 raw.specs[0].success=false;put('raw-report.json',raw);assert.equal(check().ok,false);raw.specs[0].success=true;put('raw-report.json',raw);
 raw.specs[0].skipped=true;put('raw-report.json',raw);assert.equal(check().ok,false);raw.specs[0].skipped=false;put('raw-report.json',raw);
 const badRequest=request();badRequest.typeaheadExecution.exit_code=1;assert.equal(check(badRequest).ok,false);
 assert.equal(check().ok,true);console.log('Complete synthetic typeahead validator: positive and corruption checks passed.');
} finally {process.env.PATH=oldPath;rmSync(out,{recursive:true,force:true});}
