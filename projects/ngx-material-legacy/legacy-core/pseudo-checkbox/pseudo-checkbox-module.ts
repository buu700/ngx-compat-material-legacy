/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {BidiModule} from '@angular/cdk/bidi';
import {NgModule} from '@angular/core';
import {MatLegacyPseudoCheckbox} from './pseudo-checkbox';

@NgModule({
  imports: [MatLegacyPseudoCheckbox, BidiModule],
  exports: [MatLegacyPseudoCheckbox, BidiModule],
})
export class MatLegacyPseudoCheckboxModule {}
