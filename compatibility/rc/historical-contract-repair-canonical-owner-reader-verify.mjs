/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite tool reference controls; no full canonical traversal. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {historicalContractRepairReaderSubject,readHistoricalContractRepairOwnerMember} from '../../scripts/historical-contract-repair-readers.mjs';
const root=process.cwd(),hash=b=>createHash('sha256').update(b).digest('hex'),mutations=new Map(),read=p=>mutations.get(p)??readHistoricalContractRepairOwnerMember(root,p),start=performance.now();
const tools=historicalContractRepairReaderSubject({root,read}),controls=[];
function rejects(name,action,pattern){assert.throws(action,pattern);controls.push({name,rejected:true});}
for(const row of tools.transitions){
 const before={path:row.path,...row.before,annotation:'retained'},after={path:row.path,...row.after,annotation:'retained'};
 assert.deepEqual(tools.qualify(before),after);assert.deepEqual(tools.qualify(after),after);assert.deepEqual(tools.predecessorReference(after),before);
 assert.equal(hash(tools.comparisonBytes(before)),row.before.sha256);assert.equal(hash(tools.comparisonBytes(after)),row.after.sha256);
 assert.equal(tools.ownsReference({...before,sha256:'0'.repeat(64)}),false);assert.equal(tools.qualify({...before,sha256:'0'.repeat(64)}),null);
 rejects('unsupported old tool comparison '+row.path,()=>tools.comparisonBytes({...before,sha256:'0'.repeat(64)}),/unsupported reader comparison/);
 rejects('incorrect tool byte count '+row.path,()=>tools.qualify({...before,bytes:row.before.bytes+1}),/wrong repaired tool reference length/);
}
assert.equal(tools.qualify({path:'projects/ngx-material-legacy/unselected.ts',sha256:'0'.repeat(64)}),null);
for(const path of ['compatibility/rc/historical-contract-repair-reader-inputs.json',tools.transitions[0].path]){
 mutations.set(path,Buffer.concat([readHistoricalContractRepairOwnerMember(root,path),Buffer.from('\n/* changed supplied reader */\n')]));
 rejects('cold altered reader '+path,()=>historicalContractRepairReaderSubject({root,read}),/nonphysical repaired reader input/);
 rejects('late altered reader '+path,()=>tools.assertCurrent(),/nonphysical repaired reader input/);mutations.clear();
}
const actualCompiler=fs.realpathSync(join(root,'node_modules/@angular/compiler-cli')),compilerFile=join(actualCompiler,'package.json'),saved=fs.lstatSync;
const compiler=readHistoricalContractRepairOwnerMember(root,'node_modules/@angular/compiler-cli/package.json');assert.ok(compiler.length>100);
fs.lstatSync=function(path,...rest){const value=saved.call(this,path,...rest);if(String(path)===compilerFile)value.isSymbolicLink=()=>true;return value;};syncBuiltinESMExports();
try{rejects('compiler-cli descendant symlink remains rejected',()=>readHistoricalContractRepairOwnerMember(root,'node_modules/@angular/compiler-cli/package.json'),/Expected values to be strictly equal/);}finally{fs.lstatSync=saved;syncBuiltinESMExports();}
tools.assertCurrent();
const producer='compatibility/rc/historical-contract-repair-canonical-owner-reader-verify.mjs',module='scripts/historical-contract-repair-readers.mjs';
const result={schema_version:1,line:tools.line,status:'finite tool transitions qualified;full canonical reader integration remains pending',tool_transitions:tools.transitions,tool_bound:tools.bound,controls,controls_rejected:controls.length,current_executable_tool_bytes_physical:true,comparison_bytes_are_explicit_metadata_only:true,
 execution:{producer,sha256:hash(fs.readFileSync(join(root,producer))),seconds:(performance.now()-start)/1000},module:{path:module,sha256:hash(fs.readFileSync(join(root,module)))},
 full_canonical_reader_integration_complete:false,product_changes:0,canonical_dispositions_changed:0,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
const out='compatibility/rc/historical-contract-repair-canonical-owner-reader-qualified.json';assert.equal(fs.existsSync(join(root,out)),false);fs.writeFileSync(join(root,out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({line:result.line,tools:result.tool_transitions.length,rejected:result.controls_rejected,seconds:result.execution.seconds,full_owner_integration:false}));
