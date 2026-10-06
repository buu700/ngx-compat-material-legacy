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
import {Subject} from 'rxjs';

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

  /**
   * CDK schedules autofocus via `afterNextRender`, which historical fakeAsync
   * suites (flushMicrotasks only) never flush. Run the same focus selection on
   * a microtask so noop-animation opens still autofocus under those tests.
   */
  protected override _trapFocus(options?: FocusOptions): void {
    const self = this as unknown as {
      _isDestroyed?: boolean;
      _elementRef: {nativeElement: HTMLElement};
      _config: MatDialogConfig;
      _focusTrap?: {focusInitialElement: (options?: FocusOptions) => boolean};
      _containsFocus: () => boolean;
      _focusDialogContainer: (options?: FocusOptions) => void;
      _focusByCssSelector: (selector: string, options?: FocusOptions) => void;
      _focusTrapped: Subject<void>;
    };
    if (self._isDestroyed) {
      return;
    }
    Promise.resolve().then(() => {
      if (self._isDestroyed) {
        return;
      }
      const element = self._elementRef.nativeElement;
      switch (self._config.autoFocus) {
        case false:
        case 'dialog':
          if (!self._containsFocus()) {
            element.focus(options);
          }
          break;
        case true:
        case 'first-tabbable':
          if (!self._focusTrap?.focusInitialElement(options)) {
            self._focusDialogContainer(options);
          }
          break;
        case 'first-heading':
          self._focusByCssSelector('h1, h2, h3, h4, h5, h6, [role="heading"]', options);
          break;
        default:
          self._focusByCssSelector(self._config.autoFocus as string, options);
          break;
      }
      self._focusTrapped.next();
    });
  }

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
