/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 `_MatFormFieldHarnessBase` (removed from Angular Material 22).
 */

import {
  AsyncFactoryFn,
  ComponentHarness,
  ComponentHarnessConstructor,
  HarnessPredicate,
  HarnessQuery,
  parallel,
  TestElement,
} from '@angular/cdk/testing';
import {ErrorHarnessFilters} from '@angular/material/form-field/testing';
import {MatFormFieldControlHarness} from '@angular/material/form-field/testing/control';

interface ErrorBase extends ComponentHarness {
  getText(): Promise<string>;
}

export abstract class _MatFormFieldHarnessBase<
  ControlHarness extends MatFormFieldControlHarness,
  ErrorType extends ComponentHarnessConstructor<ErrorBase> & {
    with: (options?: ErrorHarnessFilters) => HarnessPredicate<ErrorBase>;
  },
> extends ComponentHarness {
  protected abstract _prefixContainer: AsyncFactoryFn<TestElement | null>;
  protected abstract _suffixContainer: AsyncFactoryFn<TestElement | null>;
  protected abstract _label: AsyncFactoryFn<TestElement | null>;
  protected abstract _hints: AsyncFactoryFn<TestElement[]>;
  protected abstract _inputControl: AsyncFactoryFn<ControlHarness | null>;
  protected abstract _selectControl: AsyncFactoryFn<ControlHarness | null>;
  protected abstract _datepickerInputControl: AsyncFactoryFn<ControlHarness | null>;
  protected abstract _dateRangeInputControl: AsyncFactoryFn<ControlHarness | null>;
  protected abstract _errorHarness: ErrorType;

  abstract getAppearance(): Promise<string>;
  abstract isLabelFloating(): Promise<boolean>;
  abstract hasLabel(): Promise<boolean>;

  async getLabel(): Promise<string | null> {
    const labelEl = await this._label();
    return labelEl ? labelEl.text() : null;
  }

  async hasErrors(): Promise<boolean> {
    return (await this.getTextErrors()).length > 0;
  }

  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('mat-form-field-disabled');
  }

  async isAutofilled(): Promise<boolean> {
    return (await this.host()).hasClass('mat-form-field-autofilled');
  }

  async getControl(): Promise<ControlHarness | null>;
  async getControl<X extends MatFormFieldControlHarness>(
    type: ComponentHarnessConstructor<X>,
  ): Promise<X | null>;
  async getControl<X extends MatFormFieldControlHarness>(
    type: HarnessPredicate<X>,
  ): Promise<X | null>;
  async getControl<X extends MatFormFieldControlHarness>(type?: HarnessQuery<X>) {
    if (type) {
      return this.locatorForOptional(type)();
    }
    const [select, input, datepickerInput, dateRangeInput] = await parallel(() => [
      this._selectControl(),
      this._inputControl(),
      this._datepickerInputControl(),
      this._dateRangeInputControl(),
    ]);
    return datepickerInput || dateRangeInput || select || input;
  }

  async getThemeColor(): Promise<'primary' | 'accent' | 'warn'> {
    const hostEl = await this.host();
    const [isAccent, isWarn] = await parallel(() => {
      return [hostEl.hasClass('mat-accent'), hostEl.hasClass('mat-warn')];
    });
    if (isAccent) {
      return 'accent';
    } else if (isWarn) {
      return 'warn';
    }
    return 'primary';
  }

  async getTextErrors(): Promise<string[]> {
    const errors = await this.getErrors();
    return parallel(() => errors.map(e => e.getText()));
  }

  async getErrors(filter: ErrorHarnessFilters = {}): Promise<ErrorBase[]> {
    return this.locatorForAll(this._errorHarness.with(filter))();
  }

  async getTextHints(): Promise<string[]> {
    const hints = await this._hints();
    return parallel(() => hints.map(e => e.text()));
  }

  async getPrefixText(): Promise<string> {
    const prefix = await this._prefixContainer();
    return prefix ? prefix.text() : '';
  }

  async getSuffixText(): Promise<string> {
    const suffix = await this._suffixContainer();
    return suffix ? suffix.text() : '';
  }

  async isControlTouched(): Promise<boolean | null> {
    if (!(await this._hasFormControl())) {
      return null;
    }
    return (await this.host()).hasClass('ng-touched');
  }

  async isControlDirty(): Promise<boolean | null> {
    if (!(await this._hasFormControl())) {
      return null;
    }
    return (await this.host()).hasClass('ng-dirty');
  }

  async isControlValid(): Promise<boolean | null> {
    if (!(await this._hasFormControl())) {
      return null;
    }
    return (await this.host()).hasClass('ng-valid');
  }

  async isControlPending(): Promise<boolean | null> {
    if (!(await this._hasFormControl())) {
      return null;
    }
    return (await this.host()).hasClass('ng-pending');
  }

  private async _hasFormControl(): Promise<boolean> {
    const hostEl = await this.host();
    const [isTouched, isUntouched] = await parallel(() => [
      hostEl.hasClass('ng-touched'),
      hostEl.hasClass('ng-untouched'),
    ]);
    return isTouched || isUntouched;
  }
}
