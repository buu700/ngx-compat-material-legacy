/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact tool literals only. Comparison bytes never form a current public reader. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync,realpathSync,existsSync} from 'node:fs';
import {currentSassToolReferenceSubject} from './current-sass-tool-references.mjs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {readHistoricalContractRepairMember} from './historical-contract-repair-source.mjs';
const SELF='scripts/historical-contract-repair-readers.mjs',INPUTS='compatibility/rc/historical-contract-repair-reader-inputs.json';
const PINS={'21.x':'655b4e39694b5452767604de5c2ce4bb0c0f28ab9632dd82ae390e039964f2d8',main:'8ba8b2652be4ddcff5d7ee1881f351e83922f8a778c1b318434652f833a89e4d'};
const image=readFileSync(fileURLToPath(import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex'),originals=new Map();
/** Declared peer aliases retain their historical package identity and no-link guards. */
export function readHistoricalContractRepairOwnerMember(root,path){
 const peer=path.match(/^projects\/ngx-material-legacy\/node_modules\/@angular\/(material|cdk)\/(.+)$/);
 const metadata=path.match(/^projects\/ngx-material-legacy\/node_modules\/(@angular\/(?:core|common|forms)|rxjs)\/(package\.json|operators\/package\.json)$/);
 if(peer||metadata){
  if(metadata)assert.ok(metadata[2]==='package.json'||metadata[1]==='rxjs');
  const name=peer?'@angular/'+peer[1]:metadata[1];
  let file=realpathSync(join(root,'projects/ngx-material-legacy/node_modules',name));
  assert.equal(file,realpathSync(join(root,'node_modules',name)),'workspace peer differs from the declared root peer');
  if(metadata){
   const manifest=join(file,'package.json');assert.equal(lstatSync(manifest).isSymbolicLink(),false);
   assert.equal(JSON.parse(readFileSync(manifest)).name,name,'wrong workspace peer manifest identity');
  }
  for(const part of (peer?peer[2]:metadata[2]).split('/')){
   assert.ok(part&&part!=='.'&&part!=='..'&&!part.includes('\\'));file=join(file,part);assert.equal(lstatSync(file).isSymbolicLink(),false);
  }
  assert.ok(lstatSync(file).isFile());return readFileSync(file);
 }
 // The source resolver's root Core manifest has the same identity requirement.
 if(path==='node_modules/@angular/core/package.json'){
  const bytes=readHistoricalContractRepairMember(root,path);assert.equal(JSON.parse(bytes).name,'@angular/core','wrong root peer manifest identity');return bytes;
 }
 const sass=path.match(/^node_modules\/sass\/(package\.json|sass\.node\.js|sass\.dart\.js)$/);
 if(sass){
  const modules=join(root,'node_modules');assert.ok(lstatSync(modules).isDirectory()&&!lstatSync(modules).isSymbolicLink());
  const expected=JSON.parse(readEvidenceMember(root,'package.json')).devDependencies.sass;assert.match(expected,/^\d+\.\d+\.\d+$/);
  const directory=realpathSync(join(modules,'sass')),manifest=join(directory,'package.json');
  assert.ok(lstatSync(manifest).isFile()&&!lstatSync(manifest).isSymbolicLink());
  const identity=JSON.parse(readFileSync(manifest));assert.equal(identity.name,'sass');assert.equal(identity.version,expected);
  const file=join(directory,sass[1]);assert.ok(lstatSync(file).isFile()&&!lstatSync(file).isSymbolicLink());return readFileSync(file);
 }
 const compiler=path.match(/^node_modules\/@angular\/compiler-cli\/(.+)$/);
 if(compiler){
  let file=realpathSync(join(root,'node_modules/@angular/compiler-cli'));
  for(const part of compiler[1].split('/')){assert.ok(part&&part!=='.'&&part!=='..');file=join(file,part);assert.equal(lstatSync(file).isSymbolicLink(),false);}
  assert.ok(lstatSync(file).isFile());return readFileSync(file);
 }
 return readHistoricalContractRepairMember(root,path);
}
function original(root,parent,path){
 assert.match(parent,/^[0-9a-f]{40}$/);const key=JSON.stringify([root,parent,path]);
 if(!originals.has(key)){
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
  originals.set(key,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:2*1024*1024}));
 }return Buffer.from(originals.get(key));
}
/** Maintained callers explicitly select the pinned current tool successor when installed. */
export function historicalContractRepairReaderSubject(args={}){
 const root=resolve(args.root??process.cwd());
 if(existsSync(join(root,'compatibility/rc/current-sass-tool-reference-inputs-v1.json')))return currentSassToolReferenceSubject(args);
 return historicalContractRepairFrozenReaderSubject(args);
}
export function historicalContractRepairFrozenReaderSubject({root=process.cwd(),read=path=>readHistoricalContractRepairOwnerMember(root,path)}={}){
 root=resolve(root);const bound=new Map();
 // This final pass invokes only trusted filesystem reads, never the supplied callback.
 const assertPhysicalCurrent=()=>{for(const ref of bound.values()){const actual=readEvidenceMember(root,ref.path);assert.equal(hash(actual),ref.sha256,'late physical repaired reader input '+ref.path);assert.equal(actual.length,ref.bytes);}};
 const member=(path,expected)=>{
  const actual=readEvidenceMember(root,path),provided=read(path);assert.ok(Buffer.isBuffer(provided)&&actual.equals(provided),'nonphysical repaired reader input '+path);
  assert.ok(actual.equals(readEvidenceMember(root,path)),'repaired reader input changed during callback '+path);
  const ref={path,sha256:hash(actual),bytes:actual.length};if(expected){assert.equal(ref.sha256,expected.sha256,'changed repaired reader member '+path);if(expected.bytes!==undefined)assert.equal(ref.bytes,expected.bytes);}
  if(bound.has(path))assert.deepEqual(ref,bound.get(path));else bound.set(path,ref);return actual;
 };
 const version=JSON.parse(member('projects/ngx-material-legacy/package.json')).version,line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);
 const raw=member(INPUTS,{sha256:PINS[line]}),data=JSON.parse(raw);assert.equal(data.schema_version,1);assert.equal(data.line,line);
 assert.equal(data.canonical_dispositions_changed,0);assert.equal(data.product_changes,0);assert.equal(data.old_programs_executed,false);assert.equal(data.actual_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(data.g11_claim,'not-passed');
 member(SELF,{sha256:hash(image),bytes:image.length});member(data.unchanged_source_subject.path,data.unchanged_source_subject);
 const intermediate=new Map(),sourceLanes=data.extension_kind==='packed-owner-source-lanes',c04=data.extension_kind==='spinner-snack-c04-source',gate=data.gate_tool_successor;
 if(gate)assert.equal(c04,true);
 if(c04){
  const ref=data.prior_reader_registry,pins={'21.x':{sha256:'577d690ecdad79da270dda15a73649c519e5f9444f9e0a0739d94aecefa45a90',bytes:172038},main:{sha256:'702d6f65109297515ee1fc57810eaf8fe0a9f7148742ff8572d90824d57b2944',bytes:29767}};
  assert.equal(ref.path,INPUTS);assert.equal(ref.sha256,pins[line].sha256);assert.equal(ref.bytes,pins[line].bytes);
  const raw=original(root,ref.source_parent,INPUTS);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);
  const prior=JSON.parse(raw),count=line==='21.x'?17:7;assert.equal(prior.line,line);assert.equal(prior.source_parent,data.source_parent);assert.equal(prior.tool_transitions.length,count);
  assert.deepEqual(data.tool_transitions.slice(0,count),prior.tool_transitions,'prior tool transitions changed');
  const scope=data.c04_source_successor;assert.equal(scope.historical_owned_scss_rows,409);assert.equal(scope.old_product_read_callback,false);assert.equal(scope.historical_report_rewrites,0);assert.equal(scope.historical_boundaries,4);assert.equal(scope.current_boundaries,6);assert.equal(scope.ordinary_all_legacy_companions,13);
  assert.deepEqual(scope.physical_product_paths,['projects/ngx-material-legacy/styles/progress-spinner/_progress-spinner-theme.scss','projects/ngx-material-legacy/styles/snack-bar/_snack-bar-theme.scss']);
  const end=count+scope.added_tool_paths.length;assert.deepEqual(data.tool_transitions.slice(count,end).map(row=>row.path),scope.added_tool_paths);
  for(const row of data.tool_transitions.slice(count,end))assert.equal(row.source_parent,ref.source_parent);
  assert.deepEqual(data.support_inputs.map(r=>r.path),['scripts/sass-spinner-snack-c04-source.mjs','scripts/sass-spinner-snack-bridge-contract.mjs',...(gate?['scripts/sass-spinner-snack-gate-integration.mjs','scripts/sass_spinner_snack_gate_integration.py']:[])]);for(const input of data.support_inputs)member(input.path,input);
  if(line==='21.x'){
   const previous=prior.prior_reader_registry,oldRaw=original(root,previous.source_parent,INPUTS);assert.equal(hash(oldRaw),previous.sha256);assert.equal(oldRaw.length,previous.bytes);
   const epoch=JSON.parse(oldRaw).tool_transitions.find(r=>r.path==='scripts/packed-upstream-ledger-epoch.mjs');assert.equal(epoch.after.sha256,'34a8c062367debddf81a5112be37e4aa603e4a3c6b9c8e5c7c34144995d62669');
   const bytes=original(root,previous.source_parent,epoch.path);assert.equal(hash(bytes),epoch.after.sha256);assert.equal(bytes.length,epoch.after.bytes);intermediate.set(epoch.path,{reference:{...epoch.after},bytes});
  }
 }
 if(gate){
  const pin={"21.x":{"sha256":"a16f2e253cb34efb9963eadcf921977f2d8464c468797faad5c2dca580b13f35","bytes":333345,"source_parent":"af07cb6311c960de054dcf16e2d29ad65f6138f5"},"main":{"sha256":"ab76e4170d669a5f7cea18ffcd33d91b05c954572ae96ad65ca9158f5dea9a14","bytes":67365,"source_parent":"99aa39254e87bd215d2f3ed7d6821236e9bb483d"}}[line],ref=gate.prior_reader_registry;
  assert.deepEqual(ref,{path:INPUTS,...pin});const raw=original(root,ref.source_parent,INPUTS);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);
  const prior=JSON.parse(raw),count=line==='21.x'?39:11;assert.equal(prior.tool_transitions.length,count);assert.equal(prior.extension_kind,'spinner-snack-c04-source');assert.equal(prior.gate_tool_successor,undefined);
  assert.deepEqual(data.c04_source_successor,prior.c04_source_successor);assert.deepEqual(data.prior_reader_registry,prior.prior_reader_registry);const support=gate.rolled_forward_c04_support;assert.equal(support.path,'scripts/sass-spinner-snack-c04-source.mjs');assert.equal(support.source_parent,ref.source_parent);assert.deepEqual(support.before,prior.support_inputs[0]);assert.deepEqual(support.after,data.support_inputs[0]);assert.deepEqual(data.support_inputs[1],prior.support_inputs[1]);
  const supportBefore=original(root,support.source_parent,support.path);assert.equal(hash(supportBefore),support.before.sha256);assert.equal(supportBefore.length,support.before.bytes);let supportText=supportBefore.toString();assert.ok(support.literal_edits.length>0);for(const edit of support.literal_edits){assert.equal(supportText.split(edit.before).length,2);supportText=supportText.replace(edit.before,edit.after);}assert.equal(hash(supportText),support.after.sha256);assert.equal(Buffer.byteLength(supportText),support.after.bytes);
  const paths=['scripts/sass-seal.mjs','scripts/sass-api-inventory.mjs','scripts/sass-mixin-arguments.mjs','scripts/sass_mixin_argument_admission.py','scripts/rc-verify.py','scripts/sass-api-regressions.mjs'];assert.deepEqual(gate.added_tool_paths,paths);assert.deepEqual(data.tool_transitions.slice(count).map(row=>row.path),paths);assert.equal(data.tool_transitions.length,count+6);
  for(const row of data.tool_transitions.slice(count))assert.equal(row.source_parent,ref.source_parent);
  for(let i=0;i<count;i++){
   const old=prior.tool_transitions[i],next=data.tool_transitions[i];
   if(line==='21.x'&&old.path==='tests/test_historical_contract_repair_source.py'){
    const proof=gate.rolled_forward_test;assert.equal(proof.path,old.path);assert.equal(proof.source_parent,ref.source_parent);assert.deepEqual(proof.before,old.after);assert.deepEqual(proof.after,next.after);
    assert.deepEqual(next.literal_edits.slice(0,old.literal_edits.length),old.literal_edits);assert.deepEqual(next.literal_edits.slice(old.literal_edits.length),proof.literal_edits);assert.deepEqual({...next,after:old.after,literal_edits:old.literal_edits},old);
    const before=original(root,proof.source_parent,proof.path);assert.equal(hash(before),proof.before.sha256);assert.equal(before.length,proof.before.bytes);let text=before.toString();assert.equal(proof.literal_edits.length,2);for(const edit of proof.literal_edits){assert.equal(text.split(edit.before).length,2);text=text.replace(edit.before,edit.after);}assert.equal(hash(text),proof.after.sha256);assert.equal(Buffer.byteLength(text),proof.after.bytes);
   }else assert.deepEqual(next,old,'unrelated C04 predecessor row changed');
  }
  if(line==='main')assert.equal(gate.rolled_forward_test,null);
  assert.equal(gate.old_reports_rewritten,0);assert.equal(gate.old_product_reader,false);assert.equal(gate.canonical_dispositions_changed,0);assert.equal(gate.current_artifact_or_rendering_qualified,false);
 }
 if(data.prior_reader_registry&&!c04){
  const packed=data.extension_kind==='packed-source',ledger=data.extension_kind==='ledger-reader',roster=data.extension_kind==='roster-reader',cva=data.extension_kind==='cva-reader',owner=data.extension_kind==='current-owner-reader',portal=data.extension_kind==='portal-reader',title=data.extension_kind==='title-measurement-reader';if(!packed&&!ledger&&!roster&&!cva&&!owner&&!portal)assert.equal(line,'21.x');const priorRef=data.prior_reader_registry;assert.equal(priorRef.path,INPUTS);
  const priorBytes=original(root,priorRef.source_parent,priorRef.path);assert.equal(hash(priorBytes),priorRef.sha256);assert.equal(priorBytes.length,priorRef.bytes);
  const prior=JSON.parse(priorBytes);assert.equal(prior.line,line);assert.equal(prior.source_parent,data.source_parent);assert.equal(prior.tool_transitions.length,sourceLanes?15:title?15:(owner||portal)?(line==='21.x'?14:6):(roster||cva)?(line==='21.x'?13:5):ledger?(line==='21.x'?12:3):packed?(line==='21.x'?11:2):9);
  const oldPaths=new Set(prior.tool_transitions.map(row=>row.path));assert.deepEqual(data.tool_transitions.filter(row=>!oldPaths.has(row.path)).map(row=>row.path),sourceLanes?['scripts/packed-upstream-ledger-base.mjs','scripts/checker-reference-metadata.mjs']:title?[]:portal?['scripts/dialog-portal-failure-recovery.mjs']:owner?[]:cva?['scripts/packed-cva-source-requalification.mjs']:roster?[]:ledger?(line==='main'?['scripts/inventory-reference-owner.mjs','scripts/browser-owner-source.mjs']:['scripts/inventory-reference-owner.mjs']):packed?['scripts/packed-product-source-recovery.mjs']:['scripts/packed-upstream-ledger-epoch.mjs','scripts/canonical-tool-source-role.mjs']);
  for(const row of prior.tool_transitions){const next=data.tool_transitions.find(item=>item.path===row.path);assert.ok(next);assert.deepEqual(next.before,row.before);
   if(sourceLanes&&row.path==='scripts/packed-upstream-ledger-epoch.mjs'){
    assert.deepEqual(next.literal_edits.slice(0,row.literal_edits.length),row.literal_edits);assert.deepEqual({...next,after:row.after,literal_edits:row.literal_edits},row);
    const bytes=original(root,priorRef.source_parent,row.path);assert.equal(hash(bytes),row.after.sha256);assert.equal(bytes.length,row.after.bytes);intermediate.set(row.path,{reference:{...row.after},bytes});
   }else if(!sourceLanes&&!ledger&&row.path===(title?'scripts/inventory-reference-owner.mjs':cva?'scripts/dialog-title-source-context.mjs':(packed||roster||owner||portal)?'scripts/snack-dom-source-context.mjs':'tests/table_local_compilation_owner_source.py'))assert.deepEqual(next.literal_edits.slice(0,row.literal_edits.length),row.literal_edits);
   else assert.deepEqual(next,row,'unrelated earlier reader transition changed');
  }
  if(sourceLanes){for(const[path,digest]of [['scripts/packed-upstream-ledger-base.mjs','ee74d3c46ae056f4ffd16cc1d38d60820ca449d96158c776319a2bfcbc6fc715'],['scripts/checker-reference-metadata.mjs','1fd8883f7f8872cab67003b355b140020c49ed7ce0422660c7ec51460d14b1ea']]){const row=data.tool_transitions.find(row=>row.path===path);assert.equal(row.source_parent,priorRef.source_parent);assert.equal(row.before.sha256,digest);}}
 }
 const transitions=new Map();
 for(const row of data.tool_transitions){
  assert.ok(/^(?:scripts\/[^/]+\.(?:mjs|cjs)|tests\/[^/]+\.(?:py|mjs))$/.test(row.path)||(gate&&['scripts/sass_mixin_argument_admission.py','scripts/rc-verify.py'].includes(row.path)),'non-tool reader transition');assert.equal(transitions.has(row.path),false);
  const before=original(root,row.source_parent??data.source_parent,row.path);assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);
  let expected=before.toString();assert.ok(row.literal_edits.length>0);for(const edit of row.literal_edits){assert.equal(expected.split(edit.before).length,2,'ambiguous repaired reader literal '+row.path);expected=expected.replace(edit.before,edit.after);}
  assert.equal(hash(expected),row.after.sha256);assert.equal(Buffer.byteLength(expected),row.after.bytes);const after=member(row.path,row.after);assert.equal(after.toString(),expected);
  transitions.set(row.path,{before:{...row.before},after:{...row.after},beforeBytes:Buffer.from(before),afterBytes:Buffer.from(after)});
 }
 assert.equal(transitions.size,c04?(line==='21.x'?17:7)+data.c04_source_successor.added_tool_paths.length+(gate?6:0):line==='21.x'?(sourceLanes?17:15):7);
 const ownsReference=ref=>{const row=transitions.get(ref.path),middle=intermediate.get(ref.path)?.reference;return Boolean(row&&(ref.sha256===row.before.sha256||ref.sha256===row.after.sha256||(middle&&ref.sha256===middle.sha256)));};
 const side=(ref,target)=>{
  const path=ref.path,row=transitions.get(path);if(!row)return null;
  const middle=intermediate.get(path)?.reference;
  const prior=ref.sha256===row.before.sha256?row.before:ref.sha256===row.after.sha256?row.after:ref.sha256===middle?.sha256?middle:null;if(!prior)return null;
  if(ref.bytes!==undefined)assert.equal(ref.bytes,prior.bytes,'wrong repaired tool reference length');
  member(path,row.after);const result={...ref,path,sha256:row[target].sha256,...(ref.bytes===undefined?{}:{bytes:row[target].bytes})};assertPhysicalCurrent();return result;
 };
 const qualify=ref=>side(ref,'after'),predecessorReference=ref=>side(ref,'before');
 const comparisonBytes=incoming=>{const ref={...incoming};assert.ok(ownsReference(ref),'unsupported reader comparison');qualify(ref);const row=transitions.get(ref.path),middle=intermediate.get(ref.path);const result=Buffer.from(ref.sha256===middle?.reference.sha256?middle.bytes:ref.sha256===row.before.sha256?row.beforeBytes:row.afterBytes);assertPhysicalCurrent();return result;};
 const assertCurrent=()=>{for(const ref of bound.values())member(ref.path,ref);assertPhysicalCurrent();};
 const result={line,bound:structuredClone([...bound.values()]),transitions:structuredClone(data.tool_transitions.map(row=>({path:row.path,before:row.before,after:row.after}))),ownsReference,qualify,predecessorReference,comparisonBytes,assertCurrent,
  old_code_executed:false,old_product_bytes_exposed:false,old_tool_bytes_exposed_as_current:false,current_read_route_returned:false,canonical_admission_granted:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
 assertCurrent();return result;
}
