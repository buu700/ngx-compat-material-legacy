/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 `_MatDialogBase` (removed from Angular Material 22).
 * Adapted to current CDK Dialog / Overlay peers without private Material 22 APIs.
 */

import {Dialog, DialogConfig, DialogRef} from '@angular/cdk/dialog';
import {ComponentType, Overlay, OverlayContainer, ScrollStrategy} from '@angular/cdk/overlay';
import {
  ComponentRef,
  Injectable,
  InjectionToken,
  Injector,
  OnDestroy,
  TemplateRef,
  Type,
} from '@angular/core';
import {MatDialogConfig} from '@angular/material/dialog';
import {Observable, Subject, defer} from 'rxjs';
import {startWith} from 'rxjs/operators';
import {MatLegacyDialogRef} from '../dialog-ref';
import {_MatDialogContainerBase} from './dialog-container-base';

/** @docs-private */
export function MAT_DIALOG_SCROLL_STRATEGY_FACTORY(overlay: Overlay): () => ScrollStrategy {
  return () => overlay.scrollStrategies.block();
}

/**
 * Base class for dialog services. The base dialog service allows
 * for arbitrary dialog refs and dialog container components.
 */
@Injectable()
export abstract class _MatDialogBase<C extends _MatDialogContainerBase> implements OnDestroy {
  private readonly _openDialogsAtThisLevel: MatLegacyDialogRef<any>[] = [];
  private readonly _afterAllClosedAtThisLevel = new Subject<void>();
  private readonly _afterOpenedAtThisLevel = new Subject<MatLegacyDialogRef<any>>();
  private _scrollStrategy: () => ScrollStrategy;
  protected _idPrefix = 'mat-dialog-';
  private _dialog: Dialog;
  protected dialogConfigClass = MatDialogConfig;

  /** Keeps track of the currently-open dialogs. */
  get openDialogs(): MatLegacyDialogRef<any>[] {
    return this._parentDialog ? this._parentDialog.openDialogs : this._openDialogsAtThisLevel;
  }

  /** Stream that emits when a dialog has been opened. */
  get afterOpened(): Subject<MatLegacyDialogRef<any>> {
    return this._parentDialog ? this._parentDialog.afterOpened : this._afterOpenedAtThisLevel;
  }

  private _getAfterAllClosed(): Subject<void> {
    const parent = this._parentDialog;
    return parent ? parent._getAfterAllClosed() : this._afterAllClosedAtThisLevel;
  }

  /**
   * Stream that emits when all open dialog have finished closing.
   * Will emit on subscribe if there are no open dialogs to begin with.
   */
  readonly afterAllClosed: Observable<void> = defer(() =>
    this.openDialogs.length
      ? this._getAfterAllClosed()
      : this._getAfterAllClosed().pipe(startWith(undefined)),
  ) as Observable<any>;

  constructor(
    private _overlay: Overlay,
    injector: Injector,
    private _defaultOptions: MatDialogConfig | undefined,
    private _parentDialog: _MatDialogBase<C> | undefined,
    /**
     * @deprecated No longer used. To be removed.
     * @breaking-change 15.0.0
     */
    _overlayContainer: OverlayContainer,
    scrollStrategy: any,
    private _dialogRefConstructor: Type<MatLegacyDialogRef<any>>,
    private _dialogContainerType: Type<C>,
    private _dialogDataToken: InjectionToken<any>,
    /**
     * @deprecated No longer used. To be removed.
     * @breaking-change 14.0.0
     */
    _animationMode?: 'NoopAnimations' | 'BrowserAnimations',
  ) {
    this._scrollStrategy = scrollStrategy;
    this._dialog = injector.get(Dialog);
  }

  open<T, D = any, R = any>(
    component: ComponentType<T>,
    config?: MatDialogConfig<D>,
  ): MatLegacyDialogRef<T, R>;

  open<T, D = any, R = any>(
    template: TemplateRef<T>,
    config?: MatDialogConfig<D>,
  ): MatLegacyDialogRef<T, R>;

  open<T, D = any, R = any>(
    template: ComponentType<T> | TemplateRef<T>,
    config?: MatDialogConfig<D>,
  ): MatLegacyDialogRef<T, R>;

  open<T, D = any, R = any>(
    componentOrTemplateRef: ComponentType<T> | TemplateRef<T>,
    config?: MatDialogConfig<D>,
  ): MatLegacyDialogRef<T, R> {
    let dialogRef: MatLegacyDialogRef<T, R>;
    config = {...(this._defaultOptions || new MatDialogConfig()), ...config};
    config.id = config.id || `${this._idPrefix}${uniqueId++}`;
    config.scrollStrategy = config.scrollStrategy || this._scrollStrategy();

    const cdkRef = this._dialog.open<R, D, T>(componentOrTemplateRef, {
      ...config,
      positionStrategy: this._overlay.position().global().centerHorizontally().centerVertically(),
      // Disable closing since we need to sync it up to the animation ourselves.
      disableClose: true,
      closePredicate: undefined,
      // Disable closing on destroy, because this service cleans up its open dialogs as well.
      closeOnDestroy: false,
      // Disable closing on detachments so that we can sync up the animation.
      closeOnOverlayDetachments: false,
      container: {
        type: this._dialogContainerType,
        providers: () => [
          {provide: this.dialogConfigClass, useValue: config},
          {provide: DialogConfig, useValue: config},
        ],
      },
      templateContext: () => ({dialogRef}),
      providers: (ref, cdkConfig, dialogContainer) => {
        dialogRef = new this._dialogRefConstructor(ref, config!, dialogContainer);
        dialogRef.updatePosition(config?.position);
        return [
          {provide: this._dialogContainerType, useValue: dialogContainer},
          {provide: this._dialogDataToken, useValue: cdkConfig.data},
          {provide: this._dialogRefConstructor, useValue: dialogRef},
          // Prevent content from resolving the CDK DialogRef accidentally.
          {provide: DialogRef, useValue: null},
        ];
      },
    });

    (dialogRef! as {componentRef: ComponentRef<T>}).componentRef = cdkRef.componentRef!;
    dialogRef!.componentInstance = cdkRef.componentInstance!;

    this.openDialogs.push(dialogRef!);
    this.afterOpened.next(dialogRef!);

    dialogRef!.afterClosed().subscribe(() => {
      const index = this.openDialogs.indexOf(dialogRef);

      if (index > -1) {
        this.openDialogs.splice(index, 1);

        if (!this.openDialogs.length) {
          this._getAfterAllClosed().next();
        }
      }
    });

    return dialogRef!;
  }

  /** Closes all of the currently-open dialogs. */
  closeAll(): void {
    this._closeDialogs(this.openDialogs);
  }

  /**
   * Finds an open dialog by its id.
   * @param id ID to use when looking up the dialog.
   */
  getDialogById(id: string): MatLegacyDialogRef<any> | undefined {
    return this.openDialogs.find(dialog => dialog.id === id);
  }

  ngOnDestroy() {
    this._closeDialogs(this._openDialogsAtThisLevel);
    this._afterAllClosedAtThisLevel.complete();
    this._afterOpenedAtThisLevel.complete();
  }

  private _closeDialogs(dialogs: MatLegacyDialogRef<any>[]) {
    let i = dialogs.length;

    while (i--) {
      dialogs[i].close();
    }
  }
}

// Counter for unique dialog ids.
let uniqueId = 0;
