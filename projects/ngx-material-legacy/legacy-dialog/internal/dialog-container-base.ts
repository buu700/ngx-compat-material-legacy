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
  afterNextRender, ApplicationRef, assertInInjectionContext, ChangeDetectorRef, Component, ComponentRef, DOCUMENT,
  ElementRef, EmbeddedViewRef, EventEmitter, Inject, inject, Injector, NgZone, OnDestroy,
  Optional, ProviderToken, Renderer2, ViewChild,
} from '@angular/core';
import type {AfterRenderRef} from '@angular/core';
import {MatDialogConfig} from '@angular/material/dialog';
import type {LegacyDialogRuntimeConfig} from '../dialog-config';
import {Subject, Subscription} from 'rxjs';
import {take} from 'rxjs/operators';
import {focusLegacyDialogInitially, legacyDialogActiveElement, legacyDialogContainsFocus, legacyDialogContainsComposedFocus}
  from './dialog-initial-focus';
import {destroyLegacyDialogContainerState, legacyDialogContainerPeer, registerLegacyDialogContainerState}
  from './dialog-container-state';
export {registerLegacyDialogContainerPeer} from './dialog-container-state';

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
  private readonly _legacyRenderInjector = ambientService(Injector);
  private readonly _legacyApplicationRef = ambientService(ApplicationRef);
  private _legacyAfterRender: AfterRenderRef | null = null;
  private _legacyFocusEpoch = 0;
  private _legacyInitialFocusPending = false;
  private _legacyPendingOpenedTime: number | null = null;
  private _legacyPendingFocusListenerCleanup: (() => void) | null = null;
  private _legacyPendingInitialZoneSubscription: Subscription | null = null;
  private _legacyPendingRecapture: Subscription | null = null;

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
    const owner = legacyDialogContainerPeer(this) ?? this._legacyDialogRef;
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
    if (this._legacyFocusDestroyed) {
      return;
    }
    const owner = legacyDialogContainerPeer(this) ?? this._legacyDialogRef;
    // The CDK peer is disabled for deferred closing even when the legacy dialog can close.
    // Keep that peer hook from adding focus work to an enabled legacy backdrop click.
    if (!this._config.disableClose && owner instanceof DialogRef && owner.disableClose
        && owner.overlayRef === this._legacyOverlayRef && owner.containerInstance === this) {
      return;
    }
    if (!legacyDialogContainsFocus(this._elementRef.nativeElement)) {
      if (this._legacyInitialFocusPending) {
        if (this._legacyPendingRecapture && !this._legacyPendingRecapture.closed) {
          return;
        }
        this._legacyAfterRender?.destroy();
        this._legacyAfterRender = null;
        const epoch = this._legacyFocusEpoch;
        this._trapFocus(false, () => {
          if (!this._legacyFocusDestroyed && epoch === this._legacyFocusEpoch) {
            const openedTime = this._legacyPendingOpenedTime;
            this._cancelPendingInitialFocus();
            if (openedTime !== null) {
              this._animationStateChanged.next({state: 'opened', totalTime: openedTime});
            }
          }
        }, true);
      } else {
        this._trapFocus(false, undefined, true);
      }
    }
  }

  /** Select focus directly or after render readiness, using public NgZone stability. */
  protected _trapFocus(initial = false, onRecaptureSettled?: () => void, recapture = false): void {
    if (this._legacyFocusDestroyed) {
      return;
    }
    let selectingFocus = false;
    const focus = (onSettled?: () => void) => {
      if (this._legacyFocusDestroyed) {
        return;
      }
      this._legacyFocusCleanup?.();
      selectingFocus = true;
      let invoking = true;
      let settledWhileInvoking = false;
      const notifySettled = () => {
        if (!this._legacyFocusDestroyed) {
          if (onSettled || onRecaptureSettled) {
            this._legacyPendingFocusListenerCleanup?.();
            this._legacyPendingFocusListenerCleanup = null;
          }
          this._legacyFocusNotifications.next();
          onRecaptureSettled?.();
          onSettled?.();
        }
      };
      let cleanup: (() => void) | null;
      try {
        cleanup = focusLegacyDialogInitially({
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
          beforeFallbackFocus: () => {
            if (onSettled || onRecaptureSettled) {
              this._legacyPendingFocusListenerCleanup?.();
              this._legacyPendingFocusListenerCleanup = null;
            }
          },
          onFocusSettled: () => {
            if (invoking) {
              settledWhileInvoking = true;
            } else {
              notifySettled();
            }
          },
        });
      } finally {
        selectingFocus = false;
        invoking = false;
      }
      if (this._legacyFocusDestroyed) {
        cleanup?.();
      } else {
        this._legacyFocusCleanup = cleanup;
        if (settledWhileInvoking) {
          notifySettled();
        }
      }
    };
    const firstTabbable = this._config.autoFocus === true || this._config.autoFocus === 'first-tabbable';
    // Stable application views can attach before child controls complete their
    // initial render and model update. Manual construction keeps the direct path.
    const deferInitialFocus = initial && firstTabbable && this._ngZone.isStable
        && this._legacyRenderInjector && this._legacyApplicationRef instanceof ApplicationRef
        && this._document && this._isBrowser();
    if (deferInitialFocus) {
      this._cancelPendingInitialFocus();
      this._legacyInitialFocusPending = true;
      const epoch = this._legacyFocusEpoch;
      const activeRoots = (): {roots: (Document | ShadowRoot)[], active: Element | null} => {
        const roots: (Document | ShadowRoot)[] = [this._document];
        let active: Element | null = this._document.activeElement;
        while (active) {
          let next: Document | ShadowRoot | null = active.shadowRoot;
          if (!next && active.tagName === 'IFRAME') {
            try {
              next = (active as HTMLIFrameElement).contentDocument;
            } catch {
              next = null;
            }
          }
          if (!next) break;
          roots.push(next);
          active = next.activeElement;
        }
        return {roots, active};
      };
      const {roots: focusRoots, active: previousActiveElement} = activeRoots();
      const cancelPendingFocus = () => {
        const openedTime = this._legacyPendingOpenedTime;
        this._cancelPendingInitialFocus();
        if (openedTime !== null && !this._legacyFocusDestroyed) {
          this._animationStateChanged.next({state: 'opened', totalTime: openedTime});
        }
      };
      const cancelOnFocus = () => {
        if (!selectingFocus && activeRoots().active !== previousActiveElement) cancelPendingFocus();
      };
      const checkFocusOut = () => {
        if (activeRoots().active !== previousActiveElement) {
          queueMicrotask(() => {
            if (!this._legacyFocusDestroyed && this._legacyInitialFocusPending
                && epoch === this._legacyFocusEpoch) {
              cancelPendingFocus();
            }
          });
        }
      };
      for (const root of focusRoots) {
        root.addEventListener('focusin', cancelOnFocus, true);
        root.addEventListener('focusout', checkFocusOut, true);
      }
      this._legacyPendingFocusListenerCleanup = () => {
        for (const root of focusRoots) {
          root.removeEventListener('focusin', cancelOnFocus, true);
          root.removeEventListener('focusout', checkFocusOut, true);
        }
      };
      const injector = this._legacyRenderInjector!;
      // NgModel schedules its initial model update during the first render. Register
      // the next render callback after its queued promise has marked the view dirty.
      this._legacyAfterRender = afterNextRender({mixedReadWrite: () => queueMicrotask(() => {
        if (this._legacyFocusDestroyed || epoch !== this._legacyFocusEpoch) return;
        this._legacyAfterRender = afterNextRender({mixedReadWrite: () => {
          if (!this._legacyFocusDestroyed && epoch === this._legacyFocusEpoch) {
            const currentFocus = activeRoots();
            if (currentFocus.active !== previousActiveElement ||
                currentFocus.roots.length !== focusRoots.length ||
                currentFocus.roots.some((root, index) => root !== focusRoots[index])) {
              cancelPendingFocus();
              return;
            }
            this._legacyAfterRender = null;
            focus(() => {
              if (!this._legacyFocusDestroyed && epoch === this._legacyFocusEpoch) {
                this._legacyInitialFocusPending = false;
                if (this._legacyPendingOpenedTime !== null) {
                  const totalTime = this._legacyPendingOpenedTime;
                  this._legacyPendingOpenedTime = null;
                  this._animationStateChanged.next({state: 'opened', totalTime});
                }
              }
            });
          }
        }}, {injector, manualCleanup: true});
      })}, {injector, manualCleanup: true});
    } else if (firstTabbable && !this._ngZone.isStable) {
      const epoch = this._legacyFocusEpoch;
      const coordinateInitial = initial && this._legacyRenderInjector
        && this._legacyApplicationRef instanceof ApplicationRef && this._document && this._isBrowser();
      if (coordinateInitial) {
        this._legacyInitialFocusPending = true;
        const activeRoots = (): {roots: (Document | ShadowRoot)[], active: Element | null} => {
          const roots: (Document | ShadowRoot)[] = [this._document];
          let active: Element | null = this._document.activeElement;
          while (active) {
            let next: Document | ShadowRoot | null = active.shadowRoot;
            if (!next && active.tagName === 'IFRAME') {
              try {
                next = (active as HTMLIFrameElement).contentDocument;
              } catch {
                next = null;
              }
            }
            if (!next) break;
            roots.push(next);
            active = next.activeElement;
          }
          return {roots, active};
        };
        const {roots: focusRoots, active: previousFocus} = activeRoots();
        const onUserFocus = () => {
          if (!selectingFocus && activeRoots().active !== previousFocus) {
            const openedTime = this._legacyPendingOpenedTime;
            this._cancelPendingInitialFocus();
            if (openedTime !== null && !this._legacyFocusDestroyed) {
              this._animationStateChanged.next({state: 'opened', totalTime: openedTime});
            }
          }
        };
        const onUserBlur = () => queueMicrotask(() => {
          if (this._legacyInitialFocusPending && epoch === this._legacyFocusEpoch) {
            onUserFocus();
          }
        });
        for (const root of focusRoots) {
          root.addEventListener('focusin', onUserFocus, true);
          root.addEventListener('focusout', onUserBlur, true);
        }
        this._legacyPendingFocusListenerCleanup = () => {
          for (const root of focusRoots) {
            root.removeEventListener('focusin', onUserFocus, true);
            root.removeEventListener('focusout', onUserBlur, true);
          }
        };
      }
      const subscription = this._ngZone.onStable.pipe(take(1)).subscribe(() => {
        if (recapture && legacyDialogContainsComposedFocus(this._elementRef.nativeElement)) {
          this._legacyPendingRecapture = null;
          onRecaptureSettled?.();
          return;
        }
        focus(() => {
          if (coordinateInitial && !this._legacyFocusDestroyed && epoch === this._legacyFocusEpoch) {
            this._legacyInitialFocusPending = false;
            this._legacyPendingInitialZoneSubscription = null;
            if (this._legacyPendingOpenedTime !== null) {
              const totalTime = this._legacyPendingOpenedTime;
              this._legacyPendingOpenedTime = null;
              this._animationStateChanged.next({state: 'opened', totalTime});
            }
          }
        });
      });
      this._legacyFocusStableSubscriptions.add(subscription);
      if (initial) {
        this._legacyPendingInitialZoneSubscription = subscription;
      } else if (onRecaptureSettled) {
        this._legacyPendingRecapture = subscription;
      }
    } else {
      focus();
    }
  }

  protected _cancelPendingInitialFocus(): void {
    if (this._legacyInitialFocusPending) {
      this._legacyFocusCleanup?.();
      this._legacyFocusCleanup = null;
    }
    this._legacyFocusEpoch++;
    this._legacyPendingInitialZoneSubscription?.unsubscribe();
    this._legacyPendingInitialZoneSubscription = null;
    this._legacyPendingRecapture?.unsubscribe();
    this._legacyPendingRecapture = null;
    this._legacyPendingFocusListenerCleanup?.();
    this._legacyPendingFocusListenerCleanup = null;
    this._legacyInitialFocusPending = false;
    this._legacyPendingOpenedTime = null;
    this._legacyAfterRender?.destroy();
    this._legacyAfterRender = null;
  }

  ngOnDestroy(): void {
    if (this._legacyFocusDestroyed) {
      return;
    }
    this._legacyFocusDestroyed = true;
    this._cancelPendingInitialFocus();
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
      this._trapFocus(true);
    }
  }

  protected _openAnimationDone(totalTime: number) {
    if (this._config.delayFocusTrap) {
      this._trapFocus(true);
    }
    if (this._legacyInitialFocusPending) {
      this._legacyPendingOpenedTime = totalTime;
    } else {
      this._animationStateChanged.next({state: 'opened', totalTime});
    }
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
