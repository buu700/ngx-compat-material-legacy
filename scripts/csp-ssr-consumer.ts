import 'zone.js';
import {CSP_NONCE, Component, NgModule, ViewChild, inject} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MatLegacyDialog, MatLegacyDialogModule} from '@ngx-compat/material-legacy/legacy-dialog';
import {MatLegacyMenuModule, MatLegacyMenuTrigger} from '@ngx-compat/material-legacy/legacy-menu';
import {MatLegacyProgressSpinnerModule} from '@ngx-compat/material-legacy/legacy-progress-spinner';
import {MatLegacySelect, MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';
import {MatLegacySnackBar, MatLegacySnackBarModule} from '@ngx-compat/material-legacy/legacy-snack-bar';
import {MatLegacyTooltip, MatLegacyTooltipModule} from '@ngx-compat/material-legacy/legacy-tooltip';

const page = new URLSearchParams(location.search);
const providerNonce = (window as unknown as {__cspNonce?: string}).__cspNonce;

@Component({standalone: false, selector: 'dialog-body', template: '<p id="dialog-body">Open</p>'})
export class DialogBody {}

@Component({
  standalone: false,
  selector: 'csp-root',
  template: `
    <button *ngIf="surface === 'dialog'" id="open-dialog" type="button" (click)="openDialog()">Dialog</button>
    <ng-container *ngIf="surface === 'menu'">
      <button id="open-menu" type="button" [matMenuTriggerFor]="labMenu">Menu</button>
      <mat-menu #labMenu="matMenu"><button mat-menu-item type="button">Item</button></mat-menu>
    </ng-container>
    <mat-select *ngIf="surface === 'select'" id="choice">
      <mat-option value="a">Alpha</mat-option>
    </mat-select>
    <button *ngIf="surface === 'tooltip'" id="tip" type="button" #tip="matTooltip" matTooltip="Hello">Tip</button>
    <button *ngIf="surface === 'snack-bar'" id="open-snack" type="button" (click)="openSnack()">Snack</button>
    <mat-progress-spinner *ngIf="surface === 'progress-spinner'" id="spinner" mode="indeterminate" [diameter]="spinnerDiameter"></mat-progress-spinner>
  `,
})
export class CspRoot {
  /** Structural CSS owns the 100px keyframes. Another diameter emits the dynamic style tag. */
  readonly spinnerDiameter = 48;
  readonly surface = page.get('surface') || '';
  @ViewChild(MatLegacyMenuTrigger) menuTrigger?: MatLegacyMenuTrigger;
  @ViewChild(MatLegacySelect) select?: MatLegacySelect;
  @ViewChild('tip') tip?: MatLegacyTooltip;
  private dialog = inject(MatLegacyDialog);
  private snack = inject(MatLegacySnackBar);

  openDialog(): void { this.dialog.open(DialogBody); }
  openSnack(): void { this.snack.open('Saved', 'OK', {duration: 30000}); }

  ngAfterViewInit(): void {
    const mode = page.get('mode') || 'correct';
    if (mode === 'correct' || mode === 'missing' || mode === 'wrong') {
      try {
        if (this.surface === 'dialog') this.openDialog();
        else if (this.surface === 'menu') this.menuTrigger?.openMenu();
        else if (this.surface === 'select') this.select?.open();
        else if (this.surface === 'tooltip') this.tip?.show(0);
        else if (this.surface === 'snack-bar') this.openSnack();
      } catch { /* recorded by the missing overlay */ }
    }
    setTimeout(() => this.publish(), 500);
  }

  private publish(): void {
    const policyNonce = (window as unknown as {__policyNonce?: string}).__policyNonce || '';
    const violations = ((window as unknown as {__cspViolations?: string[]}).__cspViolations || []);
    const styles = Array.from(document.querySelectorAll('style'));
    const spinner = document.querySelector('style[mat-spinner-animation]') as HTMLStyleElement | null;
    const sheet = spinner && spinner.sheet;
    let spinnerRules = 0;
    try { spinnerRules = sheet ? sheet.cssRules.length : 0; } catch { spinnerRules = 0; }
    const payload = {
      opened: {
        dialog: !!document.getElementById('dialog-body'),
        menu: !!document.querySelector('.mat-menu-panel'),
        select: !!document.querySelector('.mat-select-panel'),
        tooltip: !!document.querySelector('.mat-tooltip'),
        'snack-bar': !!document.querySelector('snack-bar-container'),
        'progress-spinner': !!document.getElementById('spinner'),
      },
      styleSrcViolations: violations.filter(item => item.startsWith('style-src')).length,
      scriptSrcViolations: violations.filter(item => item.startsWith('script-src')).length,
      stylesWithPolicyNonce: styles.filter(style => style.nonce === policyNonce && policyNonce !== '').length,
      rejectedStyles: styles.filter(style => style.nonce === 'wrong-nonce').length,
      spinnerNonce: !spinner ? '' : (spinner.nonce === policyNonce && policyNonce !== '' ? 'policy' : (spinner.nonce === 'wrong-nonce' ? 'wrong' : spinner.nonce)),
      spinnerRules,
      providerNonce: providerNonce || '',
    };
    (window as unknown as {__cspResult?: unknown}).__cspResult = payload;
    document.documentElement.dataset.cspReady = '1';
  }
}

@NgModule({
  imports: [
    BrowserModule,
    MatLegacyDialogModule,
    MatLegacyMenuModule,
    MatLegacySelectModule,
    MatLegacyTooltipModule,
    MatLegacySnackBarModule,
    MatLegacyProgressSpinnerModule,
  ],
  declarations: [CspRoot, DialogBody],
  bootstrap: [CspRoot],
  providers: [
    ...(providerNonce ? [{provide: CSP_NONCE, useValue: providerNonce}] : []),
  ],
})
export class CspModule {}

platformBrowserDynamic().bootstrapModule(CspModule).catch(err => {
  const node = document.createElement('pre');
  node.id = 'bootstrap-error';
  node.textContent = String(err);
  document.body.appendChild(node);
  document.documentElement.dataset.cspReady = 'error';
});
