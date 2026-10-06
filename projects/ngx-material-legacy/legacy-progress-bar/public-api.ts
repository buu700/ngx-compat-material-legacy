/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacyProgressBarModule} from './progress-bar-module';
export {MatLegacyProgressBar} from './progress-bar';

export {
  ProgressAnimationEnd as LegacyProgressAnimationEnd,
  ProgressBarMode as LegacyProgressBarMode,
} from '@angular/material/progress-bar';
export {
  MAT_PROGRESS_BAR_LOCATION as MAT_LEGACY_PROGRESS_BAR_LOCATION,
  MatProgressBarLocation as MatLegacyProgressBarLocation,
  MAT_PROGRESS_BAR_LOCATION_FACTORY as MAT_LEGACY_PROGRESS_BAR_LOCATION_FACTORY,
} from './internal/progress-bar-location';
export {MatCommonModule} from './internal/common-module';

export {
  MatProgressBarDefaultOptions as MatLegacyProgressBarDefaultOptions,
  MAT_PROGRESS_BAR_DEFAULT_OPTIONS as MAT_LEGACY_PROGRESS_BAR_DEFAULT_OPTIONS,
} from './internal/progress-bar-defaults';
