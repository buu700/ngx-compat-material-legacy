/**
 * Test modules that publish ANIMATION_MODULE_TYPE without importing
 * `@angular/animations` or `@angular/platform-browser/animations`.
 * Legacy components read that token; they do not run the animation engine.
 */
import {ANIMATION_MODULE_TYPE, NgModule} from '@angular/core';

@NgModule({
  providers: [{provide: ANIMATION_MODULE_TYPE, useValue: 'NoopAnimations'}],
})
export class LegacyNoopAnimationsModule {}

@NgModule({
  providers: [{provide: ANIMATION_MODULE_TYPE, useValue: 'BrowserAnimations'}],
})
export class LegacyEnabledAnimationsModule {}
