/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Optional Angular animation recipes for legacy menu.
 * Primary menu uses CSS keyframes; import this entry only for historical APIs.
 *//**
 * Optional Angular animation recipes for legacy menu.
 * Primary menu uses CSS keyframes; import this entry only for historical APIs.
 */


import {
  trigger,
  state,
  style,
  animate,
  transition,
  AnimationTriggerMetadata,
} from '@angular/animations';

/**
 * Animations used by the mat-menu component.
 * Durations are parameterized so MATERIAL_ANIMATIONS / NoopAnimations can force 0ms.
 * @docs-private
 */
export const matMenuAnimations: {
  readonly transformMenu: AnimationTriggerMetadata;
  readonly fadeInItems: AnimationTriggerMetadata;
} = {
  transformMenu: trigger('transformMenu', [
    state(
      'void',
      style({
        opacity: 0,
        transform: 'scale(0.8)',
      }),
    ),
    transition(
      'void => enter',
      animate(
        '{{enterDuration}} cubic-bezier(0, 0, 0.2, 1)',
        style({
          opacity: 1,
          transform: 'scale(1)',
        }),
      ),
      {params: {enterDuration: '120ms'}},
    ),
    transition(
      '* => void',
      animate('{{exitDuration}} linear', style({opacity: 0})),
      {params: {exitDuration: '100ms'}},
    ),
  ]),

  fadeInItems: trigger('fadeInItems', [
    state('showing', style({opacity: 1})),
    transition('void => *', [
      style({opacity: 0}),
      animate('{{fadeDuration}} cubic-bezier(0.55, 0, 0.55, 0.2)'),
    ], {params: {fadeDuration: '400ms'}}),
  ]),
};

/**
 * @deprecated
 * @breaking-change 8.0.0
 * @docs-private
 */
export const fadeInItems = matMenuAnimations.fadeInItems;

/**
 * @deprecated
 * @breaking-change 8.0.0
 * @docs-private
 */
export const transformMenu = matMenuAnimations.transformMenu;
