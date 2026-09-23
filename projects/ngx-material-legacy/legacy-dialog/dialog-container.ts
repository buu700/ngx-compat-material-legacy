/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Legacy dialog container motion follows Material 22's CSS + timer pattern
 * (no `@angular/animations` engine on the primary entry). Historical
 * `matDialogAnimations` / `matLegacyDialogAnimations` recipes live under
 * `@ngx-compat/material-legacy/legacy-dialog/animations`.
 */

import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import {_MatDialogContainerBase} from './internal/dialog-container-base';
import {defaultParams} from './dialog-animation-params';
import {legacyAnimationsDisabled} from '@ngx-compat/material-legacy/legacy-core';

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
 * @deprecated Use `MatDialogContainer` from `@angular/material/dialog` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
@Component({
  standalone: false,
  selector: 'mat-dialog-container',
  templateUrl: 'dialog-container.html',
  styleUrls: ['dialog.scss'],
  encapsulation: ViewEncapsulation.None,
  // Using OnPush for dialogs caused some G3 sync issues. Disabled until we can track them down.
  // tslint:disable-next-line:validate-decorators
  changeDetection: ChangeDetectionStrategy.Default,
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
  private readonly _legacyAnimationsDisabled = legacyAnimationsDisabled();

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
  private _hostElement = this._elementRef.nativeElement;

  protected override _contentAttached(): void {
    super._contentAttached();
    this._startOpenAnimation();
  }

  private _startOpenAnimation(): void {
    this._animationStateChanged.emit({
      state: 'opening',
      totalTime: this._enterAnimationDuration,
    });

    if (this._animationsEnabled) {
      this._hostElement.style.setProperty(ENTER_DURATION_VAR, `${this._enterAnimationDuration}ms`);
      this._hostElement.style.setProperty(EXIT_DURATION_VAR, `${this._exitAnimationDuration}ms`);
      this._requestAnimationFrame(() => {
        this._hostElement.classList.add(OPENING_CLASS, OPEN_CLASS);
      });
      this._waitForAnimationToComplete(this._enterAnimationDuration, this._finishDialogOpen);
    } else {
      this._hostElement.classList.add(OPEN_CLASS, NOOP_CLASS);
      Promise.resolve().then(() => this._finishDialogOpen());
    }
  }

  /** Starts the dialog exit animation. */
  _startExitAnimation(): void {
    this._animationStateChanged.emit({
      state: 'closing',
      totalTime: this._exitAnimationDuration,
    });
    this._hostElement.classList.remove(OPEN_CLASS);

    if (this._animationsEnabled) {
      this._hostElement.style.setProperty(EXIT_DURATION_VAR, `${this._exitAnimationDuration}ms`);
      this._requestAnimationFrame(() => {
        this._hostElement.classList.add(CLOSING_CLASS);
      });
      this._waitForAnimationToComplete(this._exitAnimationDuration, this._finishDialogClose);
    } else {
      Promise.resolve().then(() => this._finishDialogClose());
    }
  }

  private _finishDialogOpen = (): void => {
    this._clearAnimationClasses();
    this._openAnimationDone(this._enterAnimationDuration);
  };

  private _finishDialogClose = (): void => {
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
    this._animationTimer = setTimeout(callback, duration);
  }

  private _requestAnimationFrame(callback: () => void): void {
    this._ngZone.runOutsideAngular(() => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(callback);
      } else {
        callback();
      }
    });
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    if (this._animationTimer !== null) {
      clearTimeout(this._animationTimer);
    }
  }
}
