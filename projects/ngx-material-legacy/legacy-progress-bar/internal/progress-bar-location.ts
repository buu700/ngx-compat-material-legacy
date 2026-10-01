/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Historical MAT_PROGRESS_BAR_LOCATION_FACTORY. Peer Material 22 no longer
 * exports the factory symbol; the LOCATION token remains on the peer.
 */

import {DOCUMENT} from '@angular/common';
import {inject} from '@angular/core';
import {MatProgressBarLocation} from '@angular/material/progress-bar';

/** @docs-private */
export function MAT_PROGRESS_BAR_LOCATION_FACTORY(): MatProgressBarLocation {
  const _document = inject(DOCUMENT);
  const _location = _document ? _document.location : null;

  return {
    // Note that this needs to be a function, rather than a property, because Angular
    // will only resolve it once, but we want the current path on each call.
    getPathname: () => (_location ? _location.pathname + _location.search : ''),
  };
}
