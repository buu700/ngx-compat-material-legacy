import * as i0 from '@angular/core';
import { InjectionToken, inject, assertInInjectionContext, Input, Optional, Inject, ChangeDetectionStrategy, ViewEncapsulation, Component, NgModule, isDevMode, signal, Directive, EventEmitter, ViewChild, Output, LOCALE_ID, DOCUMENT as DOCUMENT$1, Injectable } from '@angular/core';
import { DOCUMENT, CommonModule } from '@angular/common';
import * as i1$1 from '@angular/material/core';
import { MATERIAL_ANIMATIONS, VERSION, MatRippleModule, DateAdapter, MAT_DATE_LOCALE, MAT_NATIVE_DATE_FORMATS, MAT_DATE_FORMATS } from '@angular/material/core';
export { VERSION as LEGACY_VERSION, DateAdapter as LegacyDateAdapter, ErrorStateMatcher as LegacyErrorStateMatcher, ShowOnDirtyErrorStateMatcher as LegacyShowOnDirtyErrorStateMatcher, MATERIAL_ANIMATIONS, MAT_DATE_FORMATS as MAT_LEGACY_DATE_FORMATS, MAT_DATE_LOCALE as MAT_LEGACY_DATE_LOCALE, MAT_NATIVE_DATE_FORMATS as MAT_LEGACY_NATIVE_DATE_FORMATS, MAT_RIPPLE_GLOBAL_OPTIONS as MAT_LEGACY_RIPPLE_GLOBAL_OPTIONS, MatLine as MatLegacyLine, MatLineModule as MatLegacyLineModule, MatRipple as MatLegacyRipple, MatRippleModule as MatLegacyRippleModule } from '@angular/material/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { BidiModule } from '@angular/cdk/bidi';
import * as i1 from '@angular/cdk/a11y';
import { A11yModule, isFakeMousedownFromScreenReader, isFakeTouchstartFromScreenReader } from '@angular/cdk/a11y';
import { VERSION as VERSION$1 } from '@angular/cdk';
import * as i1$2 from '@angular/cdk/platform';
import { Platform, normalizePassiveListenerOptions } from '@angular/cdk/platform';
import { coerceBooleanProperty, coerceNumberProperty, coerceElement } from '@angular/cdk/coercion';
import { ENTER, SPACE, hasModifierKey } from '@angular/cdk/keycodes';
import { Observable, Subject } from 'rxjs';
import { startWith, auditTime } from 'rxjs/operators';

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned legacy motion helper. Reads the public MATERIAL_ANIMATIONS token and
 * an owned legacy mode token. Does not call private Material helpers
 * (_getAnimationsState / _animationsDisabled).
 */
/** Legacy-only animation policy. It is distinct from Material's token. */
const LEGACY_ANIMATION_MODE = new InjectionToken('LEGACY_ANIMATION_MODE');
/**
 * Optional override token for unit tests that cannot construct Material's
 * MATERIAL_ANIMATIONS provider graph. Production code should prefer
 * MATERIAL_ANIMATIONS / LEGACY_ANIMATION_MODE.
 */
const LEGACY_ANIMATIONS_TEST_OVERRIDE = new InjectionToken('LEGACY_ANIMATIONS_TEST_OVERRIDE');
/**
 * Resolves whether legacy overlay motion should run.
 * Must be called in an injection context.
 */
function getLegacyAnimationsState() {
    const testOverride = inject(LEGACY_ANIMATIONS_TEST_OVERRIDE, { optional: true });
    if (testOverride) {
        return testOverride;
    }
    const materialConfig = inject(MATERIAL_ANIMATIONS, { optional: true });
    if (materialConfig?.animationsDisabled) {
        return 'di-disabled';
    }
    if (inject(LEGACY_ANIMATION_MODE, { optional: true }) === 'NoopAnimations') {
        return 'di-disabled';
    }
    try {
        const reduced = inject(MediaMatcher).matchMedia('(prefers-reduced-motion)').matches;
        return reduced ? 'reduced-motion' : 'enabled';
    }
    catch {
        // SSR / missing MediaMatcher — treat as enabled rather than guessing reduced.
        return 'enabled';
    }
}
/**
 * True when DI or reduced-motion asks overlays to skip meaningful motion.
 * Historical explicit constructors can run outside DI. In that case there is
 * no ambient policy to read; their supplied animation-mode arguments still apply.
 */
function legacyAnimationsDisabled() {
    try {
        assertInInjectionContext(legacyAnimationsDisabled);
    }
    catch {
        return false;
    }
    return getLegacyAnimationsState() !== 'enabled';
}
/** Preserve explicit historical constructor modes while applying ambient policy. */
function resolveLegacyAnimationMode(mode) {
    return mode === 'NoopAnimations' || legacyAnimationsDisabled() ? 'NoopAnimations' : mode;
}
/** Zero-duration params used when dialog (and similar) should noop motion. */
const LEGACY_ZERO_ANIMATION_PARAMS = {
    enterAnimationDuration: '0ms',
    exitAnimationDuration: '0ms',
};
/** Generic zero map for parameterized overlay recipes. */
function zeroAnimationParams(defaults) {
    const out = {};
    for (const key of Object.keys(defaults)) {
        out[key] = '0ms';
    }
    return out;
}
/**
 * Build `{value, params}` for Angular animation host bindings.
 * When disabled, every provided default duration becomes `0ms`.
 */
function legacyAnimationTriggerState(value, defaults, disabled) {
    return {
        value,
        params: disabled ? zeroAnimationParams(defaults) : defaults,
    };
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned legacy pseudo-checkbox (S22). Current MatPseudoCheckbox is @docs-private (S20).
 */
/**
 * Decorative checkbox without form control semantics. Parent components own ARIA.
 * Selector/classes match historical mat-pseudo-checkbox for legacy list/option rendering.
 */
class MatLegacyPseudoCheckbox {
    _animationMode;
    /** Display state of the checkbox. */
    state = 'unchecked';
    /** Whether the checkbox is disabled. */
    disabled = false;
    /**
     * Appearance of the pseudo checkbox. Default appearance of 'full' renders a checkmark/mixedmark
     * indicator inside a square box. 'minimal' appearance only renders the checkmark/mixedmark.
     */
    appearance = 'full';
    _diAnimationsDisabled = false;
    constructor(_animationMode) {
        this._animationMode = _animationMode;
        // Historical callers can construct this decorative control outside Angular.
        let inContext = true;
        try {
            assertInInjectionContext(MatLegacyPseudoCheckbox);
        }
        catch {
            inContext = false;
        }
        this._diAnimationsDisabled = inContext ? legacyAnimationsDisabled() : false;
    }
    /** Keep the original mutable animation mode and the owned motion policy. */
    get _animationsDisabled() {
        return this._diAnimationsDisabled || this._animationMode === 'NoopAnimations';
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyPseudoCheckbox, deps: [{ token: LEGACY_ANIMATION_MODE, optional: true }], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "22.1.7", type: MatLegacyPseudoCheckbox, isStandalone: true, selector: "mat-pseudo-checkbox", inputs: { state: "state", disabled: "disabled", appearance: "appearance" }, host: { properties: { "class.mat-pseudo-checkbox-indeterminate": "state === \"indeterminate\"", "class.mat-pseudo-checkbox-checked": "state === \"checked\"", "class.mat-pseudo-checkbox-disabled": "disabled", "class.mat-pseudo-checkbox-minimal": "appearance === \"minimal\"", "class.mat-pseudo-checkbox-full": "appearance === \"full\"", "class._mat-animation-noopable": "_animationsDisabled" }, classAttribute: "mat-pseudo-checkbox" }, ngImport: i0, template: '', isInline: true, styles: [".mat-pseudo-checkbox{border-radius:2px;cursor:pointer;display:inline-block;vertical-align:middle;box-sizing:border-box;position:relative;flex-shrink:0;transition:border-color 90ms cubic-bezier(0,0,.2,.1),background-color 90ms cubic-bezier(0,0,.2,.1)}.mat-pseudo-checkbox:after{position:absolute;opacity:0;content:\"\";border-bottom:2px solid currentColor;transition:opacity 90ms cubic-bezier(0,0,.2,.1)}.mat-pseudo-checkbox._mat-animation-noopable{transition:none!important;animation:none!important}.mat-pseudo-checkbox._mat-animation-noopable:after{transition:none}.mat-pseudo-checkbox-disabled{cursor:default}.mat-pseudo-checkbox-indeterminate:after{left:1px;opacity:1;border-radius:2px}.mat-pseudo-checkbox-checked:after{left:1px;border-left:2px solid currentColor;transform:rotate(-45deg);opacity:1;box-sizing:content-box}.mat-pseudo-checkbox-full{border:2px solid}.mat-pseudo-checkbox-full.mat-pseudo-checkbox-checked,.mat-pseudo-checkbox-full.mat-pseudo-checkbox-indeterminate{border-color:transparent}.mat-pseudo-checkbox{width:18px;height:18px}.mat-pseudo-checkbox-minimal.mat-pseudo-checkbox-checked:after{width:14px;height:6px;transform-origin:center;inset:-4.2426406871px 0 0;margin:auto}.mat-pseudo-checkbox-minimal.mat-pseudo-checkbox-indeterminate:after{top:8px;width:16px}.mat-pseudo-checkbox-full.mat-pseudo-checkbox-checked:after{width:10px;height:4px;transform-origin:center;inset:-2.8284271247px 0 0;margin:auto}.mat-pseudo-checkbox-full.mat-pseudo-checkbox-indeterminate:after{top:6px;width:12px}\n"], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyPseudoCheckbox, decorators: [{
            type: Component,
            args: [{ standalone: true, encapsulation: ViewEncapsulation.None, changeDetection: ChangeDetectionStrategy.OnPush, selector: 'mat-pseudo-checkbox', template: '', host: {
                        'class': 'mat-pseudo-checkbox',
                        '[class.mat-pseudo-checkbox-indeterminate]': 'state === "indeterminate"',
                        '[class.mat-pseudo-checkbox-checked]': 'state === "checked"',
                        '[class.mat-pseudo-checkbox-disabled]': 'disabled',
                        '[class.mat-pseudo-checkbox-minimal]': 'appearance === "minimal"',
                        '[class.mat-pseudo-checkbox-full]': 'appearance === "full"',
                        '[class._mat-animation-noopable]': '_animationsDisabled',
                    }, styles: [".mat-pseudo-checkbox{border-radius:2px;cursor:pointer;display:inline-block;vertical-align:middle;box-sizing:border-box;position:relative;flex-shrink:0;transition:border-color 90ms cubic-bezier(0,0,.2,.1),background-color 90ms cubic-bezier(0,0,.2,.1)}.mat-pseudo-checkbox:after{position:absolute;opacity:0;content:\"\";border-bottom:2px solid currentColor;transition:opacity 90ms cubic-bezier(0,0,.2,.1)}.mat-pseudo-checkbox._mat-animation-noopable{transition:none!important;animation:none!important}.mat-pseudo-checkbox._mat-animation-noopable:after{transition:none}.mat-pseudo-checkbox-disabled{cursor:default}.mat-pseudo-checkbox-indeterminate:after{left:1px;opacity:1;border-radius:2px}.mat-pseudo-checkbox-checked:after{left:1px;border-left:2px solid currentColor;transform:rotate(-45deg);opacity:1;box-sizing:content-box}.mat-pseudo-checkbox-full{border:2px solid}.mat-pseudo-checkbox-full.mat-pseudo-checkbox-checked,.mat-pseudo-checkbox-full.mat-pseudo-checkbox-indeterminate{border-color:transparent}.mat-pseudo-checkbox{width:18px;height:18px}.mat-pseudo-checkbox-minimal.mat-pseudo-checkbox-checked:after{width:14px;height:6px;transform-origin:center;inset:-4.2426406871px 0 0;margin:auto}.mat-pseudo-checkbox-minimal.mat-pseudo-checkbox-indeterminate:after{top:8px;width:16px}.mat-pseudo-checkbox-full.mat-pseudo-checkbox-checked:after{width:10px;height:4px;transform-origin:center;inset:-2.8284271247px 0 0;margin:auto}.mat-pseudo-checkbox-full.mat-pseudo-checkbox-indeterminate:after{top:6px;width:12px}\n"] }]
        }], ctorParameters: () => [{ type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [LEGACY_ANIMATION_MODE]
                }] }], propDecorators: { state: [{
                type: Input
            }], disabled: [{
                type: Input
            }], appearance: [{
                type: Input
            }] } });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
class MatLegacyPseudoCheckboxModule {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyPseudoCheckboxModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
    static ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyPseudoCheckboxModule, imports: [MatLegacyPseudoCheckbox, BidiModule], exports: [MatLegacyPseudoCheckbox, BidiModule] });
    static ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyPseudoCheckboxModule, imports: [BidiModule, BidiModule] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyPseudoCheckboxModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [MatLegacyPseudoCheckbox, BidiModule],
                    exports: [MatLegacyPseudoCheckbox, BidiModule],
                }]
        }] });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned historical sanity-check token and public option types.
 * The legacy common module consumes these options for doctype/theme/version checks.
 */
/** Injection token that can be used to disable or configure sanity checks. */
const MATERIAL_LEGACY_SANITY_CHECKS = new InjectionToken('mat-sanity-checks', { providedIn: 'root', factory: () => true });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Gets whether the code is currently running in a test environment. */
function _isTestEnvironment() {
    // We can't use `declare const` because it causes conflicts inside Google with the real typings
    // for these symbols and we can't read them off the global object, because they don't appear to
    // be attached there for some runners like Jest.
    // (see: https://github.com/angular/components/issues/23365#issuecomment-938146643)
    return (
    // @ts-ignore
    (typeof __karma__ !== 'undefined' && !!__karma__) ||
        // @ts-ignore
        (typeof jasmine !== 'undefined' && !!jasmine) ||
        // @ts-ignore
        (typeof jest !== 'undefined' && !!jest) ||
        // @ts-ignore
        (typeof Mocha !== 'undefined' && !!Mocha));
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Module that captures anything that should be loaded and/or run for *all* Angular Material
 * components. This includes Bidi, etc.
 *
 * This module should be imported to each top-level component module (e.g., MatTabsModule).
 */
class MatCommonModule {
    _sanityChecks;
    _document;
    /** Whether we've done the global sanity checks (e.g. a theme is loaded, there is a doctype). */
    _hasDoneGlobalChecks = false;
    constructor(highContrastModeDetector, _sanityChecks, _document) {
        this._sanityChecks = _sanityChecks;
        this._document = _document;
        // The public A11yModule import initializes high contrast and observes mode
        // changes. Keep the historical constructor token without importing or
        // copying the detector's private body-class/lifecycle implementation.
        void highContrastModeDetector;
        if (!this._hasDoneGlobalChecks) {
            this._hasDoneGlobalChecks = true;
            if (isDevMode()) {
                // Inject in here so the reference to `Platform` can be removed in production mode.
                const platform = inject(Platform, { optional: true });
                if (this._checkIsEnabled('doctype')) {
                    _checkDoctypeIsDefined(this._document);
                }
                if (this._checkIsEnabled('theme')) {
                    _checkThemeIsPresent(this._document, !!platform?.isBrowser);
                }
                if (this._checkIsEnabled('version')) {
                    _checkCdkVersionMatch();
                }
            }
        }
    }
    /** Gets whether a specific sanity check is enabled. */
    _checkIsEnabled(name) {
        if (_isTestEnvironment()) {
            return false;
        }
        if (typeof this._sanityChecks === 'boolean') {
            return this._sanityChecks;
        }
        return !!this._sanityChecks[name];
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatCommonModule, deps: [{ token: i1.HighContrastModeDetector }, { token: MATERIAL_LEGACY_SANITY_CHECKS, optional: true }, { token: DOCUMENT }], target: i0.ɵɵFactoryTarget.NgModule });
    static ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "22.1.7", ngImport: i0, type: MatCommonModule, imports: [BidiModule, A11yModule], exports: [BidiModule] });
    static ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatCommonModule, imports: [BidiModule, A11yModule, BidiModule] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatCommonModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [BidiModule, A11yModule],
                    exports: [BidiModule],
                }]
        }], ctorParameters: () => [{ type: i1.HighContrastModeDetector }, { type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [MATERIAL_LEGACY_SANITY_CHECKS]
                }] }, { type: Document, decorators: [{
                    type: Inject,
                    args: [DOCUMENT]
                }] }] });
/** Checks that the page has a doctype. */
function _checkDoctypeIsDefined(doc) {
    if (!doc.doctype) {
        console.warn('Current document does not have a doctype. This may cause ' +
            'some Angular Material components not to behave as expected.');
    }
}
/** Checks that a theme has been included. */
function _checkThemeIsPresent(doc, isBrowser) {
    // We need to assert that the `body` is defined, because these checks run very early
    // and the `body` won't be defined if the consumer put their scripts in the `head`.
    if (!doc.body || !isBrowser) {
        return;
    }
    const testElement = doc.createElement('div');
    testElement.classList.add('mat-theme-loaded-marker');
    doc.body.appendChild(testElement);
    const computedStyle = getComputedStyle(testElement);
    // In some situations the computed style of the test element can be null. For example in
    // Firefox, the computed style is null if an application is running inside of a hidden iframe.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=548397
    if (computedStyle && computedStyle.display !== 'none') {
        console.warn('Could not find Angular Material core theme. Most Material ' +
            'components may not work as expected. For more info refer ' +
            'to the theming guide: https://material.angular.io/guide/theming');
    }
    testElement.remove();
}
/** Checks whether the Material version matches the CDK version. */
function _checkCdkVersionMatch() {
    if (VERSION.full !== VERSION$1.full) {
        console.warn('The Angular Material version (' +
            VERSION.full +
            ') does not match ' +
            'the Angular CDK version (' +
            VERSION$1.full +
            ').\n' +
            'Please ensure the versions of these two packages exactly match.');
    }
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Injection token used to provide the parent component to options.
 */
const MAT_OPTION_PARENT_COMPONENT = new InjectionToken('MAT_OPTION_PARENT_COMPONENT');

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function mixinColor(base, defaultColor) {
    return class extends base {
        _color;
        defaultColor = defaultColor;
        get color() {
            return this._color;
        }
        set color(value) {
            const colorPalette = value || this.defaultColor;
            if (colorPalette !== this._color) {
                if (this._color) {
                    this._elementRef.nativeElement.classList.remove(`mat-${this._color}`);
                }
                if (colorPalette) {
                    this._elementRef.nativeElement.classList.add(`mat-${colorPalette}`);
                }
                this._color = colorPalette;
            }
        }
        constructor(...args) {
            super(...args);
            // Set the default color that can be specified from the mixin.
            this.color = defaultColor;
        }
    };
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function mixinDisabled(base) {
    return class extends base {
        _disabled = false;
        get disabled() {
            return this._disabled;
        }
        set disabled(value) {
            this._disabled = coerceBooleanProperty(value);
        }
        constructor(...args) {
            super(...args);
        }
    };
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function mixinDisableRipple(base) {
    return class extends base {
        _disableRipple = false;
        /** Whether the ripple effect is disabled or not. */
        get disableRipple() {
            return this._disableRipple;
        }
        set disableRipple(value) {
            this._disableRipple = coerceBooleanProperty(value);
        }
        constructor(...args) {
            super(...args);
        }
    };
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function mixinTabIndex(base, defaultTabIndex = 0) {
    return class extends base {
        _tabIndex = defaultTabIndex;
        defaultTabIndex = defaultTabIndex;
        get tabIndex() {
            return this.disabled ? -1 : this._tabIndex;
        }
        set tabIndex(value) {
            // If the specified tabIndex value is null or undefined, fall back to the default value.
            this._tabIndex = value != null ? coerceNumberProperty(value) : this.defaultTabIndex;
        }
        constructor(...args) {
            super(...args);
        }
    };
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function mixinErrorState(base) {
    return class extends base {
        /** Whether the component is in an error state. */
        errorState = false;
        /** An object used to control the error state of the component. */
        errorStateMatcher;
        /** Updates the error state based on the provided error state matcher. */
        updateErrorState() {
            const oldState = this.errorState;
            const parent = this._parentFormGroup || this._parentForm;
            const matcher = this.errorStateMatcher || this._defaultErrorStateMatcher;
            const control = this.ngControl ? this.ngControl.control : null;
            const newState = matcher.isErrorState(control, parent);
            if (newState !== oldState) {
                this.errorState = newState;
                this.stateChanges.next();
            }
        }
        constructor(...args) {
            super(...args);
        }
    };
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Mixin to augment a directive with an initialized property that will emits when ngOnInit ends. */
function mixinInitialized(base) {
    return class extends base {
        /** Whether this directive has been marked as initialized. */
        _isInitialized = false;
        /**
         * List of subscribers that subscribed before the directive was initialized. Should be notified
         * during _markInitialized. Set to null after pending subscribers are notified, and should
         * not expect to be populated after.
         */
        _pendingSubscribers = [];
        /**
         * Observable stream that emits when the directive initializes. If already initialized, the
         * subscriber is stored to be notified once _markInitialized is called.
         */
        initialized = new Observable(subscriber => {
            // If initialized, immediately notify the subscriber. Otherwise store the subscriber to notify
            // when _markInitialized is called.
            if (this._isInitialized) {
                this._notifySubscriber(subscriber);
            }
            else {
                this._pendingSubscribers.push(subscriber);
            }
        });
        constructor(...args) {
            super(...args);
        }
        /**
         * Marks the state as initialized and notifies pending subscribers. Should be called at the end
         * of ngOnInit.
         * @docs-private
         */
        _markInitialized() {
            if (this._isInitialized && (typeof ngDevMode === 'undefined' || ngDevMode)) {
                throw Error('This directive has already been marked as initialized and ' +
                    'should not be called twice.');
            }
            this._isInitialized = true;
            this._pendingSubscribers.forEach(this._notifySubscriber);
            this._pendingSubscribers = null;
        }
        /** Emits and completes the subscriber stream (should only emit once). */
        _notifySubscriber(subscriber) {
            subscriber.next();
            subscriber.complete();
        }
    };
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Notes on the accessibility pattern used for `mat-optgroup`.
// The option group has two different "modes": regular and inert. The regular mode uses the
// recommended a11y pattern which has `role="group"` on the group element with `aria-labelledby`
// pointing to the label. This works for `mat-select`, but it seems to hit a bug for autocomplete
// under VoiceOver where the group doesn't get read out at all. The bug appears to be that if
// there's __any__ a11y-related attribute on the group (e.g. `role` or `aria-labelledby`),
// VoiceOver on Safari won't read it out.
// We've introduced the `inert` mode as a workaround. Under this mode, all a11y attributes are
// removed from the group, and we get the screen reader to read out the group label by mirroring it
// inside an invisible element in the option. This is sub-optimal, because the screen reader will
// repeat the group label on each navigation, whereas the default pattern only reads the group when
// the user enters a new group. The following alternate approaches were considered:
// 1. Reading out the group label using the `LiveAnnouncer` solves the problem, but we can't control
//    when the text will be read out so sometimes it comes in too late or never if the user
//    navigates quickly.
// 2. `<mat-option aria-describedby="groupLabel"` - This works on Safari, but VoiceOver in Chrome
//    won't read out the description at all.
// 3. `<mat-option aria-labelledby="optionLabel groupLabel"` - This works on Chrome, but Safari
//     doesn't read out the text at all. Furthermore, on
// Boilerplate for applying mixins to MatOptgroup.
/** @docs-private */
const _MatOptgroupMixinBase = mixinDisabled(class {
});
// Keep the historical boolean-property contract of the mixin while notifying option views.
const _MatReactiveOptgroupMixinBase = class extends _MatOptgroupMixinBase {
    _groupDisabled = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_groupDisabled" }] : /* istanbul ignore next */ []));
    get disabled() { return this._groupDisabled(); }
    set disabled(value) { this._groupDisabled.set(coerceBooleanProperty(value)); }
};
// Counter for unique group ids.
let _uniqueOptgroupIdCounter = 0;
class _MatOptgroupBase extends _MatReactiveOptgroupMixinBase {
    /** Label for the option group. */
    label;
    /** Unique id for the underlying label. */
    _labelId = `mat-optgroup-label-${_uniqueOptgroupIdCounter++}-legacy`;
    /** Whether the group is in inert a11y mode. */
    _inert;
    constructor(parent) {
        super();
        this._inert = parent?.inertGroups ?? false;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: _MatOptgroupBase, deps: [{ token: MAT_OPTION_PARENT_COMPONENT, optional: true }], target: i0.ɵɵFactoryTarget.Directive });
    static ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "22.1.7", type: _MatOptgroupBase, isStandalone: false, inputs: { label: "label" }, usesInheritance: true, ngImport: i0 });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: _MatOptgroupBase, decorators: [{
            type: Directive,
            args: [{ standalone: false }]
        }], ctorParameters: () => [{ type: undefined, decorators: [{
                    type: Inject,
                    args: [MAT_OPTION_PARENT_COMPONENT]
                }, {
                    type: Optional
                }] }], propDecorators: { label: [{
                type: Input
            }] } });
/**
 * Injection token that can be used to reference instances of `MatOptgroup`. It serves as
 * alternative token to the actual `MatOptgroup` class which could cause unnecessary
 * retention of the class and its component metadata.
 */
const MAT_OPTGROUP = new InjectionToken('MatOptgroup');

/**
 * Option IDs need to be unique across components, so this counter exists outside of
 * the component definition.
 */
let _uniqueIdCounter = 0;
/** Event object emitted by MatOption when selected or deselected. */
class MatOptionSelectionChange {
    source;
    isUserInput;
    constructor(
    /** Reference to the option that emitted the event. */
    source, 
    /** Whether the change in the option's value was a result of a user action. */
    isUserInput = false) {
        this.source = source;
        this.isUserInput = isUserInput;
    }
}
class _MatOptionBase {
    _element;
    _changeDetectorRef;
    _parent;
    group;
    _selected = false;
    _active = false;
    _disabled = false;
    #legacyDisabledState = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "#legacyDisabledState" }] : /* istanbul ignore next */ []));
    _mostRecentViewValue = '';
    /** Whether the wrapping component is in multiple selection mode. */
    get multiple() {
        return this._parent && this._parent.multiple;
    }
    /** Whether or not the option is currently selected. */
    get selected() {
        return this._selected;
    }
    /** The form value of the option. */
    value;
    /** The unique ID of the option. */
    id = `mat-option-${_uniqueIdCounter++}-legacy`;
    /** Whether the option is disabled. */
    get disabled() {
        // Track views that read this option before its input is updated.
        this.#legacyDisabledState();
        return (this.group && this.group.disabled) || this._disabled;
    }
    set disabled(value) {
        this._disabled = coerceBooleanProperty(value);
        this.#legacyDisabledState.set(this._disabled);
    }
    /** Whether ripples for the option are disabled. */
    get disableRipple() {
        return !!(this._parent && this._parent.disableRipple);
    }
    /** Whether to display checkmark for single-selection. */
    get hideSingleSelectionIndicator() {
        return !!(this._parent && this._parent.hideSingleSelectionIndicator);
    }
    /** Event emitted when the option is selected or deselected. */
    // tslint:disable-next-line:no-output-on-prefix
    onSelectionChange = new EventEmitter();
    /** Element containing the option's text. */
    _text;
    /** Emits when the state of the option changes and any parents have to be notified. */
    _stateChanges = new Subject();
    constructor(_element, _changeDetectorRef, _parent, group) {
        this._element = _element;
        this._changeDetectorRef = _changeDetectorRef;
        this._parent = _parent;
        this.group = group;
    }
    /**
     * Whether or not the option is currently active and ready to be selected.
     * An active option displays styles as if it is focused, but the
     * focus is actually retained somewhere else. This comes in handy
     * for components like autocomplete where focus must remain on the input.
     */
    get active() {
        return this._active;
    }
    /**
     * The displayed value of the option. It is necessary to show the selected option in the
     * select's trigger.
     */
    get viewValue() {
        // TODO(kara): Add input property alternative for node envs.
        return (this._text?.nativeElement.textContent || '').trim();
    }
    /** Selects the option. */
    select(emitEvent = true) {
        if (!this._selected) {
            this._selected = true;
            this._changeDetectorRef.markForCheck();
            if (emitEvent) {
                this._emitSelectionChangeEvent();
            }
        }
    }
    /** Deselects the option. */
    deselect(emitEvent = true) {
        if (this._selected) {
            this._selected = false;
            this._changeDetectorRef.markForCheck();
            if (emitEvent) {
                this._emitSelectionChangeEvent();
            }
        }
    }
    /** Sets focus onto this option. */
    focus(_origin, options) {
        // Note that we aren't using `_origin`, but we need to keep it because some internal consumers
        // use `MatOption` in a `FocusKeyManager` and we need it to match `FocusableOption`.
        const element = this._getHostElement();
        if (typeof element.focus === 'function') {
            element.focus(options);
        }
    }
    /**
     * This method sets display styles on the option to make it appear
     * active. This is used by the ActiveDescendantKeyManager so key
     * events will display the proper options as active on arrow key events.
     */
    setActiveStyles() {
        if (!this._active) {
            this._active = true;
            this._changeDetectorRef.markForCheck();
        }
    }
    /**
     * This method removes display styles on the option that made it appear
     * active. This is used by the ActiveDescendantKeyManager so key
     * events will display the proper options as active on arrow key events.
     */
    setInactiveStyles() {
        if (this._active) {
            this._active = false;
            this._changeDetectorRef.markForCheck();
        }
    }
    /** Gets the label to be used when determining whether the option should be focused. */
    getLabel() {
        return this.viewValue;
    }
    /** Ensures the option is selected when activated from the keyboard. */
    _handleKeydown(event) {
        if ((event.keyCode === ENTER || event.keyCode === SPACE) && !hasModifierKey(event)) {
            this._selectViaInteraction();
            // Prevent the page from scrolling down and form submits.
            event.preventDefault();
        }
    }
    /**
     * `Selects the option while indicating the selection came from the user. Used to
     * determine if the select's view -> model callback should be invoked.`
     */
    _selectViaInteraction() {
        if (!this.disabled) {
            this._selected = this.multiple ? !this._selected : true;
            this._changeDetectorRef.markForCheck();
            this._emitSelectionChangeEvent(true);
        }
    }
    /** Returns the correct tabindex for the option depending on disabled state. */
    // This method is only used by `MatLegacyOption`. Keeping it here to avoid breaking the types.
    // That's because `MatLegacyOption` use `MatOption` type in a few places such as
    // `MatOptionSelectionChange`. It is safe to delete this when `MatLegacyOption` is deleted.
    _getTabIndex() {
        return this.disabled ? '-1' : '0';
    }
    /** Gets the host DOM element. */
    _getHostElement() {
        return this._element.nativeElement;
    }
    ngAfterViewChecked() {
        // Since parent components could be using the option's label to display the selected values
        // (e.g. `mat-select`) and they don't have a way of knowing if the option's label has changed
        // we have to check for changes in the DOM ourselves and dispatch an event. These checks are
        // relatively cheap, however we still limit them only to selected options in order to avoid
        // hitting the DOM too often.
        if (this._selected) {
            const viewValue = this.viewValue;
            if (viewValue !== this._mostRecentViewValue) {
                if (this._mostRecentViewValue) {
                    this._stateChanges.next();
                }
                this._mostRecentViewValue = viewValue;
            }
        }
    }
    ngOnDestroy() {
        this._stateChanges.complete();
    }
    /** Emits the selection change event. */
    _emitSelectionChangeEvent(isUserInput = false) {
        this.onSelectionChange.emit(new MatOptionSelectionChange(this, isUserInput));
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: _MatOptionBase, deps: "invalid", target: i0.ɵɵFactoryTarget.Directive });
    static ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "22.1.7", type: _MatOptionBase, isStandalone: false, inputs: { value: "value", id: "id", disabled: "disabled" }, outputs: { onSelectionChange: "onSelectionChange" }, viewQueries: [{ propertyName: "_text", first: true, predicate: ["text"], descendants: true, static: true }], ngImport: i0 });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: _MatOptionBase, decorators: [{
            type: Directive,
            args: [{ standalone: false }]
        }], ctorParameters: () => [{ type: i0.ElementRef }, { type: i0.ChangeDetectorRef }, { type: undefined }, { type: _MatOptgroupBase }], propDecorators: { value: [{
                type: Input
            }], id: [{
                type: Input
            }], disabled: [{
                type: Input
            }], onSelectionChange: [{
                type: Output
            }], _text: [{
                type: ViewChild,
                args: ['text', { static: true }]
            }] } });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Component that is used to group instances of `mat-option`.
 */
class MatLegacyOptgroup extends _MatOptgroupBase {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyOptgroup, deps: null, target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "22.1.7", type: MatLegacyOptgroup, isStandalone: false, selector: "mat-optgroup", inputs: { disabled: "disabled" }, host: { properties: { "attr.role": "_inert ? null : \"group\"", "attr.aria-disabled": "_inert ? null : disabled.toString()", "attr.aria-labelledby": "_inert ? null : _labelId", "class.mat-optgroup-disabled": "disabled" }, classAttribute: "mat-optgroup" }, providers: [{ provide: MAT_OPTGROUP, useExisting: MatLegacyOptgroup }], exportAs: ["matOptgroup"], usesInheritance: true, ngImport: i0, template: "<span class=\"mat-optgroup-label\" role=\"presentation\" [id]=\"_labelId\">{{ label }} <ng-content></ng-content></span>\n<ng-content select=\"mat-option, ng-container\"></ng-content>\n", styles: [".mat-optgroup-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;line-height:48px;height:48px;padding:0 16px;text-align:left;text-decoration:none;max-width:100%}.mat-optgroup-label[disabled]{cursor:default}[dir=rtl] .mat-optgroup-label{text-align:right}.mat-optgroup-label .mat-icon{margin-right:16px;vertical-align:middle}.mat-optgroup-label .mat-icon svg{vertical-align:top}[dir=rtl] .mat-optgroup-label .mat-icon{margin-left:16px;margin-right:0}.mat-optgroup-label{-webkit-user-select:none;user-select:none;cursor:default}\n"], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyOptgroup, decorators: [{
            type: Component,
            args: [{ standalone: false, selector: 'mat-optgroup', exportAs: 'matOptgroup', encapsulation: ViewEncapsulation.None, changeDetection: ChangeDetectionStrategy.OnPush, inputs: ['disabled'], host: {
                        'class': 'mat-optgroup',
                        '[attr.role]': '_inert ? null : "group"',
                        '[attr.aria-disabled]': '_inert ? null : disabled.toString()',
                        '[attr.aria-labelledby]': '_inert ? null : _labelId',
                        '[class.mat-optgroup-disabled]': 'disabled',
                    }, providers: [{ provide: MAT_OPTGROUP, useExisting: MatLegacyOptgroup }], template: "<span class=\"mat-optgroup-label\" role=\"presentation\" [id]=\"_labelId\">{{ label }} <ng-content></ng-content></span>\n<ng-content select=\"mat-option, ng-container\"></ng-content>\n", styles: [".mat-optgroup-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;line-height:48px;height:48px;padding:0 16px;text-align:left;text-decoration:none;max-width:100%}.mat-optgroup-label[disabled]{cursor:default}[dir=rtl] .mat-optgroup-label{text-align:right}.mat-optgroup-label .mat-icon{margin-right:16px;vertical-align:middle}.mat-optgroup-label .mat-icon svg{vertical-align:top}[dir=rtl] .mat-optgroup-label .mat-icon{margin-left:16px;margin-right:0}.mat-optgroup-label{-webkit-user-select:none;user-select:none;cursor:default}\n"] }]
        }] });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Single option inside of a `<mat-select>` element.
 */
class MatLegacyOption extends _MatOptionBase {
    constructor(element, changeDetectorRef, parent, group) {
        super(element, changeDetectorRef, parent, group);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyOption, deps: [{ token: i0.ElementRef }, { token: i0.ChangeDetectorRef }, { token: MAT_OPTION_PARENT_COMPONENT, optional: true }, { token: MAT_OPTGROUP, optional: true }], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "22.1.7", type: MatLegacyOption, isStandalone: false, selector: "mat-option", host: { attributes: { "role": "option" }, listeners: { "click": "_selectViaInteraction()", "keydown": "_handleKeydown($event)" }, properties: { "attr.tabindex": "_getTabIndex()", "class.mat-selected": "selected", "class.mat-option-multiple": "multiple", "class.mat-active": "active", "id": "id", "attr.aria-selected": "selected", "attr.aria-disabled": "disabled.toString()", "class.mat-option-disabled": "disabled" }, classAttribute: "mat-option mat-focus-indicator" }, exportAs: ["matOption"], usesInheritance: true, ngImport: i0, template: "@if (multiple) {\n  <mat-pseudo-checkbox class=\"mat-option-pseudo-checkbox\"\n    [state]=\"selected ? 'checked' : 'unchecked'\" [disabled]=\"disabled\"></mat-pseudo-checkbox>\n}\n\n<span class=\"mat-option-text\" #text><ng-content></ng-content></span>\n\n<!-- See a11y notes inside optgroup.ts for context behind this element. -->\n@if (group && group._inert) {\n  <span class=\"cdk-visually-hidden\">({{ group.label }})</span>\n}\n\n<div class=\"mat-option-ripple\" mat-ripple\n  [matRippleTrigger]=\"_getHostElement()\"\n  [matRippleDisabled]=\"disabled || disableRipple\">\n</div>\n", styles: [".mat-option{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;line-height:48px;height:48px;padding:0 16px;text-align:left;text-decoration:none;max-width:100%}.mat-option[disabled]{cursor:default}[dir=rtl] .mat-option{text-align:right}.mat-option .mat-icon{margin-right:16px;vertical-align:middle}.mat-option .mat-icon svg{vertical-align:top}[dir=rtl] .mat-option .mat-icon{margin-left:16px;margin-right:0}.mat-option{position:relative;cursor:pointer;outline:none;display:flex;flex-direction:row;max-width:100%;box-sizing:border-box;align-items:center;-webkit-tap-highlight-color:transparent}.mat-option[aria-disabled=true]{-webkit-user-select:none;user-select:none;cursor:default}.mat-optgroup .mat-option:not(.mat-option-multiple){padding-left:32px}[dir=rtl] .mat-optgroup .mat-option:not(.mat-option-multiple){padding-left:16px;padding-right:32px}.mat-option.mat-active:before{content:\"\"}.cdk-high-contrast-active .mat-option[aria-disabled=true]{opacity:.5}.cdk-high-contrast-active .mat-option.mat-selected:not(.mat-option-multiple):after{content:\"\";position:absolute;top:50%;right:16px;transform:translateY(-50%);width:10px;height:0;border-bottom:solid 10px;border-radius:10px}[dir=rtl] .cdk-high-contrast-active .mat-option.mat-selected:not(.mat-option-multiple):after{right:auto;left:16px}@media(forced-colors:active){.mat-option[aria-disabled=true]{opacity:.5}.mat-option.mat-selected:not(.mat-option-multiple):after{content:\"\";position:absolute;top:50%;right:16px;transform:translateY(-50%);width:10px;height:0;border-bottom:solid 10px;border-radius:10px}[dir=rtl] .mat-option.mat-selected:not(.mat-option-multiple):after{right:auto;left:16px}}.mat-option-text{display:inline-block;flex-grow:1;overflow:hidden;text-overflow:ellipsis}.mat-option .mat-option-ripple{inset:0;position:absolute;pointer-events:none}.mat-option-pseudo-checkbox{margin-right:8px}[dir=rtl] .mat-option-pseudo-checkbox{margin-left:8px;margin-right:0}\n"], dependencies: [{ kind: "directive", type: i1$1.MatRipple, selector: "[mat-ripple], [matRipple]", inputs: ["matRippleColor", "matRippleUnbounded", "matRippleCentered", "matRippleRadius", "matRippleAnimation", "matRippleDisabled", "matRippleTrigger"], exportAs: ["matRipple"] }, { kind: "component", type: MatLegacyPseudoCheckbox, selector: "mat-pseudo-checkbox", inputs: ["state", "disabled", "appearance"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyOption, decorators: [{
            type: Component,
            args: [{ standalone: false, selector: 'mat-option', exportAs: 'matOption', host: {
                        'role': 'option',
                        '[attr.tabindex]': '_getTabIndex()',
                        '[class.mat-selected]': 'selected',
                        '[class.mat-option-multiple]': 'multiple',
                        '[class.mat-active]': 'active',
                        '[id]': 'id',
                        '[attr.aria-selected]': 'selected',
                        '[attr.aria-disabled]': 'disabled.toString()',
                        '[class.mat-option-disabled]': 'disabled',
                        '(click)': '_selectViaInteraction()',
                        '(keydown)': '_handleKeydown($event)',
                        'class': 'mat-option mat-focus-indicator',
                    }, encapsulation: ViewEncapsulation.None, changeDetection: ChangeDetectionStrategy.OnPush, template: "@if (multiple) {\n  <mat-pseudo-checkbox class=\"mat-option-pseudo-checkbox\"\n    [state]=\"selected ? 'checked' : 'unchecked'\" [disabled]=\"disabled\"></mat-pseudo-checkbox>\n}\n\n<span class=\"mat-option-text\" #text><ng-content></ng-content></span>\n\n<!-- See a11y notes inside optgroup.ts for context behind this element. -->\n@if (group && group._inert) {\n  <span class=\"cdk-visually-hidden\">({{ group.label }})</span>\n}\n\n<div class=\"mat-option-ripple\" mat-ripple\n  [matRippleTrigger]=\"_getHostElement()\"\n  [matRippleDisabled]=\"disabled || disableRipple\">\n</div>\n", styles: [".mat-option{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;line-height:48px;height:48px;padding:0 16px;text-align:left;text-decoration:none;max-width:100%}.mat-option[disabled]{cursor:default}[dir=rtl] .mat-option{text-align:right}.mat-option .mat-icon{margin-right:16px;vertical-align:middle}.mat-option .mat-icon svg{vertical-align:top}[dir=rtl] .mat-option .mat-icon{margin-left:16px;margin-right:0}.mat-option{position:relative;cursor:pointer;outline:none;display:flex;flex-direction:row;max-width:100%;box-sizing:border-box;align-items:center;-webkit-tap-highlight-color:transparent}.mat-option[aria-disabled=true]{-webkit-user-select:none;user-select:none;cursor:default}.mat-optgroup .mat-option:not(.mat-option-multiple){padding-left:32px}[dir=rtl] .mat-optgroup .mat-option:not(.mat-option-multiple){padding-left:16px;padding-right:32px}.mat-option.mat-active:before{content:\"\"}.cdk-high-contrast-active .mat-option[aria-disabled=true]{opacity:.5}.cdk-high-contrast-active .mat-option.mat-selected:not(.mat-option-multiple):after{content:\"\";position:absolute;top:50%;right:16px;transform:translateY(-50%);width:10px;height:0;border-bottom:solid 10px;border-radius:10px}[dir=rtl] .cdk-high-contrast-active .mat-option.mat-selected:not(.mat-option-multiple):after{right:auto;left:16px}@media(forced-colors:active){.mat-option[aria-disabled=true]{opacity:.5}.mat-option.mat-selected:not(.mat-option-multiple):after{content:\"\";position:absolute;top:50%;right:16px;transform:translateY(-50%);width:10px;height:0;border-bottom:solid 10px;border-radius:10px}[dir=rtl] .mat-option.mat-selected:not(.mat-option-multiple):after{right:auto;left:16px}}.mat-option-text{display:inline-block;flex-grow:1;overflow:hidden;text-overflow:ellipsis}.mat-option .mat-option-ripple{inset:0;position:absolute;pointer-events:none}.mat-option-pseudo-checkbox{margin-right:8px}[dir=rtl] .mat-option-pseudo-checkbox{margin-left:8px;margin-right:0}\n"] }]
        }], ctorParameters: () => [{ type: i0.ElementRef }, { type: i0.ChangeDetectorRef }, { type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [MAT_OPTION_PARENT_COMPONENT]
                }] }, { type: MatLegacyOptgroup, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [MAT_OPTGROUP]
                }] }] });

function _countGroupLabelsBeforeOption(optionIndex, options, optionGroups) {
    if (optionGroups.length) {
        let optionsArray = options.toArray();
        let groups = optionGroups.toArray();
        let groupCounter = 0;
        for (let i = 0; i < optionIndex + 1; i++) {
            if (optionsArray[i].group && optionsArray[i].group === groups[groupCounter]) {
                groupCounter++;
            }
        }
        return groupCounter;
    }
    return 0;
}
/**
 * Determines the position to which to scroll a panel in order for an option to be into view.
 * @param optionOffset Offset of the option from the top of the panel.
 * @param optionHeight Height of the options.
 * @param currentScrollPosition Current scroll position of the panel.
 * @param panelHeight Height of the panel.
 * @docs-private
 */
function _getOptionScrollPosition(optionOffset, optionHeight, currentScrollPosition, panelHeight) {
    if (optionOffset < currentScrollPosition) {
        return optionOffset;
    }
    if (optionOffset + optionHeight > currentScrollPosition + panelHeight) {
        return Math.max(0, optionOffset - panelHeight + optionHeight);
    }
    return currentScrollPosition;
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
class MatLegacyOptionModule {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyOptionModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
    static ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyOptionModule, declarations: [MatLegacyOption, MatLegacyOptgroup], imports: [MatRippleModule, CommonModule, MatCommonModule, MatLegacyPseudoCheckboxModule], exports: [MatLegacyOption, MatLegacyOptgroup] });
    static ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyOptionModule, imports: [MatRippleModule, CommonModule, MatCommonModule, MatLegacyPseudoCheckboxModule] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyOptionModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [MatRippleModule, CommonModule, MatCommonModule, MatLegacyPseudoCheckboxModule],
                    exports: [MatLegacyOption, MatLegacyOptgroup],
                    declarations: [MatLegacyOption, MatLegacyOptgroup],
                }]
        }] });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Copyright (c) 2026 Ryan Lester
 */
/** True when the motion event was dispatched on the listening element. */
function legacyHostMotionEvent(event) {
    return event.target != null && event.target === event.currentTarget;
}
/**
 * Returns the animation name when it has not already completed.
 * The same name completes once until the caller resets the previous name.
 */
function legacyNextMotionCompletion(previous, animationName) {
    if (!animationName || previous === animationName) {
        return undefined;
    }
    return animationName;
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Engine-independent motion curve/duration constants (Material 16.2.14).
 */
/** CSS cubic-bezier curves historically exported as AnimationCurves. */
class LegacyAnimationCurves {
    static STANDARD_CURVE = 'cubic-bezier(0.4,0.0,0.2,1)';
    static DECELERATION_CURVE = 'cubic-bezier(0.0,0.0,0.2,1)';
    static ACCELERATION_CURVE = 'cubic-bezier(0.4,0.0,1,1)';
    static SHARP_CURVE = 'cubic-bezier(0.4,0.0,0.6,1)';
}
/** CSS durations historically exported as AnimationDurations. */
class LegacyAnimationDurations {
    static COMPLEX = '375ms';
    static ENTERING = '225ms';
    static EXITING = '195ms';
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned line-count helper (S25). MatLine / MatLineModule remain public upstream aliases.
 */
/**
 * Helper that takes a query list of lines and sets the correct class on the host.
 * Historical `setLines` behavior: clear stale 2/3/multi classes, then apply based on length.
 */
function legacySetLines(lines, element, prefix = 'mat') {
    // Note: doesn't need to unsubscribe, because `changes`
    // gets completed by Angular when the view is destroyed.
    lines.changes.pipe(startWith(lines)).subscribe(({ length }) => {
        setClass(element, `${prefix}-2-line`, false);
        setClass(element, `${prefix}-3-line`, false);
        setClass(element, `${prefix}-multi-line`, false);
        if (length === 2 || length === 3) {
            setClass(element, `${prefix}-${length}-line`, true);
        }
        else if (length > 3) {
            setClass(element, `${prefix}-multi-line`, true);
        }
    });
}
/** Adds or removes a class from an element. */
function setClass(element, className, isAdd) {
    element.nativeElement.classList.toggle(className, isAdd);
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Historical MAT_DATE_LOCALE_FACTORY. Current Material inlines the factory on the token;
 * preserve the named export for legacy consumers.
 */
function MAT_LEGACY_DATE_LOCALE_FACTORY() {
    return inject(LOCALE_ID);
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Shadow DOM helpers based on Material/CDK 16.2.14 semantics (S03).
 * Do not import current underscore CDK platform helpers.
 */
let shadowDomIsSupported;
/** Checks whether the user's browser supports Shadow DOM. */
function legacySupportsShadowDom() {
    if (shadowDomIsSupported == null) {
        const head = typeof document !== 'undefined' ? document.head : null;
        shadowDomIsSupported = !!(head && (head.createShadowRoot || head.attachShadow));
    }
    return shadowDomIsSupported;
}
/**
 * Gets the shadow root of an element, if supported and the element is inside the Shadow DOM.
 * Uses the element's realm (`ownerDocument.defaultView.ShadowRoot`) when reachable rather than
 * an unguarded global `ShadowRoot` constructor.
 */
function legacyGetShadowRoot(element) {
    if (!legacySupportsShadowDom()) {
        return null;
    }
    const rootNode = element.getRootNode ? element.getRootNode() : null;
    if (!rootNode) {
        return null;
    }
    const view = element.ownerDocument?.defaultView ?? (typeof window !== 'undefined' ? window : null);
    const ShadowRootCtor = view?.ShadowRoot ?? (typeof ShadowRoot !== 'undefined' ? ShadowRoot : null);
    if (ShadowRootCtor && rootNode instanceof ShadowRootCtor) {
        return rootNode;
    }
    return null;
}
/**
 * Gets the target of an event while accounting for Shadow DOM composed paths.
 * Retains the owned empty/missing-path fallback and handles event replay paths that throw.
 */
function legacyGetEventTarget(event) {
    if (typeof event.composedPath === 'function') {
        try {
            const path = event.composedPath();
            if (path && path.length > 0) {
                return path[0];
            }
        }
        catch {
            // Angular event replay may not provide a usable composed path.
        }
    }
    return event.target ?? null;
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned numeric-recognition helper based on CDK 16.2.14 (S04).
 * Do not import current underscore `_isNumberValue`.
 */
/**
 * Whether the provided value is considered a number for sorting/filtering.
 * Empty strings, whitespace, null, booleans, and mixed suffixes follow historical
 * parseFloat+Number semantics (not truthiness / bare Number()).
 */
function legacyIsNumberValue(value) {
    return !isNaN(parseFloat(value)) && !isNaN(Number(value));
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Keep the instance structurally compatible with supplied historical rulers.
// Root-owned state and listeners belong to this helper, never its callers.
const states = new WeakMap();
const stateOf = (viewport) => states.get(viewport);
const windowOf = (state) => state.document.defaultView || window;
/**
 * Owned viewport primitives for historical legacy controls. Shared through the
 * legacy-core entry so each application has one event/cache owner across families.
 * @docs-private
 */
class _LegacyViewport {
    constructor(platform, zone, document) {
        const changes = new Subject();
        const state = { platform, document, size: null, changes,
            listener: event => changes.next(event) };
        states.set(this, state);
        zone.runOutsideAngular(() => {
            if (platform.isBrowser) {
                const target = windowOf(state);
                target.addEventListener('resize', state.listener);
                target.addEventListener('orientationchange', state.listener);
            }
            // Historical invalidation is audited at 20ms, before later change observers.
            this.change().subscribe(() => state.size = null);
        });
    }
    ngOnDestroy() {
        const state = stateOf(this);
        if (state.platform.isBrowser) {
            const target = windowOf(state);
            target.removeEventListener('resize', state.listener);
            target.removeEventListener('orientationchange', state.listener);
        }
        state.changes.complete();
    }
    getViewportSize() {
        const state = stateOf(this);
        if (!state.size) {
            const target = windowOf(state);
            state.size = state.platform.isBrowser
                ? { width: target.innerWidth, height: target.innerHeight } : { width: 0, height: 0 };
        }
        const result = { ...state.size };
        if (!state.platform.isBrowser)
            state.size = null;
        return result;
    }
    getViewportScrollPosition() {
        const state = stateOf(this);
        if (!state.platform.isBrowser)
            return { top: 0, left: 0 };
        const document = state.document, target = windowOf(state), element = document.documentElement;
        const rect = element.getBoundingClientRect();
        return {
            top: -rect.top || document.body.scrollTop || target.scrollY || element.scrollTop || 0,
            left: -rect.left || document.body.scrollLeft || target.scrollX || element.scrollLeft || 0,
        };
    }
    getViewportRect() {
        const { top, left } = this.getViewportScrollPosition();
        const { width, height } = this.getViewportSize();
        return { top, left, bottom: top + height, right: left + width, height, width };
    }
    change(throttleTime = 20) {
        const changes = stateOf(this).changes;
        return throttleTime > 0 ? changes.pipe(auditTime(throttleTime)) : changes;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: _LegacyViewport, deps: [{ token: i1$2.Platform }, { token: i0.NgZone }, { token: DOCUMENT$1, optional: true }], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: _LegacyViewport, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: _LegacyViewport, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: () => [{ type: i1$2.Platform }, { type: i0.NgZone }, { type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [DOCUMENT$1]
                }] }] });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Possible states for a ripple element. */
var LegacyRippleState;
(function (LegacyRippleState) {
    LegacyRippleState[LegacyRippleState["FADING_IN"] = 0] = "FADING_IN";
    LegacyRippleState[LegacyRippleState["VISIBLE"] = 1] = "VISIBLE";
    LegacyRippleState[LegacyRippleState["FADING_OUT"] = 2] = "FADING_OUT";
    LegacyRippleState[LegacyRippleState["HIDDEN"] = 3] = "HIDDEN";
})(LegacyRippleState || (LegacyRippleState = {}));
/**
 * Reference to a previously launched ripple element.
 */
class LegacyRippleRef {
    _renderer;
    element;
    config;
    _animationForciblyDisabledThroughCss;
    /** Current state of the ripple. */
    state = LegacyRippleState.HIDDEN;
    constructor(_renderer, 
    /** Reference to the ripple HTML element. */
    element, 
    /** Ripple configuration used for the ripple. */
    config, _animationForciblyDisabledThroughCss = false) {
        this._renderer = _renderer;
        this.element = element;
        this.config = config;
        this._animationForciblyDisabledThroughCss = _animationForciblyDisabledThroughCss;
        this.state = LegacyRippleState.FADING_IN;
    }
    /** Fades out the ripple element. */
    fadeOut() {
        this._renderer.fadeOutRipple(this);
    }
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Handles the event registration for ripples. Delegates events so each renderer
 * does not need its own capturing listeners on every trigger.
 */
class LegacyRippleEventManager {
    _events = new Map();
    addHandler(ngZone, type, element, handler) {
        const handlersForEvent = this._events.get(type) || new Map();
        const handlersOnElement = handlersForEvent.get(element) || new Set();
        if (!this._events.has(type)) {
            this._events.set(type, handlersForEvent);
            ngZone.runOutsideAngular(() => {
                document.addEventListener(type, this, { capture: true, passive: true });
            });
        }
        if (!handlersForEvent.has(element)) {
            handlersForEvent.set(element, handlersOnElement);
        }
        handlersOnElement.add(handler);
    }
    removeHandler(type, element, handler) {
        const handlersForEvent = this._events.get(type);
        const handlersOnElement = handlersForEvent?.get(element);
        if (!handlersOnElement) {
            return;
        }
        handlersOnElement.delete(handler);
        if (handlersOnElement.size === 0) {
            handlersForEvent.delete(element);
        }
        if (handlersForEvent.size === 0) {
            this._events.delete(type);
            document.removeEventListener(type, this, true);
        }
    }
    handleEvent(event) {
        const targets = this._events.get(event.type);
        if (!targets) {
            return;
        }
        const target = legacyGetEventTarget(event);
        if (target) {
            // Material 16 dispatches matching triggers in registration order.
            targets.forEach((handlers, element) => {
                if (element === target || element.contains(target)) {
                    handlers.forEach(handler => handler.handleEvent(event));
                }
            });
        }
    }
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned finite ripple renderer (S23/S26). Current RippleRenderer is @docs-private (S21).
 */
/** Default enter/exit durations (historical defaultRippleAnimationConfig). */
const legacyDefaultRippleAnimationConfig = {
    enterDuration: 225,
    exitDuration: 150,
};
const ignoreMouseEventsTimeout = 800;
const passiveCapturingEventOptions = normalizePassiveListenerOptions({
    passive: true,
    capture: true,
});
const pointerDownEvents = ['mousedown', 'touchstart'];
const pointerUpEvents = ['mouseup', 'mouseleave', 'touchend', 'touchcancel'];
/**
 * Finite DOM ripple renderer used by legacy chips and tab links.
 * Constructor and public methods match the historical 4-arg form used by those consumers.
 */
class LegacyRippleRenderer {
    _target;
    _ngZone;
    _platform;
    _containerElement;
    _triggerElement = null;
    _isPointerDown = false;
    _activeRipples = new Map();
    _mostRecentTransientRipple = null;
    _lastTouchStartEvent;
    _pointerUpEventsRegistered = false;
    _containerRect = null;
    static _eventManager = new LegacyRippleEventManager();
    constructor(_target, _ngZone, elementOrElementRef, _platform) {
        this._target = _target;
        this._ngZone = _ngZone;
        this._platform = _platform;
        if (_platform.isBrowser) {
            this._containerElement = coerceElement(elementOrElementRef);
        }
    }
    fadeInRipple(x, y, config = {}) {
        const containerRect = (this._containerRect =
            this._containerRect || this._containerElement.getBoundingClientRect());
        const animationConfig = { ...legacyDefaultRippleAnimationConfig, ...config.animation };
        if (config.centered) {
            x = containerRect.left + containerRect.width / 2;
            y = containerRect.top + containerRect.height / 2;
        }
        const radius = config.radius || distanceToFurthestCorner(x, y, containerRect);
        const offsetX = x - containerRect.left;
        const offsetY = y - containerRect.top;
        const enterDuration = animationConfig.enterDuration;
        const ripple = document.createElement('div');
        ripple.classList.add('mat-ripple-element');
        ripple.style.left = `${offsetX - radius}px`;
        ripple.style.top = `${offsetY - radius}px`;
        ripple.style.height = `${radius * 2}px`;
        ripple.style.width = `${radius * 2}px`;
        if (config.color != null) {
            ripple.style.backgroundColor = config.color;
        }
        ripple.style.transitionDuration = `${enterDuration}ms`;
        this._containerElement.appendChild(ripple);
        const computedStyles = window.getComputedStyle(ripple);
        const userTransitionProperty = computedStyles.transitionProperty;
        const userTransitionDuration = computedStyles.transitionDuration;
        const animationForciblyDisabledThroughCss = userTransitionProperty === 'none' ||
            userTransitionDuration === '0s' ||
            userTransitionDuration === '0s, 0s' ||
            (containerRect.width === 0 && containerRect.height === 0);
        const rippleRef = new LegacyRippleRef(this, ripple, config, animationForciblyDisabledThroughCss);
        ripple.style.transform = 'scale3d(1, 1, 1)';
        rippleRef.state = LegacyRippleState.FADING_IN;
        if (!config.persistent) {
            this._mostRecentTransientRipple = rippleRef;
        }
        let eventListeners = null;
        if (!animationForciblyDisabledThroughCss && (enterDuration || animationConfig.exitDuration)) {
            this._ngZone.runOutsideAngular(() => {
                const onTransitionEnd = () => {
                    if (!this._activeRipples.has(rippleRef)) {
                        return;
                    }
                    if (eventListeners) {
                        if (eventListeners.fallbackTimer !== null) {
                            clearTimeout(eventListeners.fallbackTimer);
                        }
                        eventListeners.fallbackTimer = null;
                    }
                    this._finishRippleTransition(rippleRef);
                };
                const onTransitionCancel = () => this._destroyRipple(rippleRef);
                // Fallback when neither transitionend nor transitioncancel fires under load.
                // Complete the current state: a held or persistent ripple must remain visible.
                const fallbackTimer = setTimeout(() => {
                    if (rippleRef.state === LegacyRippleState.FADING_IN) {
                        onTransitionEnd();
                    }
                }, enterDuration + 100);
                ripple.addEventListener('transitionend', onTransitionEnd);
                ripple.addEventListener('transitioncancel', onTransitionCancel);
                eventListeners = { onTransitionEnd, onTransitionCancel, fallbackTimer };
            });
        }
        this._activeRipples.set(rippleRef, eventListeners);
        if (animationForciblyDisabledThroughCss || !enterDuration) {
            this._finishRippleTransition(rippleRef);
        }
        return rippleRef;
    }
    fadeOutRipple(rippleRef) {
        if (rippleRef.state === LegacyRippleState.FADING_OUT || rippleRef.state === LegacyRippleState.HIDDEN) {
            return;
        }
        const rippleEl = rippleRef.element;
        const animationConfig = { ...legacyDefaultRippleAnimationConfig, ...rippleRef.config.animation };
        rippleEl.style.transitionDuration = `${animationConfig.exitDuration}ms`;
        rippleEl.style.opacity = '0';
        rippleRef.state = LegacyRippleState.FADING_OUT;
        if (rippleRef._animationForciblyDisabledThroughCss || !animationConfig.exitDuration) {
            this._finishRippleTransition(rippleRef);
        }
        else {
            const eventListeners = this._activeRipples.get(rippleRef);
            if (eventListeners) {
                if (eventListeners.fallbackTimer !== null) {
                    clearTimeout(eventListeners.fallbackTimer);
                }
                this._ngZone.runOutsideAngular(() => {
                    eventListeners.fallbackTimer = setTimeout(() => {
                        if (rippleRef.state === LegacyRippleState.FADING_OUT) {
                            eventListeners.onTransitionEnd();
                        }
                    }, animationConfig.exitDuration + 100);
                });
            }
        }
    }
    fadeOutAll() {
        this._getActiveRipples().forEach(ripple => ripple.fadeOut());
    }
    fadeOutAllNonPersistent() {
        this._getActiveRipples().forEach(ripple => {
            if (!ripple.config.persistent) {
                ripple.fadeOut();
            }
        });
    }
    setupTriggerEvents(elementOrElementRef) {
        const element = coerceElement(elementOrElementRef);
        if (!this._platform.isBrowser || !element || element === this._triggerElement) {
            return;
        }
        this._removeTriggerEvents();
        this._triggerElement = element;
        pointerDownEvents.forEach(type => {
            LegacyRippleRenderer._eventManager.addHandler(this._ngZone, type, element, this);
        });
    }
    handleEvent(event) {
        if (event.type === 'mousedown') {
            this._onMousedown(event);
        }
        else if (event.type === 'touchstart') {
            this._onTouchStart(event);
        }
        else {
            this._onPointerUp();
        }
        if (!this._pointerUpEventsRegistered) {
            this._ngZone.runOutsideAngular(() => {
                pointerUpEvents.forEach(type => {
                    this._triggerElement.addEventListener(type, this, passiveCapturingEventOptions);
                });
            });
            this._pointerUpEventsRegistered = true;
        }
    }
    _finishRippleTransition(rippleRef) {
        if (rippleRef.state === LegacyRippleState.FADING_IN) {
            this._startFadeOutTransition(rippleRef);
        }
        else if (rippleRef.state === LegacyRippleState.FADING_OUT) {
            this._destroyRipple(rippleRef);
        }
    }
    _startFadeOutTransition(rippleRef) {
        const isMostRecentTransientRipple = rippleRef === this._mostRecentTransientRipple;
        const { persistent } = rippleRef.config;
        rippleRef.state = LegacyRippleState.VISIBLE;
        if (!persistent && (!isMostRecentTransientRipple || !this._isPointerDown)) {
            rippleRef.fadeOut();
        }
    }
    _destroyRipple(rippleRef) {
        const eventListeners = this._activeRipples.get(rippleRef) ?? null;
        this._activeRipples.delete(rippleRef);
        if (!this._activeRipples.size) {
            this._containerRect = null;
        }
        if (rippleRef === this._mostRecentTransientRipple) {
            this._mostRecentTransientRipple = null;
        }
        rippleRef.state = LegacyRippleState.HIDDEN;
        if (eventListeners !== null) {
            rippleRef.element.removeEventListener('transitionend', eventListeners.onTransitionEnd);
            rippleRef.element.removeEventListener('transitioncancel', eventListeners.onTransitionCancel);
            if (eventListeners.fallbackTimer !== null) {
                clearTimeout(eventListeners.fallbackTimer);
            }
        }
        rippleRef.element.remove();
    }
    _onMousedown(event) {
        const isFakeMousedown = isFakeMousedownFromScreenReader(event);
        const isSyntheticEvent = this._lastTouchStartEvent && Date.now() < this._lastTouchStartEvent + ignoreMouseEventsTimeout;
        if (!this._target.rippleDisabled && !isFakeMousedown && !isSyntheticEvent) {
            this._isPointerDown = true;
            this.fadeInRipple(event.clientX, event.clientY, this._target.rippleConfig);
        }
    }
    _onTouchStart(event) {
        if (!this._target.rippleDisabled && !isFakeTouchstartFromScreenReader(event)) {
            this._lastTouchStartEvent = Date.now();
            this._isPointerDown = true;
            const touches = event.changedTouches;
            if (touches) {
                for (let i = 0; i < touches.length; i++) {
                    this.fadeInRipple(touches[i].clientX, touches[i].clientY, this._target.rippleConfig);
                }
            }
        }
    }
    _onPointerUp() {
        if (!this._isPointerDown) {
            return;
        }
        this._isPointerDown = false;
        this._getActiveRipples().forEach(ripple => {
            const isVisible = ripple.state === LegacyRippleState.VISIBLE ||
                (ripple.config.terminateOnPointerUp && ripple.state === LegacyRippleState.FADING_IN);
            if (!ripple.config.persistent && isVisible) {
                ripple.fadeOut();
            }
        });
    }
    _getActiveRipples() {
        return Array.from(this._activeRipples.keys());
    }
    _removeTriggerEvents() {
        const trigger = this._triggerElement;
        if (trigger) {
            pointerDownEvents.forEach(type => LegacyRippleRenderer._eventManager.removeHandler(type, trigger, this));
            if (this._pointerUpEventsRegistered) {
                pointerUpEvents.forEach(type => trigger.removeEventListener(type, this, passiveCapturingEventOptions));
                this._pointerUpEventsRegistered = false;
            }
        }
    }
}
function distanceToFurthestCorner(x, y, rect) {
    const distX = Math.max(Math.abs(x - rect.left), Math.abs(x - rect.right));
    const distY = Math.max(Math.abs(y - rect.top), Math.abs(y - rect.bottom));
    return Math.sqrt(distX * distX + distY * distY);
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * Matches strings that have the form of a valid RFC 3339 string
 * (https://tools.ietf.org/html/rfc3339). Note that the string may not actually be a valid date
 * because the regex will match strings an with out of bounds month, date, etc.
 */
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|(?:(?:\+|-)\d{2}:\d{2}))?)?$/;
/** Creates an array and fills it with values. */
function range(length, valueFunction) {
    const valuesArray = Array(length);
    for (let i = 0; i < length; i++) {
        valuesArray[i] = valueFunction(i);
    }
    return valuesArray;
}
/** Adapts the native JS Date for use with cdk-based components that work with dates. */
class LegacyNativeDateAdapter extends DateAdapter {
    /**
     * @deprecated No longer being used. To be removed.
     * @breaking-change 14.0.0
     */
    useUtcForDisplay = false;
    constructor(matDateLocale, 
    /**
     * @deprecated No longer being used. To be removed.
     * @breaking-change 14.0.0
     */
    _platform) {
        super();
        super.setLocale(matDateLocale);
    }
    getYear(date) {
        return date.getFullYear();
    }
    getMonth(date) {
        return date.getMonth();
    }
    getDate(date) {
        return date.getDate();
    }
    getDayOfWeek(date) {
        return date.getDay();
    }
    getMonthNames(style) {
        const dtf = new Intl.DateTimeFormat(this.locale, { month: style, timeZone: 'utc' });
        return range(12, i => this._format(dtf, new Date(2017, i, 1)));
    }
    getDateNames() {
        const dtf = new Intl.DateTimeFormat(this.locale, { day: 'numeric', timeZone: 'utc' });
        return range(31, i => this._format(dtf, new Date(2017, 0, i + 1)));
    }
    getDayOfWeekNames(style) {
        const dtf = new Intl.DateTimeFormat(this.locale, { weekday: style, timeZone: 'utc' });
        return range(7, i => this._format(dtf, new Date(2017, 0, i + 1)));
    }
    getYearName(date) {
        const dtf = new Intl.DateTimeFormat(this.locale, { year: 'numeric', timeZone: 'utc' });
        return this._format(dtf, date);
    }
    getFirstDayOfWeek() {
        // We can't tell using native JS Date what the first day of the week is, we default to Sunday.
        return 0;
    }
    getNumDaysInMonth(date) {
        return this.getDate(this._createDateWithOverflow(this.getYear(date), this.getMonth(date) + 1, 0));
    }
    clone(date) {
        return new Date(date.getTime());
    }
    createDate(year, month, date) {
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
            // Check for invalid month and date (except upper bound on date which we have to check after
            // creating the Date).
            if (month < 0 || month > 11) {
                throw Error(`Invalid month index "${month}". Month index has to be between 0 and 11.`);
            }
            if (date < 1) {
                throw Error(`Invalid date "${date}". Date has to be greater than 0.`);
            }
        }
        let result = this._createDateWithOverflow(year, month, date);
        // Check that the date wasn't above the upper bound for the month, causing the month to overflow
        if (result.getMonth() != month && (typeof ngDevMode === 'undefined' || ngDevMode)) {
            throw Error(`Invalid date "${date}" for month with index "${month}".`);
        }
        return result;
    }
    today() {
        return new Date();
    }
    parse(value, parseFormat) {
        // We have no way using the native JS Date to set the parse format or locale, so we ignore these
        // parameters.
        if (typeof value == 'number') {
            return new Date(value);
        }
        return value ? new Date(Date.parse(value)) : null;
    }
    format(date, displayFormat) {
        if (!this.isValid(date)) {
            throw Error('NativeDateAdapter: Cannot format invalid date.');
        }
        const dtf = new Intl.DateTimeFormat(this.locale, { ...displayFormat, timeZone: 'utc' });
        return this._format(dtf, date);
    }
    addCalendarYears(date, years) {
        return this.addCalendarMonths(date, years * 12);
    }
    addCalendarMonths(date, months) {
        let newDate = this._createDateWithOverflow(this.getYear(date), this.getMonth(date) + months, this.getDate(date));
        // It's possible to wind up in the wrong month if the original month has more days than the new
        // month. In this case we want to go to the last day of the desired month.
        // Note: the additional + 12 % 12 ensures we end up with a positive number, since JS % doesn't
        // guarantee this.
        if (this.getMonth(newDate) != (((this.getMonth(date) + months) % 12) + 12) % 12) {
            newDate = this._createDateWithOverflow(this.getYear(newDate), this.getMonth(newDate), 0);
        }
        return newDate;
    }
    addCalendarDays(date, days) {
        return this._createDateWithOverflow(this.getYear(date), this.getMonth(date), this.getDate(date) + days);
    }
    toIso8601(date) {
        return [
            date.getUTCFullYear(),
            this._2digit(date.getUTCMonth() + 1),
            this._2digit(date.getUTCDate()),
        ].join('-');
    }
    /**
     * Returns the given value if given a valid Date or null. Deserializes valid ISO 8601 strings
     * (https://www.ietf.org/rfc/rfc3339.txt) into valid Dates and empty string into null. Returns an
     * invalid date for all other values.
     */
    deserialize(value) {
        if (typeof value === 'string') {
            if (!value) {
                return null;
            }
            // The `Date` constructor accepts formats other than ISO 8601, so we need to make sure the
            // string is the right format first.
            if (ISO_8601_REGEX.test(value)) {
                let date = new Date(value);
                if (this.isValid(date)) {
                    return date;
                }
            }
        }
        return super.deserialize(value);
    }
    isDateInstance(obj) {
        return obj instanceof Date;
    }
    isValid(date) {
        return !isNaN(date.getTime());
    }
    invalid() {
        return new Date(NaN);
    }
    /** Creates a date but allows the month and date to overflow. */
    _createDateWithOverflow(year, month, date) {
        // Passing the year to the constructor causes year numbers <100 to be converted to 19xx.
        // To work around this we use `setFullYear` and `setHours` instead.
        const d = new Date();
        d.setFullYear(year, month, date);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    /**
     * Pads a number to make it two digits.
     * @param n The number to pad.
     * @returns The padded number.
     */
    _2digit(n) {
        return ('00' + n).slice(-2);
    }
    /**
     * When converting Date object to string, javascript built-in functions may return wrong
     * results because it applies its internal DST rules. The DST rules around the world change
     * very frequently, and the current valid rule is not always valid in previous years though.
     * We work around this problem building a new Date object which has its internal UTC
     * representation with the local date and time.
     * @param dtf Intl.DateTimeFormat object, containing the desired string format. It must have
     *    timeZone set to 'utc' to work fine.
     * @param date Date from which we want to get the string representation according to dtf
     * @returns A Date object with its UTC representation based on the passed in date info
     */
    _format(dtf, date) {
        // Passing the year to the constructor causes year numbers <100 to be converted to 19xx.
        // To work around this we use `setUTCFullYear` and `setUTCHours` instead.
        const d = new Date();
        d.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        d.setUTCHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
        return dtf.format(d);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: LegacyNativeDateAdapter, deps: [{ token: MAT_DATE_LOCALE, optional: true }, { token: i1$2.Platform }], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: LegacyNativeDateAdapter });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: LegacyNativeDateAdapter, decorators: [{
            type: Injectable
        }], ctorParameters: () => [{ type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [MAT_DATE_LOCALE]
                }] }, { type: i1$2.Platform }] });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Historical native date provider using the owned locale constructor. */
class LegacyNativeDateModule {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: LegacyNativeDateModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
    static ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "22.1.7", ngImport: i0, type: LegacyNativeDateModule });
    static ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: LegacyNativeDateModule, providers: [{ provide: DateAdapter, useClass: LegacyNativeDateAdapter }] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: LegacyNativeDateModule, decorators: [{
            type: NgModule,
            args: [{ providers: [{ provide: DateAdapter, useClass: LegacyNativeDateAdapter }] }]
        }] });
/** Historical native provider and the public native date formats. */
class MatLegacyNativeDateModule {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyNativeDateModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
    static ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyNativeDateModule, imports: [LegacyNativeDateModule] });
    static ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyNativeDateModule, providers: [{ provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS }], imports: [LegacyNativeDateModule] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.7", ngImport: i0, type: MatLegacyNativeDateModule, decorators: [{
            type: NgModule,
            args: [{ imports: [LegacyNativeDateModule], providers: [{ provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS }] }]
        }] });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * Generated bundle index. Do not edit.
 */

export { LEGACY_ANIMATIONS_TEST_OVERRIDE, LEGACY_ANIMATION_MODE, LEGACY_ZERO_ANIMATION_PARAMS, LegacyAnimationCurves, LegacyAnimationDurations, LegacyNativeDateAdapter, LegacyNativeDateModule, LegacyRippleRef, LegacyRippleRenderer, LegacyRippleState, MATERIAL_LEGACY_SANITY_CHECKS, MAT_LEGACY_DATE_LOCALE_FACTORY, MAT_OPTGROUP as MAT_LEGACY_OPTGROUP, MAT_OPTION_PARENT_COMPONENT as MAT_LEGACY_OPTION_PARENT_COMPONENT, MatCommonModule as MatLegacyCommonModule, MatLegacyNativeDateModule, MatLegacyOptgroup, MatLegacyOption, MatLegacyOptionModule, MatOptionSelectionChange as MatLegacyOptionSelectionChange, MatLegacyPseudoCheckbox, MatLegacyPseudoCheckboxModule, _LegacyViewport, _MatOptgroupBase as _MatLegacyOptgroupBase, _MatOptionBase as _MatLegacyOptionBase, _MatOptgroupBase, _MatOptionBase, _countGroupLabelsBeforeOption as _countGroupLabelsBeforeLegacyOption, _getOptionScrollPosition as _getLegacyOptionScrollPosition, getLegacyAnimationsState, legacyAnimationTriggerState, legacyAnimationsDisabled, legacyDefaultRippleAnimationConfig, legacyGetEventTarget, legacyGetShadowRoot, legacyHostMotionEvent, legacyIsNumberValue, mixinColor as legacyMixinColor, mixinDisableRipple as legacyMixinDisableRipple, mixinDisabled as legacyMixinDisabled, mixinErrorState as legacyMixinErrorState, mixinInitialized as legacyMixinInitialized, mixinTabIndex as legacyMixinTabIndex, legacyNextMotionCompletion, legacySetLines, legacySupportsShadowDom, resolveLegacyAnimationMode, zeroAnimationParams };
//# sourceMappingURL=ngx-compat-material-legacy-legacy-core.mjs.map
