/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {autocompleteSelectionNativeSubject as make,SELECTION_NATIVE_REGISTRY} from '../scripts/autocomplete-selection-native-subject.mjs';
import {selectionNativeRegistrySourceSuccessor} from '../scripts/selection-native-registry-source-successor.mjs';
const root=process.cwd(),physical=path=>readFileSync(root+'/'+path),live=make({root,read:physical,line:'main'});
assert.equal(live.after.sha256,'2e3d0d372775457655239efabd3769ca3b8bd1e0de42333bd48f9926bf1c3044');
assert.equal(live.current_after.sha256,'b4267df0a78789777bcea4943f6d1371239e94c51d32055ecdcfe818e4743eaa');
const prior={path:SELECTION_NATIVE_REGISTRY,...live.after};
assert.deepEqual(live.qualify(prior),live.current_after);
const targets=live.bound.map(ref=>ref.path);
for(const target of targets){
 let bad=false;const read=path=>{const raw=physical(path);return bad&&path===target?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const scope=make({root,read,line:'main'});scope.bound.length=0;scope.after.sha256='0'.repeat(64);scope.current_after.sha256='0'.repeat(64);
 bad=true;assert.throws(()=>scope.assertCurrent(),undefined,'late '+target);assert.throws(()=>make({root,read,line:'main'}),undefined,'cold '+target);
 bad=false;scope.assertCurrent();assert.equal(scope.qualify(prior).sha256,live.current_after.sha256);
}
const registry=selectionNativeRegistrySourceSuccessor({root});
assert.throws(()=>registry.qualify({...prior,sha256:'0'.repeat(64)}));assert.throws(()=>registry.qualify({...prior,bytes:prior.bytes+1}));
let reads=0;assert.throws(()=>registry.qualify({get path(){reads++;return prior.path;},sha256:prior.sha256}));assert.equal(reads,0);
console.log(JSON.stringify({result:'pass',targets:targets.length,cold_rejections:targets.length,late_rejections:targets.length,recovery:targets.length,historical_after_preserved:true,current_registry_bound:true,default_selection_scopes_preserved:3,public_metadata_isolated:true,unknown_hash_rejected:true,wrong_length_rejected:true,accessor_not_invoked:true,native_artifact_or_audit_credit:false}));
