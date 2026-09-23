/**
 * Owned Material-16 common behavior mixins.
 * Copied from angular/components 16.2.14 `src/material/core/common-behaviors`
 * because Material 22 no longer exports these public mixin helpers.
 */
export {Constructor as _Constructor, AbstractConstructor as _AbstractConstructor} from './constructor';
export {CanDisable, mixinDisabled} from './disabled';
export {CanColor, mixinColor, ThemePalette} from './color';
export {CanDisableRipple, mixinDisableRipple} from './disable-ripple';
