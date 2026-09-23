/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacyAutocomplete} from './autocomplete';
export {MatLegacyAutocompleteModule} from './autocomplete-module';
export {
  MAT_LEGACY_AUTOCOMPLETE_VALUE_ACCESSOR,
  MatLegacyAutocompleteTrigger,
} from './autocomplete-trigger';
export {MatLegacyAutocompleteOrigin} from './autocomplete-origin';
export {
  _MatAutocompleteBase as _MatLegacyAutocompleteBase,
  MatAutocompleteSelectedEvent as MatLegacyAutocompleteSelectedEvent,
  MatAutocompleteActivatedEvent as MatLegacyAutocompleteActivatedEvent,
} from './internal/autocomplete-base';
export {_MatAutocompleteTriggerBase as _MatLegacyAutocompleteTriggerBase} from './internal/autocomplete-trigger-base';
export {_MatAutocompleteOriginBase as _MatLegacyAutocompleteOriginBase} from './internal/autocomplete-origin-base';
export {
  MAT_AUTOCOMPLETE_SCROLL_STRATEGY_FACTORY as MAT_LEGACY_AUTOCOMPLETE_SCROLL_STRATEGY_FACTORY,
  MAT_AUTOCOMPLETE_SCROLL_STRATEGY_FACTORY_PROVIDER as MAT_LEGACY_AUTOCOMPLETE_SCROLL_STRATEGY_FACTORY_PROVIDER,
} from './internal/autocomplete-trigger-base';
export {
  /**
   * @deprecated Use `getMatAutocompleteMissingPanelError` from `@angular/material/autocomplete` instead.
   * @breaking-change 17.0.0
   */
  getMatAutocompleteMissingPanelError as getMatLegacyAutocompleteMissingPanelError,

  /**
   * @deprecated Use `MAT_AUTOCOMPLETE_DEFAULT_OPTIONS` from `@angular/material/autocomplete` instead.
   * @breaking-change 17.0.0
   */
  MAT_AUTOCOMPLETE_DEFAULT_OPTIONS as MAT_LEGACY_AUTOCOMPLETE_DEFAULT_OPTIONS,

  /**
   * @deprecated Use `MAT_AUTOCOMPLETE_SCROLL_STRATEGY` from `@angular/material/autocomplete` instead.
   * @breaking-change 17.0.0
   */
  MAT_AUTOCOMPLETE_SCROLL_STRATEGY as MAT_LEGACY_AUTOCOMPLETE_SCROLL_STRATEGY,

  /**
   * @deprecated Use `MatAutocompleteDefaultOptions` from `@angular/material/autocomplete` instead.
   * @breaking-change 17.0.0
   */
  MatAutocompleteDefaultOptions as MatLegacyAutocompleteDefaultOptions,
} from '@angular/material/autocomplete';
export {MatCommonModule} from './internal/common-module';
