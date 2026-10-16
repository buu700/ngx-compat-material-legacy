/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {readEvidenceMember, validatePackedConsumerRun} from './upstream-packed-run-evidence.mjs';
import {GENERATED_IDENTITY_CASE_ID, packedGeneratedIdentityCase} from './generated-identity-packed-contract.mjs';
export const GENERATED_IDENTITY_KIND = 'packed-required-individual-generated-identity';
const members = [
  'scripts/upstream-generated-identity-evidence.mjs', 'scripts/check-upstream-audit-disposition.mjs',
  'scripts/upstream-packed-run-evidence.mjs', 'scripts/packed-consumer-evidence.mjs',
  'scripts/packed-consumer-aot-smoke.mjs', 'scripts/generated-identity-packed-fixture.mjs',
  'scripts/generated-identity-packed-contract.mjs', 'compatibility/rc/matrices/full-verify.json',
  'scripts/bidi-isolated-packed-contract.mjs', 'scripts/bidi-isolated-packed-fixture.mjs',
  'scripts/selection-comparator-packed-contract.mjs', 'scripts/selection-comparator-packed-fixture.mjs',
  'compatibility/rc/matrices/library-exports.json', 'projects/ngx-material-legacy/package.json',
  'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts',
  'projects/ngx-material-legacy/legacy-menu/menu.ts', 'projects/ngx-material-legacy/legacy-menu/menu.html',
  'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts',
  'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-container-base.ts',
  'projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.ts',
  'projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.html',
  'projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-base.ts',
  'projects/ngx-material-legacy/legacy-select/internal/select-base.ts',
  'projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts',
  'projects/ngx-material-legacy/legacy-tabs/tab-nav-bar/tab-nav-bar.ts',
  'compatibility/rc/remaining-identity-public-subjects.json',
  'compatibility/rc/remaining-identity-source-proof.json',
  'compatibility/rc/snack-modal-identity-source-proof.json',
  'compatibility/f10/disposition-ledger/evidence/closeout-remaining-identity-generator-review.json',
];
const scopes = new Map([
  ['938f478efdc96ef0de1217e806f98939beb027cd', {kind: 'owned-identity-independent-of-private-cdk-generator',
    patch: 'e756cce5271186044ae2f18746d6685f7bee5a83328605800cea0817b761cb35'}],
  ['ea0aed5a0cba3288d89e7448073e0a5556487313', {kind: 'owned-menu-panel-identity-coexistence',
    patch: '61e21a3d1846f725b6a048fe434d74e0bd173a6fc3e90bca79091c349a39c7ec'}],
  ['69968510fb0222ee565f57171640a99768efa972', {kind: 'owned-snack-live-identity-and-modal-ownership',
    patch: '3809a4c8be10fbe0e99531fda686e37f32dc153640055c86b612be0668849dbe'}],
]);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const demand = (value, message) => {if (!value) throw new Error(message);};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sameIds = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
export const GENERATED_IDENTITY_SHAS = Object.freeze([...scopes.keys()]);
export function generatedIdentityRequirements(sha) {
  const row = scopes.get(sha);
  return row ? structuredClone({...row, members, case_ids: [GENERATED_IDENTITY_CASE_ID]}) : null;
}
export function requiresGeneratedIdentity(entry, proof) {
  return scopes.has(entry?.sha) || proof?.proof_kind === GENERATED_IDENTITY_KIND
    || (object(proof) && Object.hasOwn(proof, 'generated_identity_behavior'));
}
/** Source/constructor diagnostics cannot qualify these current DOM contracts.
 * The real coordinator/final sealer owns full execution authenticity. */
export function validateGeneratedIdentity({root, entry, proof, request}) {
  try {
    const registered = scopes.get(entry?.sha), scope = proof?.generated_identity_behavior;
    demand(registered && proof?.proof_kind === GENERATED_IDENTITY_KIND && proof.diff_sha256 === registered.patch,
      'unregistered generated identity subject');
    demand(object(scope) && scope.kind === registered.kind && isDeepStrictEqual(scope.case_ids, [GENERATED_IDENTITY_CASE_ID]),
      'wrong generated identity scope');
    demand(Array.isArray(scope.source_members) && sameIds(scope.source_members.map(row => row?.path), members),
      'incomplete generated identity source scope');
    for (const member of scope.source_members) demand(/^[0-9a-f]{64}$/.test(member.sha256)
      && hash(readEvidenceMember(root, member.path)) === member.sha256, 'stale generated identity source member');
    const runtime = validatePackedConsumerRun({root, request}); demand(runtime.ok, runtime.detail);
    const selected = runtime.observation.cases.find(row => row.case_id === GENERATED_IDENTITY_CASE_ID);
    const raw = runtime.observation.extra?.harness?.generatedIdentity;
    demand(selected && isDeepStrictEqual(raw, selected.observation)
      && packedGeneratedIdentityCase(selected.observation).result === 'pass', 'insufficient generated identity DOM observations');
    return {ok: true, detail: 'Complete mixed-generation generated-ID, exact ARIA-target and snack-modal ownership observations passed in this same packed run; complete G11 and final sealing remain separate.',
      invocation_id: runtime.invocation_id, output: runtime.output, library: runtime.library, required_cases: [GENERATED_IDENTITY_CASE_ID]};
  } catch (error) {return {ok: false, detail: error.message};}
}
