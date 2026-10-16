/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export const BIDI_SCOPE_CASE_ID = 'packed-consumer/harness/bidi-module-legacy-node-scope';
const expected = [
  ['initial', 'rtl', 'rtl', []],
  ['ltr', 'ltr', 'ltr', ['ltr']],
  ['repeat-ltr', 'ltr', 'ltr', ['ltr']],
  ['uppercase-rtl', 'RTL', 'rtl', ['ltr', 'rtl']],
  ['invalid', 'invalid-direction', 'ltr', ['ltr', 'rtl', 'ltr']],
  ['empty', '', 'ltr', ['ltr', 'rtl', 'ltr']],
  ['rtl', 'rtl', 'rtl', ['ltr', 'rtl', 'ltr', 'rtl']],
];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** Runtime evidence from a component with an isolated, legacy-only import scope. */
export function packedLegacyBidiScopeCase(observed) {
  const ok = Boolean(observed && observed.execution === 'packed-angular-testbed-dom' && observed.error === null
    && observed.public_dir_instance === true && observed.node_instances_distinct_from_root === true
    && Array.isArray(observed.states) && observed.states.length === expected.length
    && observed.states.every((row, index) => row && row.stage === expected[index][0]
      && row.bound_value === expected[index][1] && row.host_attribute === expected[index][1]
      && row.normalized === expected[index][2] && same(row.events, expected[index][3])
      && row.same_dir_instance === true && row.field_provider_is_dir === true && row.input_provider_is_dir === true
      && row.legacy_field_structure === true && row.legacy_input_structure === true)
    && observed.cleanup?.view_destroyed === true && observed.cleanup.output_completions === 1
    && observed.cleanup.subscription_closed === true);
  return {case_id: BIDI_SCOPE_CASE_ID, result: ok ? 'pass' : 'fail', observation: observed ?? null,
    failure: ok ? null : 'Missing isolated legacy bidi node/provider/output/lifecycle observations'};
}
