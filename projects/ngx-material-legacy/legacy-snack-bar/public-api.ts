/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacySnackBarModule} from './snack-bar-module';
export {MatLegacySnackBar} from './snack-bar';
export {MatLegacySnackBarContainer} from './snack-bar-container';
export {LegacySimpleSnackBar, LegacyTextOnlySnackBar} from './simple-snack-bar';
// Historical AnimationTriggerMetadata recipes moved to
// native CSS motion (historical `/animations` recipe secondary removed in F04).
export {

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

  MAT_SNACK_BAR_DATA as MAT_LEGACY_SNACK_BAR_DATA,


  MatSnackBarHorizontalPosition as MatLegacySnackBarHorizontalPosition,


  MatSnackBarVerticalPosition as MatLegacySnackBarVerticalPosition,


  MAT_SNACK_BAR_DEFAULT_OPTIONS as MAT_LEGACY_SNACK_BAR_DEFAULT_OPTIONS,

} from '@angular/material/snack-bar';
export {MatLegacySnackBarConfig} from './snack-bar-config';
export {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';
