/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {autocompleteSelectionHistoricalScopes} from './autocomplete-selection-native-scopes.mjs';
import {isDeepStrictEqual} from 'node:util';
import {readEvidenceMember, validatePackedConsumerRun} from './upstream-packed-run-evidence.mjs';
import {CHIP_LIST_SOURCE,CHIP_LIST_REFERENCE,CHIP_LIST_ORIGINALS,inspectChipListFocusContract} from './chip-list-focus-contract.mjs';
import {chipLifecycleHistoricalScopes,inspectChipLifecycleCurrentContract,validateChipLifecycleBrowserRun} from './upstream-chip-lifecycle-admission.mjs';

export const HISTORICAL_BEHAVIOR_KIND = 'historical-required-individual-behavior';
const checkId = 'historical-legacy-artifact';
// Expansion requires reviewing this finite contract alongside its indexed names.
const requiredCaseCount = 2236;
const casePrefix = checkId + '/original-and-shared-cases/';
const commonMembers = [
  'scripts/rc-test-legacy-family.mjs', 'scripts/historical-case-roster.mjs',
  'scripts/resolve-run-library.mjs', 'scripts/rc-verify.py',
  'scripts/check-upstream-audit-disposition.mjs', 'scripts/upstream-historical-behavior-evidence.mjs',
  'testing/legacy-runner/build.mjs', 'testing/legacy-runner/adapt-spec.mjs',
  'testing/legacy-runner/entry.ts', 'testing/legacy-runner/init-test-env.ts',
  'testing/legacy-runner/karma.conf.cjs', 'testing/legacy-runner/karma-legacy-json-reporter.cjs',
  'testing/legacy-runner/historical-inventory.json', 'testing/legacy-runner/historical-specs.json',
  'projects/ngx-material-legacy/internal/testing/owned-test-events.ts',
  'projects/ngx-material-legacy/internal/testing/owned-animation-modules.ts',
  'compatibility/rc/matrices/full-verify.json',
];
const nativeCase = (path, index, full_name) => ({
  case_id: casePrefix + 'src/material/' + path + '#' + index,
  historical_path: 'src/material/' + path,
  candidate: 'projects/ngx-material-legacy/' + path,
  full_name,
});
// Existing regression additions are required by the complete historical run.
// They supplement every original named scope; no prior requirement is replaced.
const retainedRegressionCases = [
  nativeCase('legacy-autocomplete/autocomplete.spec.ts', 172, 'MatAutocomplete > should not throw errors when closing without options'),
  nativeCase('legacy-chips/chip-list.spec.ts', 87, 'MatChipList > should clear a destroyed active chip when the list becomes empty'),
  nativeCase('legacy-table/table-data-source.spec.ts', 6, 'MatTableDataSource > sort > should be able to correctly sort an array of strings and numbers with left zero'),
  nativeCase('legacy-chips/chip.spec.ts', 34, "MatChip > owned blur lifecycle > should restore DOM focus while an earlier blur is pending"),
  nativeCase('legacy-chips/chip.spec.ts', 35, "MatChip > owned blur lifecycle > should emit one blur for repeated requests and racing stability"),
  nativeCase('legacy-chips/chip.spec.ts', 36, "MatChip > owned blur lifecycle > should cancel pending blur and notify destruction before ripple cleanup"),
  nativeCase('legacy-chips/chip.spec.ts', 37, "MatChip > owned blur lifecycle > should notify programmatic focus once during synchronous host reentry"),
];
export function historicalRegressionRequirements(options = {}) {
  return structuredClone(scopeForEpoch(options.epoch, options.line).regressions);
}
// This finite registry is owned by individual whole-patch source reviews.
// Names are checked in addition to indexed ids: an inserted test cannot silently
// turn the same numeric id into an unrelated behavior assertion.
const scopes = new Map([
  ...autocompleteSelectionHistoricalScopes(commonMembers,nativeCase),
  ...chipLifecycleHistoricalScopes(commonMembers,nativeCase),
  ['e69b2b09efaf577cd5fe92b70808479f975913af', {
    patch: '896c8735f0eb1e9afa6c49c70c84050af0d62d91c0085522eab07e7a6a90ec4b',
    kind: 'classic-first-chip-refocus',
    required_disposition: 'do-not-adopt',
    source_contract: 'classic-chip-list-focus-and-state',
    members: [...commonMembers, CHIP_LIST_SOURCE, CHIP_LIST_REFERENCE, CHIP_LIST_ORIGINALS,
      'scripts/chip-list-focus-contract.mjs',
      'projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts',
      'projects/ngx-material-legacy/legacy-chips/chip.ts',
      'projects/ngx-material-legacy/legacy-chips/internal/common-behaviors/index.ts',
      'projects/ngx-material-legacy/legacy-chips/internal/common-behaviors/error-state.ts',
      'projects/ngx-material-legacy/legacy-chips/internal/common-behaviors/constructor.ts',
    ],
    cases: [nativeCase('legacy-chips/chip-list.spec.ts', 90, "MatChipList > classic focus and state contract > should refocus the first chip after focus leaves while index zero remains active")],
  }],
  ['2861a306aebc54eafe4a72b4a53860d8612af5d4', {
    patch: '37a1205e60a79f7f051873c1bb55e2df73b5332087d9e5e56562359964c8555a',
    kind: 'classic-first-enabled-over-active-retention',
    required_disposition: 'do-not-adopt',
    source_contract: 'classic-chip-list-focus-and-state',
    members: [...commonMembers, CHIP_LIST_SOURCE, CHIP_LIST_REFERENCE, CHIP_LIST_ORIGINALS,
      'scripts/chip-list-focus-contract.mjs',
      'projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts',
      'projects/ngx-material-legacy/legacy-chips/chip.ts',
      'projects/ngx-material-legacy/legacy-chips/internal/common-behaviors/index.ts',
      'projects/ngx-material-legacy/legacy-chips/internal/common-behaviors/error-state.ts',
      'projects/ngx-material-legacy/legacy-chips/internal/common-behaviors/constructor.ts',
    ],
    cases: [nativeCase('legacy-chips/chip-list.spec.ts', 88, "MatChipList > classic focus and state contract > should focus the first enabled chip when a later chip was active"),
      nativeCase('legacy-chips/chip-list.spec.ts', 89, "MatChipList > classic focus and state contract > should skip the disabled first and active chips when focusing"),
      nativeCase('legacy-chips/chip-list.spec.ts', 90, "MatChipList > classic focus and state contract > should refocus the first chip after focus leaves while index zero remains active")],
  }],
  ['8980ad584c7ab7d8a0553528cbff88958e94a22a', {
    patch: '2ce04e1fed9b79e0e4c765e2ceba70a163efe978c5eaf72505422761cfaea2ca',
    kind: 'classic-disabled-state-notification',
    required_disposition: 'already-adapted',
    source_contract: 'classic-chip-list-focus-and-state',
    members: [...commonMembers, CHIP_LIST_SOURCE, CHIP_LIST_REFERENCE, CHIP_LIST_ORIGINALS,
      'scripts/chip-list-focus-contract.mjs',
      'projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts',
      'projects/ngx-material-legacy/legacy-chips/chip.ts',
      'projects/ngx-material-legacy/legacy-chips/internal/common-behaviors/index.ts',
      'projects/ngx-material-legacy/legacy-chips/internal/common-behaviors/error-state.ts',
      'projects/ngx-material-legacy/legacy-chips/internal/common-behaviors/constructor.ts',
    ],
    cases: [nativeCase('legacy-chips/chip-list.spec.ts', 91, "MatChipList > classic focus and state contract > should notify disabled state after propagating it to chips and render the form field state")],
  }],
  ['db06fa8d8939d793f598bc3dbedc96a5a71c0db0', {
    patch: '097bc267621c07d520fd9aac2e3329a90c05c0ca308a9cc4e3aa4ecb43dc68b7',
    kind: 'autocomplete-empty-required-selection',
    members: [...commonMembers,
      'projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts',
      'projects/ngx-material-legacy/legacy-autocomplete/autocomplete-trigger.ts',
      'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts',
    ],
    cases: [nativeCase('legacy-autocomplete/autocomplete.spec.ts', 172,
      'MatAutocomplete > should not throw errors when closing without options')],
  }],
  ['008212a9807fd01fd32fe136a075763b7b2c854d', {
    patch: '6aef092d6a8579b310fbf94242da1a1adf3125f3934ba5d7649d56f49290855b',
    kind: 'autocomplete-landscape-viewport',
    members: [...commonMembers,
      'projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts',
      'projects/ngx-material-legacy/legacy-autocomplete/autocomplete-trigger.ts',
      'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts',
      'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.html',
      'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.scss',
    ],
    cases: [
      nativeCase('legacy-autocomplete/autocomplete.spec.ts', 105, 'MatAutocomplete > Fallback positions > should fit an above-position panel inside the handset landscape viewport'),
      nativeCase('legacy-autocomplete/autocomplete.spec.ts', 106, 'MatAutocomplete > Fallback positions > should reset landscape configuration and unsubscribe without destroying the observer'),
      nativeCase('legacy-autocomplete/autocomplete.spec.ts', 107, 'MatAutocomplete > Fallback positions > should reuse one handset subscription across panel close and reopen'),
      nativeCase('legacy-autocomplete/autocomplete.spec.ts', 108, 'MatAutocomplete > Fallback positions > should allow the panel to expand when the number of results increases'),
      nativeCase('legacy-autocomplete/autocomplete.spec.ts', 110, 'MatAutocomplete > Fallback positions > should fall back to above position when requested if options are added while the panel is open'),
    ],
  }],
  ['77ffdf98ba71c11d908b29e02b516dddf487ae0b', {
    patch: '651a4d5c27086e2011a17b2d97a58a7a0f32f8dc8000bc3d7ee5ffd98b3d098b',
    kind: 'autocomplete-required-selection-model',
    members: [...commonMembers,
      'projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts',
      'projects/ngx-material-legacy/legacy-autocomplete/autocomplete-trigger.ts',
      'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts',
    ],
    cases: [
      nativeCase('legacy-autocomplete/autocomplete.spec.ts', 37, 'MatAutocomplete > forms integration > should retain the selected model while typing when selection is required'),
      nativeCase('legacy-autocomplete/autocomplete.spec.ts', 38, 'MatAutocomplete > forms integration > should publish the chosen option once after required-selection typing'),
      nativeCase('legacy-autocomplete/autocomplete.spec.ts', 39, 'MatAutocomplete > forms integration > should reset unmatched required-selection text once on outside click'),
    ],
  }],
  ['5dd614aa100e28f0815fdd83e5b68f4239ef01f9', {
    patch: 'ee5e90a8d85ee282ae185775732e8e6a56e907bb60cda7c9fe36923d406006bf',
    kind: 'tab-link-enter-activation',
    members: [...commonMembers,
      'projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts',
      'projects/ngx-material-legacy/legacy-tabs/tab-nav-bar/tab-nav-bar.ts',
      'projects/ngx-material-legacy/legacy-tabs/tab-nav-bar/tab-nav-bar.spec.ts',
    ],
    cases: [
      nativeCase('legacy-tabs/tab-nav-bar/tab-nav-bar.spec.ts', 21, 'MatTabNavBar > should activate a tab-panel link on enter without preventing navigation'),
      nativeCase('legacy-tabs/tab-nav-bar/tab-nav-bar.spec.ts', 22, 'MatTabNavBar > should prevent enter on disabled tab-panel links without activating them'),
      nativeCase('legacy-tabs/tab-nav-bar/tab-nav-bar.spec.ts', 33, 'MatTabNavBar > without panel > should leave native enter navigation alone without a tab panel'),
    ],
  }],
  ['86ad5150110522873dae2801fd3c2957502949e7', {
    patch: 'e237a5b4d0aeb7afb5765e852a89945691ffa98604ba9bfddd2988e5068d3414',
    kind: 'select-unresolved-panel-close',
    members: [...commonMembers,
      'projects/ngx-material-legacy/legacy-select/internal/select-base.ts',
      'projects/ngx-material-legacy/legacy-select/internal/after-select-render.ts',
      'projects/ngx-material-legacy/legacy-select/select.ts',
      'projects/ngx-material-legacy/legacy-select/select.html',
      'projects/ngx-material-legacy/legacy-select/select.scss',
      'projects/ngx-material-legacy/legacy-select/select.spec.ts',
    ],
    cases: [nativeCase('legacy-select/select.spec.ts', 70, 'MatSelect > core > overlay panel > should close an enabled-motion panel before its view is resolved')],
  }],
]);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const demand = (value, message) => { if (!value) throw new Error(message); };
const sameIds = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');


// Explicit, source-reviewed MAIN successor. Unspecified epoch remains historical.
export const CURRENT_MAIN_HISTORICAL_EPOCH = 'main-pointer-regression-v2';
export const POINTER_REGRESSION_SUBJECT = Object.freeze({sha: '979e903020ec8e23747fa35414708be2c99e7e99', intended_disposition: 'already-adapted', case_id: casePrefix + 'src/material/legacy-autocomplete/autocomplete.spec.ts#179'});
const currentMainIndexByName = new Map(Object.entries({
  "MatAutocomplete > should not throw errors when closing without options": [
    172,
    174
  ],
  "MatAutocomplete > Fallback positions > should fit an above-position panel inside the handset landscape viewport": [
    105,
    106
  ],
  "MatAutocomplete > Fallback positions > should reset landscape configuration and unsubscribe without destroying the observer": [
    106,
    107
  ],
  "MatAutocomplete > Fallback positions > should reuse one handset subscription across panel close and reopen": [
    107,
    108
  ],
  "MatAutocomplete > Fallback positions > should allow the panel to expand when the number of results increases": [
    108,
    109
  ],
  "MatAutocomplete > Fallback positions > should fall back to above position when requested if options are added while the panel is open": [
    110,
    111
  ],
  "MatAutocomplete > forms integration > should retain the selected model while typing when selection is required": [
    37,
    38
  ],
  "MatAutocomplete > forms integration > should publish the chosen option once after required-selection typing": [
    38,
    39
  ],
  "MatAutocomplete > forms integration > should reset unmatched required-selection text once on outside click": [
    39,
    40
  ],
  "MatAutocomplete > forms integration > should clear the text field if value is reset programmatically": [
    46,
    47
  ],
  "MatAutocomplete > forms integration > should update the control back to a string if user types after an option is selected": [
    42,
    43
  ]
}));
function scopeForEpoch(epoch, line) {
  if (epoch === undefined) return {scopes, regressions: retainedRegressionCases, count: requiredCaseCount};
  if (epoch !== CURRENT_MAIN_HISTORICAL_EPOCH || line !== 'main') throw new Error('unsupported historical roster epoch');
  const rebind = row => {
    const pair = currentMainIndexByName.get(row.full_name);
    if (!pair) return structuredClone(row);
    const suffix = '#' + pair[0];
    if (!row.case_id.endsWith(suffix) || row.historical_path !== 'src/material/legacy-autocomplete/autocomplete.spec.ts') throw new Error('wrong historical epoch mapping');
    return {...row, case_id: row.case_id.slice(0, -suffix.length) + '#' + pair[1]};
  };
  return {scopes: new Map([...scopes].map(([sha, row]) => [sha, {...row, cases: row.cases.map(rebind)}])),
    regressions: [...retainedRegressionCases.map(rebind), nativeCase('legacy-autocomplete/autocomplete.spec.ts', 179, 'autocomplete hidden overlay pointer state > should release an empty group pane and restore inline pointer policy when options return')], count: 2328};
}

export const HISTORICAL_BEHAVIOR_SHAS = Object.freeze([...scopes.keys()]);
export function historicalBehaviorRequirements(sha, options = {}) {
  return structuredClone(scopeForEpoch(options.epoch, options.line).scopes.get(sha) ?? null);
}

export function requiresHistoricalBehavior(entry, proof) {
  return scopes.has(entry?.sha) || proof?.proof_kind === HISTORICAL_BEHAVIOR_KIND
    || (object(proof) && Object.hasOwn(proof, 'historical_behavior'));
}

/** Current complete artifact tests are required; source/protocol diagnostics do
 * not qualify these subjects. The coordinator and final seal own authenticity.
 */
export function validateHistoricalBehavior({root, entry, proof, request}) {
  try {
    const epoch = proof?.historical_behavior?.roster_epoch;
    const selected = scopeForEpoch(epoch, request?.binding?.source_line);
    const registered = selected.scopes.get(entry?.sha);
    demand(registered && proof?.proof_kind === HISTORICAL_BEHAVIOR_KIND
      && proof.diff_sha256 === registered.patch, 'unregistered historical behavior subject');
    if (registered.source_contract === 'classic-chip-list-focus-and-state') {
      demand(entry.final_disposition === registered.required_disposition, 'wrong classic chip-list disposition');
      inspectChipListFocusContract({root,readSource:relative=>readEvidenceMember(root,relative).toString('utf8')});
    }
    if (registered.source_contract === 'owned-chip-lifecycle-current') {
      demand(entry.final_disposition === registered.required_disposition, 'wrong owned chip lifecycle disposition');
      inspectChipLifecycleCurrentContract({root,read:relative=>readEvidenceMember(root,relative),line:proof.affected_branches?.[0]});
    }
    const scope = proof.historical_behavior;
    demand(object(scope) && scope.kind === registered.kind
      && sameIds(scope.case_ids, registered.cases.map(row => row.case_id)), 'wrong historical behavior scope');
    demand(Array.isArray(scope.source_members)
      && sameIds(scope.source_members.map(row => row?.path), registered.members), 'incomplete historical source scope');
    for (const member of scope.source_members) {
      demand(/^[0-9a-f]{64}$/.test(member.sha256)
        && hash(readEvidenceMember(root, member.path)) === member.sha256, 'stale historical source member');
    }
    // The unchanged validator authenticates the current clean checkout, run
    // manifest/binding/matrix, rehashed library and all packed-consumer cases.
    const packed = validatePackedConsumerRun({root, request});
    demand(packed.ok, packed.detail);
    const {binding, runDir, historicalExecution: execution} = request;
    demand(object(execution) && execution.run_id === binding.run_id && execution.exit_code === 0
      && typeof execution.invocation_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(execution.invocation_id),
    'missing successful coordinator-observed historical invocation');
    const matrix = JSON.parse(readEvidenceMember(root, 'compatibility/rc/matrices/full-verify.json'));
    const groups = matrix.checks.find(row => row.check_id === checkId)?.acceptance?.cases_by_line?.[binding.source_line];
    demand(object(groups) && Object.values(groups).every(Array.isArray), 'missing full historical matrix roster');
    const expected = Object.values(groups).flat();
    demand(expected.length === selected.count && new Set(expected).size === expected.length
      && registered.cases.every(row => expected.includes(row.case_id))
      && selected.regressions.every(row => expected.includes(row.case_id)), 'incomplete full historical matrix roster');
    const report = JSON.parse(readEvidenceMember(runDir, 'reports/' + checkId + '.json'));
    demand(report.schema_version === 1 && report.template === false && report.check_id === checkId
      && report.line === binding.source_line && report.run_id === binding.run_id
      && report.invocation_id === execution.invocation_id && isDeepStrictEqual(report.binding, binding), 'wrong historical report subject');
    demand(report.result === 'pass' && report.coverage === 'complete' && report.exit_code === 0
      && report.subject_kind === 'artifact' && isDeepStrictEqual(report.subject_ids, ['library'])
      && isDeepStrictEqual(report.artifacts, {library: packed.library}), 'incomplete or failed historical result');
    for (const field of ['expected_case_ids', 'discovered_case_ids', 'executed_case_ids', 'passed_case_ids']) {
      demand(sameIds(report[field], expected), 'incomplete historical ' + field);
    }
    demand(report.passed === expected.length && report.failed === 0 && report.skipped === 0, 'wrong historical counts');
    for (const field of ['failed_case_ids', 'skipped_case_ids', 'unresolved_case_ids', 'exceptions']) {
      demand(Array.isArray(report[field]) && report[field].length === 0, 'unresolved historical ' + field);
    }
    const relative = `evidence/${checkId}/${execution.invocation_id}/historical-observations.json`;
    demand(Array.isArray(report.outputs) && report.outputs.length === 1 && report.outputs[0].path === relative, 'wrong historical assertion ownership');
    const output = report.outputs[0], bytes = readEvidenceMember(runDir, relative);
    demand(/^[0-9a-f]{64}$/.test(output.sha256) && Number.isSafeInteger(output.bytes) && output.bytes > 0
      && bytes.length === output.bytes && hash(bytes) === output.sha256, 'historical assertion bytes/hash mismatch');
    const observation = JSON.parse(bytes);
    demand(observation.kind === checkId + '-observations' && observation.check_id === checkId
      && observation.run_id === binding.run_id && observation.invocation_id === execution.invocation_id
      && observation.library_sha256 === packed.library.sha256, 'wrong historical assertion subject');
    demand(Array.isArray(report.case_results) && sameIds(report.case_results.map(row => row?.case_id), expected)
      && report.case_results.every(row => row.result === 'pass' && row.kind === 'assertion'
        && isDeepStrictEqual(row.output_paths, [relative])), 'incomplete historical report assertions');
    demand(Array.isArray(observation.cases) && sameIds(observation.cases.map(row => row?.case_id), expected)
      && observation.cases.every(row => row.result === 'pass')
      && isDeepStrictEqual(observation.rejection_reasons, []), 'incomplete historical observed cases');
    for (const required of [...registered.cases, ...selected.regressions]) {
      const selected = observation.cases.find(row => row.case_id === required.case_id);
      demand(Object.entries(required).every(([key, value]) => selected[key] === value)
        && selected.executed_full_name === required.full_name, 'wrong required historical test identity');
    }
    let chipLifecycleBrowser;
    if (registered.source_contract === 'owned-chip-lifecycle-current') {
      chipLifecycleBrowser = validateChipLifecycleBrowserRun({root,request});
      demand(chipLifecycleBrowser.ok,chipLifecycleBrowser.detail);
    }
    return {ok: true, ...(chipLifecycleBrowser ? {chip_lifecycle_browser:chipLifecycleBrowser} : {}), detail: 'Required named tests passed in the complete same-run historical artifact invocation; final sealing remains separate.',
      invocation_id: execution.invocation_id, output, library: packed.library,
      packed_consumer: {invocation_id: packed.invocation_id, output: packed.output},
      required_cases: registered.cases.map(row => row.case_id),
      retained_regression_cases: selected.regressions.map(row => row.case_id)};
  } catch (error) {
    return {ok: false, detail: error.message};
  }
}
