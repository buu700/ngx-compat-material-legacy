/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Use of this source code is governed by the MIT license in LICENSE.
 * Copyright (c) 2026 Ryan Lester.
 */
/** Actual table/current-source leaf boundaries; no composed owner or compiler. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {tableLocalCompilationOwnerSourceSubject} from '../scripts/table-local-compilation-owner-source.mjs';
import {tableLocalCompilationOwnerContext} from '../scripts/table-local-compilation-canonical-stage.mjs';
import {legacyRemovalOwnerSourceSubject} from '../scripts/legacy-removal-owner-source.mjs';
import {baseClassRemovalCanonicalFrameSubject} from '../scripts/base-class-removal-owner-source.mjs';
import {packedUpstreamLedgerCurrentSourceLane} from '../scripts/packed-upstream-ledger-epoch.mjs';

const root=process.cwd(),read=path=>readFileSync(join(root,path));
const registry='scripts/upstream-source-contract-registry.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const frame=baseClassRemovalCanonicalFrameSubject({root,read});
const table=tableLocalCompilationOwnerSourceSubject({root,read});
const proposal=JSON.parse(read('compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v6.json'));
const after70=gunzipSync(read(proposal.registry_after_image.path));
const before69=gunzipSync(read(proposal.registry_before_image.path));
const before68=gunzipSync(read(table.packet.registry_before_image.path));
const ref70={path:registry,sha256:hash(after70),bytes:after70.length};
assert.ok(table.ownsReference(ref70));
assert.deepEqual(table.predecessorReference(ref70),{path:registry,sha256:hash(before68),bytes:before68.length});
assert.ok(table.comparisonBytes(ref70).equals(after70));
assert.ok(frame.predecessorData(registry,after70).equals(before69));
assert.ok(table.predecessorData(registry,after70).equals(before68));
assert.ok(table.predecessorData(registry,before69).equals(before68));
assert.ok(table.registryComparisonBytes().equals(before69));
assert.deepEqual(table.qualifyReference(ref70),{path:registry,sha256:hash(read(registry)),bytes:read(registry).length});
const unknown=Buffer.concat([after70,Buffer.from('\n// unrelated registry change\n')]);
assert.ok(table.predecessorData(registry,unknown).equals(unknown));
assert.throws(()=>table.qualifyReference({path:registry,sha256:hash(unknown),bytes:unknown.length}));
assert.ok(table.predecessorData('scripts/unrelated.mjs',after70).equals(after70));

// A caller-supplied historical projection cannot acquire the module-private
// capability that the terminal owner records at its exact construction site.
const projected=path=>path===registry?after70:read(path);
const unbranded=packedUpstreamLedgerCurrentSourceLane({root,read:projected});
assert.equal(unbranded.registered_frames,0);assert.equal(unbranded.read,projected);
if(!read(registry).equals(after70))assert.throws(()=>tableLocalCompilationOwnerSourceSubject({root,read:projected}));
const spoof=path=>path==='compatibility/rc/.canonical-owned-tool-metadata-role'
  ?Buffer.from('owned canonical tool metadata'):projected(path);
const noAuthority=packedUpstreamLedgerCurrentSourceLane({root,read:spoof});
assert.equal(noAuthority.registered_frames,0);assert.equal(noAuthority.read,spoof);

// Late callback drift is rejected even when actual files never change.
let changed=false;
const mutableRead=path=>changed&&path===registry?unknown:read(path);
const live=tableLocalCompilationOwnerSourceSubject({root,read:mutableRead});
changed=true;assert.throws(()=>live.assertCurrent());
changed=false;live.assertCurrent();table.assertCurrent();frame.assertCurrent();
// Arm a mutation on the last callback of the real guard, after its earlier
// source checks. The final trusted sweep must still reject physical drift.
function finalCallbackMutation(construct,label){
 const path='scripts/base-class-removal-canonical-stage.mjs',before=read(path);
 let calls=0,trigger=Infinity,changedPhysical=false;
 const callback=name=>{const raw=read(name);if(++calls===trigger){writeFileSync(join(root,path),Buffer.concat([before,Buffer.from('\n// late callback mutation\n')]));changedPhysical=true;}return raw;};
 const subject=construct(callback);calls=0;subject.assertCurrent();const callbackCount=calls;
 assert.ok(callbackCount>0,label+' has no callback path');calls=0;trigger=callbackCount;
 try{assert.throws(()=>subject.assertCurrent(),undefined,label);assert.equal(changedPhysical,true,label+' never reached final callback');}
 finally{writeFileSync(join(root,path),before);trigger=Infinity;}
 subject.assertCurrent();
}
finalCallbackMutation(read=>tableLocalCompilationOwnerSourceSubject({root,read}),'table source final callback');
finalCallbackMutation(read=>tableLocalCompilationOwnerContext({root,read}),'table canonical final callback');
finalCallbackMutation(read=>legacyRemovalOwnerSourceSubject({root,read}),'legacy source final callback');
console.log(JSON.stringify({result:'pass',line:'21.x',private_comparison:'70→69→68',
  current_registry_sha256:hash(read(registry)),source_bound:table.bound.length,
  unbranded_and_spoofed_capabilities_rejected:true,late_callback_mutation_and_restoration:true,
  final_callback_physical_mutation_rejections:3,
  full_composed_owner_executed:false,compiler_or_build_executed:false,g11_claim:'not-passed'}));
