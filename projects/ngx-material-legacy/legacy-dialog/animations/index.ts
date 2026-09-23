/**
 * Optional Angular animation recipes for legacy dialog.
 * Import only when you need historical `AnimationTriggerMetadata` objects;
 * the primary dialog container uses CSS + timers and does not load this entry.
 */
import {
  animate,
  animateChild,
  AnimationTriggerMetadata,
  group,
  query,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';

/** @docs-private */
export const _defaultParams = {
  params: {enterAnimationDuration: '150ms', exitAnimationDuration: '75ms'},
};

/** @docs-private @deprecated Use `_defaultParams` instead. */
export const defaultParams = _defaultParams;

/**
 * Animations used by MatDialog.
 * @docs-private
 */
export const matDialogAnimations: {
  readonly dialogContainer: AnimationTriggerMetadata;
} = {
  dialogContainer: trigger('dialogContainer', [
    state('void, exit', style({opacity: 0, transform: 'scale(0.7)'})),
    state('enter', style({transform: 'none'})),
    transition(
      '* => enter',
      group([
        animate(
          '{{enterAnimationDuration}} cubic-bezier(0, 0, 0.2, 1)',
          style({transform: 'none', opacity: 1}),
        ),
        query('@*', animateChild(), {optional: true}),
      ]),
      _defaultParams,
    ),
    transition(
      '* => void, * => exit',
      group([
        animate('{{exitAnimationDuration}} cubic-bezier(0.4, 0.0, 0.2, 1)', style({opacity: 0})),
        query('@*', animateChild(), {optional: true}),
      ]),
      _defaultParams,
    ),
  ]),
};

export {matDialogAnimations as matLegacyDialogAnimations};
