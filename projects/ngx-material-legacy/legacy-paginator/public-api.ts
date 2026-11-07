/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
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

  MatPaginatorIntl as MatLegacyPaginatorIntl,


  PageEvent as LegacyPageEvent,


  MatPaginatorSelectConfig as MatLegacyPaginatorSelectConfig,
} from '@angular/material/paginator';
export {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';
