/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Legacy dialog container motion follows Material 22's CSS + timer pattern
 * (no `@angular/animations` engine on the primary entry). Historical
 * `matDialogAnimations` / `matLegacyDialogAnimations` recipes live under
 * native CSS motion (historical `/animations` recipe secondary removed in F04).
 */

import {FocusMonitor, FocusTrapFactory, InteractivityChecker} from '@angular/cdk/a11y';
import {OverlayRef} from '@angular/cdk/overlay';
import {
  assertInInjectionContext,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DOCUMENT,
  ElementRef,
  Inject,
  NgZone,
  Optional,
  Component,
  OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import {_MatDialogContainerBase} from './internal/dialog-container-base';
import {MatLegacyDialogConfig} from './dialog-config';
import {defaultParams} from './dialog-animation-params';
import {legacyAnimationsDisabled} from '@ngx-compat/material-legacy/legacy-core';

/** Preserve manual construction; the owned policy still governs Angular views. */
function dialogAnimationsDisabled(): boolean {
  try {
    assertInInjectionContext(dialogAnimationsDisabled);
  } catch {
    // The original constructor could be called outside Angular. It had no
    // injected motion-mode argument, so manual construction starts enabled.
    return false;
  }
  return legacyAnimationsDisabled();
}

const OPEN_CLASS = 'mat-legacy-dialog-container-open';
const OPENING_CLASS = 'mat-legacy-dialog-container-opening';
const CLOSING_CLASS = 'mat-legacy-dialog-container-closing';
const NOOP_CLASS = '_mat-animation-noopable';
const ENTER_DURATION_VAR = '--mat-legacy-dialog-enter-duration';
const EXIT_DURATION_VAR = '--mat-legacy-dialog-exit-duration';

const DEFAULT_ENTER_MS = 150;
const DEFAULT_EXIT_MS = 75;

function parseCssTime(value: string | number | undefined | null): number | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  const trimmed = String(value).trim();
  if (trimmed.endsWith('ms')) {
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  if (trimmed.endsWith('s')) {
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? n * 1000 : null;
  }
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Internal component that wraps user-provided dialog content.
 * Animation is based on https://material.io/guidelines/motion/choreography.html.
 * @docs-private
 */
@Component({
  standalone: false,
  selector: 'mat-dialog-container',
  templateUrl: 'dialog-container.html',
  styleUrls: ['dialog.scss'],
  encapsulation: ViewEncapsulation.None,
  // Using OnPush for dialogs caused some G3 sync issues. Disabled until we can track them down.
  // tslint:disable-next-line:validate-decorators
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    'class': 'mat-dialog-container',
    'tabindex': '-1',
    '[attr.aria-modal]': '_config.ariaModal',
    '[id]': '_config.id',
    '[attr.role]': '_config.role',
    '[attr.aria-labelledby]': '_config.ariaLabel ? null : _ariaLabelledByQueue[0]',
    '[attr.aria-label]': '_config.ariaLabel',
    '[attr.aria-describedby]': '_config.ariaDescribedBy || null',
    '[class._mat-animation-noopable]': '!_animationsEnabled',
  },
})
export class MatLegacyDialogContainer extends _MatDialogContainerBase implements OnDestroy {
  private readonly _legacyAnimationsDisabled = dialogAnimationsDisabled();

  /** Whether CSS transitions should run (MATERIAL_ANIMATIONS / reduced-motion / Noop). */
  readonly _animationsEnabled = !this._legacyAnimationsDisabled;

  private _enterAnimationDuration = this._animationsEnabled
    ? parseCssTime(this._config.enterAnimationDuration) ??
      parseCssTime(defaultParams.params.enterAnimationDuration) ??
      DEFAULT_ENTER_MS
    : 0;
  private _exitAnimationDuration = this._animationsEnabled
    ? parseCssTime(this._config.exitAnimationDuration) ??
      parseCssTime(defaultParams.params.exitAnimationDuration) ??
      DEFAULT_EXIT_MS
    : 0;

  private _animationTimer: ReturnType<typeof setTimeout> | null = null;
  private _animationFrame: number | null = null;
  private _animationRevision = 0;
  private _animationDestroyed = false;
  private _animationCompleted = false;
  private _hostElement = this._elementRef.nativeElement;

  /**
   * Animation phase string kept for historical specs that asserted the
   * engine trigger state. Mapped onto CSS enter/exit lifecycle.
   * @docs-private
   */
  _state: 'void' | 'enter' | 'exit' = 'enter';

  constructor(
    elementRef: ElementRef,
    focusTrapFactory: FocusTrapFactory,
    @Optional() @Inject(DOCUMENT) document: any,
    dialogConfig: MatLegacyDialogConfig,
    checker: InteractivityChecker,
    ngZone: NgZone,
    overlayRef: OverlayRef,
    private _changeDetectorRef: ChangeDetectorRef,
    focusMonitor?: FocusMonitor,
  ) {
    super(elementRef, focusTrapFactory, document, dialogConfig, checker, ngZone,
      overlayRef, focusMonitor);
  }

  protected override _contentAttached(): void {
    super._contentAttached();
    this._startOpenAnimation();
  }

  private _startOpenAnimation(): void {
    if (this._animationDestroyed) {
      return;
    }
    this._cancelAnimationWork();
    this._animationCompleted = false;
    this._state = 'enter';
    const revision = this._animationRevision;
    this._animationStateChanged.emit({
      state: 'opening',
      totalTime: this._enterAnimationDuration,
    });
    // A synchronous opening observer can close or destroy the container.
    if (this._animationDestroyed || revision !== this._animationRevision) {
      return;
    }

    if (this._animationsEnabled) {
      this._hostElement.style.setProperty(ENTER_DURATION_VAR, `${this._enterAnimationDuration}ms`);
      this._hostElement.style.setProperty(EXIT_DURATION_VAR, `${this._exitAnimationDuration}ms`);
      this._requestAnimationFrame(() => {
        this._hostElement.classList.add(OPENING_CLASS, OPEN_CLASS);
      });
      this._waitForAnimationToComplete(this._enterAnimationDuration, this._finishDialogOpen);
    } else {
      this._hostElement.classList.add(OPEN_CLASS, NOOP_CLASS);
      Promise.resolve().then(() => this._finishDialogOpen(revision));
    }
  }

  /** Starts the dialog exit animation. */
  _startExitAnimation(): void {
    if (this._animationDestroyed || this._state === 'exit') {
      return;
    }
    this._cancelPendingInitialFocus();
    this._cancelAnimationWork();
    this._animationCompleted = false;
    this._state = 'exit';
    const revision = this._animationRevision;
    this._changeDetectorRef.markForCheck();
    if (this._animationDestroyed || revision !== this._animationRevision) {
      return;
    }
    this._animationStateChanged.emit({
      state: 'closing',
      totalTime: this._exitAnimationDuration,
    });
    if (this._animationDestroyed || revision !== this._animationRevision) {
      return;
    }
    this._hostElement.classList.remove(OPEN_CLASS);

    if (this._animationsEnabled) {
      this._hostElement.style.setProperty(EXIT_DURATION_VAR, `${this._exitAnimationDuration}ms`);
      this._requestAnimationFrame(() => {
        this._hostElement.classList.add(CLOSING_CLASS);
      });
      this._waitForAnimationToComplete(this._exitAnimationDuration, this._finishDialogClose);
    } else {
      Promise.resolve().then(() => this._finishDialogClose(revision));
    }
  }

  private _finishDialogOpen = (revision = this._animationRevision): void => {
    if (revision !== this._animationRevision || this._animationDestroyed || this._state !== 'enter' || this._animationCompleted) {
      return;
    }
    this._animationCompleted = true;
    this._cancelAnimationWork();
    // A zero-duration timer can finish before the first animation frame.
    this._hostElement.classList.add(OPEN_CLASS);
    this._clearAnimationClasses();
    this._openAnimationDone(this._enterAnimationDuration);
  };

  private _finishDialogClose = (revision = this._animationRevision): void => {
    if (revision !== this._animationRevision || this._animationDestroyed || this._state !== 'exit' || this._animationCompleted) {
      return;
    }
    this._animationCompleted = true;
    this._cancelAnimationWork();
    this._clearAnimationClasses();
    this._animationStateChanged.emit({
      state: 'closed',
      totalTime: this._exitAnimationDuration,
    });
  };

  private _clearAnimationClasses(): void {
    this._hostElement.classList.remove(OPENING_CLASS, CLOSING_CLASS);
  }

  private _waitForAnimationToComplete(duration: number, callback: () => void): void {
    if (this._animationTimer !== null) {
      clearTimeout(this._animationTimer);
    }
    const revision = this._animationRevision;
    this._animationTimer = setTimeout(() => {
      if (!this._animationDestroyed && revision === this._animationRevision) {
        this._animationTimer = null;
        callback();
      }
    }, duration);
  }

  private _requestAnimationFrame(callback: () => void): void {
    const revision = this._animationRevision;
    this._ngZone.runOutsideAngular(() => {
      if (typeof requestAnimationFrame === 'function') {
        this._animationFrame = requestAnimationFrame(() => {
          if (!this._animationDestroyed && revision === this._animationRevision) {
            this._animationFrame = null;
            callback();
          }
        });
      } else if (!this._animationDestroyed && revision === this._animationRevision) {
        callback();
      }
    });
  }

  private _cancelAnimationWork(): void {
    this._animationRevision++;
    if (this._animationTimer !== null) {
      clearTimeout(this._animationTimer);
      this._animationTimer = null;
    }
    if (this._animationFrame !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this._animationFrame);
      }
      this._animationFrame = null;
    }
  }

  override ngOnDestroy(): void {
    this._animationDestroyed = true;
    // Cancel before focus restoration, which may throw in consumer code.
    this._cancelAnimationWork();
    super.ngOnDestroy();
  }
}
