/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {currentInventorySourceSubject as make} from '../scripts/current-inventory-source-subject.mjs';
import {currentSassToolReferenceSubject} from '../scripts/current-sass-tool-references.mjs';
const root=process.cwd(),physical=path=>readFileSync(root+'/'+path),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const scope=make({root}),targets=scope.bound.map(ref=>ref.path),before={...scope.transitions[0].before},after={...scope.transitions[0].after};
assert.deepEqual(scope.qualify(before),after);assert.equal(hash(scope.comparisonBytes(before)),before.sha256);assert.equal(hash(scope.comparisonBytes(after)),after.sha256);
const intermediate=JSON.parse(physical('compatibility/rc/main-current-inventory-source-routing-v2.json')).updates[0].after;
assert.notEqual(intermediate.sha256,after.sha256);assert.deepEqual(scope.qualify(intermediate),after);assert.equal(hash(scope.comparisonBytes(intermediate)),intermediate.sha256);
for(const target of targets){let bad=false;const read=path=>{const raw=physical(path);return bad&&path===target?Buffer.concat([raw,Buffer.from(' ')]):raw;};const live=make({root,read});bad=true;assert.throws(()=>live.assertCurrent(),undefined,'late '+target);assert.throws(()=>make({root,read}),undefined,'cold '+target);bad=false;live.assertCurrent();}
assert.throws(()=>scope.qualify({...before,sha256:'0'.repeat(64)}));assert.throws(()=>scope.qualify({...before,bytes:before.bytes+1}));
let getters=0;assert.throws(()=>scope.qualify({get path(){getters++;return before.path;},sha256:before.sha256}));assert.equal(getters,0);
assert.throws(()=>make({root,read:path=>path===before.path?scope.comparisonBytes(before):physical(path)}));
const copy=scope.comparisonBytes(before);copy.fill(0);assert.equal(hash(scope.comparisonBytes(before)),before.sha256);
scope.bound.length=0;scope.transitions[0].before.sha256='0'.repeat(64);scope.transitions[0].after.sha256='0'.repeat(64);assert.deepEqual(scope.qualify(before),after);scope.assertCurrent();
// A function property cannot manufacture the owning packed module's private
// association between an inventory metadata reader and its genuine raw reader.
const inventory='testing/legacy-runner/historical-inventory.json',old=execFileSync('git',['--no-replace-objects','show','948e8290b74953c83d11268368f38952d0b51fd7:'+inventory],{cwd:root});
assert.notEqual(hash(old),hash(physical(inventory)));const forged=path=>path===inventory?old:physical(path);Object.defineProperty(forged,'raw',{value:physical});
assert.throws(()=>currentSassToolReferenceSubject({root,read:forged}),/nonphysical current tool input/);
console.log(JSON.stringify({result:'pass',targets:targets.length,cold_rejections:targets.length,late_rejections:targets.length,recovery:targets.length,old_source_substitution_rejected:true,unknown_hash_rejected:true,wrong_length_rejected:true,accessor_not_invoked:true,public_metadata_isolated:true,comparison_copy_isolated:true,forged_raw_property_rejected:true,intermediate_owner_preserved:true}));
