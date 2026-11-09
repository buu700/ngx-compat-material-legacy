/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Packed-consumer fixture for body-overlay dialog padding, not a component implementation.
 */
import 'zone.js';
import {AfterViewInit, Component, inject, provideZoneChangeDetection} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatLegacyDialog, MatLegacyDialogModule} from '@ngx-compat/material-legacy/legacy-dialog';

@Component({standalone: true, imports: [MatDialogModule, MatFormFieldModule, MatInputModule], template: `
  <h2 mat-dialog-title>Current title</h2>
  <mat-dialog-content><mat-form-field appearance="fill"><mat-label>Input label</mat-label><input matInput value="Current input"></mat-form-field></mat-dialog-content>
  <mat-dialog-actions><button type="button">Current action</button></mat-dialog-actions>`})
export class CurrentDialogFixture {}

@Component({standalone: true, imports: [MatLegacyDialogModule], template: `
  <h2 mat-dialog-title>Legacy title</h2>
  <mat-dialog-content><input value="Legacy input"></mat-dialog-content>
  <mat-dialog-actions><button type="button">Legacy action</button></mat-dialog-actions>`})
export class OwnedLegacyDialogFixture {}

@Component({standalone: true, selector: 'dialog-padding-lab', imports: [MatDialogModule, MatLegacyDialogModule], template: `<main id="nested-theme"><span id="fixture-root">Dialog padding fixture</span></main>`})
export class DialogPaddingLab implements AfterViewInit {
  private current = inject(MatDialog);
  private legacy = inject(MatLegacyDialog);
  ngAfterViewInit(): void {
    const config = {hasBackdrop: false, disableClose: true, autoFocus: false, restoreFocus: false,
      enterAnimationDuration: 0, exitAnimationDuration: 0, width: '480px'};
    const refs = [
      this.current.open(CurrentDialogFixture, {...config, id: 'dp-current-baseline', panelClass: 'dp-current-baseline'}),
      this.current.open(CurrentDialogFixture, {...config, id: 'dp-current-optin', panelClass: 'dp-current-optin'}),
      this.legacy.open(OwnedLegacyDialogFixture, {...config, id: 'dp-legacy-baseline', panelClass: 'dp-legacy-baseline'}),
      this.legacy.open(OwnedLegacyDialogFixture, {...config, id: 'dp-legacy-optin', panelClass: 'dp-legacy-optin'}),
    ];
    (window as unknown as {dialogPaddingFixture: unknown}).dialogPaddingFixture = {refs};
  }
}
bootstrapApplication(DialogPaddingLab, {providers: [provideZoneChangeDetection()]}).catch(error => {
  (window as unknown as {dialogPaddingError: string}).dialogPaddingError = String(error);
});
