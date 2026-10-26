/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 dialog ref adapted for Angular 22 peers. Uses shared
 * `MatDialogState` / `DialogPosition` from `@angular/material/dialog`.
 */

import {FocusOrigin} from '@angular/cdk/a11y';
import {DialogRef} from '@angular/cdk/dialog';
import {ESCAPE, hasModifierKey} from '@angular/cdk/keycodes';
import {GlobalPositionStrategy} from '@angular/cdk/overlay';
import {ComponentRef} from '@angular/core';
import {
  DialogPosition,
  MatDialogConfig,
  MatDialogState,
} from '@angular/material/dialog';
import {Observable, Subject, Subscription, merge} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {_MatDialogContainerBase, registerLegacyDialogContainerPeer} from './internal/dialog-container-base';

/**
 * Reference to a dialog opened via the MatDialog service.
 */
export class MatLegacyDialogRef<T, R = any> {
  /** The instance of component opened into the dialog. */
  componentInstance: T;

  /**
   * `ComponentRef` of the component opened into the dialog. Will be
   * undefined when the dialog is opened using a `TemplateRef`.
   */
  readonly componentRef: ComponentRef<T> | null | undefined;

  /** Whether the user is allowed to close the dialog. */
  disableClose: boolean | undefined;

  /** Unique ID for the dialog. */
  id: string;

  /** Subject for notifying the user that the dialog has finished opening. */
  private readonly _afterOpened = new Subject<void>();

  /** Subject for notifying the user that the dialog has started closing. */
  private readonly _beforeClosed = new Subject<R | undefined>();

  /** Result to be passed to afterClosed. */
  private _result: R | undefined;

  /** Handle to the timeout that's running as a fallback in case the exit animation doesn't fire. */
  private _closeFallbackTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Subscriptions owned by this ref, including the pending animation phases. */
  private readonly _subscriptions = new Subscription();

  /** Prevent synchronous close observers from notifying beforeClosed twice. */
  private _beforeClosedEmitted = false;

  /** Current state of the dialog. */
  private _state = MatDialogState.OPEN;

  /** Interaction that caused the dialog to close. */
  private _closeInteractionType: FocusOrigin | undefined;

  constructor(
    private _ref: DialogRef<R, T>,
    config: MatDialogConfig,
    public _containerInstance: _MatDialogContainerBase,
  ) {
    registerLegacyDialogContainerPeer(_containerInstance, _ref);
    this.disableClose = config.disableClose;
    this.id = _ref.id;

    this._subscriptions.add(
      _containerInstance._animationStateChanged
        .pipe(
          filter(event => event.state === 'opened'),
          take(1),
        )
        .subscribe(() => {
          if (this._state === MatDialogState.OPEN) {
            this._afterOpened.next();
            this._afterOpened.complete();
          }
        }),
    );

    this._subscriptions.add(
      _containerInstance._animationStateChanged
        .pipe(
          filter(event => event.state === 'closed'),
          take(1),
        )
        .subscribe(() => this._finishDialogClose()),
    );

    this._subscriptions.add(
      _ref.overlayRef.detachments().subscribe(() => {
        if (this._state === MatDialogState.CLOSED) {
          return;
        }
        this._state = MatDialogState.CLOSING;
        this._afterOpened.complete();
        this._notifyBeforeClosed();
        this._finishDialogClose();
      }),
    );

    this._subscriptions.add(
      merge(
        this.backdropClick(),
        this.keydownEvents().pipe(
          filter(event => event.keyCode === ESCAPE && !this.disableClose && !hasModifierKey(event)),
        ),
      ).subscribe(event => {
        if (!this.disableClose) {
          event.preventDefault();
          _closeDialogVia(this, event.type === 'keydown' ? 'keyboard' : 'mouse');
        }
      }),
    );
  }

  /** Close the dialog. */
  close(dialogResult?: R): void {
    if (this._state !== MatDialogState.OPEN) {
      return;
    }
    this._result = dialogResult;
    this._state = MatDialogState.CLOSING;
    this._afterOpened.complete();

    // A completion observer can detach the overlay synchronously.
    if (this._state !== MatDialogState.CLOSING) {
      return;
    }

    this._subscriptions.add(
      this._containerInstance._animationStateChanged
        .pipe(
          filter(event => event.state === 'closing'),
          take(1),
        )
        .subscribe(event => {
          this._notifyBeforeClosed();
          if (this._state !== MatDialogState.CLOSING) {
            return;
          }
          this._ref.overlayRef.detachBackdrop();

          this._scheduleCloseFallback(event.totalTime);
        }),
    );

    try {
      this._containerInstance._startExitAnimation();
    } finally {
      // A destroyed view or a throwing detector can prevent the closing event.
      // Preserve its error while still releasing this ref after the usual margin.
      if (this._state === MatDialogState.CLOSING && this._closeFallbackTimeout === null) {
        this._notifyBeforeClosed();
        if (this._state === MatDialogState.CLOSING) {
          this._ref.overlayRef.detachBackdrop();
        }
        this._scheduleCloseFallback(0);
      }
    }
  }

  /** Gets an observable that is notified when the dialog is finished opening. */
  afterOpened(): Observable<void> {
    return this._afterOpened;
  }

  /** Gets an observable that is notified when the dialog is finished closing. */
  afterClosed(): Observable<R | undefined> {
    return this._ref.closed;
  }

  /** Gets an observable that is notified when the dialog has started closing. */
  beforeClosed(): Observable<R | undefined> {
    return this._beforeClosed;
  }

  /** Gets an observable that emits when the overlay's backdrop has been clicked. */
  backdropClick(): Observable<MouseEvent> {
    return this._ref.backdropClick;
  }

  /** Gets an observable that emits when keydown events are targeted on the overlay. */
  keydownEvents(): Observable<KeyboardEvent> {
    return this._ref.keydownEvents;
  }

  /** Updates the dialog's position. */
  updatePosition(position?: DialogPosition): this {
    let strategy = this._ref.config.positionStrategy as GlobalPositionStrategy;

    if (position && (position.left || position.right)) {
      position.left ? strategy.left(position.left) : strategy.right(position.right);
    } else {
      strategy.centerHorizontally();
    }

    if (position && (position.top || position.bottom)) {
      position.top ? strategy.top(position.top) : strategy.bottom(position.bottom);
    } else {
      strategy.centerVertically();
    }

    this._ref.updatePosition();
    return this;
  }

  /** Updates the dialog's width and height. */
  updateSize(width: string = '', height: string = ''): this {
    this._ref.updateSize(width, height);
    return this;
  }

  /** Add a CSS class or an array of classes to the overlay pane. */
  addPanelClass(classes: string | string[]): this {
    this._ref.addPanelClass(classes);
    return this;
  }

  /** Remove a CSS class or an array of classes from the overlay pane. */
  removePanelClass(classes: string | string[]): this {
    this._ref.removePanelClass(classes);
    return this;
  }

  /** Gets the current state of the dialog's lifecycle. */
  getState(): MatDialogState {
    return this._state;
  }

  private _notifyBeforeClosed(): void {
    if (!this._beforeClosedEmitted) {
      this._beforeClosedEmitted = true;
      this._beforeClosed.next(this._result);
      this._beforeClosed.complete();
    }
  }

  private _scheduleCloseFallback(totalTime: number): void {
    if (this._state !== MatDialogState.CLOSING) {
      return;
    }
    if (this._closeFallbackTimeout !== null) {
      clearTimeout(this._closeFallbackTimeout);
    }
    this._closeFallbackTimeout = setTimeout(() => this._finishDialogClose(), totalTime + 100);
  }

  private _finishDialogClose(): void {
    if (this._state === MatDialogState.CLOSED) {
      return;
    }
    if (!this._beforeClosedEmitted) {
      this._state = MatDialogState.CLOSING;
      this._notifyBeforeClosed();
      if (this._state !== MatDialogState.CLOSING) {
        return;
      }
    }
    this._state = MatDialogState.CLOSED;
    if (this._closeFallbackTimeout !== null) {
      clearTimeout(this._closeFallbackTimeout);
      this._closeFallbackTimeout = null;
    }
    this._subscriptions.unsubscribe();
    this._afterOpened.complete();
    try {
      this._ref.close(this._result, {focusOrigin: this._closeInteractionType});
    } finally {
      // Keep the instance available while the public CDK ref dispatches afterClosed.
      this.componentInstance = null!;
    }
  }
}

/**
 * Closes the dialog with the specified interaction type.
 * @docs-private
 */
export function _closeDialogVia<R>(
  ref: MatLegacyDialogRef<R>,
  interactionType: FocusOrigin,
  result?: R,
) {
  if (ref.getState() !== MatDialogState.OPEN) {
    return;
  }
  (ref as unknown as {_closeInteractionType: FocusOrigin})._closeInteractionType = interactionType;
  return ref.close(result);
}
