/*ZONE_IMPORT*/import {Component, NgModule, ViewChild/*ZONE_NAMED*/} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {MatLegacyDialog, MatLegacyDialogModule} from '@ngx-compat/material-legacy/legacy-dialog';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
import {MatLegacyMenu, MatLegacyMenuModule, MatLegacyMenuTrigger} from '@ngx-compat/material-legacy/legacy-menu';
import {MatLegacySelect, MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';
import {MatLegacySnackBar, MatLegacySnackBarModule} from '@ngx-compat/material-legacy/legacy-snack-bar';
import {MatLegacyTabGroup, MatLegacyTabsModule} from '@ngx-compat/material-legacy/legacy-tabs';
import {MatLegacyTooltip, MatLegacyTooltipModule} from '@ngx-compat/material-legacy/legacy-tooltip';

const motionMode = new URLSearchParams(location.search).get('mode') || 'enabled';
const motionProviders = motionMode === 'provider-disabled'
  ? [{provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}}]
  : [];

@Component({standalone: false, selector: 'dialog-body', template: '<p id="dialog-body">Open</p>'})
export class DialogBody {}

@Component({
  standalone: false,
  selector: 'motion-root',
  template: `
    <div class="lab-light mat-app-background">
      <button id="probe-dialog" type="button" (click)="probeDialog()">Dialog</button>
      <button id="probe-dialog-zero" type="button" (click)="probeDialogZero()">Dialog zero</button>
      <button id="probe-snack" type="button" (click)="probeSnack()">Snack</button>
      <button id="probe-menu" type="button" (click)="probeMenu()">Menu</button>
      <button id="probe-select" type="button" (click)="probeSelect()">Select</button>
      <button id="probe-tooltip" type="button" (click)="probeTooltip()">Tooltip</button>
      <button id="probe-tabs" type="button" (click)="probeTabs()">Tabs</button>
      <button id="probe-tabs-zero" type="button" (click)="probeTabsZero()">Tabs zero</button>
      <button id="probe-field" type="button" (click)="probeField()">Field</button>
      <button id="interrupt-dialog-reversal" type="button" (click)="interruptDialogReversal()">Reversal</button>
      <button id="interrupt-dialog-reopen" type="button" (click)="interruptDialogReopen()">Reopen</button>
      <button id="interrupt-dialog-destroy" type="button" (click)="interruptDialogDestroy()">Destroy</button>
      <button id="interrupt-snack" type="button" (click)="interruptSnack()">Snack interrupt</button>
      <button id="interrupt-menu-duplicate" type="button" (click)="interruptMenuDuplicate()">Menu duplicate</button>
      <button id="interrupt-menu-descendant" type="button" (click)="interruptMenuDescendant()">Menu descendant</button>
      <button id="interrupt-select-descendant" type="button" (click)="interruptSelectDescendant()">Select descendant</button>
      <button id="interrupt-select-fallback" type="button" (click)="interruptSelectFallback()">Select fallback</button>
      <button id="interrupt-tooltip-destroy" type="button" (click)="interruptTooltip()">Tooltip destroy</button>
      <button id="interrupt-tabs" type="button" (click)="interruptTabs()">Tabs interrupt</button>
      <button id="remove-gone" type="button" (click)="showGone = false">Remove tip</button>
      <ng-container *ngIf="showSurfaces">
      <button id="open-menu" type="button" [matMenuTriggerFor]="labMenu">Menu</button>
      <mat-menu #labMenu="matMenu"><button mat-menu-item type="button">Item</button></mat-menu>
      <mat-form-field>
        <mat-label>Name</mat-label>
        <input matInput [formControl]="name">
        <mat-error>Required</mat-error>
      </mat-form-field>
      <mat-form-field>
        <mat-select>
          <mat-option value="a">Alpha</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-tab-group [animationDuration]="tabDuration">
        <mat-tab label="One">One</mat-tab>
        <mat-tab label="Two">Two</mat-tab>
        <mat-tab label="Three">Three</mat-tab>
      </mat-tab-group>
      <button id="tip" type="button" #tip="matTooltip" matTooltip="Hello">Tip</button>
      <button *ngIf="showGone" id="tip-gone" type="button" #tipGone="matTooltip" matTooltip="Gone">Gone</button>
      </ng-container>
    </div>
  `,
})
export class MotionRoot {
  name = new FormControl('');
  tabDuration = '500ms';
  showGone = true;
  showSurfaces = false;
  @ViewChild(MatLegacyMenuTrigger) menuTrigger!: MatLegacyMenuTrigger;
  @ViewChild(MatLegacyMenu) menu!: MatLegacyMenu;
  @ViewChild(MatLegacySelect) select!: MatLegacySelect;
  @ViewChild(MatLegacyTabGroup) tabs!: MatLegacyTabGroup;
  @ViewChild('tip') tip!: MatLegacyTooltip;
  @ViewChild('tipGone') tipGone?: MatLegacyTooltip;

  constructor(
    private dialog: MatLegacyDialog,
    private snack: MatLegacySnackBar,
  ) {}

  ngAfterViewInit(): void {
    document.documentElement.dataset.labReady = '1';
  }

  probeDialog(): void { void this.guard('probe-dialog', () => this.measureDialog(false)); }
  probeDialogZero(): void { void this.guard('probe-dialog-zero', () => this.measureDialog(true)); }
  probeSnack(): void { void this.guard('probe-snack', () => this.measureSnack()); }
  probeMenu(): void { void this.guard('probe-menu', () => this.measureMenu()); }
  probeSelect(): void { void this.guard('probe-select', () => this.measureSelect()); }
  probeTooltip(): void { void this.guard('probe-tooltip', () => this.measureTooltip()); }
  probeTabs(): void { void this.guard('probe-tabs', () => this.measureTabs(false)); }
  probeTabsZero(): void { void this.guard('probe-tabs-zero', () => this.measureTabs(true)); }
  probeField(): void { void this.guard('probe-field', () => this.measureField()); }
  interruptDialogReversal(): void { void this.guard('interrupt-dialog-reversal', () => this.reversal()); }
  interruptDialogReopen(): void { void this.guard('interrupt-dialog-reopen', () => this.reopen()); }
  interruptDialogDestroy(): void { void this.guard('interrupt-dialog-destroy', () => this.destroyDialog()); }
  interruptSnack(): void { void this.guard('interrupt-snack', () => this.snackInterrupt()); }
  interruptMenuDuplicate(): void { void this.guard('interrupt-menu-duplicate', () => this.menuDuplicate()); }
  interruptMenuDescendant(): void { void this.guard('interrupt-menu-descendant', () => this.menuDescendant()); }
  interruptSelectDescendant(): void { void this.guard('interrupt-select-descendant', () => this.selectDescendant()); }
  interruptSelectFallback(): void { void this.guard('interrupt-select-fallback', () => this.selectFallback()); }
  interruptTooltip(): void { void this.guard('interrupt-tooltip-destroy', () => this.tooltipDestroy()); }
  interruptTabs(): void { void this.guard('interrupt-tabs', () => this.tabsRapid()); }

  private mode(): string {
    return new URLSearchParams(location.search).get('mode') || 'enabled';
  }

  private async guard(button: string, work: () => Promise<unknown>): Promise<void> {
    try {
      const value = await work();
      this.finish(button, value);
    } catch (err) {
      this.finish(button, {error: err instanceof Error ? err.message : String(err)});
    }
  }

  private finish(button: string, value: unknown): void {
    (window as unknown as {__step: unknown}).__step = value;
    document.documentElement.dataset.step = button;
    document.documentElement.dataset.stepState = 'done';
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async ensureSurfaces(): Promise<void> {
    if (!this.showSurfaces) {
      this.showSurfaces = true;
      await this.wait(60);
    }
    if (!this.menuTrigger || !this.select || !this.tabs || !this.tip) {
      throw new Error('motion surfaces were not constructed');
    }
  }

  private async waitFor(predicate: () => boolean, limit = 1200): Promise<void> {
    const started = Date.now();
    while (!predicate()) {
      if (Date.now() - started > limit) throw new Error('timed out waiting for motion');
      await this.wait(20);
    }
  }

  private duration(el: HTMLElement, property: 'transition-duration' | 'animation-duration'): number {
    const raw = getComputedStyle(el).getPropertyValue(property);
    let max = 0;
    for (const part of raw.split(',')) {
      const text = part.trim();
      if (text.endsWith('ms')) max = Math.max(max, parseFloat(text));
      else if (text.endsWith('s')) max = Math.max(max, parseFloat(text) * 1000);
    }
    return max < 1 ? 0 : max;
  }

  private visible(el: HTMLElement | null): boolean {
    if (!el) return false;
    const opacity = parseFloat(getComputedStyle(el).opacity);
    return Number.isFinite(opacity) && opacity > 0.85;
  }

  private async measureDialog(zero: boolean): Promise<unknown> {
    this.dialog.closeAll();
    let notifications = 0;
    const ref = this.dialog.open(DialogBody, zero ? {enterAnimationDuration: '0ms', exitAnimationDuration: '0ms'} : {});
    ref.afterOpened().subscribe(() => { notifications += 1; });
    await this.waitFor(() => !!document.querySelector('mat-dialog-container') && notifications >= 1);
    const el = document.querySelector('mat-dialog-container') as HTMLElement;
    const mode = zero ? 'zero' : this.mode();
    const observation = {
      selector: el.tagName === 'MAT-DIALOG-CONTAINER' ? 'mat-dialog-container' : '',
      selectorMatches: el.tagName === 'MAT-DIALOG-CONTAINER' && el.classList.contains('mat-dialog-container'),
      durationMs: this.duration(el, 'transition-duration'),
      finalState: this.visible(el) ? 'visible' : 'hidden',
      notifications,
      detectChangesCalls: 0,
    };
    ref.close();
    await this.wait(zero || mode !== 'enabled' ? 80 : 200);
    return {
      key: `dialog/${mode}`,
      observation,
      notify: {key: `dialog/afterOpened/${mode}`, observation: {notifications, detectChangesCalls: 0}},
    };
  }

  private async measureSnack(): Promise<unknown> {
    try { this.snack.dismiss(); } catch { /* none open */ }
    let notifications = 0;
    const ref = this.snack.open('Saved', 'OK', {duration: 30000});
    const opened = ref.afterOpened() as unknown as {closed: boolean; subscribe: (fn: () => void) => void};
    if (opened.closed) notifications = 1;
    else opened.subscribe(() => { notifications += 1; });
    await this.waitFor(() => {
      const el = document.querySelector('snack-bar-container');
      return !!el && notifications >= 1;
    }, 1500);
    const el = document.querySelector('snack-bar-container') as HTMLElement;
    const mode = this.mode();
    const observation = {
      selector: el.tagName === 'SNACK-BAR-CONTAINER' ? 'snack-bar-container' : '',
      selectorMatches: el.tagName === 'SNACK-BAR-CONTAINER' && el.classList.contains('mat-snack-bar-container'),
      durationMs: this.duration(el, 'animation-duration'),
      finalState: this.visible(el) ? 'visible' : 'hidden',
      notifications,
      detectChangesCalls: 0,
    };
    ref.dismiss();
    await this.wait(200);
    return {
      key: `snack-bar/${mode}`,
      observation,
      notify: {key: `snack-bar/afterOpened/${mode}`, observation: {notifications, detectChangesCalls: 0}},
    };
  }

  private async measureMenu(): Promise<unknown> {
    await this.ensureSurfaces();
    try { this.menuTrigger.closeMenu(); } catch { /* closed */ }
    let notifications = 0;
    this.menuTrigger.menuOpened.subscribe(() => { notifications += 1; });
    this.menuTrigger.openMenu();
    await this.waitFor(() => !!document.querySelector('.mat-menu-panel'));
    await this.wait(250);
    const el = document.querySelector('.mat-menu-panel') as HTMLElement;
    const mode = this.mode();
    const observation = {
      selector: el.classList.contains('mat-menu-panel') ? '.mat-menu-panel' : '',
      selectorMatches: el.classList.contains('mat-menu-panel') && !el.classList.contains('cdk-overlay-pane'),
      durationMs: this.duration(el, 'animation-duration'),
      finalState: this.visible(el) ? 'visible' : 'hidden',
      notifications,
      detectChangesCalls: 0,
    };
    this.menuTrigger.closeMenu();
    await this.wait(250);
    return {
      key: `menu/${mode}`,
      observation,
      notify: {key: `menu/menuOpened/${mode}`, observation: {notifications, detectChangesCalls: 0}},
    };
  }

  private async measureSelect(): Promise<unknown> {
    await this.ensureSurfaces();
    try { this.select.close(); } catch { /* closed */ }
    let notifications = 0;
    this.select.openedChange.subscribe(open => { if (open) notifications += 1; });
    this.select.open();
    await this.waitFor(() => !!document.querySelector('.mat-select-panel'));
    await this.wait(250);
    const el = document.querySelector('.mat-select-panel') as HTMLElement;
    const mode = this.mode();
    const observation = {
      selector: el.classList.contains('mat-select-panel') ? '.mat-select-panel' : '',
      selectorMatches: el.classList.contains('mat-select-panel') && !el.classList.contains('cdk-overlay-pane'),
      durationMs: this.duration(el, 'animation-duration'),
      finalState: this.visible(el) ? 'visible' : 'hidden',
      notifications,
      detectChangesCalls: 0,
    };
    this.select.close();
    await this.wait(300);
    return {
      key: `select/${mode}`,
      observation,
      notify: {key: `select/openedChange/${mode}`, observation: {notifications, detectChangesCalls: 0}},
    };
  }

  private async measureTooltip(): Promise<unknown> {
    await this.ensureSurfaces();
    this.tip.show(0);
    await this.wait(350);
    const el = document.querySelector('.mat-tooltip') as HTMLElement | null;
    const mode = this.mode();
    const observation = {
      selector: el && el.classList.contains('mat-tooltip') ? '.mat-tooltip' : '',
      selectorMatches: !!el && el.classList.contains('mat-tooltip') && !el.classList.contains('cdk-overlay-pane'),
      durationMs: el ? this.duration(el, 'animation-duration') : 0,
      finalState: this.visible(el) ? 'visible' : 'hidden',
      notifications: 0,
      detectChangesCalls: 0,
    };
    this.tip.hide(0);
    await this.wait(150);
    return {key: `tooltip/${mode}`, observation};
  }

  private async measureTabs(zero: boolean): Promise<unknown> {
    await this.ensureSurfaces();
    this.tabDuration = zero ? '0ms' : '500ms';
    this.tabs.selectedIndex = 0;
    await this.wait(40);
    this.tabs.selectedIndex = 1;
    await this.wait(zero ? 80 : 700);
    const el = document.querySelector('.mat-tab-body-active .mat-tab-body-content') as HTMLElement | null;
    const mode = zero ? 'zero' : this.mode();
    const observation = {
      selector: el && el.classList.contains('mat-tab-body-content') ? '.mat-tab-body-content' : '',
      selectorMatches: !!el && el.classList.contains('mat-tab-body-content'),
      durationMs: el ? this.duration(el, 'transition-duration') : 0,
      finalState: el && (el.textContent || '').includes('Two') && getComputedStyle(el).visibility !== 'hidden' ? 'visible' : 'hidden',
      notifications: 0,
      detectChangesCalls: 0,
    };
    this.tabs.selectedIndex = 0;
    this.tabDuration = '500ms';
    return {key: `tabs/${mode}`, observation};
  }

  private async measureField(): Promise<unknown> {
    await this.ensureSurfaces();
    this.name.setErrors({required: true});
    this.name.markAsTouched();
    await this.waitFor(() => (document.querySelector('.mat-form-field-subscript-message')?.textContent || '').includes('Required'));
    await this.wait(this.mode() === 'enabled' ? 400 : 40);
    const el = document.querySelector('.mat-form-field-subscript-message') as HTMLElement;
    const mode = this.mode();
    const text = el.textContent || '';
    const observation = {
      selector: el.classList.contains('mat-form-field-subscript-message') ? '.mat-form-field-subscript-message' : '',
      selectorMatches: el.classList.contains('mat-form-field-subscript-message') && !!el.closest('mat-form-field'),
      durationMs: this.duration(el, 'transition-duration'),
      finalState: text.includes('Required') && this.visible(el) ? 'visible' : 'hidden',
      notifications: 0,
      detectChangesCalls: 0,
    };
    this.name.setErrors(null);
    return {key: `form-field/${mode}`, observation};
  }

  private async reversal(): Promise<unknown> {
    this.dialog.closeAll();
    let opened = 0;
    const ref = this.dialog.open(DialogBody);
    ref.afterOpened().subscribe(() => { opened += 1; });
    ref.close();
    await this.wait(500);
    return {
      key: 'dialog/rapid-reversal',
      observation: {
        containers: document.querySelectorAll('mat-dialog-container').length,
        openedAfterClose: opened,
        leaks: document.querySelectorAll('mat-dialog-container').length,
        detectChangesCalls: 0,
      },
    };
  }

  private async reopen(): Promise<unknown> {
    this.dialog.closeAll();
    const first = this.dialog.open(DialogBody);
    await this.waitFor(() => !!document.querySelector('mat-dialog-container'));
    const firstEl = document.querySelector('mat-dialog-container') as HTMLElement;
    firstEl.setAttribute('data-motion-instance', 'first');
    first.close();
    await this.waitFor(() => !document.querySelector('mat-dialog-container'), 800);
    const second = this.dialog.open(DialogBody);
    await this.waitFor(() => !!document.querySelector('mat-dialog-container'));
    const secondEl = document.querySelector('mat-dialog-container') as HTMLElement;
    const secondInstance = secondEl.getAttribute('data-motion-instance') !== 'first';
    first.close();
    await this.wait(200);
    const still = document.querySelector('mat-dialog-container');
    const observation = {
      secondInstance,
      staleClosed: !still,
      leaks: document.querySelectorAll('mat-dialog-container').length === 1 ? 0 : document.querySelectorAll('mat-dialog-container').length,
      detectChangesCalls: 0,
    };
    second.close();
    return {key: 'dialog/reopen-instance', observation};
  }

  private async destroyDialog(): Promise<unknown> {
    const ref = this.dialog.open(DialogBody);
    await this.waitFor(() => !!document.querySelector('mat-dialog-container'));
    ref.close();
    this.dialog.closeAll();
    await this.wait(500);
    const containers = document.querySelectorAll('mat-dialog-container').length;
    return {key: 'dialog/destroy-cleanup', observation: {containers, leaks: containers, detectChangesCalls: 0}};
  }

  private async snackInterrupt(): Promise<unknown> {
    let notifications = 0;
    const ref = this.snack.open('Saved', 'OK', {duration: 30000});
    ref.afterOpened().subscribe(() => { notifications += 1; });
    await this.waitFor(() => !!document.querySelector('snack-bar-container'));
    const host = document.querySelector('snack-bar-container') as HTMLElement;
    const child = host.firstElementChild as HTMLElement;
    child.dispatchEvent(new AnimationEvent('animationend', {animationName: 'mat-legacy-snack-bar-enter', bubbles: true}));
    await this.wait(40);
    const descendantIgnored = notifications === 0;
    host.style.setProperty('animation', 'none');
    await this.waitFor(() => notifications >= 1, 800);
    const observation = {descendantIgnored, completions: notifications, detectChangesCalls: 0};
    ref.dismiss();
    await this.wait(200);
    return {
      results: {
        'snack-bar/descendant-end': observation,
        'snack-bar/fallback-without-end-event': {
          endEventDispatched: false,
          fallbackCompleted: notifications === 1,
          completions: notifications,
          detectChangesCalls: 0,
        },
      },
    };
  }

  private async menuDuplicate(): Promise<unknown> {
    await this.ensureSurfaces();
    let completions = 0;
    const sub = this.menu._animationDone.subscribe(() => { completions += 1; });
    this.menuTrigger.openMenu();
    await this.waitFor(() => !!document.querySelector('.mat-menu-panel'));
    const panel = document.querySelector('.mat-menu-panel') as HTMLElement;
    const event = () => panel.dispatchEvent(new AnimationEvent('animationend', {animationName: 'mat-legacy-menu-enter', bubbles: true}));
    event();
    event();
    await this.wait(200);
    sub.unsubscribe();
    this.menuTrigger.closeMenu();
    return {key: 'menu/duplicate-end', observation: {duplicateDispatched: true, completions, detectChangesCalls: 0}};
  }

  private async menuDescendant(): Promise<unknown> {
    await this.ensureSurfaces();
    let completions = 0;
    const sub = this.menu._animationDone.subscribe(() => { completions += 1; });
    this.menuTrigger.openMenu();
    await this.waitFor(() => !!document.querySelector('.mat-menu-panel'));
    const panel = document.querySelector('.mat-menu-panel') as HTMLElement;
    const child = panel.querySelector('button') as HTMLElement;
    child.dispatchEvent(new AnimationEvent('animationend', {animationName: 'mat-legacy-menu-enter', bubbles: true}));
    await this.wait(30);
    const descendantIgnored = completions === 0;
    panel.dispatchEvent(new AnimationEvent('animationend', {animationName: 'mat-legacy-menu-enter', bubbles: true}));
    await this.wait(80);
    sub.unsubscribe();
    this.menuTrigger.closeMenu();
    return {key: 'menu/descendant-end', observation: {descendantIgnored, completions, detectChangesCalls: 0}};
  }

  private async selectDescendant(): Promise<unknown> {
    await this.ensureSurfaces();
    let completions = 0;
    const sub = this.select._panelDoneAnimatingStream.subscribe(() => { completions += 1; });
    this.select.open();
    await this.waitFor(() => !!document.querySelector('.mat-select-panel'));
    const panel = document.querySelector('.mat-select-panel') as HTMLElement;
    const option = panel.querySelector('mat-option') as HTMLElement;
    option.dispatchEvent(new AnimationEvent('animationend', {animationName: 'mat-legacy-select-enter', bubbles: true}));
    await this.wait(40);
    const panelRemained = !!document.querySelector('.mat-select-panel');
    const descendantIgnored = completions === 0 && panelRemained;
    sub.unsubscribe();
    this.select.close();
    await this.wait(300);
    return {key: 'select/descendant-end', observation: {descendantIgnored, panelRemained, detectChangesCalls: 0}};
  }

  private async selectFallback(): Promise<unknown> {
    await this.ensureSurfaces();
    this.select.open();
    await this.waitFor(() => !!document.querySelector('.mat-select-panel'));
    this.select.close();
    const panel = document.querySelector('.mat-select-panel') as HTMLElement | null;
    if (panel) panel.style.setProperty('animation', 'none');
    await this.wait(450);
    const gone = !document.querySelector('.mat-select-panel');
    return {key: 'select/missing-end-fallback', observation: {endEventDispatched: false, fallbackCompleted: gone, detectChangesCalls: 0}};
  }

  private async tooltipDestroy(): Promise<unknown> {
    await this.ensureSurfaces();
    this.showGone = true;
    await this.wait(20);
    if (!this.tipGone) throw new Error('tooltip host missing');
    this.tipGone.show(0);
    await this.wait(120);
    const shown = !!document.querySelector('.mat-tooltip');
    document.getElementById('remove-gone')!.click();
    await this.wait(200);
    const leaks = document.querySelectorAll('.mat-tooltip').length;
    return {key: 'tooltip/destroy-while-shown', observation: {destroyed: shown && leaks === 0, leaks, detectChangesCalls: 0}};
  }

  private async tabsRapid(): Promise<unknown> {
    await this.ensureSurfaces();
    this.tabDuration = '500ms';
    await this.wait(20);
    const el = document.querySelector('.mat-tab-body-content') as HTMLElement;
    const durationMs = this.duration(el, 'transition-duration');
    this.tabs.selectedIndex = 1;
    this.tabs.selectedIndex = 2;
    await this.wait(800);
    const active = document.querySelector('.mat-tab-body-active .mat-tab-body-content');
    const text = active ? active.textContent || '' : '';
    return {
      key: 'tabs/rapid-reversal',
      observation: {
        durationMs,
        finalState: text.includes('Three') ? 'visible' : 'hidden',
        animating: !!document.querySelector('.mat-tab-body-animating'),
        detectChangesCalls: 0,
      },
    };
  }
}

@NgModule({
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    MatLegacyDialogModule,
    MatLegacyFormFieldModule,
    MatLegacyInputModule,
    MatLegacyMenuModule,
    MatLegacySelectModule,
    MatLegacySnackBarModule,
    MatLegacyTabsModule,
    MatLegacyTooltipModule,
  ],
  declarations: [MotionRoot, DialogBody],
  bootstrap: [MotionRoot],
  providers: [/*ZONE_PROVIDER*/...motionProviders],
})
export class MotionModule {}

platformBrowserDynamic().bootstrapModule(MotionModule).catch(err => {
  const node = document.createElement('pre');
  node.id = 'bootstrap-error';
  node.textContent = String(err);
  document.body.appendChild(node);
});
