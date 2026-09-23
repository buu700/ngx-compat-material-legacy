/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 harness base(s) removed from Angular Material 22.
 */

import {AsyncFactoryFn, ComponentHarness, TestElement} from '@angular/cdk/testing';

export abstract class _MatTooltipHarnessBase extends ComponentHarness {
  protected abstract _optionalPanel: AsyncFactoryFn<TestElement | null>;
  protected abstract _hiddenClass: string;
  protected abstract _disabledClass: string;
  protected abstract _showAnimationName: string;
  protected abstract _hideAnimationName: string;

  /** Shows the tooltip. */
  async show(): Promise<void> {
    const host = await this.host();

    // We need to dispatch both `touchstart` and a hover event, because the tooltip binds
    // different events depending on the device. The `changedTouches` is there in case the
    // element has ripples.
    await host.dispatchEvent('touchstart', {changedTouches: []});
    await host.hover();
    const panel = await this._optionalPanel();
    await panel?.dispatchEvent('animationend', {animationName: this._showAnimationName});
  }

  /** Hides the tooltip. */
  async hide(): Promise<void> {
    const host = await this.host();

    // We need to dispatch both `touchstart` and a hover event, because
    // the tooltip binds different events depending on the device.
    await host.dispatchEvent('touchend');
    await host.mouseAway();
    const panel = await this._optionalPanel();
    await panel?.dispatchEvent('animationend', {animationName: this._hideAnimationName});
  }

  /** Gets whether the tooltip is open. */
  async isOpen(): Promise<boolean> {
    const panel = await this._optionalPanel();
    return !!panel && !(await panel.hasClass(this._hiddenClass));
  }

  /** Gets whether the tooltip is disabled */
  async isDisabled(): Promise<boolean> {
    const host = await this.host();
    return host.hasClass(this._disabledClass);
  }

  /** Gets a promise for the tooltip panel's text. */
  async getTooltipText(): Promise<string> {
    const panel = await this._optionalPanel();
    return panel ? panel.text() : '';
  }
}
