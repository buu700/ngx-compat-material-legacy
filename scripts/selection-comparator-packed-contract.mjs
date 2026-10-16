/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export const SELECTION_COMPARATOR_CASE_ID = 'packed-consumer/harness/selection-model-comparator-public-list';
const phases = [
  ['initial', [], 0], ['first-real', [0], 2], ['first-equivalent', [0], 2],
  ['repeat-first-equivalent', [0], 2], ['second-real', [1], 5], ['second-equivalent', [1], 5],
  ['cleared', [], 7], ['restored-first', [0], 9],
];
// The untouched legacy option setters re-enter the public model notification.
// Preserve that historical sequence instead of inventing a one-event contract.
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
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
/** The real legacy-list public model, option identities and Angular DOM must
 * agree throughout comparator reselection; labels alone do not admit a case. */
export function packedSelectionComparatorCase(observed) {
  const okay = Boolean(observed && observed.execution === 'packed-angular-testbed-dom' && observed.error === null
    && observed.public_selection_model === true && observed.option_count === 2 && observed.legacy_list_structure === true
    && observed.list_multiple === false && observed.model_is_multiple === false
    && observed.comparable_model_public === true && observed.comparable_model_distinct === true
    && observed.comparable_option_count === 2 && observed.comparable_options_distinct === true && observed.comparable_list_structure === true
    && same(observed.before_indices, [0]) && same(observed.after_indices, [0])
    && Array.isArray(observed.states) && observed.states.length === phases.length
    && observed.states.every((row, index) => {
      const [stage, selected, count] = phases[index], flags = [0, 1].map(option => selected.includes(option));
      return row && row.stage === stage && row.same_model === true && row.same_options === true
        && row.same_nodes === true && row.legacy_option_classes === true
        && row.same_comparable_model === true && row.same_comparable_options === true && row.same_comparable_nodes === true
        && same(row.comparable_selected_indices, []) && same(row.comparable_option_selected, [false, false])
        && same(row.comparable_aria_selected, ['false', 'false'])
        && same(row.selected_indices, selected) && same(row.selected_values, selected.map(option => ['one', 'two'][option]))
        && same(row.option_selected, flags) && same(row.aria_selected, flags.map(value => String(value)))
        && same(row.events, events.slice(0, count));
    }) && observed.cleanup?.subscription_closed === true);
  return {case_id: SELECTION_COMPARATOR_CASE_ID, result: okay ? 'pass' : 'fail', observation: observed ?? null,
    failure: okay ? null : 'Missing public SelectionModel concrete-option/event/legacy-node/ARIA observations'};
}
