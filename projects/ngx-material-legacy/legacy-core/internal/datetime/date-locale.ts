/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {LOCALE_ID, inject} from '@angular/core';

/**
 * Historical MAT_DATE_LOCALE_FACTORY. Current Material inlines the factory on the token;
 * preserve the named export for legacy consumers.
 */
export function MAT_LEGACY_DATE_LOCALE_FACTORY(): unknown {
  return inject(LOCALE_ID);
}
