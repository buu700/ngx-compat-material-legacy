/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync, realpathSync, readdirSync, lstatSync} from 'node:fs';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {typeaheadRunDigest} from './typeahead-run-projection.mjs';
import {readEvidenceMember, validatePackedConsumerRun} from './upstream-packed-run-evidence.mjs';

export const TYPEAHEAD_SHA = 'ff36c80f9c7a14f0e9f36eafc3e1423d34e7c916';
export const TYPEAHEAD_KIND = 'packed-required-individual-public-typeahead';
const PRODUCER = '8881c99409fac3b0ef9f49b6b964c1b99b349d9ba907d9119564fda3d099ad44';
const PATCH = 'bc2fea20f0eb151177ebf5e93853294c61f03c6cd9ff0b8630fd2ab471b005c1';
const PEERS = {'fesm2022/_list-key-manager-chunk.mjs':'63042ad0a8264bfedfaac1c03d2b0eee450bcd7890a09792dc83256195e00057','fesm2022/_typeahead-chunk.mjs':'c26eed04140a44b175020b75b3a16bf73c2913a064ae61c79dc744d5fa3e4622'};
const FIXTURES = {
 'compatibility/rc/typeahead-fixture/legacy-list/selection-list.spec.ts':'5f054aa0006cb252bec9e1a919d52d425a07a7845735f2b7b21f8e9f7316911d',
 'compatibility/rc/typeahead-fixture/legacy-menu/menu.spec.ts':'5ac09824120ecdec80e24cee8597128576b56483a3029218fd2b2b010f77cacc',
 'compatibility/rc/typeahead-fixture/legacy-select/select.spec.ts':'bfd20552594bda7081f024141ac2817f8fbe0a3a3dae07fd97aa4c2b3e4aa3f1',
 'compatibility/rc/typeahead-runner/build.mjs':'d83279e8899b09cfe0241d5c392f71c452c99385db376e337e799ba8ffaec6a5',
 'compatibility/rc/typeahead-runner/historical-specs.json':'4ab1f9572aeeb711a37cc7ce45ae58a4aabd018c95cabbaa14f34f292136e83c',
 'compatibility/rc/typeahead-runner/karma.conf.cjs':'2cd99b2ea37543f7ea741861c07bce5b57e5a65555458f83965527b4ee604439',
};
export const TYPEAHEAD_CASES = Object.freeze([
'MatSelectionList without forms > with list option > should be able to jump focus down to an item by typing',
'MatSelectionList without forms > with list option > should not select items while using the typeahead',
'MatMenu > should route typeahead focus through the public menu keydown and skip disabled matches',
'MatMenu > should update menu typeahead targets after dynamic items change',
'MatSelect > core > accessibility > for select > should be able to select options by typing on a closed select',
'MatSelect > core > accessibility > for select > should skip a disabled option after the closed select options change during typeahead',
'MatSelect > core > accessibility > for select > should not open the select when pressing space while typing',
'MatSelect > core > accessibility > for select > should be able to customize the typeahead debounce interval',
'MatSelect > core > accessibility > for select > should cancel the typeahead selection on blur']);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const demand = (v, m) => {if (!v) throw Error(m);};
const json = b => JSON.parse(b.toString());
const record = (root, path, item) => {
 demand(item && /^[a-f0-9]{64}$/.test(item.sha256) && Number.isSafeInteger(item.bytes) && item.bytes > 0, 'invalid evidence identity');
 const bytes=readEvidenceMember(root,path); demand(bytes.length===item.bytes && hash(bytes)===item.sha256,'evidence bytes mismatch'); return bytes;
};
const CHECKERS = ['scripts/revalidate-typeahead.mjs','scripts/upstream-typeahead-evidence.mjs','scripts/typeahead-run-projection.mjs','scripts/upstream-packed-run-evidence.mjs','scripts/packed-consumer-evidence.mjs','compatibility/rc/matrices/library-exports.json'];
const checkerRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Bind the loaded checker images at module initialization. This detects ordinary
// drift under trusted exclusive ownership, not continuous hostile replacement.
const checkerImages = new Map(CHECKERS.map(path => [path, hash(readEvidenceMember(checkerRoot,path))]));
const totals = {executed:496,passed:9,failed:0,skipped:487};
// The build plugin and TypeScript compiler read inputs outside esbuild's graph.
// Bind their entire staged source trees as well as every resolved graph member.
function snapshot(root, relative) {
 const result = {};
 function visit(dir, parts) {
  for (const name of readdirSync(dir).sort()) {
   if (name === 'out') continue;
   const path=join(dir,name), next=[...parts,name], stat=lstatSync(path);
   if (stat.isSymbolicLink()) continue;
   if (stat.isDirectory()) visit(path,next);
   else if (stat.isFile()) result[next.join('/')]=hash(readFileSync(path));
  }
 }
 visit(join(root,relative),[]); return result;
}
export function typeaheadBehaviorRequirements(sha,line) {
 return sha===TYPEAHEAD_SHA && line==='main' ? {sha,patch:PATCH,kind:'public-list-menu-select-typeahead',case_ids:[...TYPEAHEAD_CASES]} : null;
}
export function validateTypeaheadResults(raw, runId, artifactSha, observation) {
 demand(raw.subject_mode==='artifact' && raw.mode==='normal' && raw.run_id===runId && raw.artifact_sha256===artifactSha && isDeepStrictEqual(raw.totals,totals) && Array.isArray(raw.specs) && raw.specs.length===496 && raw.specs.every(row=>row && typeof row.skipped==='boolean') && isDeepStrictEqual(raw.failures,[]),'wrong raw typeahead report');
 const selected=raw.specs.filter(row=>row.skipped===false);
 demand(isDeepStrictEqual(selected.map(row=>row.full_name),TYPEAHEAD_CASES) && selected.every(row=>row.success===true) && TYPEAHEAD_CASES.every(name=>raw.specs.filter(row=>row.full_name===name).length===1) && isDeepStrictEqual(observation.selected_cases,selected) && isDeepStrictEqual(observation.counts,totals),'missing, failed, skipped or duplicate typeahead case');
}
export function validateTypeaheadBehavior({root,entry,proof,request,line}) {
 try {
  demand(realpathSync(root)===realpathSync(checkerRoot), 'checker image root differs from requested repository');
  const identities = new Map();
  function remember(path, expected) {
   const bytes=readEvidenceMember(root,path), digest=hash(bytes);
   demand(!expected || digest===expected, 'validated input changed: '+path);
   const row={root:'repository',path,sha256:digest,bytes:bytes.length};
   demand(bytes.length>0 && (!identities.has(path) || isDeepStrictEqual(identities.get(path),row)), 'invalid or changed validated input');
   identities.set(path,row);
  }
  function physical(path, expected) {
   const resolved=realpathSync(path), rel=relative(realpathSync(root),resolved).split(sep).join('/');
   demand(rel.startsWith('node_modules/') && !rel.split('/').includes('..'), 'dependency outside repository node_modules');
   remember(rel,expected);
  }
  for(const [path,digest] of checkerImages) remember(path,digest);
  const req=typeaheadBehaviorRequirements(entry?.sha,line);
  demand(req && request?.line==='main' && proof?.proof_kind===TYPEAHEAD_KIND && proof.diff_sha256===PATCH && isDeepStrictEqual(proof.affected_branches,['main']) && proof.reachable_behavior?.kind==='executed-delegation' && proof.reachable_behavior.id==='public-list-menu-select-typeahead' && isDeepStrictEqual(proof.typeahead_behavior,{kind:req.kind,case_ids:req.case_ids}), 'wrong typeahead proof');
  const runtime=validatePackedConsumerRun({root,request}); demand(runtime.ok,runtime.detail);
  demand(hash(readEvidenceMember(root,'scripts/run-typeahead-execution.py'))===PRODUCER,'changed typeahead producer');
  for(const [path,digest] of Object.entries(FIXTURES)) demand(hash(readEvidenceMember(root,path))===digest,'changed reviewed typeahead fixture');
  const peer=realpathSync(join(root,'node_modules/@angular/cdk'));
  demand(json(readFileSync(join(peer,'package.json'))).version==='22.1.7','wrong installed peer version');
  for(const [path,digest] of Object.entries(PEERS)) demand(hash(readEvidenceMember(peer,path))===digest,'stale peer bytes');
  const execution=request.typeaheadExecution;
  demand(execution?.run_id===request.runId && execution.exit_code===0 && /^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(execution.invocation_id),'missing successful typeahead coordinator execution');
  const prefix=`evidence/typeahead-execution/${execution.invocation_id}/`, output=execution.output;
  demand(output?.path===prefix+'observation.json','wrong typeahead output ownership');
  const obs=json(record(request.runDir,output.path,output));
  demand(obs.schema_version===1 && obs.kind==='typeahead-execution' && obs.sha===TYPEAHEAD_SHA && obs.line==='main' && obs.run_id===request.runId && obs.invocation_id===execution.invocation_id && isDeepStrictEqual(obs.binding,request.binding) && isDeepStrictEqual(obs.library,runtime.library) && obs.peer_version==='22.1.7' && isDeepStrictEqual(obs.peer_members,PEERS) && obs.inputs_unchanged===true && Number.isSafeInteger(obs.extracted_files) && obs.extracted_files>0,'wrong typeahead observation');
  const names=['raw-report.json','commands.json','inputs-before.json','metafile.json','bundle.js','bundle-inputs.json','entry.generated.ts'];
  demand(isDeepStrictEqual(Object.keys(obs.files??{}).sort(),[...names].sort()),'incomplete typeahead evidence');
  const files=Object.fromEntries(names.map(name=>[name,record(request.runDir,prefix+name,obs.files[name])]));
  const initial=json(files['inputs-before.json']); demand(initial.producer===PRODUCER && initial.artifact===runtime.library.sha256 && isDeepStrictEqual(initial.peer,PEERS) && initial.peer_manifest===hash(readFileSync(join(peer,'package.json'))) && initial.manifest===typeaheadRunDigest(json(readEvidenceMember(request.runDir,'run.json'))),'wrong producer input snapshot');
  remember('scripts/run-typeahead-execution.py',PRODUCER);
  for(const [path,digest] of Object.entries(FIXTURES)) remember(path,digest);
  physical(join(peer,'package.json'),initial.peer_manifest);
  for(const [path,digest] of Object.entries(PEERS)) physical(join(peer,path),digest);
  for(const [key,path] of Object.entries({fixture:'compatibility/rc/typeahead-fixture',runner:'compatibility/rc/typeahead-runner',base_runner:'testing/legacy-runner',project:'projects/ngx-material-legacy'}))
   {demand(isDeepStrictEqual(initial[key],snapshot(root,path)),'changed producer source tree: '+key);
    for(const [name,digest] of Object.entries(initial[key])) remember(path+'/'+name,digest);}
  const raw=json(files['raw-report.json']);
  validateTypeaheadResults(raw,request.runId,runtime.library.sha256,obs);
  const log=json(files['commands.json']); demand(Array.isArray(log) && log.length===3 && log.every(row=>row.exit_code===0) && log[0].command?.[1]==='testing/legacy-runner/build.mjs' && log[1].command?.[1]==='testing/legacy-runner/build.mjs' && log[2].command?.[1]==='node_modules/karma/bin/karma','wrong typeahead command sequence');
  const meta=json(files['metafile.json']), inputs=json(files['bundle-inputs.json']);
  demand(inputs.schema_version===1 && Array.isArray(inputs.inputs) && isDeepStrictEqual(inputs.inputs.map(row=>row.key),Object.keys(meta.inputs)) && inputs.inputs.length>0,'incomplete bundle input graph');
  const run=json(readEvidenceMember(request.runDir,'run.json')); const lib=run.artifacts.find(x=>x.id==='library');
  const tar=resolve(request.runDir,lib.path);
  const members=execFileSync('tar',['-tzf',tar],{encoding:'utf8',maxBuffer:32*1024*1024}).trimEnd().split('\n');
  demand(members.length>0 && new Set(members).size===members.length && members.every(name=>name.startsWith('package/') && !name.split('/').includes('..')),'unsafe or duplicate artifact members');
  let seenArtifact=false, seenGenerated=false;
  for(const row of inputs.inputs) {
   demand(typeof row.key==='string' && typeof row.path==='string' && !row.path.includes('\\\\') && row.path.split('/').every(x=>x && x!=='.' && x!=='..') && /^[a-f0-9]{64}$/.test(row.sha256) && Number.isSafeInteger(row.bytes) && row.bytes>0,'invalid bundle input identity');
   let bytes;
   if(row.origin==='source'||row.origin==='fixture') {
    const fixturePrefix='projects/ngx-material-legacy/', runnerPrefix='testing/legacy-runner/';
    let expected;
    if(row.key.startsWith(fixturePrefix)) {const relative=row.key.slice(fixturePrefix.length); expected=Object.hasOwn(FIXTURES,'compatibility/rc/typeahead-fixture/'+relative) ? 'compatibility/rc/typeahead-fixture/'+relative : row.key;}
    else if(row.key.startsWith(runnerPrefix)) {const relative=row.key.slice(runnerPrefix.length); expected=Object.hasOwn(FIXTURES,'compatibility/rc/typeahead-runner/'+relative) ? 'compatibility/rc/typeahead-runner/'+relative : row.key;}
    demand(row.path===expected && (row.origin==='fixture')===row.path.startsWith('compatibility/rc/typeahead-fixture/'),'wrong staged source mapping');bytes=readEvidenceMember(root,row.path);
   } else if(row.origin==='dependency') {demand(row.key.endsWith('/'+row.path),'wrong dependency mapping');bytes=readEvidenceMember(realpathSync(join(root,'node_modules')),row.path);}
   else if(row.origin==='generated') {demand(row.path==='entry.generated.ts' && row.key==='testing/legacy-runner/out/entry.generated.ts' && !seenGenerated,'invalid generated entry');seenGenerated=true;bytes=files[row.path];}
   else if(row.origin==='artifact') {demand(row.key==='artifact/'+row.path && row.path.startsWith('package/'),'invalid artifact input');seenArtifact=true;bytes=execFileSync('tar',['-xOf',tar,row.path],{maxBuffer:32*1024*1024});}
   else throw Error('unknown bundle input origin');
   demand(bytes.length===row.bytes && hash(bytes)===row.sha256,'stale bundle input');
   if(row.origin==='source'||row.origin==='fixture') remember(row.path,row.sha256);
   if(row.origin==='dependency') physical(join(realpathSync(join(root,'node_modules')),row.path),row.sha256);
  }
  demand(seenArtifact && seenGenerated && Object.keys(PEERS).every(path=>inputs.inputs.some(row=>row.origin==='dependency' && row.path.endsWith('@angular/cdk/'+path) && row.sha256===PEERS[path])),'missing bundle artifact or peers');
  for(const [path,digest] of checkerImages) remember(path,digest);
  return {ok:true,detail:'Nine focused public typeahead cases passed against the bound packed artifact; no floor, line coverage or G11 claim.',invocation_id:execution.invocation_id,output,library:runtime.library,required_cases:[...TYPEAHEAD_CASES],validated_files:[...identities.values()].sort((a,b)=>a.path.localeCompare(b.path))};
 } catch(error) {return {ok:false,detail:error.message};}
}
