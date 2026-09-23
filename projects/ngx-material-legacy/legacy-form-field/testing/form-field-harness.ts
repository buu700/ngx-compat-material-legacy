/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {HarnessPredicate, parallel} from '@angular/cdk/testing';
import {
  MatDatepickerInputHarness,
  MatDateRangeInputHarness,
} from '@angular/material/datepicker/testing';
import {FormFieldHarnessFilters} from '@angular/material/form-field/testing';
import {MatLegacyInputHarness} from '@ngx-compat/material-legacy/legacy-input/testing';
import {MatLegacySelectHarness} from '@ngx-compat/material-legacy/legacy-select/testing';
import {MatLegacyErrorHarness} from './error-harness';
import {_MatFormFieldHarnessBase} from './form-field-harness-base';

/**
 * Possible harnesses of controls which can be bound to a form-field.
 * @deprecated Use `FormFieldControlHarness` from `@angular/material/form-field/testing` instead.
 * @breaking-change 17.0.0
 */
export type LegacyFormFieldControlHarness =
  | MatLegacyInputHarness
  | MatLegacySelectHarness
  | MatDatepickerInputHarness
  | MatDateRangeInputHarness;

/**
 * Harness for interacting with a standard Material form-field's in tests.
 * @deprecated Use `MatFormFieldHarness` from `@angular/material/form-field/testing` instead.
 * @breaking-change 17.0.0
 */
export class MatLegacyFormFieldHarness extends _MatFormFieldHarnessBase<
  LegacyFormFieldControlHarness,
  typeof MatLegacyErrorHarness
> {
  static hostSelector = '.mat-form-field';

  static with(options: FormFieldHarnessFilters = {}): HarnessPredicate<MatLegacyFormFieldHarness> {
    return new HarnessPredicate(MatLegacyFormFieldHarness, options)
      .addOption('floatingLabelText', options.floatingLabelText, async (harness, text) =>
        HarnessPredicate.stringMatches(await harness.getLabel(), text),
      )
      .addOption(
        'hasErrors',
        options.hasErrors,
        async (harness, hasErrors) => (await harness.hasErrors()) === hasErrors,
      )
      .addOption(
        'isValid',
        options.isValid,
        async (harness, isValid) => (await harness.isControlValid()) === isValid,
      );
  }

  protected _prefixContainer = this.locatorForOptional('.mat-form-field-prefix');
  protected _suffixContainer = this.locatorForOptional('.mat-form-field-suffix');
  protected _label = this.locatorForOptional('.mat-form-field-label');
  protected _errors = this.locatorForAll('.mat-error');
  protected _hints = this.locatorForAll('mat-hint, .mat-hint');
  protected _inputControl = this.locatorForOptional(MatLegacyInputHarness);
  protected _selectControl = this.locatorForOptional(MatLegacySelectHarness);
  protected _datepickerInputControl = this.locatorForOptional(MatDatepickerInputHarness);
  protected _dateRangeInputControl = this.locatorForOptional(MatDateRangeInputHarness);
  protected _errorHarness = MatLegacyErrorHarness;

  async getAppearance(): Promise<'legacy' | 'standard' | 'fill' | 'outline'> {
    const hostClasses = await (await this.host()).getAttribute('class');
    if (hostClasses !== null) {
      const appearanceMatch = hostClasses.match(
        /mat-form-field-appearance-(legacy|standard|fill|outline)(?:$| )/,
      );
      if (appearanceMatch) {
        return appearanceMatch[1] as 'legacy' | 'standard' | 'fill' | 'outline';
      }
    }
    throw Error('Could not determine appearance of form-field.');
  }

  async hasLabel(): Promise<boolean> {
    return (await this.host()).hasClass('mat-form-field-has-label');
  }

  async isLabelFloating(): Promise<boolean> {
    const host = await this.host();
    const [hasLabel, shouldFloat] = await parallel(() => [
      this.hasLabel(),
      host.hasClass('mat-form-field-should-float'),
    ]);
    return hasLabel && shouldFloat;
  }
}
