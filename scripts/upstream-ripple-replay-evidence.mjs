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
import {validateBrowserMatrixRun} from './upstream-browser-run-evidence.mjs';
import {rippleHydrationApplication, rippleHydrationReplayOkay} from './ripple-hydration-application.mjs';
export const RIPPLE_REPLAY_SHA = '10db3e30f94c8cfd160679da7ba22e4c6c0dd8bb';
export const RIPPLE_REPLAY_KIND = 'browser-required-individual-ripple-replay';
const patch = 'c5a3cab8777ece5990a5e00eaa506a871971176c33e8ade45277d7a2a169b037';
const namespacePath = 'compatibility/rc/material-public-subjects.json';
const namespaceHash = 'f4e494ce1f71c068e801d086e4017fc86ea721c842d5e7ac161d3d08d1434ae3';
const peers = {
  main: {core:'22.1.7', cdk:'22.1.7', helper_has_replay_catch:true,
    helper:'ba6a8afdd5fde4736ff8fe14ed7c2caaf06041a247ab20d083b7fc7bc4309f8a',
    caller:'a5da707a2f05673bccfe9fe92f4384ddff0d4d5d7c77bd7cf65ad62eeaa339ae'},
  '21.x': {core:'21.2.23', cdk:'21.2.14', helper_has_replay_catch:false,
    helper:'98455cf5ae4c2fbc66b0b5b2875549e6a453df0587d536ef7b140c48a351f228',
    caller:'37a91cadf041513ac559096dbaf6fb708772fee939cc00e1df23aba1f01540f3'},
};
const members = [
  'scripts/upstream-ripple-replay-evidence.mjs','scripts/upstream-browser-run-evidence.mjs','scripts/upstream-packed-run-evidence.mjs',
  'scripts/check-upstream-audit-disposition.mjs','scripts/rc-verify.py','scripts/browser-matrix-acceptance.mjs','scripts/browser-matrix-roster.mjs',
  'scripts/browser-required-cells.mjs','scripts/ripple-hydration-replay.mjs','scripts/ripple-hydration-application.mjs',
  'scripts/ripple-hydration-component-fixture.mjs','scripts/ripple-native-event-probe.mjs','scripts/ripple-public-replay-probe.mjs',
  'compatibility/rc/matrices/full-verify.json','compatibility/rc/matrices/library-exports.json','testing/legacy-runner/historical-inventory.json',
  'projects/ngx-material-legacy/package.json','projects/ngx-material-legacy/legacy-core/public-api.ts',
  'projects/ngx-material-legacy/legacy-core/ripple/index.ts','projects/ngx-material-legacy/legacy-core/ripple/ripple-renderer.ts',
  'projects/ngx-material-legacy/legacy-core/ripple/ripple-event-manager.ts','projects/ngx-material-legacy/legacy-core/ripple/ripple-ref.ts',
  'projects/ngx-material-legacy/legacy-core/internal/dom/shadow-dom.ts',namespacePath,
];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const demand = (value,message) => {if (!value) throw Error(message);};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sameIds = (actual,expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
const peerPath = digest => `compatibility/rc/material-public-source-members/${digest}.gz`;
export function rippleReplayRequirements(sha,line) {
  const peer = Object.hasOwn(peers,line) ? peers[line] : null;
  return sha === RIPPLE_REPLAY_SHA && peer ? structuredClone({sha,patch,kind:'owned-replay-fallback-and-distinct-public-native-route',
    runtimes:['zoneful','zoneless'],members:[...members,peerPath(peer.helper),peerPath(peer.caller)],
    peer_reference:{public_route:'@angular/material/core#MatRipple', core_version:peer.core, cdk_version:peer.cdk,
      material_version:peer.cdk, helper_has_replay_catch:peer.helper_has_replay_catch,
      helper:{path:peerPath(peer.helper),sha256:peer.helper},caller:{path:peerPath(peer.caller),sha256:peer.caller}}}) : null;
}
export function requiresRippleReplay(entry,proof) {
  return entry?.sha === RIPPLE_REPLAY_SHA || proof?.proof_kind === RIPPLE_REPLAY_KIND
    || (object(proof) && Object.hasOwn(proof,'ripple_replay_behavior'));
}
/** Re-evaluate the complete actual replay records, not their ok labels. The
 * controlled21 native failure is diagnostic; the supported replay route is separate. */
export function rippleReplayObservedOkay(report,{line,runId,librarySha256,producerSha256}) {
  if (!Object.hasOwn(peers,line) || !object(report) || report.schema_version !== 1 || report.line !== line
    || report.run_id !== runId || report.tarball_sha256 !== librarySha256 || report.producer_sha256 !== producerSha256
    || report.ok !== true || report.error != null || typeof report.node !== 'string' || !/^v\d+\.\d+\.\d+$/.test(report.node)
    || !Array.isArray(report.results) || !sameIds(report.results.map(row => row?.runtime),['zoneful','zoneless'])) return false;
  return report.results.every(row => {
    const spec = rippleHydrationApplication(line,row.runtime), browser = row.browser;
    const sourceHashes = Object.fromEntries(Object.entries(spec.files).map(([path,source]) => [path,hash(source)]));
    const replay = row.replayed, live = row.live;
    return row.ok === true && /^[0-9a-f]{64}$/.test(row.lock_sha256 ?? '')
      && isDeepStrictEqual(row.dependencies,spec.dependencies) && isDeepStrictEqual(row.source_sha256,sourceHashes)
      && object(browser) && browser.launched === true && browser.engine === 'chromium' && browser.protocol === 'cdp'
      && /^(?:Headless)?Chrome\//.test(browser.product ?? '') && typeof browser.binary === 'string' && browser.binary.length > 0
      && Number.isInteger(browser.port) && browser.port > 0 && browser.port <= 65535 && rippleHydrationReplayOkay(row,line)
      && live.actual_peer_directive_present === true && live.actual_owned_renderer_present === true
      && isDeepStrictEqual(live.deliveries.slice(0,2),replay.deliveries)
      && live.deliveries.slice(2).every((event,index) => event.type === ['mousedown','click'][index] && event.peer_present === true);
  });
}
export function validateRippleReplay({root,entry,proof,request}) {
  try {
    const line = request?.line ?? proof?.affected_branches?.[0], registered = rippleReplayRequirements(entry?.sha,line);
    const scope = proof?.ripple_replay_behavior;
    demand(registered && proof?.proof_kind === RIPPLE_REPLAY_KIND && proof.diff_sha256 === patch,'unregistered ripple replay subject');
    demand(object(scope) && scope.kind === registered.kind && isDeepStrictEqual(scope.runtimes,registered.runtimes),'wrong ripple replay scope');
    demand(isDeepStrictEqual(proof.affected_branches,[line]) && isDeepStrictEqual(proof.peer_reference,registered.peer_reference),'wrong ripple replay peer reference');
    demand(Array.isArray(scope.source_members) && sameIds(scope.source_members.map(row => row?.path),registered.members),'incomplete ripple replay source scope');
    for (const member of scope.source_members) demand(/^[0-9a-f]{64}$/.test(member.sha256)
      && hash(readEvidenceMember(root,member.path)) === member.sha256,'stale ripple replay source member');
    const namespace = readEvidenceMember(root,namespacePath);demand(hash(namespace) === namespaceHash,'wrong ripple replay namespace');
    const subject = JSON.parse(namespace).subjects.find(row => row.line === line), peer = peers[line];
    for (const digest of [peer.helper,peer.caller]) {
      const member = subject?.members.find(row => row.sha256 === digest && row.path === peerPath(digest));
      demand(member && member.compression === 'gzip','missing ripple replay peer member');
      const stored = readEvidenceMember(root,member.path);demand(hash(stored) === member.stored_sha256,'wrong ripple replay peer archive');
      const bytes = gunzipSync(stored);demand(bytes.length === member.bytes && hash(bytes) === digest,'wrong ripple replay peer source');
    }
    const browser = validateBrowserMatrixRun({root,request});demand(browser.ok,browser.detail);
    demand(rippleReplayObservedOkay(browser.observation.hydration_replay,{line,runId:request.binding.run_id,
      librarySha256:browser.library.sha256,producerSha256:hash(readEvidenceMember(root,'scripts/ripple-hydration-replay.mjs'))}),
    'insufficient genuine ripple replay/native route observations');
    return {ok:true,detail:'Both exact-floor packed applications passed genuine Angular replay and live input with owned target fallback, distinct public no-launch replay/native route, authenticated source identities and cleanup. The21 controlled native fault remains explicit, not an inherited fix or exception; full floors and G11 are separate.',
      invocation_id:browser.invocation_id,output:browser.output,library:browser.library,packed_consumer:browser.packed_consumer,
      required_runtimes:registered.runtimes,peer_reference:registered.peer_reference};
  } catch (error) {return {ok:false,detail:error.message};}
}
