/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 `_MatSelectHarnessBase` (removed from Angular Material 22).
 */

import {
  BaseHarnessFilters,
  ComponentHarness,
  ComponentHarnessConstructor,
  HarnessPredicate,
  parallel,
} from '@angular/cdk/testing';
import {MatFormFieldControlHarness} from '@angular/material/form-field/testing/control';

export abstract class _MatSelectHarnessBase<
  OptionType extends ComponentHarnessConstructor<Option> & {
    with: (options?: OptionFilters) => HarnessPredicate<Option>;
  },
  Option extends ComponentHarness & {click(): Promise<void>},
  OptionFilters extends BaseHarnessFilters,
  OptionGroupType extends ComponentHarnessConstructor<OptionGroup> & {
    with: (options?: OptionGroupFilters) => HarnessPredicate<OptionGroup>;
  },
  OptionGroup extends ComponentHarness,
  OptionGroupFilters extends BaseHarnessFilters,
> extends MatFormFieldControlHarness {
  protected abstract _prefix: string;
  protected abstract _optionClass: OptionType;
  protected abstract _optionGroupClass: OptionGroupType;
  private _documentRootLocator = this.documentRootLocatorFactory();
  private _backdrop = this._documentRootLocator.locatorFor('.cdk-overlay-backdrop');

  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass(`${this._prefix}-select-disabled`);
  }

  async isValid(): Promise<boolean> {
    return !(await (await this.host()).hasClass('ng-invalid'));
  }

  async isRequired(): Promise<boolean> {
    return (await this.host()).hasClass(`${this._prefix}-select-required`);
  }

  async isEmpty(): Promise<boolean> {
    return (await this.host()).hasClass(`${this._prefix}-select-empty`);
  }

  async isMultiple(): Promise<boolean> {
    return (await this.host()).hasClass(`${this._prefix}-select-multiple`);
  }

  async getValueText(): Promise<string> {
    const value = await this.locatorFor(`.${this._prefix}-select-value`)();
    return value.text();
  }

  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  async blur(): Promise<void> {
    return (await this.host()).blur();
  }

  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }

  async getOptions(filter?: Omit<OptionFilters, 'ancestor'>): Promise<Option[]> {
    return this._documentRootLocator.locatorForAll(
      this._optionClass.with({
        ...(filter || {}),
        ancestor: await this._getPanelSelector(),
      } as OptionFilters),
    )();
  }

  async getOptionGroups(filter?: Omit<OptionGroupFilters, 'ancestor'>): Promise<OptionGroup[]> {
    return this._documentRootLocator.locatorForAll(
      this._optionGroupClass.with({
        ...(filter || {}),
        ancestor: await this._getPanelSelector(),
      } as OptionGroupFilters),
    )() as Promise<OptionGroup[]>;
  }

  async isOpen(): Promise<boolean> {
    return !!(await this._documentRootLocator.locatorForOptional(await this._getPanelSelector())());
  }

  async open(): Promise<void> {
    if (!(await this.isOpen())) {
      const trigger = await this.locatorFor(`.${this._prefix}-select-trigger`)();
      return trigger.click();
    }
  }

  async clickOptions(filter?: OptionFilters): Promise<void> {
    await this.open();

    const [isMultiple, options] = await parallel(() => [
      this.isMultiple(),
      this.getOptions(filter),
    ]);

    if (options.length === 0) {
      throw Error('Select does not have options matching the specified filter');
    }

    if (isMultiple) {
      await parallel(() => options.map(option => option.click()));
    } else {
      await options[0].click();
    }
  }

  async close(): Promise<void> {
    if (await this.isOpen()) {
      return (await this._backdrop()).click();
    }
  }

  private async _getPanelSelector(): Promise<string> {
    const id = await (await this.host()).getAttribute('id');
    return `#${id}-panel`;
  }
}
