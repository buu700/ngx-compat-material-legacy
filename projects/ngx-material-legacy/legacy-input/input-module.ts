/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {TextFieldModule} from '@angular/cdk/text-field';
import {NgModule} from '@angular/core';
import {ErrorStateMatcher} from '@angular/material/core';
import {MatLegacyCommonModule as MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacyInput} from './input';


@NgModule({
  declarations: [MatLegacyInput],
  imports: [TextFieldModule, MatLegacyFormFieldModule, MatCommonModule],
  exports: [
    TextFieldModule,
    // We re-export the `MatLegacyFormFieldModule` since `MatLegacyInput` will almost always
    // be used together with `MatLegacyFormField`.
    MatLegacyFormFieldModule,
    MatLegacyInput,
  ],
  providers: [ErrorStateMatcher],
})
export class MatLegacyInputModule {}
