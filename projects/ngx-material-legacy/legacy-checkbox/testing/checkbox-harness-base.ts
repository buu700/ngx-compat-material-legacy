/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 `_MatCheckboxHarnessBase` (removed from Angular Material 22).
 */

import {
  AsyncFactoryFn,
  ComponentHarness,
  TestElement,
} from '@angular/cdk/testing';
import {coerceBooleanProperty} from '@angular/cdk/coercion';

export abstract class _MatCheckboxHarnessBase extends ComponentHarness {
  protected abstract _input: AsyncFactoryFn<TestElement>;
  protected abstract _label: AsyncFactoryFn<TestElement>;

  async isChecked(): Promise<boolean> {
    const checked = (await this._input()).getProperty<boolean>('checked');
    return coerceBooleanProperty(await checked);
  }

  async isIndeterminate(): Promise<boolean> {
    const indeterminate = (await this._input()).getProperty<string>('indeterminate');
    return coerceBooleanProperty(await indeterminate);
  }

  async isDisabled(): Promise<boolean> {
    const disabled = (await this._input()).getAttribute('disabled');
    return coerceBooleanProperty(await disabled);
  }

  async isRequired(): Promise<boolean> {
    const required = (await this._input()).getProperty<boolean>('required');
    return coerceBooleanProperty(await required);
  }

  async isValid(): Promise<boolean> {
    const invalid = (await this.host()).hasClass('ng-invalid');
    return !(await invalid);
  }

  async getName(): Promise<string | null> {
    return (await this._input()).getAttribute('name');
  }

  async getValue(): Promise<string | null> {
    return (await this._input()).getProperty<string | null>('value');
  }

  async getAriaLabel(): Promise<string | null> {
    return (await this._input()).getAttribute('aria-label');
  }

  async getAriaLabelledby(): Promise<string | null> {
    return (await this._input()).getAttribute('aria-labelledby');
  }

  async getLabelText(): Promise<string> {
    return (await this._label()).text();
  }

  async focus(): Promise<void> {
    return (await this._input()).focus();
  }

  async blur(): Promise<void> {
    return (await this._input()).blur();
  }

  async isFocused(): Promise<boolean> {
    return (await this._input()).isFocused();
  }

  abstract toggle(): Promise<void>;

  async check(): Promise<void> {
    if (!(await this.isChecked())) {
      await this.toggle();
    }
  }

  async uncheck(): Promise<void> {
    if (await this.isChecked()) {
      await this.toggle();
    }
  }
}
