/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic data for admission controls, never native or component evidence. */
export function selectionComparatorPackedSample() {
  const events = [
    {source_is_model: true, added_indices: [0], removed_indices: []},
    {source_is_model: true, added_indices: [0], removed_indices: []},
    {source_is_model: true, added_indices: [1], removed_indices: [0]},
    {source_is_model: true, added_indices: [1], removed_indices: [0]},
    {source_is_model: true, added_indices: [1], removed_indices: [0]},
    {source_is_model: true, added_indices: [], removed_indices: [1]},
    {source_is_model: true, added_indices: [], removed_indices: [1]},
    {source_is_model: true, added_indices: [0], removed_indices: []},
    {source_is_model: true, added_indices: [0], removed_indices: []},
  ];
  const phases = [
    ['initial', [], 0], ['first-real', [0], 2], ['first-equivalent', [0], 2],
    ['repeat-first-equivalent', [0], 2], ['second-real', [1], 5], ['second-equivalent', [1], 5],
    ['cleared', [], 7], ['restored-first', [0], 9],
  ];
  return {execution: 'packed-angular-testbed-dom', error: null, public_selection_model: true, option_count: 2,
    legacy_list_structure: true, list_multiple: false, model_is_multiple: false, before_indices: [0], after_indices: [0],
    comparable_model_public: true, comparable_model_distinct: true, comparable_option_count: 2, comparable_options_distinct: true, comparable_list_structure: true,
    states: phases.map(([stage, selected, count]) => ({stage, same_model: true, same_options: true, same_nodes: true,
      legacy_option_classes: true, selected_indices: [...selected], selected_values: selected.map(index => ['one', 'two'][index]),
      same_comparable_model: true, same_comparable_options: true, same_comparable_nodes: true,
      comparable_selected_indices: [], comparable_option_selected: [false, false], comparable_aria_selected: ['false', 'false'],
      option_selected: [0, 1].map(index => selected.includes(index)), aria_selected: [0, 1].map(index => String(selected.includes(index))),
      events: structuredClone(events.slice(0, count))})), cleanup: {subscription_closed: true}};
}
