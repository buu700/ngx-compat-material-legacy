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
import {SELECT_FOCUS_CLICK_CASE_ID, packedSelectFocusClickCase} from './select-focus-click-packed-contract.mjs';
import {SELECT_DETACH_CASE_ID, packedSelectDetachCase} from './select-detach-packed-contract.mjs';
import {TABLE_ONPUSH_CASE_ID, packedTableOnPushCase} from './table-onpush-packed-contract.mjs';

export const ARTIFACT_BEHAVIOR_KIND = 'artifact-required-individual-behavior';
export const SELECT_FOCUS_SHA = '1b6db8c89b00ace8aaa0e0824866acec5369635f';
export const SELECT_FOCUS_PATCH = 'b937a4a631c52484825a5a3ab74a301b01b64ba494ff72ef4eb7d0de7c992aba';
export const SELECT_FOCUS_MEMBERS = Object.freeze([
  'projects/ngx-material-legacy/legacy-select/select.html',
  'projects/ngx-material-legacy/legacy-select/internal/select-base.ts',
  'projects/ngx-material-legacy/legacy-select/select.ts',
  'projects/ngx-material-legacy/legacy-form-field/form-field.html',
  'scripts/packed-consumer-aot-smoke.mjs',
  'scripts/packed-consumer-evidence.mjs',
  'scripts/select-focus-click-packed-fixture.mjs',
  'scripts/select-focus-click-packed-contract.mjs',
  'compatibility/rc/matrices/library-exports.json',
  'compatibility/rc/matrices/full-verify.json',
]);
export const SELECT_DETACH_SHA = '688c430fe8df09152ee59eb8a2ca62b5ba2fb81e';
export const SELECT_DETACH_PATCH = 'b443861e8eabbfa6c7613fc26349a89e59d2b364493d426461957beb247b691a';
export const TABLE_ONPUSH_SHA = 'ca9c490ee30dbf7c9c147079197d0dbc0abcd611';
export const TABLE_ONPUSH_PATCH = '3630c1798278c09cfd65afa8a4d5853034cfd2a0bd67eff9dc2edd6aa4d8808f';
const producerMembers = [
  'scripts/packed-consumer-aot-smoke.mjs', 'scripts/packed-consumer-evidence.mjs',
  'compatibility/rc/matrices/library-exports.json', 'compatibility/rc/matrices/full-verify.json',
];
export const SELECT_DETACH_MEMBERS = Object.freeze([
  'projects/ngx-material-legacy/legacy-select/select.html',
  'projects/ngx-material-legacy/legacy-select/internal/select-base.ts',
  'projects/ngx-material-legacy/legacy-select/select.ts',
  'scripts/select-detach-packed-fixture.mjs', 'scripts/select-detach-packed-contract.mjs', ...producerMembers,
]);
export const TABLE_ONPUSH_MEMBERS = Object.freeze([
  'projects/ngx-material-legacy/legacy-table/table.ts',
  'projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts',
  'projects/ngx-material-legacy/legacy-table/row.ts',
  'projects/ngx-material-legacy/legacy-table/table-module.ts',
  'projects/ngx-material-legacy/legacy-table/table-data-source.ts',
  'projects/ngx-material-legacy/legacy-table/internal/public-constructor-context.ts',
  'scripts/table-onpush-packed-fixture.mjs', 'scripts/table-onpush-packed-contract.mjs',
  'compatibility/rc/table-public-module-sources/cdk-22.1.7-table.mjs',
  'compatibility/rc/table-public-module-sources/cdk-21.2.14-table.mjs', ...producerMembers,
]);
const scopes = new Map([
  [SELECT_FOCUS_SHA, {patch: SELECT_FOCUS_PATCH, kind: 'select-focus-before-click', members: SELECT_FOCUS_MEMBERS,
    caseId: SELECT_FOCUS_CLICK_CASE_ID, harness: 'selectFocusClick', evaluate: packedSelectFocusClickCase}],
  [SELECT_DETACH_SHA, {patch: SELECT_DETACH_PATCH, kind: 'select-close-on-real-scroll-detach', members: SELECT_DETACH_MEMBERS,
    caseId: SELECT_DETACH_CASE_ID, harness: 'selectScrollDetach', evaluate: packedSelectDetachCase}],
  [TABLE_ONPUSH_SHA, {patch: TABLE_ONPUSH_PATCH, kind: 'table-no-data-row-on-push', members: TABLE_ONPUSH_MEMBERS,
    caseId: TABLE_ONPUSH_CASE_ID, harness: 'tableOnPushRendering', evaluate: packedTableOnPushCase}],
]);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const demand = (value, message) => { if (!value) throw new Error(message); };
const sameIds = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

/** Registered subjects cannot fall back to a generic proof kind. */
export function requiresArtifactBehavior(entry, proof) {
  return scopes.has(entry?.sha) || proof?.proof_kind === ARTIFACT_BEHAVIOR_KIND
    || (object(proof) && Object.hasOwn(proof, 'artifact_behavior'));
}

/** Finite source-reviewed case requirements; no caller-defined case predicate. */
export function validateArtifactBehavior({root, entry, proof, request}) {
  try {
    const registered = scopes.get(entry?.sha);
    demand(registered && proof?.proof_kind === ARTIFACT_BEHAVIOR_KIND
      && proof.diff_sha256 === registered.patch, 'unregistered artifact behavior subject');
    const scope = proof.artifact_behavior;
    demand(object(scope) && scope.kind === registered.kind
      && sameIds(scope.case_ids, [registered.caseId]), 'wrong artifact behavior scope');
    demand(Array.isArray(scope.source_members)
      && sameIds(scope.source_members.map(row => row?.path), registered.members), 'incomplete reviewed source scope');
    for (const row of scope.source_members) {
      demand(/^[0-9a-f]{64}$/.test(row.sha256) && hash(readEvidenceMember(root, row.path)) === row.sha256, 'stale reviewed source member');
    }
    if (entry.sha === TABLE_ONPUSH_SHA) {
      const line = request?.line ?? proof.affected_branches?.[0];
      const version = line === 'main' ? '22.1.7' : line === '21.x' ? '21.2.14' : null;
      const path = `compatibility/rc/table-public-module-sources/cdk-${version}-table.mjs`;
      const installed = proof.installed_member, behavior = proof.reachable_behavior;
      demand(version && installed?.package === '@angular/cdk' && installed.version === version
        && installed.path === path && installed.member === 'CdkTable._updateNoDataRow'
        && installed.sha256 === hash(readEvidenceMember(root, path)), 'wrong branch installed table member');
      demand(behavior?.kind === 'executed-delegation' && behavior.id === TABLE_ONPUSH_CASE_ID,
        'wrong required public table delegation');
    }
    const runtime = validatePackedConsumerRun({root, request});
    demand(runtime.ok, runtime.detail);
    const selected = runtime.observation.cases.find(row => row.case_id === registered.caseId);
    const harness = runtime.observation.extra?.harness;
    if (entry.sha === SELECT_FOCUS_SHA) {
      demand(selected?.legacy_harness_passed === true && harness?.selectOpened === true && harness.selectClosed === true
        && harness.viewportShared === true && isDeepStrictEqual(harness.selectFocusClick, selected.observation)
        && packedSelectFocusClickCase(selected.observation).result === 'pass', 'insufficient select focus/click observations');
    } else {
      demand(selected && isDeepStrictEqual(harness?.[registered.harness], selected.observation)
        && registered.evaluate(selected.observation).result === 'pass', 'insufficient ' + registered.kind + ' observations');
    }
    return {ok: true, detail: 'Required behavior observed in this run; complete G11 judgment and final sealing remain separate.',
      invocation_id: runtime.invocation_id, output: runtime.output, library: runtime.library};
  } catch (error) {
    return {ok: false, detail: error.message};
  }
}
