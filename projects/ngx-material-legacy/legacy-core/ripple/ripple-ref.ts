/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/** Possible states for a ripple element. */
export enum LegacyRippleState {
  FADING_IN,
  VISIBLE,
  FADING_OUT,
  HIDDEN,
}

/** Configuration for the animation of a ripple. */
export interface LegacyRippleAnimationConfig {
  enterDuration?: number;
  exitDuration?: number;
}

/** Extra options for launching a ripple. */
export type LegacyRippleConfig = {
  color?: string;
  centered?: boolean;
  radius?: number;
  persistent?: boolean;
  animation?: LegacyRippleAnimationConfig;
  terminateOnPointerUp?: boolean;
};

/**
 * Reference to a previously launched ripple element.
 */
export class LegacyRippleRef {
  /** Current state of the ripple. */
  state: LegacyRippleState = LegacyRippleState.HIDDEN;

  constructor(
    private _renderer: {fadeOutRipple(ref: LegacyRippleRef): void},
    /** Reference to the ripple HTML element. */
    public element: HTMLElement,
    /** Ripple configuration used for the ripple. */
    public config: LegacyRippleConfig,
    public _animationForciblyDisabledThroughCss = false,
  ) {
    this.state = LegacyRippleState.FADING_IN;
  }

  /** Fades out the ripple element. */
  fadeOut(): void {
    this._renderer.fadeOutRipple(this);
  }
}
