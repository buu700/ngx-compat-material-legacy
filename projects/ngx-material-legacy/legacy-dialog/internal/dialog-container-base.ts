/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 `_MatDialogContainerBase` (removed from Angular Material 22).
 * Constructor adapted to current CDK `CdkDialogContainer` inject()-based API.
 */

import {CdkDialogContainer} from '@angular/cdk/dialog';
import {InteractivityChecker} from '@angular/cdk/a11y';
import {Platform} from '@angular/cdk/platform';
import {Component, EventEmitter, inject, Renderer2} from '@angular/core';
import {MatDialogConfig} from '@angular/material/dialog';
import {Subject} from 'rxjs';
import {focusLegacyDialogInitially} from './dialog-initial-focus';

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

  private readonly _legacyFocusNotifications = new Subject<void>();

  private readonly _legacyFocusChecker = inject(InteractivityChecker);
  private readonly _legacyFocusRenderer = inject(Renderer2);
  private readonly _legacyFocusPlatform = inject(Platform);
  private _legacyFocusDestroyed = false;
  private _legacyFocusCleanup: (() => void) | null = null;

  constructor() {
    super();
    // Keep the existing observable-only public type while owning notification.
    this._focusTrapped = this._legacyFocusNotifications;
  }

  /** Starts the dialog exit animation. */
  abstract _startExitAnimation(): void;

  /**
   * CDK schedules autofocus via `afterNextRender`, which historical fakeAsync
   * suites (flushMicrotasks only) never flush. Run the same focus selection on
   * a microtask so noop-animation opens still autofocus under those tests.
   */
  protected override _trapFocus(options?: FocusOptions): void {
    if (this._legacyFocusDestroyed) {
      return;
    }
    Promise.resolve().then(() => {
      if (this._legacyFocusDestroyed) {
        return;
      }
      this._legacyFocusCleanup?.();
      this._legacyFocusCleanup = focusLegacyDialogInitially({
        element: this._elementRef.nativeElement,
        config: this._config,
        factory: this._focusTrapFactory,
        checker: this._legacyFocusChecker,
        renderer: this._legacyFocusRenderer,
        ngZone: this._ngZone,
        isBrowser: this._legacyFocusPlatform.isBrowser,
      }, options);
      this._legacyFocusNotifications.next();
    });
  }

  override ngOnDestroy(): void {
    this._legacyFocusDestroyed = true;
    try {
      super.ngOnDestroy();
    } finally {
      this._legacyFocusCleanup?.();
      this._legacyFocusCleanup = null;
    }
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
