/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 `_MatTestDialogOpenerBase` (removed from Angular Material 22).
 */

import {ComponentType} from '@angular/cdk/overlay';
import {Directive, OnDestroy} from '@angular/core';
import {Subscription} from 'rxjs';
import {
  MatLegacyDialog,
  MatLegacyDialogConfig,
  MatLegacyDialogContainer,
  MatLegacyDialogRef,
} from '@ngx-compat/material-legacy/legacy-dialog';

/** Base class for a component that immediately opens a dialog when created. */
@Directive()
export class _MatTestDialogOpenerBase<
  C extends MatLegacyDialogContainer = MatLegacyDialogContainer,
  T = unknown,
  R = unknown,
> implements OnDestroy
{
  protected static component: ComponentType<unknown> | undefined;
  protected static config: MatLegacyDialogConfig | undefined;

  dialogRef: MatLegacyDialogRef<T, R>;
  closedResult: R | undefined;

  private readonly _afterClosedSubscription: Subscription;

  constructor(public dialog: MatLegacyDialog) {
    if (!_MatTestDialogOpenerBase.component) {
      throw new Error(`MatTestDialogOpener does not have a component provided.`);
    }

    this.dialogRef = this.dialog.open(
      _MatTestDialogOpenerBase.component as ComponentType<T>,
      _MatTestDialogOpenerBase.config || {},
    ) as MatLegacyDialogRef<T, R>;
    this._afterClosedSubscription = this.dialogRef.afterClosed().subscribe(result => {
      this.closedResult = result as R | undefined;
    });
  }

  ngOnDestroy() {
    this._afterClosedSubscription.unsubscribe();
    _MatTestDialogOpenerBase.component = undefined;
    _MatTestDialogOpenerBase.config = undefined;
  }
}
