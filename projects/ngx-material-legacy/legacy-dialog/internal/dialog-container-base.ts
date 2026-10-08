/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 dialog base, composed from public portal and focus APIs.
 */

import {FocusMonitor, FocusOrigin, FocusTrap, FocusTrapFactory, InteractivityChecker}
  from '@angular/cdk/a11y';
import {DialogRef} from '@angular/cdk/dialog';
import {OverlayRef} from '@angular/cdk/overlay';
import {Platform} from '@angular/cdk/platform';
import {BasePortalOutlet, CdkPortalOutlet, ComponentPortal, DomPortal, TemplatePortal}
  from '@angular/cdk/portal';
import {
  assertInInjectionContext, ChangeDetectorRef, Component, ComponentRef, DOCUMENT,
  ElementRef, EmbeddedViewRef, EventEmitter, Inject, inject, NgZone, OnDestroy,
  Optional, ProviderToken, Renderer2, ViewChild,
} from '@angular/core';
import {MatDialogConfig} from '@angular/material/dialog';
import {Observable, Subject, Subscription} from 'rxjs';
import {focusLegacyDialogInitially, legacyDialogActiveElement, legacyDialogContainsFocus}
  from './dialog-initial-focus';

/** Optional Angular services must not prevent the original manual constructor. */
function ambientService<T>(token: ProviderToken<T>): T | null {
  try {
    assertInInjectionContext(ambientService);
  } catch {
    return null;
  }
  return inject(token, {optional: true});
}

/** Event that captures the state of dialog container animations. */
export interface LegacyDialogAnimationEvent {
  state: 'opened' | 'opening' | 'closing' | 'closed';
  totalTime: number;
}

/**
 * Base class for the legacy dialog container. Portal rendering, keyboard trapping
 * and focus monitoring remain owned by the current public peer primitives.
 */
@Component({
  template: '',
  standalone: false,
  host: {'class': 'cdk-dialog-container'},
})
export abstract class _MatDialogContainerBase extends BasePortalOutlet implements OnDestroy {
  /** Emits when an animation state changes. */
  _animationStateChanged = new EventEmitter<LegacyDialogAnimationEvent>();

  @ViewChild(CdkPortalOutlet, {static: true}) _portalOutlet!: CdkPortalOutlet;
  _closeInteractionType: FocusOrigin | null = null;
  _ariaLabelledByQueue: string[] = [];
  protected _document: Document;

  private readonly _legacyFocusNotifications = new Subject<void>();
  /** Public CDK custom-container protocol; consumers cannot emit notifications. */
  readonly _focusTrapped: Observable<void> = this._legacyFocusNotifications.asObservable();

  private readonly _legacyChangeDetector = ambientService(ChangeDetectorRef);
  private readonly _legacyDialogRef = ambientService(DialogRef);
  private readonly _legacyFocusPlatform = ambientService(Platform);
  private readonly _legacyFocusRenderer = ambientService(Renderer2);
  private _legacyFocusTrap: FocusTrap | null = null;
  private _legacyPreviousFocus: HTMLElement | null = null;
  private _legacyBackdropSubscription: Subscription | null = null;
  private _legacyFocusDestroyed = false;
  private _legacyFocusCleanup: (() => void) | null = null;

  constructor(
    protected _elementRef: ElementRef,
    protected _focusTrapFactory: FocusTrapFactory,
    @Optional() @Inject(DOCUMENT) _document: any,
    public readonly _config: MatDialogConfig,
    private _legacyFocusChecker: InteractivityChecker,
    protected _ngZone: NgZone,
    private _legacyOverlayRef: OverlayRef,
    private _legacyFocusMonitor?: FocusMonitor,
  ) {
    super();
    this._document = _document;
    if (_config.ariaLabelledBy) {
      this._ariaLabelledByQueue.push(_config.ariaLabelledBy);
    }
  }

  /** Starts the dialog exit animation. */
  abstract _startExitAnimation(): void;

  override attachComponentPortal<T>(portal: ComponentPortal<T>): ComponentRef<T> {
    this._assertContentAvailable();
    const result = this._portalOutlet.attach(portal);
    this._contentAttached();
    return result;
  }

  override attachTemplatePortal<T>(portal: TemplatePortal<T>): EmbeddedViewRef<T> {
    this._assertContentAvailable();
    const result = this._portalOutlet.attach(portal);
    this._contentAttached();
    return result;
  }

  /** Historical DOM-portal entry, delegated through the public generic protocol. */
  override attachDomPortal: (portal: DomPortal) => void = portal => {
    this._assertContentAvailable();
    this._portalOutlet.attach(portal);
    this._contentAttached();
  };

  override hasAttached(): boolean {
    return !!this._portalOutlet?.hasAttached() || super.hasAttached();
  }

  override detach(): void {
    this._portalOutlet?.detach();
    super.detach();
  }

  override dispose(): void {
    this._portalOutlet?.dispose();
    super.dispose();
  }

  protected _contentAttached(): void {
    if (this._legacyFocusDestroyed) {
      return;
    }
    if (!this._legacyFocusTrap && this._isBrowser()) {
      this._legacyFocusTrap = this._focusTrapFactory.create(this._elementRef.nativeElement);
      if (this._document) {
        this._legacyPreviousFocus = legacyDialogActiveElement();
      }
    }
    // A public CDK DialogRef already recaptures on its own backdrop. A manually
    // constructed container still listens to exactly the supplied OverlayRef.
    const owner = this._legacyDialogRef;
    if (!this._legacyBackdropSubscription && !(owner instanceof DialogRef
        && owner.overlayRef === this._legacyOverlayRef && owner.containerInstance === this)) {
      this._legacyBackdropSubscription = this._legacyOverlayRef.backdropClick().subscribe(() => {
        if (this._config.disableClose) {
          this._recaptureFocus();
        }
      });
    }
    this._captureInitialFocus();
  }

  _recaptureFocus(): void {
    if (!this._legacyFocusDestroyed && !legacyDialogContainsFocus(this._elementRef.nativeElement)) {
      this._trapFocus();
    }
  }

  _addAriaLabelledBy(id: string): void {
    this._ariaLabelledByQueue.push(id);
    this._legacyChangeDetector?.markForCheck();
  }

  _removeAriaLabelledBy(id: string): void {
    const index = this._ariaLabelledByQueue.indexOf(id);
    if (index > -1) {
      this._ariaLabelledByQueue.splice(index, 1);
      this._legacyChangeDetector?.markForCheck();
    }
  }

  /** Keep the legacy microtask focus timing independently of render callbacks. */
  protected _trapFocus(options?: FocusOptions): void {
    if (this._legacyFocusDestroyed) {
      return;
    }
    Promise.resolve().then(() => {
      if (this._legacyFocusDestroyed) {
        return;
      }
      this._legacyFocusCleanup?.();
      this._legacyFocusCleanup = focusLegacyDialogInitially({
        element: this._elementRef.nativeElement,
        config: this._config,
        factory: this._focusTrapFactory,
        checker: this._legacyFocusChecker,
        renderer: this._legacyFocusRenderer || {
          listen: (target: HTMLElement, event: string, callback: EventListener) => {
            target.addEventListener(event, callback);
            return () => target.removeEventListener(event, callback);
          },
        },
        ngZone: this._ngZone,
        isBrowser: this._isBrowser(),
      }, options);
      this._legacyFocusNotifications.next();
    });
  }

  ngOnDestroy(): void {
    if (this._legacyFocusDestroyed) {
      return;
    }
    this._legacyFocusDestroyed = true;
    try {
      this._restoreLegacyFocus();
    } finally {
      try {
        this._legacyBackdropSubscription?.unsubscribe();
      } finally {
        this._legacyBackdropSubscription = null;
        try {
          this._legacyFocusTrap?.destroy();
        } finally {
          this._legacyFocusTrap = null;
          try {
            this._legacyFocusCleanup?.();
          } finally {
            this._legacyFocusCleanup = null;
            this._legacyFocusNotifications.complete();
          }
        }
      }
    }
  }

  protected _captureInitialFocus(): void {
    if (!this._config.delayFocusTrap) {
      this._trapFocus();
    }
  }

  protected _openAnimationDone(totalTime: number) {
    if (this._config.delayFocusTrap) {
      this._trapFocus();
    }
    this._animationStateChanged.next({state: 'opened', totalTime});
  }

  private _assertContentAvailable(): void {
    if (this._legacyFocusDestroyed) {
      throw Error('Attempting to attach dialog content after the container is destroyed');
    }
    if (this._portalOutlet.hasAttached()) {
      throw Error('Attempting to attach dialog content after content is already attached');
    }
  }

  private _isBrowser(): boolean {
    return this._legacyFocusPlatform?.isBrowser ??
      (typeof document !== 'undefined' && !!document
        && typeof this._elementRef.nativeElement.focus === 'function');
  }

  private _restoreLegacyFocus(): void {
    if (!this._isBrowser()) {
      return;
    }
    const config = this._config.restoreFocus;
    const target = typeof config === 'string' ? this._document.querySelector<HTMLElement>(config)
      : typeof config === 'boolean' ? config ? this._legacyPreviousFocus : null : config;
    if (config && target && typeof target.focus === 'function') {
      const active = legacyDialogActiveElement();
      const element = this._elementRef.nativeElement;
      if (!active || active === this._document?.body || active === element || element.contains(active)) {
        if (this._legacyFocusMonitor) {
          this._legacyFocusMonitor.focusVia(target, this._closeInteractionType);
          this._closeInteractionType = null;
        } else {
          target.focus();
        }
      }
    }
  }
}
