/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned historical sanity-check token and public option types.
 * The legacy common module consumes these options for doctype/theme/version checks.
 */

import {InjectionToken} from '@angular/core';

/** Granular sanity checks historically accepted by MatCommonModule. */
export interface LegacyGranularSanityChecks {
  doctype: boolean;
  theme: boolean;
  version: boolean;
}

/** Possible sanity check values. */
export type LegacySanityChecks = boolean | LegacyGranularSanityChecks;

/** Injection token that can be used to disable or configure sanity checks. */
export const MATERIAL_LEGACY_SANITY_CHECKS = new InjectionToken<LegacySanityChecks>(
  'mat-sanity-checks',
  {providedIn: 'root', factory: () => true},
);
