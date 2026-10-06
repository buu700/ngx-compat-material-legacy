/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Historical MAT_PROGRESS_SPINNER_DEFAULT_OPTIONS_FACTORY. Peer Material
 * no longer exports the factory symbol; the options token remains on the peer.
 */

import {MatProgressSpinnerDefaultOptions} from '@angular/material/progress-spinner';

/**
 * Base reference size of the spinner.
 * @docs-private
 */
const BASE_SIZE = 100;

/** @docs-private */
export function MAT_PROGRESS_SPINNER_DEFAULT_OPTIONS_FACTORY(): MatProgressSpinnerDefaultOptions {
  return {diameter: BASE_SIZE};
}
