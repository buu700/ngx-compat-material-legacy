/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Valid synthetic input for existing unrelated collector/writer controls. */
export function isolatedBidiPackedSample() {
  const rows = [
    ['initial', 'rtl', 'rtl', []], ['ltr', 'ltr', 'ltr', ['ltr']], ['repeat-ltr', 'ltr', 'ltr', ['ltr']],
    ['uppercase-rtl', 'RTL', 'rtl', ['ltr', 'rtl']], ['invalid', 'invalid-direction', 'ltr', ['ltr', 'rtl', 'ltr']],
    ['empty', '', 'ltr', ['ltr', 'rtl', 'ltr']], ['rtl', 'rtl', 'rtl', ['ltr', 'rtl', 'ltr', 'rtl']],
  ];
  return {execution: 'packed-angular-testbed-dom', error: null, public_dir_instance: true, node_instances_distinct_from_root: true,
    states: rows.map(([stage, bound_value, normalized, events]) => ({stage, bound_value, normalized, host_attribute: bound_value,
      events, same_dir_instance: true, field_provider_is_dir: true, input_provider_is_dir: true,
      legacy_field_structure: true, legacy_input_structure: true})),
    cleanup: {view_destroyed: true, output_completions: 1, subscription_closed: true}};
}
