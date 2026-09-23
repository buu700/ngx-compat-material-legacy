/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
import {Observable, Subject, merge} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {_MatDialogContainerBase} from './internal/dialog-container-base';

/**
 * Reference to a dialog opened via the MatDialog service.
 * @deprecated Use `MatDialogRef` from `@angular/material/dialog` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
export class MatLegacyDialogRef<T, R = any> {
  /** The instance of component opened into the dialog. */
  componentInstance: T;

  /**
   * `ComponentRef` of the component opened into the dialog. Will be
   * null when the dialog is opened using a `TemplateRef`.
   */
  readonly componentRef: ComponentRef<T> | null;

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
  private _closeFallbackTimeout: ReturnType<typeof setTimeout>;

  /** Current state of the dialog. */
  private _state = MatDialogState.OPEN;

  /** Interaction that caused the dialog to close. */
  private _closeInteractionType: FocusOrigin | undefined;

  constructor(
    private _ref: DialogRef<R, T>,
    config: MatDialogConfig,
    public _containerInstance: _MatDialogContainerBase,
  ) {
    this.disableClose = config.disableClose;
    this.id = _ref.id;

    _containerInstance._animationStateChanged
      .pipe(
        filter(event => event.state === 'opened'),
        take(1),
      )
      .subscribe(() => {
        this._afterOpened.next();
        this._afterOpened.complete();
      });

    _containerInstance._animationStateChanged
      .pipe(
        filter(event => event.state === 'closed'),
        take(1),
      )
      .subscribe(() => {
        clearTimeout(this._closeFallbackTimeout);
        this._finishDialogClose();
      });

    _ref.overlayRef.detachments().subscribe(() => {
      this._beforeClosed.next(this._result);
      this._beforeClosed.complete();
      this._finishDialogClose();
    });

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
    });
  }

  /** Close the dialog. */
  close(dialogResult?: R): void {
    this._result = dialogResult;

    this._containerInstance._animationStateChanged
      .pipe(
        filter(event => event.state === 'closing'),
        take(1),
      )
      .subscribe(event => {
        this._beforeClosed.next(dialogResult);
        this._beforeClosed.complete();
        this._ref.overlayRef.detachBackdrop();

        this._closeFallbackTimeout = setTimeout(
          () => this._finishDialogClose(),
          event.totalTime + 100,
        );
      });

    this._state = MatDialogState.CLOSING;
    this._containerInstance._startExitAnimation();
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

  private _finishDialogClose() {
    this._state = MatDialogState.CLOSED;
    this._ref.close(this._result, {focusOrigin: this._closeInteractionType});
    this.componentInstance = null!;
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
  (ref as unknown as {_closeInteractionType: FocusOrigin})._closeInteractionType = interactionType;
  return ref.close(result);
}
