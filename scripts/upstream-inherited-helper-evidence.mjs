/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';

const common = [
  {path: 'scripts/key-manager-public-subjects.mjs', sha256: '904eb0aca144a2d0b002572a1a671ffb021f5a06b5a09ad3514f5182f81b9f18'},
  {path: 'scripts/element-ref-use-review.mjs', sha256: '93d9658d61b5345210975fbeacc99cfdc1c97be488af34c3476b93597af8fbea'},
];
const scopes = new Map([
  ['737c7a8f1a5bc4df0e790d3ecdd227f8342499f8', {
    kind: 'complete-public-predicate-and-exact-owned-handler-replay',
    patch: '3b851d3ccee1db729cd51680182d3832947fec5533e30bb18f851d6813325e20',
    id: 'compatibility/rc/screen-reader-event-source-diagnostic.json',
    producer: {path: 'scripts/screen-reader-event-use-review.mjs', sha256: '5fea3e4a4887358fc62bdaf86ca80da2bfb2014056aed276b8708dd87bd4777b'},
    fn: 'reviewScreenReaderEventUses', names: ['isFakeMousedownFromScreenReader', 'isFakeTouchstartFromScreenReader'],
    files: ['legacy-menu/internal/menu-trigger-base.ts', 'legacy-core/ripple/ripple-renderer.ts'],
    member: 'package/fesm2022/_fake-event-detection-chunk.mjs',
    digests: {main: 'c0a3ee4354b15e99157782330c2fa18e026943c189b6f3c46496b4dc400e01cf', '21.x': 'c0a3ee4354b15e99157782330c2fa18e026943c189b6f3c46496b4dc400e01cf'},
  }],
  ['e43c059ac313fca732443c6c73cf397f0cf446f3', {
    kind: 'complete-reviewed-helper-hunk-and-tagged-owned-method-replay',
    patch: 'b7f43524551ae931446c984057ad09ac32b52f7fbbff7c1c2e7ab780d3760695',
    id: 'compatibility/rc/aria-reference-source-diagnostic.json',
    producer: {path: 'scripts/aria-reference-use-review.mjs', sha256: 'c012941e4f7ae523d01e68b3a9d6ca5f54adc963358830ea6d46cf17285c3254'},
    fn: 'reviewAriaReferenceUses', names: ['addAriaReferencedId', 'removeAriaReferencedId'],
    files: ['legacy-autocomplete/internal/autocomplete-trigger-base.ts', 'legacy-select/internal/select-base.ts'],
    member: 'package/fesm2022/a11y.mjs',
    digests: {main: '664e6e790f99f67c8e730bfd03bcc8d98349d8872b7df720b6f3fe67ef1768e8', '21.x': '35ad4762a2506389b71e72c299b93f0c15d6a9c0ceb1e7834673107d8e96640d'},
  }],
]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const demand = (value, message) => {if (!value) throw new Error(message);};
const lines = ['original', 'main', '21.x'];
const sameIds = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
export function inheritedHelperRequirements(sha, line) {
  const scope = scopes.get(sha);
  return scope && ['main', '21.x'].includes(line) ? structuredClone({sha, ...scope,
    installed_member: {path: scope.member, sha256: scope.digests[line]}, source_members: [scope.producer, ...common]}) : null;
}

/** Structural admission of observations from the fixed producer below. This
 * function alone is not execution evidence and is never used alone by the gate. */
export function inspectInheritedHelperObservation({root, sha, line, observation: o}) {
  const scope = inheritedHelperRequirements(sha, line);
  demand(scope && o?.schema_version === 1 && o.upstream_sha === sha && o.line === line
    && o.patch_sha256 === scope.patch && o.public_subjects_sha256 === '97733629aa03a8faa5dfa88ccf96efa9f1cb3b40914f65efed7123870eedc0fb'
    && o.runtime_override_used === false && o.source_override_used === false && o.g11_claim === 'not-passed', 'wrong actual helper observation subject');
  demand(Array.isArray(o.contracts) && sameIds(o.contracts.map(row => row.line), lines), 'incomplete original/minimum helper contracts');
  const current = o.contracts.find(row => row.line === line), version = line === 'main' ? '22.1.7' : '21.2.14';
  demand(current.cdk_version === version && scope.names.every(name => current.helpers?.some(helper => helper.name === name
    && helper.runtime_path === '@angular/cdk/' + scope.member.slice('package/'.length)
    && helper.runtime_sha256 === scope.installed_member.sha256)), 'wrong actual installed helper member');
  const expected = scope.files.flatMap(file => scope.names.map(symbol => JSON.stringify([file, '@angular/cdk/a11y', symbol])));
  demand(Array.isArray(o.cases) && sameIds(o.cases.map(row => JSON.stringify([row.file, row.module, row.symbol])), expected)
    && o.cases.every(row => hash(readEvidenceMember(root, 'projects/ngx-material-legacy/' + row.file)) === row.candidate_source_sha256), 'wrong current helper callers');
  if (sha.startsWith('737c7a8')) {
    demand(o.original_already_has_detail_based_fix === true && Array.isArray(o.helpers)
      && sameIds(o.helpers.map(row => row.line), lines)
      && o.helpers.every(row => row.mouse_cases === 16 && row.touch_cases === 153 && row.layout_coordinate_reads === 0)
      && Array.isArray(o.delegations) && sameIds(o.delegations.map(row => row.line), lines)
      && o.delegations.every(row => row.mouse_cases === 36 && row.touch_cases === 8 && row.exact_owned_handlers_replayed === true
        && row.whole_angular_class_constructed === false && row.native_focus_or_view_executed === false)
      && Array.isArray(o.tagged_menu_bodies) && o.tagged_menu_bodies.length === 2
      && o.tagged_menu_bodies.every(row => row.owned_body_matches_tag === true), 'insufficient fake-event predicate/handler observations');
  } else {
    demand(Array.isArray(o.behaviors) && sameIds(o.behaviors.map(row => row.line), ['main', '21.x'])
      && o.behaviors.every(row => row.primitive_string_cases === 192 && row.trim_once_checks === 2 && row.repeated_operation_idempotent === true)
      && Array.isArray(o.delegations) && sameIds(o.delegations.map(row => JSON.stringify([row.line, row.file])),
        lines.flatMap(subject => scope.files.map(file => JSON.stringify([subject, file]))))
      && o.delegations.every(row => row.ownership_transitions === 8 && row.whole_component_or_native_DOM_executed === false)
      && Array.isArray(o.tagged_ownership_methods) && o.tagged_ownership_methods.length === 2, 'insufficient ARIA helper/ownership observations');
  }
}

/** Fresh primitive/protocol execution. Never substitutes for packed/native
 * component, browser, assistive technology or runtime/compiler/RxJS floor gates. */
export function validateInheritedHelperExecution({root, entry, proof, line}) {
  try {
    const scope = inheritedHelperRequirements(entry?.sha, line);
    demand(scope && proof?.proof_kind === scope.kind && proof.diff_sha256 === scope.patch
      && isDeepStrictEqual(proof.affected_branches, [line]), 'wrong inherited helper review scope');
    demand(isDeepStrictEqual(proof.installed_member, scope.installed_member), 'wrong authenticated inherited helper member');
    demand(proof.reachable_behavior?.kind === 'executed-delegation' && proof.reachable_behavior.id === scope.id, 'wrong inherited helper delegation');
    const manifest = JSON.parse(readEvidenceMember(root, 'projects/ngx-material-legacy/package.json'));
    demand(manifest.version.startsWith(line === 'main' ? '22.' : '21.'), 'wrong inherited helper checkout branch');
    for (const member of scope.source_members) demand(hash(readEvidenceMember(root, member.path)) === member.sha256, 'unreviewed inherited helper producer: ' + member.path);
    // Only finite, reviewed module/function names enter this program; no input
    // supplies a command, script path, callback, observation or success flag.
    const program = `import {${scope.fn}} from './${scope.producer.path}'; console.log(JSON.stringify(await ${scope.fn}({root:process.cwd()})));`;
    const child = spawnSync(process.execPath, ['--experimental-vm-modules', '--input-type=module', '-e', program],
      {cwd: root, env: process.env, encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024});
    demand(child.status === 0 && !child.error && child.signal === null, 'inherited helper execution failed: ' + (child.error?.message || child.stderr || child.status).toString().slice(-700));
    const observation = JSON.parse(child.stdout);
    inspectInheritedHelperObservation({root, sha: entry.sha, line, observation});
    return {ok: true, detail: 'Authenticated public original/minimum helpers and exact tagged owned method protocols executed now; full native/packed/floor and G11 gates remain separate.',
      execution: 'authenticated-public-module-and-tagged-owned-method-protocols', observation_sha256: hash(child.stdout), observation,
      actual_native_packed_or_floor_qualified: false};
  } catch (error) {return {ok: false, detail: error.message};}
}
