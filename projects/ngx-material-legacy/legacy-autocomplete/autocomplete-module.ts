/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OverlayModule} from '@angular/cdk/overlay';
import {MatCommonModule} from './internal/common-module';
import {MatLegacyOptionModule} from '@ngx-compat/material-legacy/legacy-core';
import {CdkScrollableModule} from '@angular/cdk/scrolling';
import {MAT_AUTOCOMPLETE_SCROLL_STRATEGY_FACTORY_PROVIDER} from './internal/autocomplete-trigger-base';
import {MatLegacyAutocomplete} from './autocomplete';
import {MatLegacyAutocompleteTrigger} from './autocomplete-trigger';
import {MatLegacyAutocompleteOrigin} from './autocomplete-origin';

/**
 * @deprecated Use `MatAutocompleteModule` from `@angular/material/autocomplete` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
@NgModule({
  imports: [OverlayModule, MatLegacyOptionModule, MatCommonModule, CommonModule],
  exports: [
    MatLegacyAutocomplete,
    MatLegacyAutocompleteTrigger,
    MatLegacyAutocompleteOrigin,
    CdkScrollableModule,
    MatLegacyOptionModule,
    MatCommonModule,
  ],
  declarations: [MatLegacyAutocomplete, MatLegacyAutocompleteTrigger, MatLegacyAutocompleteOrigin],
  providers: [MAT_AUTOCOMPLETE_SCROLL_STRATEGY_FACTORY_PROVIDER],
})
export class MatLegacyAutocompleteModule {}
