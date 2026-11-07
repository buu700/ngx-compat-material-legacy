/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import 'zone.js';
import '@angular/compiler';
import {ChangeDetectorRef, Component, Input, NgZone, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {bootstrapApplication} from '@angular/platform-browser';
import {provideAnimations} from '@angular/platform-browser/animations';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {MatLegacyTabsModule} from '@ngx-compat/material-legacy/legacy-tabs';

const log: Array<Record<string, unknown>> = [];
let serial = 0;
@Component({selector: 'tab-probe', standalone: true, template: '<div class="probe-content" [attr.data-probe]="name">{{name}} <button>focus</button></div>'})
class Probe {
  @Input() name = '';
  private id = ++serial;
  ngOnInit() { log.push({type: 'create', name: this.name, id: this.id, t: performance.now()}); }
  ngOnDestroy() { log.push({type: 'destroy', name: this.name, id: this.id, t: performance.now()}); }
}
@Component({selector: 'tabs-root', standalone: true, imports: [CommonModule, MatLegacyTabsModule, Probe], template: `
  <mat-tab-group [selectedIndex]="selected" [animationDuration]="duration" [dynamicHeight]="dynamicHeight"
      [preserveContent]="preserve" (selectedTabChange)="tabChanged($event)" (selectedIndexChange)="selectedEvent($event)" (animationDone)="done()">
    <mat-tab label="A"><ng-template matTabContent><tab-probe name="A"></tab-probe><div class="consumer-transform" style="transform:scale(.97)">consumer</div></ng-template></mat-tab>
    <mat-tab label="B"><ng-template matTabContent><tab-probe name="B"></tab-probe><div [style.height.px]="panelBHeight">B height</div></ng-template></mat-tab>
    <mat-tab label="C"><ng-template matTabContent><tab-probe name="C"></tab-probe><div style="height:35px">C height</div></ng-template></mat-tab>
  </mat-tab-group>
`})
class App {
  selected = 0;
  duration = '500ms';
  dynamicHeight = false;
  preserve = false;
  panelBHeight = 140;
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  tabChanged(event: {index: number}) { log.push({type: 'selectedTabChange', index: event.index, t: performance.now()}); }
  selectedEvent(index: number) { log.push({type: 'selectedIndexChange', index, t: performance.now()}); }
  done() { log.push({type: 'animationDone', t: performance.now()}); }
  constructor() {
    (window as any).tabProof = Object.freeze({
      select: (index: number) => this.zone.run(() => { this.selected = index; this.cdr.detectChanges(); }),
      setDuration: (value: string) => this.zone.run(() => { this.duration = value; this.cdr.detectChanges(); }),
      setDynamicHeight: (value: boolean) => this.zone.run(() => { this.dynamicHeight = value; this.cdr.detectChanges(); }),
      selectAndResizeB: (index: number, height: number) => this.zone.run(() => { this.panelBHeight = height; this.selected = index; this.cdr.detectChanges(); }),
      widthStress: (enabled: boolean) => document.documentElement.classList.toggle('width-boundary', enabled),
      setPreserve: (value: boolean) => this.zone.run(() => { this.preserve = value; this.cdr.detectChanges(); }),
      snapshot: () => {
        const wrapper = document.querySelector('.mat-tab-body-wrapper');
        const bodies = Array.from(wrapper?.children ?? []) as HTMLElement[];
        const matrix = (value: string) => {
          try { const m = new DOMMatrixReadOnly(value); return {x: m.m41, y: m.m42, a: m.a, d: m.d}; }
          catch { return {x: NaN, y: NaN, a: NaN, d: NaN}; }
        };
        return {
          time: performance.now(),
          wrapperHeight: wrapper?.getBoundingClientRect().height ?? 0,
          wrapperWidth: wrapper?.getBoundingClientRect().width ?? 0,
          tabs: Array.from(document.querySelectorAll('[role=tab]')).map((n: Element) => ({label: n.textContent?.trim(), selected: n.getAttribute('aria-selected'), active: n.classList.contains('mat-tab-label-active')})),
          bodies: bodies.map(body => {
            const content = body.firstElementChild as HTMLElement | null;
            const style = content ? getComputedStyle(content) : null;
            return {id: body.id, active: body.classList.contains('mat-tab-body-active'), animating: body.classList.contains('mat-tab-body-animating'), hidden: body.getAttribute('aria-hidden'), content: !!content, child: content?.querySelector('[data-probe]')?.getAttribute('data-probe') ?? null,
              transform: style?.transform ?? null, matrix: matrix(style?.transform ?? 'none'), visibility: style?.visibility ?? null,
              duration: style?.transitionDuration ?? null, inlineStyles: content ? {transform: content.style.transform, transitionProperty: content.style.transitionProperty, visibility: content.style.visibility} : null, rect: content ? {x: content.getBoundingClientRect().x, width: content.getBoundingClientRect().width, height: content.getBoundingClientRect().height} : null};
          }),
          events: log.map(x => ({...x})),
          consumerTransform: (document.querySelector('.consumer-transform') as HTMLElement | null)?.style.transform ?? null,
          docDirection: document.documentElement.dir,
        };
      },
      direction: (value: 'ltr'|'rtl') => { document.documentElement.dir = value; document.querySelector('mat-tab-group')?.setAttribute('dir', value); },
      fakeTransitionEnd: (index: number) => {
        const content = document.querySelectorAll('.mat-tab-body-content')[index];
        content?.dispatchEvent(new TransitionEvent('transitionend', {bubbles: true, propertyName: 'transform'}));
      },
      perturbConsumerTransform: () => { const n = document.querySelector('.consumer-transform') as HTMLElement; if (n) n.style.transform = 'scale(.91)'; },
      setBodyInlineStyles: (index: number, values: Record<string,string>) => { const n = document.querySelectorAll('.mat-tab-body-content')[index] as HTMLElement | undefined; if(!n)throw Error('missing tab body content '+index); for(const [k,v] of Object.entries(values)) n.style.setProperty(k,v); },
    });
  }
}
const policyProviders = new URLSearchParams(location.search).get('disabled') === '1' ? [{provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}}] : [];
bootstrapApplication(App, {providers: [provideAnimations(), ...policyProviders]}).then(() => document.documentElement.dataset.ready = '1').catch(error => {
  document.documentElement.dataset.error = String(error?.stack ?? error);
});
