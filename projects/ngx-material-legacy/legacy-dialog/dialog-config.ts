/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {MatDialogConfig as DialogConfigBase} from '@angular/material/dialog';
import {_defaultParams} from './dialog-animation-params';


/**
 * Historical focus and animation values are interpreted by the owned legacy
 * container. Keep their contract independent of upstream removal annotations.
 * All other configuration fields retain the public peer contract.
 */
export type LegacyDialogRuntimeConfig<D = any> = Omit<DialogConfigBase<D>,
  'autoFocus' | 'enterAnimationDuration' | 'exitAnimationDuration'> & {
  autoFocus?: string | boolean;
  enterAnimationDuration?: string | number;
  exitAnimationDuration?: string | number;
};

export class MatLegacyDialogConfig<D = any> extends DialogConfigBase<D> {
  /**
   * Whether the dialog should set `aria-modal`. Current Material defaults this
   * to false; the legacy dialog set it to true.
   */
  override ariaModal: boolean = true;

  /** Max-width of the dialog. Current Material leaves this unset; legacy defaults to 80vw. */
  override maxWidth?: number | string = '80vw';

  /** Historical autofocus policy, including boolean values handled by the owned container. */
  override autoFocus?: string | boolean = 'first-tabbable';

  /** Duration of the enter animation. Has to be a valid CSS value (e.g. 100ms). */
  override enterAnimationDuration?: string = _defaultParams.params.enterAnimationDuration;

  /** Duration of the exit animation. Has to be a valid CSS value (e.g. 50ms). */
  override exitAnimationDuration?: string = _defaultParams.params.exitAnimationDuration;
}
