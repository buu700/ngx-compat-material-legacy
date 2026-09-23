/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 `_MatDialogContainerBase` (removed from Angular Material 22).
 * Constructor adapted to current CDK `CdkDialogContainer` inject()-based API.
 */

import {CdkDialogContainer} from '@angular/cdk/dialog';
import {Component, EventEmitter} from '@angular/core';
import {MatDialogConfig} from '@angular/material/dialog';

/** Event that captures the state of dialog container animations. */
export interface LegacyDialogAnimationEvent {
  state: 'opened' | 'opening' | 'closing' | 'closed';
  totalTime: number;
}

/**
 * Base class for the `MatDialogContainer`. The base class does not implement
 * animations as these are left to implementers of the dialog container.
 */
// tslint:disable-next-line:validate-decorators
@Component({
  template: '',
  standalone: false,
})
export abstract class _MatDialogContainerBase extends CdkDialogContainer<MatDialogConfig> {
  /** Emits when an animation state changes. */
  _animationStateChanged = new EventEmitter<LegacyDialogAnimationEvent>();

  constructor() {
    super();
  }

  /** Starts the dialog exit animation. */
  abstract _startExitAnimation(): void;

  protected override _captureInitialFocus(): void {
    if (!this._config.delayFocusTrap) {
      this._trapFocus();
    }
  }

  /**
   * Callback for when the open dialog animation has finished. Intended to
   * be called by sub-classes that use different animation implementations.
   */
  protected _openAnimationDone(totalTime: number) {
    if (this._config.delayFocusTrap) {
      this._trapFocus();
    }

    this._animationStateChanged.next({state: 'opened', totalTime});
  }
}
