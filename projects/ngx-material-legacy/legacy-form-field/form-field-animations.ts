/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
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
 * Animations used by the MatFormField.
 * Duration parameterized for MATERIAL_ANIMATIONS / NoopAnimations.
 * @docs-private
 */
export const matFormFieldAnimations: {
  readonly transitionMessages: AnimationTriggerMetadata;
} = {
  transitionMessages: trigger('transitionMessages', [
    state('enter', style({opacity: 1, transform: 'translateY(0%)'})),
    transition(
      'void => enter',
      [
        style({opacity: 0, transform: 'translateY(-5px)'}),
        animate('{{transitionDuration}} cubic-bezier(0.55, 0, 0.55, 0.2)'),
      ],
      {params: {transitionDuration: '300ms'}},
    ),
  ]),
};
