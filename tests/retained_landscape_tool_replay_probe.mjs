/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {currentSassToolReferenceSubject as make} from '../scripts/current-sass-tool-references.mjs';
const root=process.cwd(),physical=path=>readFileSync(root+'/'+path),hash=raw=>createHash('sha256').update(raw).digest('hex');
const packetPath='compatibility/rc/main-retained-landscape-program-source-v1.json',packet=JSON.parse(physical(packetPath));
const scope=make({root}),clean=ref=>({path:ref.path,sha256:ref.sha256,bytes:ref.bytes});
for(const update of packet.updates){
 const before=clean(update.before),after=clean(update.after);
 assert.deepEqual(scope.qualify(before),after);assert.deepEqual(scope.predecessorReference(after),before);
 assert.equal(hash(scope.comparisonBytes(before)),before.sha256);assert.equal(hash(scope.comparisonBytes(after)),after.sha256);
 assert.equal(scope.qualify({...before,sha256:'0'.repeat(64)}),null);assert.throws(()=>scope.qualify({...before,bytes:before.bytes+1}));
}
const targets=['scripts/retained-landscape-program-source.mjs',packetPath,...packet.updates.map(row=>row.path),...packet.support.map(ref=>ref.path)];
assert.equal(new Set(targets).size,13);
// One valid frame exercises each late corruption and recovery. Its callback
// switches targets only between operations; every public guard still rereads
// its full physical frame. Cold failures construct independent new frames.
let bad=false,target=null;const read=path=>{const raw=physical(path);return bad&&path===target?Buffer.concat([raw,Buffer.from(' ')]):raw;};
const live=make({root,read});
for(target of targets){
 bad=true;assert.throws(()=>live.assertCurrent(),undefined,'late '+target);assert.throws(()=>make({root,read}),undefined,'cold '+target);
 bad=false;live.assertCurrent();
}
const result={result:'pass',bound:scope.bound,transitions:scope.transitions,targets,cold_rejections:13,late_rejections:13,recoveries:13,
 unknown_hash_not_qualified:true,wrong_length_rejected:true,historical_programs_executed:false,artifact_or_audit_admission_granted:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:'pass',bound:scope.bound.length,transitions:scope.transitions.length,cold_rejections:13,late_rejections:13,recoveries:13}));
