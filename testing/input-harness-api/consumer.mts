/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Historical input-harness declaration consumer for the packed artifact.
 */
import {MatLegacyInputHarness, type LegacyInputHarnessFilters} from '@ngx-compat/material-legacy/legacy-input/testing';
import {type MatInputHarness} from '@angular/material/input/testing';
import {type HarnessPredicate} from '@angular/cdk/testing';
declare const input: MatLegacyInputHarness;
const booleans: Promise<boolean>[] = [input.isRequired(), input.isReadonly(), input.isFocused(), input.isDisabled()];
const strings: Promise<string>[] = [input.getId(), input.getName(), input.getPlaceholder(), input.getType(), input.getValue()];
const actions: Promise<void>[] = [input.blur(), input.focus(), input.setValue('text')];
const filters: LegacyInputHarnessFilters = {selector:'input',ancestor:'.form',value:/v/,placeholder:'p'};
const current: HarnessPredicate<MatLegacyInputHarness> = MatLegacyInputHarness.with(filters);
const historical: HarnessPredicate<MatInputHarness> = MatLegacyInputHarness.with();
class ConsumerHarness extends MatLegacyInputHarness {
  override getValue(): Promise<string> { return super.getValue(); }
}
// @ts-expect-error historical result is string
const invalidResult: Promise<boolean> = input.getValue();
// @ts-expect-error historical setValue accepts a string
input.setValue(42);
// @ts-expect-error required historical method cannot be omitted
declare const omitted: Omit<MatLegacyInputHarness,'getName'>; const required: Pick<MatLegacyInputHarness,'getName'> = omitted;
// @ts-expect-error the historical value filter is not numeric
MatLegacyInputHarness.with({value: 42});
void [booleans,strings,actions,current,historical,ConsumerHarness,invalidResult,required];
