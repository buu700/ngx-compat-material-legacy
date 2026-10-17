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
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {validateBrowserMatrixRun} from './upstream-browser-run-evidence.mjs';
import {CONTENT_OBSERVER_SHA, CONTENT_OBSERVER_STAGES, contentObserverNativeOkay} from './content-observer-native-contract.mjs';
export const CONTENT_OBSERVER_KIND = 'browser-required-individual-content-observer';
export const CONTENT_OBSERVER_CASE_ID = 'browser-diagnostic/content-observer/legacy-header-native';
const patch = '00c3c8215628119ebf9f173e7379adcd4f3b311b7cccbbc9a243b36254a3eea8';
const peers = {
  "main": {
    "version": "22.1.7",
    "runtime": {
      "package": "@angular/cdk",
      "archive_member": "package/fesm2022/observers.mjs",
      "module_path": "fesm2022/observers.mjs",
      "sha256": "8991cf56e1d55d6e784280fb658546b15999a4ea803e599a6a6c905fc7c47746",
      "bytes": 7328,
      "path": "compatibility/rc/material-public-source-members/8991cf56e1d55d6e784280fb658546b15999a4ea803e599a6a6c905fc7c47746.gz",
      "compression": "gzip",
      "stored_sha256": "eb5422e94b63995bebda6d680d589f431959483297091c3e77ac87f275e15d0e"
    },
    "types": {
      "package": "@angular/cdk",
      "archive_member": "package/types/observers.d.ts",
      "module_path": "types/observers.d.ts",
      "sha256": "5f0573712362469c94921044786089b44009577af1143942f6a3991d9e0eeacb",
      "bytes": 3581,
      "path": "compatibility/rc/material-public-source-members/5f0573712362469c94921044786089b44009577af1143942f6a3991d9e0eeacb.gz",
      "compression": "gzip",
      "stored_sha256": "d2e0ca17e700e6fdf38b4db3dcadfc745ad7aa9dcf885561888189019465bf7f"
    }
  },
  "21.x": {
    "version": "21.2.14",
    "runtime": {
      "package": "@angular/cdk",
      "archive_member": "package/fesm2022/observers.mjs",
      "module_path": "fesm2022/observers.mjs",
      "sha256": "f709af3e7a617ec0ffa95ed916683c50c777ba14f77ed4bee2e27afe75f88329",
      "bytes": 7596,
      "path": "compatibility/rc/material-public-source-members/f709af3e7a617ec0ffa95ed916683c50c777ba14f77ed4bee2e27afe75f88329.gz",
      "compression": "gzip",
      "stored_sha256": "145e0cc71e2721460b3dd5bbd50da324a61c7a102cab9315812e3e4098bdf957"
    },
    "types": {
      "package": "@angular/cdk",
      "archive_member": "package/types/observers.d.ts",
      "module_path": "types/observers.d.ts",
      "sha256": "d342fefc7d087e22258016a304daa4f5aa9321d0425d3699665c4c0d3a94bcc3",
      "bytes": 3687,
      "path": "compatibility/rc/material-public-source-members/d342fefc7d087e22258016a304daa4f5aa9321d0425d3699665c4c0d3a94bcc3.gz",
      "compression": "gzip",
      "stored_sha256": "e1222db4792a2b267a9bab5afb17aaf6d546b972f654329db9892c136a4ceaec"
    }
  }
};
const members = [
  'scripts/upstream-content-observer-evidence.mjs', 'scripts/upstream-browser-run-evidence.mjs', 'scripts/upstream-packed-run-evidence.mjs',
  'scripts/check-upstream-audit-disposition.mjs', 'scripts/rc-verify.py', 'scripts/packed-consumer-evidence.mjs',
  'scripts/browser-matrix-acceptance.mjs', 'scripts/browser-matrix-roster.mjs', 'scripts/browser-required-cells.mjs',
  'scripts/browser-surface-families.mjs', 'scripts/content-observer-native-contract.mjs',
  'compatibility/rc/matrices/full-verify.json', 'compatibility/rc/matrices/library-exports.json', 'testing/legacy-runner/historical-inventory.json',
  'projects/ngx-material-legacy/package.json', 'projects/ngx-material-legacy/legacy-tabs/tabs-module.ts',
  'projects/ngx-material-legacy/legacy-tabs/public-api.ts', 'projects/ngx-material-legacy/legacy-tabs/tab-group.ts',
  'projects/ngx-material-legacy/legacy-tabs/tab-header.ts', 'projects/ngx-material-legacy/legacy-tabs/tab-header.html',
  'projects/ngx-material-legacy/legacy-tabs/tab-header.scss', 'projects/ngx-material-legacy/legacy-tabs/internal/tab-group-base.ts',
  'projects/ngx-material-legacy/legacy-tabs/internal/tab-header-base.ts', 'projects/ngx-material-legacy/legacy-tabs/internal/paginated-tab-header.ts',
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const demand = (value, message) => {if (!value) throw new Error(message);};
const sameIds = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
export function contentObserverRequirements(sha, line) {
  const peer = Object.hasOwn(peers, line) ? peers[line] : null;
  return sha === CONTENT_OBSERVER_SHA && peer ? structuredClone({sha, patch, kind: 'native-public-comment-filter-and-owned-header',
    case_ids: [CONTENT_OBSERVER_CASE_ID], stages: [...CONTENT_OBSERVER_STAGES], runtimes: ['zoneful', 'zoneless'],
    members: [...members, peer.runtime.path, peer.types.path],
    installed_member: {package: '@angular/cdk', version: peer.version, path: peer.runtime.path, sha256: peer.runtime.sha256, member: 'ContentObserver.observe / CdkObserveContent'},
    public_declaration: {path: peer.types.path, sha256: peer.types.sha256},
    consumer_peer: {package: '@angular/cdk', version: peer.version, runtime_member: peer.runtime.module_path, runtime_sha256: peer.runtime.sha256,
      types_member: peer.types.module_path, types_sha256: peer.types.sha256}}) : null;
}
/** This subject cannot evade runtime requirements by relabeling a proof or row. */
export function requiresContentObserver(entry, proof) {
  return entry?.sha === CONTENT_OBSERVER_SHA || proof?.proof_kind === CONTENT_OBSERVER_KIND
    || (object(proof) && Object.hasOwn(proof, 'content_observer_behavior'));
}
/** Complete current clean same-run packed/browser prerequisites, real installed
 * peer identity and both meaningful native raw protocols. No status-only path. */
export function validateContentObserver({root, entry, proof, request}) {
  try {
    const line = request?.line ?? proof?.affected_branches?.[0], registered = contentObserverRequirements(entry?.sha, line);
    const scope = proof?.content_observer_behavior;
    demand(registered && entry.final_disposition === 'inherited' && proof?.proof_kind === CONTENT_OBSERVER_KIND
      && proof.diff_sha256 === patch, 'unregistered inherited content observer subject');
    demand(object(scope) && scope.kind === registered.kind && isDeepStrictEqual(scope.runtimes, registered.runtimes)
      && isDeepStrictEqual(scope.case_ids, registered.case_ids) && isDeepStrictEqual(scope.stages, registered.stages), 'wrong content observer scope');
    demand(isDeepStrictEqual(proof.affected_branches, [line]) && isDeepStrictEqual(proof.installed_member, registered.installed_member)
      && isDeepStrictEqual(proof.public_declaration, registered.public_declaration), 'wrong content observer installed member');
    demand(proof.reachable_behavior?.kind === 'executed-delegation' && proof.reachable_behavior.id === CONTENT_OBSERVER_CASE_ID, 'wrong content observer delegation');
    demand(Array.isArray(scope.source_members) && sameIds(scope.source_members.map(row => row?.path), registered.members), 'incomplete content observer source scope');
    for (const member of scope.source_members) demand(/^[0-9a-f]{64}$/.test(member.sha256)
      && hash(readEvidenceMember(root, member.path)) === member.sha256, 'stale content observer source member');
    for (const member of [peers[line].runtime, peers[line].types]) {
      const stored = readEvidenceMember(root, member.path); demand(hash(stored) === member.stored_sha256, 'wrong authenticated content observer peer bytes');
      const raw = gunzipSync(stored); demand(raw.length === member.bytes && hash(raw) === member.sha256, 'wrong authenticated content observer peer source');
    }
    const browser = validateBrowserMatrixRun({root, request}); demand(browser.ok, browser.detail);
    for (const runtime of registered.runtimes) {
      const raw = browser.observation.closeout_diagnostics[runtime].observation;
      demand(isDeepStrictEqual(raw.content_observer_peer, registered.consumer_peer), 'wrong ' + runtime + ' actually installed content observer peer');
      demand(contentObserverNativeOkay(raw.content_observer, runtime === 'zoneless'), 'insufficient ' + runtime + ' native content observer observations');
    }
    return {ok: true, detail: 'Both native runtimes observed actual public minimum-peer comment/text filtering, owned legacy header text/cache/pagination delegation and shared/unsubscribe/destroy/reobserve cleanup in this complete same-artifact packed/browser run. Other callers, engines, AT, enabled motion, floors and full G11 remain separate.',
      invocation_id: browser.invocation_id, output: browser.output, library: browser.library, packed_consumer: browser.packed_consumer,
      required_runtimes: registered.runtimes, required_cases: registered.case_ids, required_stages: registered.stages};
  } catch (error) {return {ok: false, detail: error.message};}
}
