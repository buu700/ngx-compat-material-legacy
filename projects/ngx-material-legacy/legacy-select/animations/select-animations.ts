/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  animate,
  animateChild,
  AnimationTriggerMetadata,
  query,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';

/**
 * The following are all the animations for the mat-select component, with each
 * const containing the metadata for one animation.
 *
 * Durations are parameterized for MATERIAL_ANIMATIONS / NoopAnimations.
 * @docs-private
 * @deprecated Use `matSelectAnimations` from `@angular/material/select` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
export const matLegacySelectAnimations: {
  readonly transformPanelWrap: AnimationTriggerMetadata;
  readonly transformPanel: AnimationTriggerMetadata;
} = {
  transformPanelWrap: trigger('transformPanelWrap', [
    transition('* => void', query('@transformPanel', [animateChild()], {optional: true})),
  ]),

  transformPanel: trigger('transformPanel', [
    state(
      'void',
      style({
        transform: 'scaleY(0.8)',
        minWidth: '100%',
        opacity: 0,
      }),
    ),
    state(
      'showing',
      style({
        opacity: 1,
        minWidth: 'calc(100% + 32px)',
        transform: 'scaleY(1)',
      }),
    ),
    state(
      'showing-multiple',
      style({
        opacity: 1,
        minWidth: 'calc(100% + 64px)',
        transform: 'scaleY(1)',
      }),
    ),
    transition(
      'void => *',
      animate('{{enterDuration}} cubic-bezier(0, 0, 0.2, 1)'),
      {params: {enterDuration: '120ms'}},
    ),
    transition(
      '* => void',
      animate('{{exitDuration}} linear', style({opacity: 0})),
      {params: {exitDuration: '100ms'}},
    ),
  ]),
};
