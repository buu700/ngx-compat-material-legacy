/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {MatDialogConfig as DialogConfigBase} from '@angular/material/dialog';
import {_defaultParams} from './dialog-animation-params';

/**
 * @deprecated Use `MatDialogConfig` from `@angular/material/dialog` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
export class MatLegacyDialogConfig<D = any> extends DialogConfigBase<D> {
  /** Duration of the enter animation. Has to be a valid CSS value (e.g. 100ms). */
  override enterAnimationDuration?: string = _defaultParams.params.enterAnimationDuration;

  /** Duration of the exit animation. Has to be a valid CSS value (e.g. 50ms). */
  override exitAnimationDuration?: string = _defaultParams.params.exitAnimationDuration;
}
