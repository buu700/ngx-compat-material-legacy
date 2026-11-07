/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// These imports must fail against the packed declarations; NgModule metadata
// continues to reference the one owned, historically named common module.
// @ts-expect-error MatCommonModule is not a legacy-autocomplete public name.
import type {MatCommonModule as Absent0} from '@ngx-compat/material-legacy/legacy-autocomplete';
// @ts-expect-error MatCommonModule is not a legacy-button public name.
import type {MatCommonModule as Absent1} from '@ngx-compat/material-legacy/legacy-button';
// @ts-expect-error MatCommonModule is not a legacy-card public name.
import type {MatCommonModule as Absent2} from '@ngx-compat/material-legacy/legacy-card';
// @ts-expect-error MatCommonModule is not a legacy-checkbox public name.
import type {MatCommonModule as Absent3} from '@ngx-compat/material-legacy/legacy-checkbox';
// @ts-expect-error MatCommonModule is not a legacy-chips public name.
import type {MatCommonModule as Absent4} from '@ngx-compat/material-legacy/legacy-chips';
// @ts-expect-error MatCommonModule is not a legacy-dialog public name.
import type {MatCommonModule as Absent5} from '@ngx-compat/material-legacy/legacy-dialog';
// @ts-expect-error MatCommonModule is not a legacy-form-field public name.
import type {MatCommonModule as Absent6} from '@ngx-compat/material-legacy/legacy-form-field';
// @ts-expect-error MatCommonModule is not a legacy-input public name.
import type {MatCommonModule as Absent7} from '@ngx-compat/material-legacy/legacy-input';
// @ts-expect-error MatCommonModule is not a legacy-list public name.
import type {MatCommonModule as Absent8} from '@ngx-compat/material-legacy/legacy-list';
// @ts-expect-error MatCommonModule is not a legacy-menu public name.
import type {MatCommonModule as Absent9} from '@ngx-compat/material-legacy/legacy-menu';
// @ts-expect-error MatCommonModule is not a legacy-paginator public name.
import type {MatCommonModule as Absent10} from '@ngx-compat/material-legacy/legacy-paginator';
// @ts-expect-error MatCommonModule is not a legacy-progress-bar public name.
import type {MatCommonModule as Absent11} from '@ngx-compat/material-legacy/legacy-progress-bar';
// @ts-expect-error MatCommonModule is not a legacy-progress-spinner public name.
import type {MatCommonModule as Absent12} from '@ngx-compat/material-legacy/legacy-progress-spinner';
// @ts-expect-error MatCommonModule is not a legacy-radio public name.
import type {MatCommonModule as Absent13} from '@ngx-compat/material-legacy/legacy-radio';
// @ts-expect-error MatCommonModule is not a legacy-select public name.
import type {MatCommonModule as Absent14} from '@ngx-compat/material-legacy/legacy-select';
// @ts-expect-error MatCommonModule is not a legacy-slide-toggle public name.
import type {MatCommonModule as Absent15} from '@ngx-compat/material-legacy/legacy-slide-toggle';
// @ts-expect-error MatCommonModule is not a legacy-slider public name.
import type {MatCommonModule as Absent16} from '@ngx-compat/material-legacy/legacy-slider';
// @ts-expect-error MatCommonModule is not a legacy-snack-bar public name.
import type {MatCommonModule as Absent17} from '@ngx-compat/material-legacy/legacy-snack-bar';
// @ts-expect-error MatCommonModule is not a legacy-table public name.
import type {MatCommonModule as Absent18} from '@ngx-compat/material-legacy/legacy-table';
// @ts-expect-error MatCommonModule is not a legacy-tabs public name.
import type {MatCommonModule as Absent19} from '@ngx-compat/material-legacy/legacy-tabs';
// @ts-expect-error MatCommonModule is not a legacy-tooltip public name.
import type {MatCommonModule as Absent20} from '@ngx-compat/material-legacy/legacy-tooltip';
// @ts-expect-error MatCommonModule is not a legacy-core public name.
import type {MatCommonModule as Absent21} from '@ngx-compat/material-legacy/legacy-core';
// @ts-expect-error The root facade does not expose a common-module alias.
import type {MatCommonModule as RootAbsent} from '@ngx-compat/material-legacy';
export {};
