/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacyDialogModule} from './dialog-module';
export {
  MAT_LEGACY_DIALOG_DATA,
  MAT_LEGACY_DIALOG_DEFAULT_OPTIONS,
  MAT_LEGACY_DIALOG_SCROLL_STRATEGY,
  MAT_LEGACY_DIALOG_SCROLL_STRATEGY_PROVIDER_FACTORY,
  MAT_LEGACY_DIALOG_SCROLL_STRATEGY_PROVIDER,
  MatLegacyDialog,
} from './dialog';
export {MatLegacyDialogContainer} from './dialog-container';
export {
  MatLegacyDialogClose,
  MatLegacyDialogTitle,
  MatLegacyDialogContent,
  MatLegacyDialogActions,
} from './dialog-content-directives';
export {MatLegacyDialogRef, _closeDialogVia as _closeLegacyDialogVia} from './dialog-ref';
export {MatLegacyDialogConfig} from './dialog-config';
export {_defaultParams, defaultParams} from './dialog-animation-params';
// Historical AnimationTriggerMetadata recipes moved to
// native CSS motion; primary dialog FESM is engine-free (F04 removed `/animations` recipe secondary).
export {
  /**
   * @deprecated Use `_MatDialogBase` from the package internals / historical docs.
   * @breaking-change 17.0.0
   */
  _MatDialogBase as _MatLegacyDialogBase,
  MAT_DIALOG_SCROLL_STRATEGY_FACTORY as MAT_LEGACY_DIALOG_SCROLL_STRATEGY_FACTORY,
} from './internal/dialog-base';
export {
  /**
   * @deprecated Use `_MatDialogContainerBase` from the package internals / historical docs.
   * @breaking-change 17.0.0
   */
  _MatDialogContainerBase as _MatLegacyDialogContainerBase,
} from './internal/dialog-container-base';
export {
  /**
   * @deprecated Use `AutoFocusTarget` from `@angular/material/dialog` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  AutoFocusTarget as LegacyAutoFocusTarget,

  /**
   * @deprecated Use `DialogRole` from `@angular/material/dialog` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  DialogRole as LegacyDialogRole,

  /**
   * @deprecated Use `DialogPosition` from `@angular/material/dialog` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  DialogPosition as LegacyDialogPosition,

  /**
   * @deprecated Use `MatDialogState` from `@angular/material/dialog` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  MatDialogState as MatLegacyDialogState,
} from '@angular/material/dialog';
export {MatCommonModule} from './internal/common-module';
