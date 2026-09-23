/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 `matSnackBarAnimations` (removed from Angular Material 22).
 */
import {
  animate,
  state,
  style,
  transition,
  trigger,
  AnimationTriggerMetadata,
} from '@angular/animations';

/**
 * Animations used by the Material snack bar.
 * Durations parameterized for MATERIAL_ANIMATIONS / NoopAnimations.
 * @docs-private
 */
export const matSnackBarAnimations: {
  readonly snackBarState: AnimationTriggerMetadata;
} = {
  snackBarState: trigger('state', [
    state(
      'void, hidden',
      style({
        transform: 'scale(0.8)',
        opacity: 0,
      }),
    ),
    state(
      'visible',
      style({
        transform: 'scale(1)',
        opacity: 1,
      }),
    ),
    transition(
      '* => visible',
      animate('{{enterDuration}} cubic-bezier(0, 0, 0.2, 1)'),
      {params: {enterDuration: '150ms'}},
    ),
    transition(
      '* => void, * => hidden',
      animate(
        '{{exitDuration}} cubic-bezier(0.4, 0.0, 1, 1)',
        style({
          opacity: 0,
        }),
      ),
      {params: {exitDuration: '75ms'}},
    ),
  ]),
};
