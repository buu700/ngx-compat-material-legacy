/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 `_MatMenuTriggerBase` (removed from Angular Material 22).
 */

import {
  FocusMonitor,
  FocusOrigin,
  isFakeMousedownFromScreenReader,
  isFakeTouchstartFromScreenReader,
} from '@angular/cdk/a11y';
import {Direction, Directionality} from '@angular/cdk/bidi';
import {ENTER, LEFT_ARROW, RIGHT_ARROW, SPACE} from '@angular/cdk/keycodes';
import {
  FlexibleConnectedPositionStrategy,
  HorizontalConnectionPos,
  Overlay,
  OverlayConfig,
  OverlayRef,
  ScrollStrategy,
  VerticalConnectionPos,
} from '@angular/cdk/overlay';
import {TemplatePortal} from '@angular/cdk/portal';
import {
  MAT_MENU_PANEL,
  MAT_MENU_SCROLL_STRATEGY,
  MatMenuItem,
  MatMenuPanel,
  MenuCloseReason,
  MenuPositionX,
  MenuPositionY,
} from '@angular/material/menu';
import {
  AfterContentInit,
  ChangeDetectorRef,
  Directive,
  ElementRef,
  EventEmitter,
  inject,
  Inject,
  InjectionToken,
  Input,
  NgZone,
  OnDestroy,
  Optional,
  Output,
  Self,
  ViewContainerRef,
} from '@angular/core';
import {normalizePassiveListenerOptions} from '@angular/cdk/platform';
import {asapScheduler, merge, Observable, of as observableOf, Subscription} from 'rxjs';
import {delay, filter, takeUntil} from 'rxjs/operators';
import {_MatMenuBase} from './menu-base';
import {_MatMenuContentBase} from './menu-content-base';
import {throwMatMenuRecursiveError} from './menu-errors';

/** @docs-private */
export function MAT_MENU_SCROLL_STRATEGY_FACTORY(overlay: Overlay): () => ScrollStrategy {
  return () => overlay.scrollStrategies.reposition();
}

/** @docs-private */
export const MAT_MENU_SCROLL_STRATEGY_FACTORY_PROVIDER = {
  provide: MAT_MENU_SCROLL_STRATEGY,
  deps: [Overlay],
  useFactory: MAT_MENU_SCROLL_STRATEGY_FACTORY,
};

/** Options for binding a passive event listener. */
const passiveEventListenerOptions = normalizePassiveListenerOptions({passive: true});

/**
 * Default top padding of the menu panel.
 * @deprecated No longer being used. Will be removed.
 * @breaking-change 15.0.0
 */
export const MENU_PANEL_TOP_PADDING = 8;

@Directive({
  standalone: false,
  host: {
    '[attr.aria-haspopup]': 'menu ? "menu" : null',
    '[attr.aria-expanded]': 'menuOpen',
    '[attr.aria-controls]': 'menuOpen ? menu?.panelId : null',
    '(click)': '_handleClick($event)',
    '(mousedown)': '_handleMousedown($event)',
    '(keydown)': '_handleKeydown($event)',
  },
})
export abstract class _MatMenuTriggerBase implements AfterContentInit, OnDestroy {
  private _portal: TemplatePortal;
  private _overlayRef: OverlayRef | null = null;
  private _menuOpen: boolean = false;
  private _closingActionsSubscription = Subscription.EMPTY;
  private _hoverSubscription = Subscription.EMPTY;
  private _menuCloseSubscription = Subscription.EMPTY;
  private _scrollStrategy: () => ScrollStrategy;
  private _changeDetectorRef = inject(ChangeDetectorRef);

  /**
   * We're specifically looking for a `MatMenu` here since the generic `MatMenuPanel`
   * interface lacks some functionality around nested menus and animations.
   */
  private _parentMaterialMenu: _MatMenuBase | undefined;

  /**
   * Cached value of the padding of the parent menu panel.
   * Used to offset sub-menus to compensate for the padding.
   */
  private _parentInnerPadding: number | undefined;

  /**
   * Handles touch start events on the trigger.
   * Needs to be an arrow function so we can easily use addEventListener and removeEventListener.
   */
  private _handleTouchStart = (event: TouchEvent) => {
    if (!isFakeTouchstartFromScreenReader(event)) {
      this._openedBy = 'touch';
    }
  };

  // Tracking input type is necessary so it's possible to only auto-focus
  // the first item of the list when the menu is opened via the keyboard
  _openedBy: Exclude<FocusOrigin, 'program' | null> | undefined = undefined;

  /**
   * @deprecated
   * @breaking-change 8.0.0
   */
  @Input('mat-menu-trigger-for')
  get _deprecatedMatMenuTriggerFor(): MatMenuPanel | null {
    return this.menu;
  }
  set _deprecatedMatMenuTriggerFor(v: MatMenuPanel | null) {
    this.menu = v;
  }

  /** References the menu instance that the trigger is associated with. */
  @Input('matMenuTriggerFor')
  get menu(): MatMenuPanel | null {
    return this._menu;
  }
  set menu(menu: MatMenuPanel | null) {
    if (menu === this._menu) {
      return;
    }

    this._menu = menu;
    this._menuCloseSubscription.unsubscribe();

    if (menu) {
      if (menu === (this._parentMaterialMenu as MatMenuPanel | undefined) && (typeof ngDevMode === 'undefined' || ngDevMode)) {
        throwMatMenuRecursiveError();
      }

      this._menuCloseSubscription = menu.close.subscribe((reason: MenuCloseReason) => {
        this._destroyMenu(reason);

        // If a click closed the menu, we should close the entire chain of nested menus.
        if ((reason === 'click' || reason === 'tab') && this._parentMaterialMenu) {
          this._parentMaterialMenu.closed.emit(reason);
        }
      });
    }

    this._menuItemInstance?._setTriggersSubmenu(this.triggersSubmenu());
  }
  private _menu: MatMenuPanel | null;

  /** Data to be passed along to any lazily-rendered content. */
  @Input('matMenuTriggerData') menuData: any;

  /**
   * Whether focus should be restored when the menu is closed.
   * Note that disabling this option can have accessibility implications
   * and it's up to you to manage focus, if you decide to turn it off.
   */
  @Input('matMenuTriggerRestoreFocus') restoreFocus: boolean = true;

  /** Event emitted when the associated menu is opened. */
  @Output() readonly menuOpened: EventEmitter<void> = new EventEmitter<void>();

  /**
   * Event emitted when the associated menu is opened.
   * @deprecated Switch to `menuOpened` instead
   * @breaking-change 8.0.0
   */
  // tslint:disable-next-line:no-output-on-prefix
  @Output() readonly onMenuOpen: EventEmitter<void> = this.menuOpened;

  /** Event emitted when the associated menu is closed. */
  @Output() readonly menuClosed: EventEmitter<void> = new EventEmitter<void>();

  /**
   * Event emitted when the associated menu is closed.
   * @deprecated Switch to `menuClosed` instead
   * @breaking-change 8.0.0
   */
  // tslint:disable-next-line:no-output-on-prefix
  @Output() readonly onMenuClose: EventEmitter<void> = this.menuClosed;

  constructor(
    overlay: Overlay,
    element: ElementRef<HTMLElement>,
    viewContainerRef: ViewContainerRef,
    scrollStrategy: any,
    parentMenu: MatMenuPanel,
    menuItemInstance: MatMenuItem,
    dir: Directionality,
    focusMonitor: FocusMonitor,
    ngZone: NgZone,
  );

  /**
   * @deprecated `focusMonitor` will become a required parameter.
   * @breaking-change 8.0.0
   */
  constructor(
    overlay: Overlay,
    element: ElementRef<HTMLElement>,
    viewContainerRef: ViewContainerRef,
    scrollStrategy: any,
    parentMenu: MatMenuPanel,
    menuItemInstance: MatMenuItem,
    dir: Directionality,
    focusMonitor?: FocusMonitor | null,
  );

  /**
   * @deprecated `ngZone` will become a required parameter.
   * @breaking-change 15.0.0
   */
  constructor(
    overlay: Overlay,
    element: ElementRef<HTMLElement>,
    viewContainerRef: ViewContainerRef,
    scrollStrategy: any,
    parentMenu: MatMenuPanel,
    menuItemInstance: MatMenuItem,
    dir: Directionality,
    focusMonitor: FocusMonitor,
  );

  constructor(
    private _overlay: Overlay,
    private _element: ElementRef<HTMLElement>,
    private _viewContainerRef: ViewContainerRef,
    @Inject(MAT_MENU_SCROLL_STRATEGY) scrollStrategy: any,
    @Inject(MAT_MENU_PANEL) @Optional() parentMenu: MatMenuPanel,
    // `MatMenuTrigger` is commonly used in combination with a `MatMenuItem`.
    // tslint:disable-next-line: lightweight-tokens
    @Optional() @Self() private _menuItemInstance: MatMenuItem,
    @Optional() private _dir: Directionality,
    private _focusMonitor: FocusMonitor | null,
    private _ngZone?: NgZone,
  ) {
    this._scrollStrategy = scrollStrategy;
    this._parentMaterialMenu = parentMenu instanceof _MatMenuBase ? parentMenu : undefined;

    _element.nativeElement.addEventListener(
      'touchstart',
      this._handleTouchStart,
      passiveEventListenerOptions,
    );
  }

  ngAfterContentInit() {
    this._handleHover();
  }

  ngOnDestroy() {
    if (this._overlayRef) {
      this._overlayRef.dispose();
      this._overlayRef = null;
    }

    this._element.nativeElement.removeEventListener(
      'touchstart',
      this._handleTouchStart,
      passiveEventListenerOptions,
    );

    this._menuCloseSubscription.unsubscribe();
    this._closingActionsSubscription.unsubscribe();
    this._hoverSubscription.unsubscribe();
  }

  /** Whether the menu is open. */
  get menuOpen(): boolean {
    return this._menuOpen;
  }

  /** The text direction of the containing app. */
  get dir(): Direction {
    return this._dir && this._dir.value === 'rtl' ? 'rtl' : 'ltr';
  }

  /** Whether the menu triggers a sub-menu or a top-level one. */
  triggersSubmenu(): boolean {
    return !!(this._menuItemInstance && this._parentMaterialMenu && this.menu);
  }

  /** Toggles the menu between the open and closed states. */
  toggleMenu(): void {
    return this._menuOpen ? this.closeMenu() : this.openMenu();
  }

  /** Opens the menu. */
  openMenu(): void {
    const menu = this.menu;

    if (this._menuOpen || !menu) {
      return;
    }

    const overlayRef = this._createOverlay(menu);
    const overlayConfig = overlayRef.getConfig();
    const positionStrategy = overlayConfig.positionStrategy as FlexibleConnectedPositionStrategy;

    this._setPosition(menu, positionStrategy);
    overlayConfig.hasBackdrop =
      menu.hasBackdrop == null ? !this.triggersSubmenu() : menu.hasBackdrop;
    overlayRef.attach(this._getPortal(menu));

    if (menu.lazyContent) {
      menu.lazyContent.attach(this.menuData);
    }

    this._closingActionsSubscription = this._menuClosingActions().subscribe(() => this.closeMenu());
    this._initMenu(menu);

    if (typeof (menu as _MatMenuBase)._startAnimation === 'function') {
      const materialMenu = menu as _MatMenuBase;
      materialMenu._startAnimation();
      materialMenu._directDescendantItems.changes.pipe(takeUntil(materialMenu.close)).subscribe(() => {
        // Re-adjust the position without locking when the amount of items
        // changes so that the overlay is allowed to pick a new optimal position.
        positionStrategy.withLockedPosition(false).reapplyLastPosition();
        positionStrategy.withLockedPosition(true);
      });
    }
  }

  /** Closes the menu. */
  closeMenu(): void {
    this.menu?.close.emit();
  }

  /**
   * Focuses the menu trigger.
   * @param origin Source of the menu trigger's focus.
   */
  focus(origin?: FocusOrigin, options?: FocusOptions) {
    if (this._focusMonitor && origin) {
      this._focusMonitor.focusVia(this._element, origin, options);
    } else {
      this._element.nativeElement.focus(options);
    }
  }

  /**
   * Updates the position of the menu to ensure that it fits all options within the viewport.
   */
  updatePosition(): void {
    this._overlayRef?.updatePosition();
  }

  /** Closes the menu and does the necessary cleanup. */
  private _destroyMenu(reason: MenuCloseReason) {
    if (!this._overlayRef || !this.menuOpen) {
      return;
    }

    const menu = this.menu;
    this._closingActionsSubscription.unsubscribe();
    this._overlayRef.detach();

    // Always restore focus if the user is navigating using the keyboard or the menu was opened
    // programmatically. We don't restore for non-root triggers, because it can prevent focus
    // from making it back to the root trigger when closing a long chain of menus by clicking
    // on the backdrop.
    if (this.restoreFocus && (reason === 'keydown' || !this._openedBy || !this.triggersSubmenu())) {
      // Fall back to program like focusFirstItem when open was not from mouse/touch
      // (e.g. click after a non-primary mousedown). Native focus() can otherwise
      // inherit a stale FocusMonitor mouse origin from that mousedown.
      this.focus(this._openedBy || 'program');
    }

    this._openedBy = undefined;

    // Detach immediately; do not bind semantic close to the exit animation.
    this._setIsMenuOpen(false);
    if (menu instanceof _MatMenuBase) {
      menu._resetAnimation();
      (menu.lazyContent as _MatMenuContentBase | undefined)?.detach();
    } else {
      menu?.lazyContent?.detach();
    }
  }

  /**
   * This method sets the menu state to open and focuses the first item if
   * the menu was opened via the keyboard.
   */
  private _initMenu(menu: MatMenuPanel): void {
    menu.parentMenu = this.triggersSubmenu() ? (this._parentMaterialMenu as MatMenuPanel | undefined) : undefined;
    menu.direction = this.dir;
    this._setMenuElevation(menu);
    menu.focusFirstItem(this._openedBy || 'program');
    this._setIsMenuOpen(true);
  }

  /** Updates the menu elevation based on the amount of parent menus that it has. */
  private _setMenuElevation(menu: MatMenuPanel): void {
    if (menu.setElevation) {
      let depth = 0;
      let parentMenu = menu.parentMenu;

      while (parentMenu) {
        depth++;
        parentMenu = parentMenu.parentMenu;
      }

      menu.setElevation(depth);
    }
  }

  // set state rather than toggle to support triggers sharing a menu
  private _setIsMenuOpen(isOpen: boolean): void {
    if (isOpen !== this._menuOpen) {
      this._menuOpen = isOpen;
      this._menuOpen ? this.menuOpened.emit() : this.menuClosed.emit();

      if (this.triggersSubmenu()) {
        this._menuItemInstance._setHighlighted(isOpen);
      }

      this._changeDetectorRef.markForCheck();
    }
  }

  /**
   * This method creates the overlay from the provided menu's template and saves its
   * OverlayRef so that it can be attached to the DOM when openMenu is called.
   */
  private _createOverlay(menu: MatMenuPanel): OverlayRef {
    if (!this._overlayRef) {
      const config = this._getOverlayConfig(menu);
      this._subscribeToPositions(
        menu,
        config.positionStrategy as FlexibleConnectedPositionStrategy,
      );
      this._overlayRef = this._overlay.create(config);

      // Handle keyboard events through the overlay keydown stream so stacking context is respected.
      this._overlayRef.keydownEvents().subscribe(event => {
        if (this.menu instanceof _MatMenuBase) {
          this.menu._handleKeydown(event);
        }
      });
    }

    return this._overlayRef;
  }

  /**
   * This method builds the configuration object needed to create the overlay, the OverlayState.
   * @returns OverlayConfig
   */
  private _getOverlayConfig(menu: MatMenuPanel): OverlayConfig {
    return new OverlayConfig({
      positionStrategy: this._overlay
        .position()
        .flexibleConnectedTo(this._element)
        .withLockedPosition()
        .withGrowAfterOpen()
        .withTransformOriginOn('.mat-menu-panel, .mat-mdc-menu-panel'),
      backdropClass: menu.backdropClass || 'cdk-overlay-transparent-backdrop',
      panelClass: menu.overlayPanelClass,
      scrollStrategy: this._scrollStrategy(),
      direction: this._dir,
    });
  }

  /**
   * Listens to changes in the position of the overlay and sets the correct classes
   * on the menu based on the new position. This ensures the animation origin is always
   * correct, even if a fallback position is used for the overlay.
   */
  private _subscribeToPositions(menu: MatMenuPanel, position: FlexibleConnectedPositionStrategy) {
    if (menu.setPositionClasses) {
      position.positionChanges.subscribe(change => {
        const posX: MenuPositionX = change.connectionPair.overlayX === 'start' ? 'after' : 'before';
        const posY: MenuPositionY = change.connectionPair.overlayY === 'top' ? 'below' : 'above';

        // @breaking-change 15.0.0 Remove null check for `ngZone`.
        // `positionChanges` fires outside of the `ngZone` and `setPositionClasses` might be
        // updating something in the view so we need to bring it back in.
        if (this._ngZone) {
          this._ngZone.run(() => menu.setPositionClasses!(posX, posY));
        } else {
          menu.setPositionClasses!(posX, posY);
        }
      });
    }
  }

  /**
   * Sets the appropriate positions on a position strategy
   * so the overlay connects with the trigger correctly.
   * @param positionStrategy Strategy whose position to update.
   */
  private _setPosition(menu: MatMenuPanel, positionStrategy: FlexibleConnectedPositionStrategy) {
    let [originX, originFallbackX]: HorizontalConnectionPos[] =
      menu.xPosition === 'before' ? ['end', 'start'] : ['start', 'end'];

    let [overlayY, overlayFallbackY]: VerticalConnectionPos[] =
      menu.yPosition === 'above' ? ['bottom', 'top'] : ['top', 'bottom'];

    let [originY, originFallbackY] = [overlayY, overlayFallbackY];
    let [overlayX, overlayFallbackX] = [originX, originFallbackX];
    let offsetY = 0;

    if (this.triggersSubmenu()) {
      // When the menu is a sub-menu, it should always align itself
      // to the edges of the trigger, instead of overlapping it.
      overlayFallbackX = originX = menu.xPosition === 'before' ? 'start' : 'end';
      originFallbackX = overlayX = originX === 'end' ? 'start' : 'end';

      if (this._parentMaterialMenu) {
        if (this._parentInnerPadding == null) {
          const firstItem = this._parentMaterialMenu.items.first;
          this._parentInnerPadding = firstItem ? firstItem._getHostElement().offsetTop : 0;
        }

        offsetY = overlayY === 'bottom' ? this._parentInnerPadding : -this._parentInnerPadding;
      }
    } else if (!menu.overlapTrigger) {
      originY = overlayY === 'top' ? 'bottom' : 'top';
      originFallbackY = overlayFallbackY === 'top' ? 'bottom' : 'top';
    }

    positionStrategy.withPositions([
      {originX, originY, overlayX, overlayY, offsetY},
      {originX: originFallbackX, originY, overlayX: overlayFallbackX, overlayY, offsetY},
      {
        originX,
        originY: originFallbackY,
        overlayX,
        overlayY: overlayFallbackY,
        offsetY: -offsetY,
      },
      {
        originX: originFallbackX,
        originY: originFallbackY,
        overlayX: overlayFallbackX,
        overlayY: overlayFallbackY,
        offsetY: -offsetY,
      },
    ]);
  }

  /** Returns a stream that emits whenever an action that should close the menu occurs. */
  private _menuClosingActions() {
    const backdrop = this._overlayRef!.backdropClick();
    const detachments = this._overlayRef!.detachments();
    const parentClose = this._parentMaterialMenu ? this._parentMaterialMenu.closed : observableOf();
    const hover = this._parentMaterialMenu
      ? this._parentMaterialMenu._hovered().pipe(
          filter(active => active !== this._menuItemInstance),
          filter(() => this._menuOpen),
        )
      : observableOf();

    return merge(backdrop, parentClose as Observable<MenuCloseReason>, hover, detachments);
  }

  /** Handles mouse presses on the trigger. */
  _handleMousedown(event: MouseEvent): void {
    if (!isFakeMousedownFromScreenReader(event)) {
      // Since right or middle button clicks won't trigger the `click` event,
      // we shouldn't consider the menu as opened by mouse in those cases.
      this._openedBy = event.button === 0 ? 'mouse' : undefined;

      // Since clicking on the trigger won't close the menu if it opens a sub-menu,
      // we should prevent focus from moving onto it via click to avoid the
      // highlight from lingering on the menu item.
      if (this.triggersSubmenu()) {
        event.preventDefault();
      }
    }
  }

  /** Handles key presses on the trigger. */
  _handleKeydown(event: KeyboardEvent): void {
    const keyCode = event.keyCode;

    // Pressing enter on the trigger will trigger the click handler later.
    if (keyCode === ENTER || keyCode === SPACE) {
      this._openedBy = 'keyboard';
    }

    if (
      this.triggersSubmenu() &&
      ((keyCode === RIGHT_ARROW && this.dir === 'ltr') ||
        (keyCode === LEFT_ARROW && this.dir === 'rtl'))
    ) {
      this._openedBy = 'keyboard';
      this.openMenu();
    }
  }

  /** Handles click events on the trigger. */
  _handleClick(event: MouseEvent): void {
    if (this.triggersSubmenu()) {
      // Stop event propagation to avoid closing the parent menu.
      event.stopPropagation();
      this.openMenu();
    } else {
      this.toggleMenu();
    }
  }

  /** Handles the cases where the user hovers over the trigger. */
  private _handleHover() {
    // Subscribe to changes in the hovered item in order to toggle the panel.
    if (!this.triggersSubmenu() || !this._parentMaterialMenu) {
      return;
    }

    this._hoverSubscription = this._parentMaterialMenu
      ._hovered()
      // Since we might have multiple competing triggers for the same menu (e.g. a sub-menu
      // with different data and triggers), we have to delay it by a tick to ensure that
      // it won't be closed immediately after it is opened.
      .pipe(
        filter(active => active === this._menuItemInstance && !active.disabled),
        delay(0, asapScheduler),
      )
      .subscribe(() => {
        this._openedBy = 'mouse';
        // Open without waiting for a previous panel animation to finish.
        this.openMenu();
      });
  }

  /** Gets the portal that should be attached to the overlay. */
  private _getPortal(menu: MatMenuPanel): TemplatePortal {
    // Note that we can avoid this check by keeping the portal on the menu panel.
    // While it would be cleaner, we'd have to introduce another required method on
    // `MatMenuPanel`, making it harder to consume.
    if (!this._portal || this._portal.templateRef !== menu.templateRef) {
      this._portal = new TemplatePortal(menu.templateRef, this._viewContainerRef);
    }

    return this._portal;
  }
}
