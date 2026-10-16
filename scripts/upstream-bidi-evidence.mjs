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
import {BIDI_SCOPE_CASE_ID, packedLegacyBidiScopeCase} from './bidi-isolated-packed-contract.mjs';
export const BIDI_BEHAVIOR_KIND = 'packed-required-individual-public-bidi';
const scopes = new Map([
  ['8c3165582fcc1e307f8ddd261f5977c6f2f8b0fc', {kind: 'public-standalone-bidi-module-reexport',
    patch: 'b5b2f1fe9262a0764c4aefac3eec4920caf3a88965f52708130348cda8906a41', member: 'BidiModule'}],
  ['25f391a3c545a1b829a74584c4f9235ab8d18497', {kind: 'public-dir-strict-initialization-and-behavior',
    patch: 'c059a453336395d30e1f19ee20ad5f2420f8ead0762ecec24087d218019697e1', member: 'Dir'}],
]);
const moduleMembers = [
  "projects/ngx-material-legacy/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-card/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-tooltip/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-progress-spinner/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-paginator/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-table/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-slider/internal/common-module.ts",
  "projects/ngx-material-legacy/src/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-button/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-tabs/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-checkbox/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-core/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-core/pseudo-checkbox/pseudo-checkbox-module.ts",
  "projects/ngx-material-legacy/legacy-list/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-radio/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-snack-bar/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-progress-bar/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-slide-toggle/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-input/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-autocomplete/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-select/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-chips/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-menu/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-form-field/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-dialog/internal/common-module.ts"
];
const peers = {
  "main": {
    "version": "22.1.7",
    "members": [
      {
        "package": "@angular/cdk",
        "archive_member": "package/fesm2022/_directionality-chunk.mjs",
        "module_path": "fesm2022/_directionality-chunk.mjs",
        "sha256": "0db67adbfeeb1d633a999e8cf603ae6f8f26e66191e450e86284f0119652b07e",
        "bytes": 1945,
        "path": "compatibility/rc/material-public-source-members/0db67adbfeeb1d633a999e8cf603ae6f8f26e66191e450e86284f0119652b07e.gz",
        "compression": "gzip",
        "stored_sha256": "733da92b4d344fcf7746e109cb14cb7c2bed97c46ad93b861a11c468201d004b"
      },
      {
        "package": "@angular/cdk",
        "archive_member": "package/fesm2022/bidi.mjs",
        "module_path": "fesm2022/bidi.mjs",
        "sha256": "385049f55ab01a2a2e05b0c417e921296f167f285ec55bf05e1643f2cdd03740",
        "bytes": 2886,
        "path": "compatibility/rc/material-public-source-members/385049f55ab01a2a2e05b0c417e921296f167f285ec55bf05e1643f2cdd03740.gz",
        "compression": "gzip",
        "stored_sha256": "4d293632a2fd52180630fde72826b410722589562d9609254fe2fb3397cad117"
      },
      {
        "package": "@angular/cdk",
        "archive_member": "package/types/_bidi-module-chunk.d.ts",
        "module_path": "types/_bidi-module-chunk.d.ts",
        "sha256": "0268e701ec17daa78e322d73365861673a4f1238ba8673c2f1dc0996e60bfa90",
        "bytes": 2282,
        "path": "compatibility/rc/material-public-source-members/0268e701ec17daa78e322d73365861673a4f1238ba8673c2f1dc0996e60bfa90.gz",
        "compression": "gzip",
        "stored_sha256": "0f75327c3511f7d4b3c9876e695d577c8973c6fc1feaac71a821e48666f186a9"
      },
      {
        "package": "@angular/cdk",
        "archive_member": "package/types/bidi.d.ts",
        "module_path": "types/bidi.d.ts",
        "sha256": "769187ce194c8dc07761a9e7d3576475e8ace31b42cbc2e2935e3a74f3e4a9b5",
        "bytes": 789,
        "path": "compatibility/rc/material-public-source-members/769187ce194c8dc07761a9e7d3576475e8ace31b42cbc2e2935e3a74f3e4a9b5.gz",
        "compression": "gzip",
        "stored_sha256": "87fcfe923b22f123b30315f76c1921fc09f1a6e601d7dd34bf61d8a006e949ee"
      }
    ]
  },
  "21.x": {
    "version": "21.2.14",
    "members": [
      {
        "package": "@angular/cdk",
        "archive_member": "package/fesm2022/_directionality-chunk.mjs",
        "module_path": "fesm2022/_directionality-chunk.mjs",
        "sha256": "eb37160785a209351f725f1e635b9a2a4e7415b02dd7f9813c913b0fca365fba",
        "bytes": 2030,
        "path": "compatibility/rc/material-public-source-members/eb37160785a209351f725f1e635b9a2a4e7415b02dd7f9813c913b0fca365fba.gz",
        "compression": "gzip",
        "stored_sha256": "fc1febeedab440c37c271c3ab96772bbb306fafd16e216e137b5a02aed61cd3d"
      },
      {
        "package": "@angular/cdk",
        "archive_member": "package/fesm2022/bidi.mjs",
        "module_path": "fesm2022/bidi.mjs",
        "sha256": "1bf07276ce79175190bc952c61a4ad096ed80e2d69e5b193cabc4aeff8784680",
        "bytes": 2893,
        "path": "compatibility/rc/material-public-source-members/1bf07276ce79175190bc952c61a4ad096ed80e2d69e5b193cabc4aeff8784680.gz",
        "compression": "gzip",
        "stored_sha256": "ffe98baaccb953e787d5ce93f01451d1575095d0fd3c9ece0a02a580f5331c2f"
      },
      {
        "package": "@angular/cdk",
        "archive_member": "package/types/_bidi-module-chunk.d.ts",
        "module_path": "types/_bidi-module-chunk.d.ts",
        "sha256": "3a9323fd680c0d3d8d8fe14f8f951c1e1e1b762fea0a8de48d876f0d435e406d",
        "bytes": 2311,
        "path": "compatibility/rc/material-public-source-members/3a9323fd680c0d3d8d8fe14f8f951c1e1e1b762fea0a8de48d876f0d435e406d.gz",
        "compression": "gzip",
        "stored_sha256": "9a126dc207ad9a20804db7c8fe9af1c0455b96ddd620365c6b88395a93106d92"
      },
      {
        "package": "@angular/cdk",
        "archive_member": "package/types/bidi.d.ts",
        "module_path": "types/bidi.d.ts",
        "sha256": "769187ce194c8dc07761a9e7d3576475e8ace31b42cbc2e2935e3a74f3e4a9b5",
        "bytes": 789,
        "path": "compatibility/rc/material-public-source-members/769187ce194c8dc07761a9e7d3576475e8ace31b42cbc2e2935e3a74f3e4a9b5.gz",
        "compression": "gzip",
        "stored_sha256": "87fcfe923b22f123b30315f76c1921fc09f1a6e601d7dd34bf61d8a006e949ee"
      }
    ]
  }
};
const commonMembers = [
  'scripts/upstream-bidi-evidence.mjs', 'scripts/check-upstream-audit-disposition.mjs',
  'scripts/upstream-packed-run-evidence.mjs', 'scripts/packed-consumer-evidence.mjs',
  'scripts/packed-consumer-aot-smoke.mjs', 'scripts/bidi-isolated-packed-contract.mjs',
  'scripts/bidi-isolated-packed-fixture.mjs', 'scripts/bidi-module-use-review.mjs',
  'scripts/selection-comparator-packed-contract.mjs', 'scripts/selection-comparator-packed-fixture.mjs',
  'compatibility/rc/matrices/full-verify.json', 'compatibility/rc/matrices/library-exports.json',
  'compatibility/rc/material-public-subjects.json', 'projects/ngx-material-legacy/package.json',
  'projects/ngx-material-legacy/legacy-form-field/form-field-module.ts',
  'projects/ngx-material-legacy/legacy-form-field/form-field.ts',
  'projects/ngx-material-legacy/legacy-form-field/form-field.html',
  'projects/ngx-material-legacy/legacy-form-field/form-field.scss',
  'projects/ngx-material-legacy/legacy-input/input-module.ts',
  'projects/ngx-material-legacy/legacy-input/input.ts', ...moduleMembers,
];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const demand = (value, message) => {if (!value) throw new Error(message);};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sameIds = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
export const BIDI_BEHAVIOR_SHAS = Object.freeze([...scopes.keys()]);
export function bidiBehaviorRequirements(sha, line) {
  const scope = scopes.get(sha), peer = Object.hasOwn(peers, line) ? peers[line] : null;
  if (!scope || !peer) return null;
  const module = peer.members.find(row => row.module_path === 'fesm2022/bidi.mjs');
  return structuredClone({sha, kind: scope.kind, patch: scope.patch, case_ids: [BIDI_SCOPE_CASE_ID],
    members: [...commonMembers, ...peer.members.map(row => row.path)],
    installed_member: {package: '@angular/cdk', version: peer.version, path: module.path, sha256: module.sha256, member: scope.member}});
}
export function requiresBidiBehavior(entry, proof) {
  return scopes.has(entry?.sha) || proof?.proof_kind === BIDI_BEHAVIOR_KIND
    || (object(proof) && Object.hasOwn(proof, 'bidi_behavior'));
}
/** Public node/provider observations are mandatory. This fixture does not
 * observe the private before-first-input raw field or certify other callers. */
export function validateBidiBehavior({root, entry, proof, request}) {
  try {
    const line = request?.line ?? proof?.affected_branches?.[0];
    const registered = bidiBehaviorRequirements(entry?.sha, line), scope = proof?.bidi_behavior;
    demand(registered && proof?.proof_kind === BIDI_BEHAVIOR_KIND && proof.diff_sha256 === registered.patch,
      'unregistered public bidi subject');
    demand(object(scope) && scope.kind === registered.kind && isDeepStrictEqual(scope.case_ids, registered.case_ids), 'wrong public bidi scope');
    demand(isDeepStrictEqual(proof.affected_branches, [line])
      && isDeepStrictEqual(proof.installed_member, registered.installed_member), 'wrong public bidi installed member');
    demand(proof.reachable_behavior?.kind === 'executed-delegation' && proof.reachable_behavior.id === BIDI_SCOPE_CASE_ID,
      'wrong public bidi delegation');
    demand(Array.isArray(scope.source_members) && sameIds(scope.source_members.map(row => row?.path), registered.members),
      'incomplete public bidi source scope');
    for (const member of scope.source_members) demand(/^[0-9a-f]{64}$/.test(member.sha256)
      && hash(readEvidenceMember(root, member.path)) === member.sha256, 'stale public bidi source member');
    for (const member of peers[line].members) {
      const stored = readEvidenceMember(root, member.path); demand(hash(stored) === member.stored_sha256, 'wrong public bidi peer bytes');
      const raw = gunzipSync(stored); demand(raw.length === member.bytes && hash(raw) === member.sha256, 'wrong public bidi peer source');
    }
    const runtime = validatePackedConsumerRun({root, request}); demand(runtime.ok, runtime.detail);
    const selected = runtime.observation.cases.find(row => row.case_id === BIDI_SCOPE_CASE_ID), harness = runtime.observation.extra?.harness;
    demand(selected?.legacy_harness_passed === true && harness?.legacyBidiScope === true
      && isDeepStrictEqual(harness?.isolatedLegacyBidi, selected.observation)
      && packedLegacyBidiScopeCase(selected.observation).result === 'pass', 'insufficient isolated public bidi observations');
    return {ok: true, detail: 'Required public bidi module/node/provider/direction/output/teardown behavior observed in the same full packed run; private initial-field, full floor and complete G11 qualification remain separate.',
      invocation_id: runtime.invocation_id, output: runtime.output, library: runtime.library, required_cases: [BIDI_SCOPE_CASE_ID]};
  } catch (error) {return {ok: false, detail: error.message};}
}
