/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 tab-nav bases.
 */
import {
  ANIMATION_MODULE_TYPE,
  AfterContentChecked,
  AfterContentInit,
  AfterViewInit,
  Attribute,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  Directive,
  ElementRef,
  forwardRef,
  Inject,
  Input,
  NgZone,
  OnDestroy,
  Optional,
  QueryList,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {MAT_RIPPLE_GLOBAL_OPTIONS, RippleConfig, RippleGlobalOptions, RippleTarget, ThemePalette} from '@angular/material/core';
import {CanDisable, CanDisableRipple, HasTabIndex, mixinDisabled, mixinDisableRipple, mixinTabIndex} from './common-behaviors';
import {FocusableOption, FocusMonitor} from '@angular/cdk/a11y';
import {Directionality} from '@angular/cdk/bidi';
import {ViewportRuler} from '@angular/cdk/scrolling';
import {Platform} from '@angular/cdk/platform';
import {MatInkBar, MatInkBarItem, mixinInkBarItem} from './ink-bar-shared';
import {BooleanInput, coerceBooleanProperty, NumberInput} from '@angular/cdk/coercion';
import {BehaviorSubject, Subject} from 'rxjs';
import {startWith, takeUntil} from 'rxjs/operators';
import {ENTER, SPACE} from '@angular/cdk/keycodes';
import {MAT_TABS_CONFIG, MatTabsConfig} from '@angular/material/tabs';
import {MatPaginatedTabHeader, MatPaginatedTabHeaderItem} from './paginated-tab-header';

// Increasing integer for generating unique ids for tab nav components.
let nextUniqueId = 0;

/**
 * Base class with all of the `MatTabNav` functionality.
 * @docs-private
 */
@Directive()
export abstract class _MatTabNavBase
  extends MatPaginatedTabHeader
  implements AfterContentChecked, AfterContentInit, OnDestroy
{
  /** Query list of all tab links of the tab navigation. */
  abstract override _items: QueryList<MatPaginatedTabHeaderItem & {active: boolean; id: string}>;

  /** Background color of the tab nav. */
  @Input()
  get backgroundColor(): ThemePalette {
    return this._backgroundColor;
  }

  set backgroundColor(value: ThemePalette) {
    const classList = this._elementRef.nativeElement.classList;
    classList.remove('mat-tabs-with-background', `mat-background-${this.backgroundColor}`);

    if (value) {
      classList.add('mat-tabs-with-background', `mat-background-${value}`);
    }

    this._backgroundColor = value;
  }

  private _backgroundColor: ThemePalette;

  /** Whether the ripple effect is disabled or not. */
  @Input()
  get disableRipple(): boolean {
    return this._disableRipple;
  }

  set disableRipple(value: BooleanInput) {
    this._disableRipple = coerceBooleanProperty(value);
  }

  private _disableRipple: boolean = false;

  /** Theme color of the nav bar. */
  @Input() color: ThemePalette = 'primary';

  /**
   * Associated tab panel controlled by the nav bar. If not provided, then the nav bar
   * follows the ARIA link / navigation landmark pattern. If provided, it follows the
   * ARIA tabs design pattern.
   */
  @Input() tabPanel?: MatTabNavPanel;

  constructor(
    elementRef: ElementRef,
    @Optional() dir: Directionality,
    ngZone: NgZone,
    changeDetectorRef: ChangeDetectorRef,
    viewportRuler: ViewportRuler,
    platform: Platform,
    @Optional() @Inject(ANIMATION_MODULE_TYPE) animationMode?: string,
  ) {
    super(elementRef, changeDetectorRef, viewportRuler, dir, ngZone, platform, animationMode);
  }

  protected _itemSelected() {
    // noop
  }

  override ngAfterContentInit() {
    // We need this to run before the `changes` subscription in parent to ensure that the
    // selectedIndex is up-to-date by the time the super class starts looking for it.
    this._items.changes.pipe(startWith(null), takeUntil(this._destroyed)).subscribe(() => {
      this.updateActiveLink();
    });

    super.ngAfterContentInit();
  }

  /** Notifies the component that the active link has been changed. */
  updateActiveLink() {
    if (!this._items) {
      return;
    }

    const items = this._items.toArray();

    for (let i = 0; i < items.length; i++) {
      if (items[i].active) {
        this.selectedIndex = i;
        this._changeDetectorRef.markForCheck();

        if (this.tabPanel) {
          this.tabPanel._activeTabId = items[i].id;
        }

        return;
      }
    }

    // The ink bar should hide itself if no items are active.
    this.selectedIndex = -1;
    this._inkBar.hide();
  }

  _getRole(): string | null {
    return this.tabPanel ? 'tablist' : this._elementRef.nativeElement.getAttribute('role');
  }
}

// Boilerplate for applying mixins to MatTabLink.
const _MatTabLinkMixinBase = mixinTabIndex(mixinDisableRipple(mixinDisabled(class {})));

/** Base class with all of the `MatTabLink` functionality. */
@Directive()
export class _MatTabLinkBase
  extends _MatTabLinkMixinBase
  implements
    AfterViewInit,
    OnDestroy,
    CanDisable,
    CanDisableRipple,
    HasTabIndex,
    RippleTarget,
    FocusableOption
{
  /** Whether the tab link is active or not. */
  protected _isActive: boolean = false;

  /** Whether the link is active. */
  @Input()
  get active(): boolean {
    return this._isActive;
  }

  set active(value: BooleanInput) {
    const newValue = coerceBooleanProperty(value);

    if (newValue !== this._isActive) {
      this._isActive = newValue;
      this._tabNavBar.updateActiveLink();
    }
  }

  /**
   * Ripple configuration for ripples that are launched on pointer down. The ripple config
   * is set to the global ripple options since we don't have any configurable options for
   * the tab link ripples.
   * @docs-private
   */
  rippleConfig: RippleConfig & RippleGlobalOptions;

  /**
   * Whether ripples are disabled on interaction.
   * @docs-private
   */
  get rippleDisabled(): boolean {
    return (
      this.disabled ||
      this.disableRipple ||
      this._tabNavBar.disableRipple ||
      !!this.rippleConfig.disabled
    );
  }

  /** Unique id for the tab. */
  @Input() id = `mat-tab-link-${nextUniqueId++}`;

  constructor(
    private _tabNavBar: _MatTabNavBase,
    /** @docs-private */ public elementRef: ElementRef,
    @Optional() @Inject(MAT_RIPPLE_GLOBAL_OPTIONS) globalRippleOptions: RippleGlobalOptions | null,
    @Attribute('tabindex') tabIndex: string,
    private _focusMonitor: FocusMonitor,
    @Optional() @Inject(ANIMATION_MODULE_TYPE) animationMode?: string,
  ) {
    super();

    this.rippleConfig = globalRippleOptions || {};
    this.tabIndex = parseInt(tabIndex) || 0;

    if (animationMode === 'NoopAnimations') {
      this.rippleConfig.animation = {enterDuration: 0, exitDuration: 0};
    }
  }

  /** Focuses the tab link. */
  focus() {
    this.elementRef.nativeElement.focus();
  }

  ngAfterViewInit() {
    this._focusMonitor.monitor(this.elementRef);
  }

  ngOnDestroy() {
    this._focusMonitor.stopMonitoring(this.elementRef);
  }

  _handleFocus() {
    // Since we allow navigation through tabbing in the nav bar, we
    // have to update the focused index whenever the link receives focus.
    this._tabNavBar.focusIndex = this._tabNavBar._items.toArray().indexOf(this);
  }

  _handleKeydown(event: KeyboardEvent) {
    if (event.keyCode === SPACE || event.keyCode === ENTER) {
      if (this.disabled) {
        event.preventDefault();
      } else if (this._tabNavBar.tabPanel) {
        this.elementRef.nativeElement.click();
      }
    }
  }

  _getAriaControls(): string | null {
    return this._tabNavBar.tabPanel
      ? this._tabNavBar.tabPanel?.id
      : this.elementRef.nativeElement.getAttribute('aria-controls');
  }

  _getAriaSelected(): string | null {
    if (this._tabNavBar.tabPanel) {
      return this.active ? 'true' : 'false';
    } else {
      return this.elementRef.nativeElement.getAttribute('aria-selected');
    }
  }

  _getAriaCurrent(): string | null {
    return this.active && !this._tabNavBar.tabPanel ? 'page' : null;
  }

  _getRole(): string | null {
    return this._tabNavBar.tabPanel ? 'tab' : this.elementRef.nativeElement.getAttribute('role');
  }

  _getTabIndex(): number {
    if (this._tabNavBar.tabPanel) {
      return this._isActive && !this.disabled ? 0 : -1;
    } else {
      return this.tabIndex;
    }
  }
}

const _MatTabLinkBaseWithInkBarItem = mixinInkBarItem(_MatTabLinkBase);

/**
 * Navigation component matching the styles of the tab group header.
 * Provides anchored navigation with animated ink bar.
 */

@Component({
  standalone: false,
  selector: 'mat-tab-nav-panel',
  exportAs: 'matTabNavPanel',
  template: '<ng-content></ng-content>',
  host: {
    '[attr.aria-labelledby]': '_activeTabId',
    '[attr.id]': 'id',
    'class': 'mat-mdc-tab-nav-panel',
    'role': 'tabpanel',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatTabNavPanel {
  /** Unique id for the tab panel. */
  @Input() id = `mat-tab-nav-panel-${nextUniqueId++}`;

  /** Id of the active tab in the nav bar. */
  _activeTabId?: string;
}
