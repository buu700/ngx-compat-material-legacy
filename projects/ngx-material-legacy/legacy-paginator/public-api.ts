/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacyPaginatorModule} from './paginator-module';
export {
  MatLegacyPaginatorDefaultOptions,
  MAT_LEGACY_PAGINATOR_DEFAULT_OPTIONS,
  MatLegacyPaginator,
} from './paginator';
export {
  _MatPaginatorBase as _MatLegacyPaginatorBase,
  MAT_PAGINATOR_INTL_PROVIDER_FACTORY as MAT_LEGACY_PAGINATOR_INTL_PROVIDER_FACTORY,
  MAT_PAGINATOR_INTL_PROVIDER as MAT_LEGACY_PAGINATOR_INTL_PROVIDER,
} from './internal/paginator-base';
export {
  /**
   * @deprecated Use `MatPaginatorIntl` from `@angular/material/paginator` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  MatPaginatorIntl as MatLegacyPaginatorIntl,

  /**
   * @deprecated Use `PageEvent` from `@angular/material/paginator` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  PageEvent as LegacyPageEvent,

  /**
   * @deprecated Use `MatPaginatorSelectConfig` from `@angular/material/paginator` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  MatPaginatorSelectConfig as MatLegacyPaginatorSelectConfig,
} from '@angular/material/paginator';
export {MatCommonModule} from './internal/common-module';
