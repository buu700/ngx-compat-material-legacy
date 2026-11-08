/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {currentSassToolReferenceSubject as make} from '../scripts/current-sass-tool-references.mjs';
const root=process.cwd(),physical=path=>readFileSync(root+'/'+path),hash=raw=>createHash('sha256').update(raw).digest('hex');
const v2=JSON.parse(physical('compatibility/rc/main-current-inventory-source-routing-v2.json')).updates[0];
const v3=JSON.parse(physical('compatibility/rc/main-current-inventory-source-routing-v3.json')).updates[0];
const v4=JSON.parse(physical('compatibility/rc/main-current-inventory-source-routing-v4.json')).updates[0];
const v5=JSON.parse(physical('compatibility/rc/main-current-inventory-source-routing-v5.json')).updates[0];
const packet=JSON.parse(physical('compatibility/rc/main-current-inventory-source-routing-v6.json')),update=packet.updates[0],scope=make({root});
for(const ref of [v2.before,v2.after,v3.after,v4.after,v5.after,update.after]){
 assert.deepEqual(scope.qualify(ref),update.after);assert.equal(hash(scope.comparisonBytes(ref)),ref.sha256);
}
assert.equal(scope.qualify({...update.before,sha256:'0'.repeat(64)}),null);
assert.throws(()=>scope.qualify({...update.before,bytes:update.before.bytes+1}));
for(const row of packet.updates.slice(1))for(const ref of [row.before,row.after]){
 assert.deepEqual(scope.qualify(ref),row.after);assert.equal(hash(scope.comparisonBytes(ref)),ref.sha256);
 assert.deepEqual(scope.predecessorReference(row.after),row.before);
 assert.equal(scope.qualify({...ref,sha256:'0'.repeat(64)}),null);assert.throws(()=>scope.qualify({...ref,bytes:ref.bytes+1}));
}
const targets=['compatibility/rc/main-current-inventory-source-routing-v6.json',...packet.updates.slice(1).map(row=>row.path),'compatibility/rc/main-current-inventory-source-routing-v5.json','compatibility/rc/main-current-inventory-source-routing-v4.json',update.path,
 'scripts/current-inventory-source-subject.mjs','scripts/retained-later-stage-program-source.mjs',
 'compatibility/rc/main-retained-later-stage-programs-v1.json','scripts/retained-selection-metadata-context.mjs',
 'compatibility/rc/main-retained-selection-metadata-context-v1.json','scripts/retained-landscape-program-source.mjs',
 'compatibility/rc/main-retained-landscape-program-source-v1.json','compatibility/rc/main-retained-landscape-current-prototype-v1.json.gz',
 'scripts/autocomplete-selection-native-subject.mjs','scripts/upstream-candidate-source-evidence.mjs',
 'compatibility/rc/autocomplete-selection-ledger-successor.json'];
assert.equal(new Set(targets).size,17);assert.ok(targets.every(path=>scope.bound.some(ref=>ref.path===path)));
let bad=false,target=null;const read=path=>{const raw=physical(path);return bad&&path===target?Buffer.concat([raw,Buffer.from(' ')]):raw;};
const live=make({root,read});
for(target of targets){bad=true;assert.throws(()=>live.assertCurrent());assert.throws(()=>make({root,read}));bad=false;live.assertCurrent();}
const result={result:'pass',bound:scope.bound,transitions:scope.transitions,targets,cold_rejections:17,late_rejections:17,recoveries:17,
 owner_images_preserved:6,wrapper_images_preserved:4,unknown_hash_not_qualified:true,wrong_length_rejected:true,historical_programs_executed:false,
 artifact_or_audit_admission_granted:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:'pass',bound:scope.bound.length,transitions:scope.transitions.length,cold_rejections:17,late_rejections:17,recoveries:17,owner_images_preserved:6,wrapper_images_preserved:4}));
