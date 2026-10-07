/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {MatSnackBarConfig} from '@angular/material/snack-bar';
import {AriaLivePoliteness} from '@angular/cdk/a11y';


export class MatLegacySnackBarConfig<D = any> extends MatSnackBarConfig<D> {
  /**
   * The politeness level for the MatAriaLiveAnnouncer announcement.
   * Current Material defaults to `polite`; legacy snack bars used `assertive`.
   */
  override politeness: AriaLivePoliteness = 'assertive';
}
