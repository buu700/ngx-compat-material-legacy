/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacySnackBarModule} from './snack-bar-module';
export {MatLegacySnackBar} from './snack-bar';
export {MatLegacySnackBarContainer} from './snack-bar-container';
export {LegacySimpleSnackBar, LegacyTextOnlySnackBar} from './simple-snack-bar';
export {matSnackBarAnimations as matLegacySnackBarAnimations} from './snack-bar-animations';
export {
  /**
   * @deprecated Use `MatSnackBarRef` from `@angular/material/snack-bar` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  MatSnackBarRef as MatLegacySnackBarRef,
  MatSnackBarDismiss as MatLegacySnackBarDismiss,
} from './internal/snack-bar-ref';
export {
  _MatSnackBarBase as _MatLegacySnackBarBase,
  MAT_SNACK_BAR_DEFAULT_OPTIONS_FACTORY as MAT_LEGACY_SNACK_BAR_DEFAULT_OPTIONS_FACTORY,
} from './internal/snack-bar-base';
export {
  _MatSnackBarContainerBase as _MatLegacySnackBarContainerBase,
} from './internal/snack-bar-container-base';
export {
  /**
   * @deprecated Use `MAT_SNACK_BAR_DATA` from `@angular/material/snack-bar` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  MAT_SNACK_BAR_DATA as MAT_LEGACY_SNACK_BAR_DATA,

  /**
   * @deprecated Use `MatSnackBarHorizontalPosition` from `@angular/material/snack-bar` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  MatSnackBarHorizontalPosition as MatLegacySnackBarHorizontalPosition,

  /**
   * @deprecated Use `MatSnackBarVerticalPosition` from `@angular/material/snack-bar` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  MatSnackBarVerticalPosition as MatLegacySnackBarVerticalPosition,

  /**
   * @deprecated Use `MatSnackBarConfig` from `@angular/material/snack-bar` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  MatSnackBarConfig as MatLegacySnackBarConfig,

  /**
   * @deprecated Use `MAT_SNACK_BAR_DEFAULT_OPTIONS` from `@angular/material/snack-bar` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  MAT_SNACK_BAR_DEFAULT_OPTIONS as MAT_LEGACY_SNACK_BAR_DEFAULT_OPTIONS,

} from '@angular/material/snack-bar';
export {MatCommonModule} from './internal/common-module';
