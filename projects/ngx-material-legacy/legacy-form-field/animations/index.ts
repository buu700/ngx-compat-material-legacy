/**
 * Optional Angular animation recipes for legacy form-field.
 * Primary form-field uses CSS transitions for subscript messages.
 */
import {
  animate,
  state,
  style,
  transition,
  trigger,
  AnimationTriggerMetadata,
} from '@angular/animations';

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

export {matFormFieldAnimations as matLegacyFormFieldAnimations};
