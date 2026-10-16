/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {readEvidenceMember, validatePackedConsumerRun} from './upstream-packed-run-evidence.mjs';
import {SELECTION_COMPARATOR_CASE_ID, packedSelectionComparatorCase} from './selection-comparator-packed-contract.mjs';
export const SELECTION_BEHAVIOR_SHA = '9494ff2d65c98726046e6a20dd6a6d938e97a2f6';
export const SELECTION_BEHAVIOR_KIND = 'packed-required-individual-public-selection-model';
const patch = 'cf574324e4e76ccd1ea45bf25e3bddf9e28b9db07d9fce40e804d04b0a55a73c';
const peers = {
  "main": {
    "version": "22.1.7",
    "members": [
      {
        "package": "@angular/cdk",
        "module_path": "fesm2022/_data-source-chunk.mjs",
        "archive_member": "package/fesm2022/_data-source-chunk.mjs",
        "path": "compatibility/rc/selection-model-public-source-members/31d219c893ebad02623af3fbbd63cb9474de9d165d2936f07f9e9bb91ae4780f.gz",
        "sha256": "31d219c893ebad02623af3fbbd63cb9474de9d165d2936f07f9e9bb91ae4780f",
        "stored_sha256": "7f4cea027dfa13c051eb2f104d91f86a64b7b4ce3feaeac189a7986eb2177f0c",
        "bytes": 286,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "fesm2022/_dispose-view-repeater-strategy-chunk.mjs",
        "archive_member": "package/fesm2022/_dispose-view-repeater-strategy-chunk.mjs",
        "path": "compatibility/rc/selection-model-public-source-members/abdfe679ed7fc91cb4495428e82a8ad329bceca2766d9f5ecc6c5fb77dab2679.gz",
        "sha256": "abdfe679ed7fc91cb4495428e82a8ad329bceca2766d9f5ecc6c5fb77dab2679",
        "stored_sha256": "7157ad0fb693ac162d00954de4d589ac81318ac063fcc90dd951114a74590a8f",
        "bytes": 1271,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "fesm2022/_recycle-view-repeater-strategy-chunk.mjs",
        "archive_member": "package/fesm2022/_recycle-view-repeater-strategy-chunk.mjs",
        "path": "compatibility/rc/selection-model-public-source-members/b203e04cedb6c811df181722f22039f8a7cc28faeb6b264b923b0289eb2b88be.gz",
        "sha256": "b203e04cedb6c811df181722f22039f8a7cc28faeb6b264b923b0289eb2b88be",
        "stored_sha256": "d47bb2b36012cb0c1907f5ace4795d82db7302811eabbadcf66cd07f13567b10",
        "bytes": 3513,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "fesm2022/_selection-model-chunk.mjs",
        "archive_member": "package/fesm2022/_selection-model-chunk.mjs",
        "path": "compatibility/rc/selection-model-public-source-members/50b8f7f87988cb7688ec24e672a603feefdfeeb667db63f37d1ff76c332b2c79.gz",
        "sha256": "50b8f7f87988cb7688ec24e672a603feefdfeeb667db63f37d1ff76c332b2c79",
        "stored_sha256": "74ebbf2fb9808e303c395d07ea25f9be9a563693c313055288e4208f3b568ff8",
        "bytes": 4744,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "fesm2022/_unique-selection-dispatcher-chunk.mjs",
        "archive_member": "package/fesm2022/_unique-selection-dispatcher-chunk.mjs",
        "path": "compatibility/rc/selection-model-public-source-members/257ec72a8f6840fe9a9d0e2233dc5274f5131088ec36a8d03e61a7015792be2c.gz",
        "sha256": "257ec72a8f6840fe9a9d0e2233dc5274f5131088ec36a8d03e61a7015792be2c",
        "stored_sha256": "9597142d5bcdc439aeff3e6dc560f6f06db1b472c94060f434b9e6080917e0e4",
        "bytes": 1119,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "fesm2022/collections.mjs",
        "archive_member": "package/fesm2022/collections.mjs",
        "path": "compatibility/rc/selection-model-public-source-members/6606304e6fdfb161997bb3835f2f01b132cc9d8776c6ab941aa6495629fe5624.gz",
        "sha256": "6606304e6fdfb161997bb3835f2f01b132cc9d8776c6ab941aa6495629fe5624",
        "stored_sha256": "82c5630c2ec16337e8a60db670970dc685c3171967d4ae1483b4308485a3d838",
        "bytes": 564,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "package.json",
        "archive_member": "package/package.json",
        "path": "compatibility/rc/selection-model-public-source-members/ec60a5803a214c9b9d8bcdc2de0b0c294ecdd420d680d0e95e686f7aa4d46933.gz",
        "sha256": "ec60a5803a214c9b9d8bcdc2de0b0c294ecdd420d680d0e95e686f7aa4d46933",
        "stored_sha256": "970dc219bb2c735a1ccc80de7164bf9e070454935a33a7cda814f703ffc0b1fd",
        "bytes": 5084,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "types/_data-source-chunk.d.ts",
        "archive_member": "package/types/_data-source-chunk.d.ts",
        "path": "compatibility/rc/selection-model-public-source-members/581228c64dea7a741cd82cc867dbc74aaf333f00a415a542c94f32904ca40737.gz",
        "sha256": "581228c64dea7a741cd82cc867dbc74aaf333f00a415a542c94f32904ca40737",
        "stored_sha256": "ef6de47715dd69f2d90b9ec04cfd991e7b53c6c5c549bf3e07ca5dcaeebab94b",
        "bytes": 1751,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "types/_selection-model-chunk.d.ts",
        "archive_member": "package/types/_selection-model-chunk.d.ts",
        "path": "compatibility/rc/selection-model-public-source-members/49a973c9bf6f3cf5ca945ebd76a663b66f31c99867deccff5063df5d7000303b.gz",
        "sha256": "49a973c9bf6f3cf5ca945ebd76a663b66f31c99867deccff5063df5d7000303b",
        "stored_sha256": "9544bf9d184dcd63bf9956215282d8d289a4bf369546a99a74dceb1f55697bfe",
        "bytes": 4768,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "types/_unique-selection-dispatcher-chunk.d.ts",
        "archive_member": "package/types/_unique-selection-dispatcher-chunk.d.ts",
        "path": "compatibility/rc/selection-model-public-source-members/9d6a5b625752af00cccc5dbcd1df2a65c2a5b6791b2543a7cae6121bede71952.gz",
        "sha256": "9d6a5b625752af00cccc5dbcd1df2a65c2a5b6791b2543a7cae6121bede71952",
        "stored_sha256": "b2588d58d0a2e30320deb78b89eec93e92df7b254385beab40808ceb28871cd5",
        "bytes": 1348,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "types/_view-repeater-chunk.d.ts",
        "archive_member": "package/types/_view-repeater-chunk.d.ts",
        "path": "compatibility/rc/selection-model-public-source-members/e96c88c22a213451ae8c5ad9c283539e2c43f48557092c0cbfe8a019d0890df0.gz",
        "sha256": "e96c88c22a213451ae8c5ad9c283539e2c43f48557092c0cbfe8a019d0890df0",
        "stored_sha256": "8a9f54638963111fdac34342936121fca3d35fb4b905561e7ac61372fc418ccd",
        "bytes": 3591,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "types/collections.d.ts",
        "archive_member": "package/types/collections.d.ts",
        "path": "compatibility/rc/selection-model-public-source-members/19bbd91064ebe0469f554155572a0b4bb4713ad7cafbc0af9d31cbafdbf223bb.gz",
        "sha256": "19bbd91064ebe0469f554155572a0b4bb4713ad7cafbc0af9d31cbafdbf223bb",
        "stored_sha256": "b95ad17b04951b9855abd5ba305aa31b057f19d2b23cda4cce09073d67d4b48a",
        "bytes": 5158,
        "compression": "gzip"
      }
    ]
  },
  "21.x": {
    "version": "21.2.14",
    "members": [
      {
        "package": "@angular/cdk",
        "module_path": "fesm2022/_data-source-chunk.mjs",
        "archive_member": "package/fesm2022/_data-source-chunk.mjs",
        "path": "compatibility/rc/selection-model-public-source-members/31d219c893ebad02623af3fbbd63cb9474de9d165d2936f07f9e9bb91ae4780f.gz",
        "sha256": "31d219c893ebad02623af3fbbd63cb9474de9d165d2936f07f9e9bb91ae4780f",
        "stored_sha256": "7f4cea027dfa13c051eb2f104d91f86a64b7b4ce3feaeac189a7986eb2177f0c",
        "bytes": 286,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "fesm2022/_dispose-view-repeater-strategy-chunk.mjs",
        "archive_member": "package/fesm2022/_dispose-view-repeater-strategy-chunk.mjs",
        "path": "compatibility/rc/selection-model-public-source-members/abdfe679ed7fc91cb4495428e82a8ad329bceca2766d9f5ecc6c5fb77dab2679.gz",
        "sha256": "abdfe679ed7fc91cb4495428e82a8ad329bceca2766d9f5ecc6c5fb77dab2679",
        "stored_sha256": "7157ad0fb693ac162d00954de4d589ac81318ac063fcc90dd951114a74590a8f",
        "bytes": 1271,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "fesm2022/_recycle-view-repeater-strategy-chunk.mjs",
        "archive_member": "package/fesm2022/_recycle-view-repeater-strategy-chunk.mjs",
        "path": "compatibility/rc/selection-model-public-source-members/b203e04cedb6c811df181722f22039f8a7cc28faeb6b264b923b0289eb2b88be.gz",
        "sha256": "b203e04cedb6c811df181722f22039f8a7cc28faeb6b264b923b0289eb2b88be",
        "stored_sha256": "d47bb2b36012cb0c1907f5ace4795d82db7302811eabbadcf66cd07f13567b10",
        "bytes": 3513,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "fesm2022/_selection-model-chunk.mjs",
        "archive_member": "package/fesm2022/_selection-model-chunk.mjs",
        "path": "compatibility/rc/selection-model-public-source-members/36ed728fa1e79dd86575355ad67999670629c4f649fdb3552488f4998de3be44.gz",
        "sha256": "36ed728fa1e79dd86575355ad67999670629c4f649fdb3552488f4998de3be44",
        "stored_sha256": "f5ae01ac91cbc90df8d37b958ffe2b67552bd66d8ca955eaa757b0b15af2e8aa",
        "bytes": 4394,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "fesm2022/_unique-selection-dispatcher-chunk.mjs",
        "archive_member": "package/fesm2022/_unique-selection-dispatcher-chunk.mjs",
        "path": "compatibility/rc/selection-model-public-source-members/899e598f88cbee664aae65cd0a18e64f4f6189651ec754a4cddfa0fc54207925.gz",
        "sha256": "899e598f88cbee664aae65cd0a18e64f4f6189651ec754a4cddfa0fc54207925",
        "stored_sha256": "9c60ada734338c40d8025a06a62a98808ffa4c1bf7668d7c907180eb592bb5ec",
        "bytes": 1204,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "fesm2022/collections.mjs",
        "archive_member": "package/fesm2022/collections.mjs",
        "path": "compatibility/rc/selection-model-public-source-members/6606304e6fdfb161997bb3835f2f01b132cc9d8776c6ab941aa6495629fe5624.gz",
        "sha256": "6606304e6fdfb161997bb3835f2f01b132cc9d8776c6ab941aa6495629fe5624",
        "stored_sha256": "82c5630c2ec16337e8a60db670970dc685c3171967d4ae1483b4308485a3d838",
        "bytes": 564,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "package.json",
        "archive_member": "package/package.json",
        "path": "compatibility/rc/selection-model-public-source-members/10c398ae1ae4854e4c98b3715f8e0f225e34b7773fa3c582f11d67852a003ea9.gz",
        "sha256": "10c398ae1ae4854e4c98b3715f8e0f225e34b7773fa3c582f11d67852a003ea9",
        "stored_sha256": "ae4dbeb2a5f9bb896e50dba8abb3c394041c73ec8a10cca0f9ffbe8dd45d5c0b",
        "bytes": 5041,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "types/_data-source-chunk.d.ts",
        "archive_member": "package/types/_data-source-chunk.d.ts",
        "path": "compatibility/rc/selection-model-public-source-members/581228c64dea7a741cd82cc867dbc74aaf333f00a415a542c94f32904ca40737.gz",
        "sha256": "581228c64dea7a741cd82cc867dbc74aaf333f00a415a542c94f32904ca40737",
        "stored_sha256": "ef6de47715dd69f2d90b9ec04cfd991e7b53c6c5c549bf3e07ca5dcaeebab94b",
        "bytes": 1751,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "types/_selection-model-chunk.d.ts",
        "archive_member": "package/types/_selection-model-chunk.d.ts",
        "path": "compatibility/rc/selection-model-public-source-members/0e4b16f47b470e8fbfa8d48d3f2edcee1265f892dc6fbf2d1753277a359f22c0.gz",
        "sha256": "0e4b16f47b470e8fbfa8d48d3f2edcee1265f892dc6fbf2d1753277a359f22c0",
        "stored_sha256": "bdb225a0af4105e97b0d636bd93784f9d906bf977522cba874378bb60653c94b",
        "bytes": 4091,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "types/_unique-selection-dispatcher-chunk.d.ts",
        "archive_member": "package/types/_unique-selection-dispatcher-chunk.d.ts",
        "path": "compatibility/rc/selection-model-public-source-members/25067a844ad4063c1a5dddb8f431102ec63416ccd137a8729dbddf4670409a99.gz",
        "sha256": "25067a844ad4063c1a5dddb8f431102ec63416ccd137a8729dbddf4670409a99",
        "stored_sha256": "2e9b5aa937fda63dc6e7a9e2453dd214511ee8c8c5f20785921bc228026b6962",
        "bytes": 1370,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "types/_view-repeater-chunk.d.ts",
        "archive_member": "package/types/_view-repeater-chunk.d.ts",
        "path": "compatibility/rc/selection-model-public-source-members/e96c88c22a213451ae8c5ad9c283539e2c43f48557092c0cbfe8a019d0890df0.gz",
        "sha256": "e96c88c22a213451ae8c5ad9c283539e2c43f48557092c0cbfe8a019d0890df0",
        "stored_sha256": "8a9f54638963111fdac34342936121fca3d35fb4b905561e7ac61372fc418ccd",
        "bytes": 3591,
        "compression": "gzip"
      },
      {
        "package": "@angular/cdk",
        "module_path": "types/collections.d.ts",
        "archive_member": "package/types/collections.d.ts",
        "path": "compatibility/rc/selection-model-public-source-members/19bbd91064ebe0469f554155572a0b4bb4713ad7cafbc0af9d31cbafdbf223bb.gz",
        "sha256": "19bbd91064ebe0469f554155572a0b4bb4713ad7cafbc0af9d31cbafdbf223bb",
        "stored_sha256": "b95ad17b04951b9855abd5ba305aa31b057f19d2b23cda4cce09073d67d4b48a",
        "bytes": 5158,
        "compression": "gzip"
      }
    ]
  }
};
const commonMembers = [
  'scripts/upstream-selection-evidence.mjs', 'scripts/check-upstream-audit-disposition.mjs',
  'scripts/upstream-packed-run-evidence.mjs', 'scripts/packed-consumer-evidence.mjs', 'scripts/packed-consumer-aot-smoke.mjs',
  'scripts/selection-comparator-packed-contract.mjs', 'scripts/selection-comparator-packed-fixture.mjs',
  'scripts/selection-model-use-review.mjs', 'compatibility/rc/selection-model-public-subjects.json',
  'compatibility/rc/matrices/full-verify.json', 'compatibility/rc/matrices/library-exports.json',
  'projects/ngx-material-legacy/package.json', 'projects/ngx-material-legacy/legacy-list/selection-list.ts',
  'projects/ngx-material-legacy/legacy-list/list-module.ts', 'projects/ngx-material-legacy/legacy-chips/chip-list.ts',
  'projects/ngx-material-legacy/legacy-select/internal/select-base.ts',
  'reference/material-16.2.14/value-accessor-token-sources/legacy-list/selection-list.ts',
];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const demand = (value, message) => {if (!value) throw new Error(message);};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sameIds = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
export function selectionBehaviorRequirements(sha, line) {
  const peer = Object.hasOwn(peers, line) ? peers[line] : null; if (sha !== SELECTION_BEHAVIOR_SHA || !peer) return null;
  const model = peer.members.find(row => row.module_path === 'fesm2022/_selection-model-chunk.mjs');
  return structuredClone({sha, patch, kind: 'public-comparator-retains-real-legacy-list-option', case_ids: [SELECTION_COMPARATOR_CASE_ID],
    members: [...commonMembers, ...peer.members.map(row => row.path)],
    installed_member: {package: '@angular/cdk', version: peer.version, path: model.path, sha256: model.sha256, member: 'SelectionModel.setSelection'}});
}
export function requiresSelectionBehavior(entry, proof) {
  return entry?.sha === SELECTION_BEHAVIOR_SHA || proof?.proof_kind === SELECTION_BEHAVIOR_KIND
    || (object(proof) && Object.hasOwn(proof, 'selection_behavior'));
}
/** Public model identity, actual legacy getters/nodes/ARIA, notification ordering
 * and cleanup must agree. Source/protocol diagnostics cannot qualify the run. */
export function validateSelectionBehavior({root, entry, proof, request}) {
  try {
    const line = request?.line ?? proof?.affected_branches?.[0], registered = selectionBehaviorRequirements(entry?.sha, line);
    const scope = proof?.selection_behavior;
    demand(registered && proof?.proof_kind === SELECTION_BEHAVIOR_KIND && proof.diff_sha256 === registered.patch,
      'unregistered public selection subject');
    demand(object(scope) && scope.kind === registered.kind && isDeepStrictEqual(scope.case_ids, registered.case_ids), 'wrong public selection scope');
    demand(isDeepStrictEqual(proof.affected_branches, [line]) && isDeepStrictEqual(proof.installed_member, registered.installed_member),
      'wrong public selection installed member');
    demand(proof.reachable_behavior?.kind === 'executed-delegation' && proof.reachable_behavior.id === SELECTION_COMPARATOR_CASE_ID,
      'wrong public selection delegation');
    demand(Array.isArray(scope.source_members) && sameIds(scope.source_members.map(row => row?.path), registered.members), 'incomplete public selection source scope');
    for (const member of scope.source_members) demand(/^[0-9a-f]{64}$/.test(member.sha256)
      && hash(readEvidenceMember(root, member.path)) === member.sha256, 'stale public selection source member');
    for (const member of peers[line].members) {
      const bytes = readEvidenceMember(root, member.path); demand(hash(bytes) === member.stored_sha256, 'wrong public selection peer bytes');
      const raw = gunzipSync(bytes); demand(raw.length === member.bytes && hash(raw) === member.sha256, 'wrong public selection peer source');
    }
    const runtime = validatePackedConsumerRun({root, request}); demand(runtime.ok, runtime.detail);
    const selected = runtime.observation.cases.find(row => row.case_id === SELECTION_COMPARATOR_CASE_ID), harness = runtime.observation.extra?.harness;
    demand(selected?.legacy_harness_passed === true && harness?.selectionComparatorExposure === true
      && isDeepStrictEqual(harness?.selectionComparatorObservation, selected.observation)
      && packedSelectionComparatorCase(selected.observation).result === 'pass', 'insufficient public selection concrete-option/event/node observations');
    return {ok: true, detail: 'The original comparator assertion and exact public model/option/event/legacy-node/ARIA sequence passed in this same full packed run; full floor and complete G11 qualification remain separate.',
      invocation_id: runtime.invocation_id, output: runtime.output, library: runtime.library, required_cases: [SELECTION_COMPARATOR_CASE_ID]};
  } catch (error) {return {ok: false, detail: error.message};}
}
