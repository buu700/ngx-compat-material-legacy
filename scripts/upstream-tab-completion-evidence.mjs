/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {gunzipSync} from 'node:zlib';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {validateNativeMotionRun} from './upstream-native-motion-run-evidence.mjs';
export const TAB_COMPLETION_SHA = '0064b4218b375b30b65bf1c13530d8620f20d980';
export const TAB_COMPLETION_KIND = 'native-required-individual-tab-completion';
const patch = '8c5c7c7e24faef142a0320faf51bd61cecd10c7e06eeeeb15ddc0f53cb654083';
const engines = ['chromium', 'firefox', 'webkit'], runtimes = ['zoneful', 'zoneless'], modes = ['enabled', 'provider-disabled', 'reduced', 'zero'];
const peers = {
  main: {version: '22.1.7', path: 'compatibility/rc/tab-completion-peer-sources/22.1.7.tabs.mjs.gz',
    sha256: 'bd6314ac06a0eed5cf0fe3a8e4c5cf69526df9541df5e40dc01a406af257fb09', stored_sha256: 'e00c74243de00b30a8d1491be70a8c8db28a84c0b839e84826db59b5b441d7f4', bytes: 134401},
  '21.x': {version: '21.2.14', path: 'compatibility/rc/tab-completion-peer-sources/21.2.14.tabs.mjs.gz',
    sha256: '5a798a54a86a966501288531be98f12338b28463543324c2b16e9756b64b418d', stored_sha256: 'a30b867e686a96fba2b3ef62d784e323fdacd753e069222258427188d77c7463', bytes: 134073},
};
const members = [
  'scripts/upstream-tab-completion-evidence.mjs', 'scripts/upstream-native-motion-run-evidence.mjs', 'scripts/upstream-packed-run-evidence.mjs',
  'scripts/check-upstream-audit-disposition.mjs', 'scripts/rc-verify.py', 'scripts/native-motion-acceptance.mjs', 'scripts/native-motion-roster.mjs',
  'scripts/native-motion-run.mjs', 'scripts/native-motion-page.mjs', 'scripts/native-motion-consumer.ts', 'scripts/browser-matrix-roster.mjs',
  'compatibility/rc/matrices/full-verify.json', 'compatibility/rc/matrices/library-exports.json', 'projects/ngx-material-legacy/package.json',
  'projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts', 'projects/ngx-material-legacy/legacy-tabs/tab-body.ts',
  'projects/ngx-material-legacy/legacy-tabs/internal/tab-group-base.ts', 'projects/ngx-material-legacy/legacy-tabs/tab-group.html',
  'projects/ngx-material-legacy/legacy-tabs/tab-body.html', 'projects/ngx-material-legacy/legacy-tabs/tab-body.scss',
  'reference/material-16.2.14/component-motion-sources/tabs/tab-body.ts',
];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const demand = (value, message) => {if (!value) throw new Error(message);};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sameIds = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
function caseIds(line) {
  const ids = [], add = suffix => {for (const runtime of runtimes) for (const engine of engines) ids.push(`native-motion/${line}/${engine}/${runtime}/${suffix}`);};
  for (const mode of modes) add('enabled-disabled-reduced/tabs/' + mode);
  add('interruption-destruction/tabs/rapid-reversal');
  for (const mode of modes) add('exactly-once-notification/tabs/animationDone/' + mode);
  return ids;
}
export function tabCompletionRequirements(sha, line) {
  const peer = Object.hasOwn(peers, line) ? peers[line] : null;
  return sha === TAB_COMPLETION_SHA && peer ? structuredClone({sha, patch, kind: 'historical-tab-completion-state-filter', engines, runtimes, modes,
    case_ids: caseIds(line), members: [...members, peer.path],
    peer_reference: {package: '@angular/material', version: peer.version, path: peer.path, sha256: peer.sha256, member: 'unmodified peer tabs module'}}) : null;
}
export function requiresTabCompletion(entry, proof) {
  return entry?.sha === TAB_COMPLETION_SHA || proof?.proof_kind === TAB_COMPLETION_KIND
    || (object(proof) && Object.hasOwn(proof, 'tab_completion_behavior'));
}
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const eventOkay = (event, trusted, type) => object(event) && event.type === type && event.trusted === trusted
  && event.property === 'transform' && event.same_target === true && event.connected === true && finite(event.at_ms) && finite(event.elapsed_ms);
/** Default enabled motion must actually reach a trusted native end before its
 * public completion. The two deliberately synthetic duplicate ends stay separate. */
export function tabCompletionMotionOkay(observed, mode) {
  if (!modes.includes(mode) || !object(observed) || observed.selector !== '.mat-tab-body-content' || observed.selectorMatches !== true
    || observed.finalState !== 'visible' || observed.notifications !== 1 || observed.detectChangesCalls !== 0
    || observed.duplicateEndEventsDispatched !== true || !finite(observed.durationMs)) return false;
  const trace = observed.native_transition;
  if (!object(trace) || trace.same_target_after !== true || !finite(trace.completion_at_ms)
    || trace.cleanup?.subscription_closed !== true || trace.cleanup?.listeners_removed !== true
    || !Array.isArray(trace.duplicate_end_controls) || trace.duplicate_end_controls.length !== 2
    || !trace.duplicate_end_controls.every(event => eventOkay(event, false, 'transitionend')
      && event.elapsed_ms === 0 && event.at_ms >= trace.completion_at_ms) || !Array.isArray(trace.trusted_events)) return false;
  if (mode !== 'enabled') return observed.durationMs === 0 && trace.trusted_events.length === 0;
  const [start, end] = trace.trusted_events;
  return observed.durationMs >= 400 && trace.trusted_events.length === 2 && eventOkay(start, true, 'transitionstart')
    && eventOkay(end, true, 'transitionend') && start.elapsed_ms === 0 && end.elapsed_ms >= 400
    && Math.abs(end.elapsed_ms - observed.durationMs) <= 2 && end.at_ms >= start.at_ms
    && trace.completion_at_ms >= 400 && trace.completion_at_ms >= end.at_ms;
}
export function tabCompletionObservedOkay(rows, line) {
  if (!Object.hasOwn(peers, line) || !Array.isArray(rows)) return false;
  const expected = caseIds(line), selected = rows.filter(row => typeof row?.case_id === 'string' && row.case_id.split('/')[5] === 'tabs');
  if (!sameIds(selected.map(row => row.case_id), expected) || !selected.every(row => row.result === 'pass' && object(row.observation))) return false;
  const byId = new Map(selected.map(row => [row.case_id, row.observation]));
  for (const engine of engines) for (const runtime of runtimes) {
    const prefix = `native-motion/${line}/${engine}/${runtime}/`;
    for (const mode of modes) {
      const motion = byId.get(prefix + 'enabled-disabled-reduced/tabs/' + mode), notification = byId.get(prefix + 'exactly-once-notification/tabs/animationDone/' + mode);
      if (!tabCompletionMotionOkay(motion, mode) || !isDeepStrictEqual(motion, notification)) return false;
    }
    const rapid = byId.get(prefix + 'interruption-destruction/tabs/rapid-reversal');
    if (!object(rapid) || rapid.detectChangesCalls !== 0 || !finite(rapid.durationMs) || rapid.durationMs < 400
      || rapid.finalState !== 'visible' || rapid.animating !== false) return false;
  }
  return true;
}
export function validateTabCompletion({root, entry, proof, request}) {
  try {
    const line = request?.line ?? proof?.affected_branches?.[0], registered = tabCompletionRequirements(entry?.sha, line), scope = proof?.tab_completion_behavior;
    demand(registered && proof?.proof_kind === TAB_COMPLETION_KIND && proof.diff_sha256 === patch, 'unregistered tab completion subject');
    demand(object(scope) && scope.kind === registered.kind && isDeepStrictEqual(scope.engines, engines) && isDeepStrictEqual(scope.runtimes, runtimes)
      && isDeepStrictEqual(scope.modes, modes) && isDeepStrictEqual(scope.case_ids, registered.case_ids), 'wrong tab completion scope');
    demand(isDeepStrictEqual(proof.affected_branches, [line]) && isDeepStrictEqual(proof.peer_reference, registered.peer_reference), 'wrong tab completion peer reference');
    demand(Array.isArray(scope.source_members) && sameIds(scope.source_members.map(row => row?.path), registered.members), 'incomplete tab completion source scope');
    for (const member of scope.source_members) demand(/^[0-9a-f]{64}$/.test(member.sha256)
      && hash(readEvidenceMember(root, member.path)) === member.sha256, 'stale tab completion source member');
    const peer = peers[line], stored = readEvidenceMember(root, peer.path); demand(hash(stored) === peer.stored_sha256, 'wrong tab completion peer bytes');
    const raw = gunzipSync(stored); demand(raw.length === peer.bytes && hash(raw) === peer.sha256, 'wrong tab completion peer source');
    const native = validateNativeMotionRun({root, request}); demand(native.ok, native.detail);
    demand(tabCompletionObservedOkay(native.observation.cases, line), 'insufficient tab completion native observations');
    return {ok: true, detail: 'All54 tab motion/completion/reversal cells passed in the full306 same-run native matrix, with trusted enabled transition ends before completion, duplicate-end suppression, matched raw notification states and observer cleanup. Full floors and G11 remain separate.',
      invocation_id: native.invocation_id, output: native.output, library: native.library, packed_consumer: native.packed_consumer,
      required_cases: registered.case_ids};
  } catch (error) {return {ok: false, detail: error.message};}
}
