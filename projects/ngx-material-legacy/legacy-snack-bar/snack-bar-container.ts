/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {_MatSnackBarContainerBase} from './internal/snack-bar-container-base';
import {matSnackBarAnimations} from './snack-bar-animations';
import {
  legacyAnimationTriggerState,
  legacyAnimationsDisabled,
} from '@ngx-compat/material-legacy/legacy-core';

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
  animations: [matSnackBarAnimations.snackBarState],
  host: {
    'class': 'mat-snack-bar-container',
    '[@state]': '_getAnimationState()',
    '(@state.done)': 'onAnimationEnd($event)',
  },
})
export class MatLegacySnackBarContainer extends _MatSnackBarContainerBase {
  private readonly _legacyAnimationsDisabled = legacyAnimationsDisabled();

  _getAnimationState() {
    return legacyAnimationTriggerState(
      this._animationState,
      {enterDuration: '150ms', exitDuration: '75ms'},
      this._legacyAnimationsDisabled,
    );
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
