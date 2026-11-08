/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {currentSassToolReferenceSubject as make} from '../scripts/current-sass-tool-references.mjs';
import {sassWrapperNoticeSubject} from '../scripts/sass-wrapper-notice-subject.mjs';
const root=process.cwd(),physical=path=>readFileSync(root+'/'+path),hash=raw=>createHash('sha256').update(raw).digest('hex');
const packetPath='compatibility/rc/main-retained-rules-js-program-source-v1.json',packet=JSON.parse(physical(packetPath));
const scope=make({root,read:physical}),{before,after}=packet.update;
assert.deepEqual(scope.qualify(before),after);assert.deepEqual(scope.qualify(after),after);
assert.deepEqual(scope.predecessorReference(after),before);
assert.equal(hash(scope.comparisonBytes(before)),before.sha256);assert.equal(hash(scope.comparisonBytes(after)),after.sha256);
assert.equal(scope.qualify({...before,sha256:'0'.repeat(64)}),null);
assert.throws(()=>scope.qualify({...before,bytes:before.bytes+1}));
const targets=[packetPath,packet.usage.path,after.path,...packet.support.map(ref=>ref.path)];
assert.equal(new Set(targets).size,12);
for(const target of targets){
 let bad=false;const read=path=>{const raw=physical(path);return bad&&path===target?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const live=make({root,read});bad=true;assert.throws(()=>live.assertCurrent(),undefined,'late '+target);assert.throws(()=>make({root,read}),undefined,'cold '+target);
 bad=false;live.assertCurrent();
}
// The unchanged notice recipe still identifies its exact historical hook;
// its live current-reader route must select the new physical program.
const notices=sassWrapperNoticeSubject({root,read:physical,line:'main'}),usage=JSON.parse(physical(packet.usage.path));
const row=usage.code_subjects.find(row=>row.path===after.path);
assert.deepEqual(notices.qualify({path:row.path,...row.before}),after);
assert.deepEqual(notices.historicalReference(after),{path:row.path,...row.before});
const result={result:'pass',bound:scope.bound,transitions:scope.transitions,targets,
 cold_rejections:12,late_rejections:12,recoveries:12,unknown_hash_not_qualified:true,wrong_length_rejected:true,
 historical_notice_route_preserved:true,historical_programs_executed:false,artifact_or_audit_admission_granted:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:'pass',bound:scope.bound.length,transitions:scope.transitions.length,cold_rejections:12,late_rejections:12,recoveries:12,historical_notice_route_preserved:true}));
