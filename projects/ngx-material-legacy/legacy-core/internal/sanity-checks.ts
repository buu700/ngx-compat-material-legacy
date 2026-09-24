/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Historical sanity-check tokens. Current Material removed MatCommonModule's
 * Hammer/theme/version checks; tokens are preserved for DI identity of consumers
 * that inject them. MatLegacyCommonModule does not re-run Hammer detection.
 */

import {InjectionToken} from '@angular/core';

/** Granular sanity checks historically accepted by MatCommonModule. */
export interface LegacyGranularSanityChecks {
  doctype?: boolean;
  theme?: boolean;
  version?: boolean;
}

/** Possible sanity check values. */
export type LegacySanityChecks = boolean | LegacyGranularSanityChecks;

/** Injection token that can be used to disable or configure sanity checks. */
export const MATERIAL_LEGACY_SANITY_CHECKS = new InjectionToken<LegacySanityChecks>(
  'mat-legacy-sanity-checks',
  {providedIn: 'root', factory: () => true},
);
