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
import type {LegacyDialogRuntimeConfig} from '../dialog-config';
import {Subject, Subscription} from 'rxjs';
import {take} from 'rxjs/operators';
import {focusLegacyDialogInitially, legacyDialogActiveElement, legacyDialogContainsFocus}
  from './dialog-initial-focus';
import {destroyLegacyDialogContainerState, registerLegacyDialogContainerState}
  from './dialog-container-state';

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
  private readonly _legacyFocusStableSubscriptions = new Subscription();

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
    @Inject(MatDialogConfig) public readonly _config: LegacyDialogRuntimeConfig,
    private _legacyFocusChecker: InteractivityChecker,
    protected _ngZone: NgZone,
    private _legacyOverlayRef: OverlayRef,
    private _legacyFocusMonitor?: FocusMonitor,
  ) {
    super();
    registerLegacyDialogContainerState(
      this, this._legacyFocusNotifications.asObservable(), this._legacyChangeDetector);
    this._document = _document;
    if (_config.ariaLabelledBy) {
      this._ariaLabelledByQueue.push(_config.ariaLabelledBy);
    }
  }

  /** Starts the dialog exit animation. */
  abstract _startExitAnimation(): void;

  override attachComponentPortal<T>(portal: ComponentPortal<T>): ComponentRef<T> {
    this._assertContentAvailable();
    const result = this._portalOutlet.attachComponentPortal(portal);
    this._contentAttached();
    return result;
  }

  override attachTemplatePortal<T>(portal: TemplatePortal<T>): EmbeddedViewRef<T> {
    this._assertContentAvailable();
    const result = this._portalOutlet.attachTemplatePortal(portal);
    this._contentAttached();
    return result;
  }

  /** Historical DOM-portal entry, delegated through the public generic protocol. */
  override attachDomPortal: (portal: DomPortal) => void = portal => {
    this._assertContentAvailable();
    // Match the historical host before and after the child's ownership handoff.
    const preserveContainerHost =
      (typeof ngDevMode === 'undefined' || ngDevMode) && !portal.element.parentNode;
    try {
      this._portalOutlet.attach(portal);
    } catch (error) {
      const portalAttached = portal.isAttached;
      this._portalOutlet.detach();
      if (portalAttached) {
        portal.setAttachedHost(preserveContainerHost ? this : this._portalOutlet);
      }
      throw error;
    }
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

  /** Preserve the original direct-focus and public NgZone stability timing. */
  protected _trapFocus(): void {
    if (this._legacyFocusDestroyed) {
      return;
    }
    const focus = () => {
      if (this._legacyFocusDestroyed) {
        return;
      }
      this._legacyFocusCleanup?.();
      const cleanup = focusLegacyDialogInitially({
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
        isDestroyed: () => this._legacyFocusDestroyed,
        onFocusSettled: () => {
          if (!this._legacyFocusDestroyed) {
            this._legacyFocusNotifications.next();
          }
        },
      });
      if (this._legacyFocusDestroyed) {
        cleanup?.();
      } else {
        this._legacyFocusCleanup = cleanup;
      }
    };
    if ((this._config.autoFocus === true || this._config.autoFocus === 'first-tabbable')
        && !this._ngZone.isStable) {
      this._legacyFocusStableSubscriptions.add(this._ngZone.onStable.pipe(take(1)).subscribe(focus));
    } else {
      focus();
    }
  }

  ngOnDestroy(): void {
    if (this._legacyFocusDestroyed) {
      return;
    }
    this._legacyFocusDestroyed = true;
    destroyLegacyDialogContainerState(this);
    try {
      this._legacyFocusStableSubscriptions.unsubscribe();
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
