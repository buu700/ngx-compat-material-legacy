/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * CSS keyframe motion (Material 22-style). Recipe metadata lives under
 * `@ngx-compat/material-legacy/legacy-snack-bar/animations`.
 */

import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {_MatSnackBarContainerBase} from './internal/snack-bar-container-base';
import {legacyAnimationsDisabled} from '@ngx-compat/material-legacy/legacy-core';

const ENTER_MS = 150;
const EXIT_MS = 75;

/**
 * Internal component that wraps user-provided snack bar content.
 * @docs-private
 * @deprecated Use `MatSnackBarContainer` from `@angular/material/snack-bar` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
@Component({
  standalone: false,
  selector: 'snack-bar-container',
  templateUrl: 'snack-bar-container.html',
  styleUrls: ['snack-bar-container.scss'],
  // In Ivy embedded views will be change detected from their declaration place, rather than
  // where they were stamped out. This means that we can't have the snack bar container be OnPush,
  // because it might cause snack bars that were opened from a template not to be out of date.
  // tslint:disable-next-line:validate-decorators
  changeDetection: ChangeDetectionStrategy.Default,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'mat-snack-bar-container',
    '[class.mat-snack-bar-container-enter]': "_animationState === 'visible'",
    '[class.mat-snack-bar-container-exit]': "_animationState === 'hidden'",
    '[class.mat-snack-bar-container-animations-enabled]': '_animationsEnabled',
    '(animationend)': 'onAnimationEnd($event.animationName)',
  },
})
export class MatLegacySnackBarContainer extends _MatSnackBarContainerBase {
  private readonly _legacyAnimationsDisabled = legacyAnimationsDisabled();
  readonly _animationsEnabled = !this._legacyAnimationsDisabled;

  private _enterFallback: ReturnType<typeof setTimeout> | null = null;
  private _exitFallback: ReturnType<typeof setTimeout> | null = null;

  protected override _afterEnterMotionStarted(): void {
    if (!this._animationsEnabled) {
      this._notifyEnter();
      return;
    }
    if (this._enterFallback !== null) {
      clearTimeout(this._enterFallback);
    }
    this._enterFallback = setTimeout(() => {
      this.onAnimationEnd('mat-legacy-snack-bar-enter');
    }, ENTER_MS + 50);
  }

  protected override _afterExitMotionStarted(): void {
    if (!this._animationsEnabled) {
      this._notifyExitComplete();
      return;
    }
    if (this._exitFallback !== null) {
      clearTimeout(this._exitFallback);
    }
    this._exitFallback = setTimeout(() => {
      this.onAnimationEnd('mat-legacy-snack-bar-exit');
    }, EXIT_MS + 50);
  }

  override onAnimationEnd(
    event: string | {fromState?: string; toState?: string; animationName?: string},
  ) {
    if (typeof event === 'string') {
      if (event === 'mat-legacy-snack-bar-enter' && this._enterFallback !== null) {
        clearTimeout(this._enterFallback);
        this._enterFallback = null;
      }
      if (event === 'mat-legacy-snack-bar-exit' && this._exitFallback !== null) {
        clearTimeout(this._exitFallback);
        this._exitFallback = null;
      }
    }
    super.onAnimationEnd(event);
  }

  override ngOnDestroy() {
    if (this._enterFallback !== null) {
      clearTimeout(this._enterFallback);
    }
    if (this._exitFallback !== null) {
      clearTimeout(this._exitFallback);
    }
    super.ngOnDestroy();
  }

  protected override _afterPortalAttached() {
    super._afterPortalAttached();

    if (this.snackBarConfig.horizontalPosition === 'center') {
      this._elementRef.nativeElement.classList.add('mat-snack-bar-center');
    }

    if (this.snackBarConfig.verticalPosition === 'top') {
      this._elementRef.nativeElement.classList.add('mat-snack-bar-top');
    }
  }
}
