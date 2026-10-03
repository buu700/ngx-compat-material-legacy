/**
 * Test providers that publish ANIMATION_MODULE_TYPE without importing
 * `@angular/animations` or `@angular/platform-browser/animations`.
 * These are providers, not NgModules, so artifact-mode spec bundles can load
 * them. Legacy components read the token; they do not run the animation engine.
 */
import {ANIMATION_MODULE_TYPE, Provider} from '@angular/core';

export const LEGACY_NOOP_ANIMATIONS: Provider = {
  provide: ANIMATION_MODULE_TYPE,
  useValue: 'NoopAnimations',
};

export const LEGACY_ENABLED_ANIMATIONS: Provider = {
  provide: ANIMATION_MODULE_TYPE,
  useValue: 'BrowserAnimations',
};
