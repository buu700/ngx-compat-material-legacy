/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite packed Angular node/CVA observations; no native-browser credit. */
export const VALUE_ACCESSOR_FAMILIES = Object.freeze([
  'autocomplete', 'checkbox', 'selection-list', 'radio', 'slide-toggle', 'slider',
]);
export const VALUE_ACCESSOR_CASE_IDS = Object.freeze(VALUE_ACCESSOR_FAMILIES.map(
  family => 'packed-consumer/harness/value-accessor-' + family,
));
const contracts = {
  autocomplete: ['MatLegacyAutocompleteTrigger', 'one', 'two', 'one', 2, 'string'],
  checkbox: ['MatLegacyCheckbox', true, false, true, 1, 'boolean'],
  'selection-list': ['MatLegacySelectionList', ['one'], ['two'], ['one'], 1, 'array'],
  radio: ['MatLegacyRadioGroup', 'one', 'two', 'one', 1, 'string'],
  'slide-toggle': ['MatLegacySlideToggle', true, false, true, 1, 'boolean'],
  slider: ['MatLegacySlider', 2, 3, 4, 1, 'number'],
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const has = (row, key) => Object.hasOwn(row || {}, key);

export function packedValueAccessorCaseOkay(row, family) {
  const contract = has(contracts, family) ? contracts[family] : null;
  if (!contract || !row || typeof row !== 'object') return false;
  const [name, model, user, afterDestroy, tokenCount, retainedType] = contract;
  const registration = row.registration, write = row.model_write, interaction = row.user_write;
  const touch = row.touch, disabled = row.disabled, enabled = row.reenabled, destroy = row.destroy;
  const retained = value => retainedType === 'array'
    ? Array.isArray(value) && value.every(item => typeof item === 'string')
    : typeof value === retainedType && (retainedType !== 'number' || Number.isFinite(value));
  return row.family === family && row.execution === 'packed-angular-testbed-dom'
    && row.target_class === name && row.error === null
    && registration?.instance_owned === true && registration.exact_prototype === true
    && registration.directive_is_form_control === true && registration.control_identity === true
    && registration.accessor_identity === true && registration.owner_occurrences === 1
    && registration.array_length === tokenCount
    && write?.pristine === true && same(write.model, model) && same(write.view, model)
    && same(write.events, [model])
    && interaction?.dirty === true && same(interaction.model, user) && same(interaction.view, user)
    && same(interaction.events, [model, user])
    && touch?.before === false && touch.after === true && same(touch.events, [model, user])
    && disabled?.control === true && disabled.view === true
    && enabled?.control === false && enabled.view === false && same(enabled.value, user)
    && destroy?.fixture_destroyed === true && same(destroy.model, afterDestroy)
    && has(destroy, 'retained_before') && has(destroy, 'retained_after')
    && retained(destroy.retained_before) && retained(destroy.retained_after)
    && same(destroy.retained_before, destroy.retained_after);
}

export function packedValueAccessorCases(rows) {
  const validRoster = Array.isArray(rows) && rows.length === VALUE_ACCESSOR_FAMILIES.length
    && rows.every(row => VALUE_ACCESSOR_FAMILIES.includes(row?.family));
  return VALUE_ACCESSOR_FAMILIES.map(family => {
    const matches = Array.isArray(rows) ? rows.filter(row => row?.family === family) : [];
    const observed = matches.length === 1 ? matches[0] : null;
    const okay = validRoster && packedValueAccessorCaseOkay(observed, family);
    return {case_id: 'packed-consumer/harness/value-accessor-' + family,
      result: okay ? 'pass' : 'fail', observation: observed,
      failure: okay ? null : 'Actual packed Angular accessor identity and model/view lifecycle observations are missing or failed'};
  });
}
