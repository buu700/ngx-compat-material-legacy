/** @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import '@angular/compiler';
import { Component, getDebugNode, provideZonelessChangeDetection, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { MatLegacyTabsModule, MatLegacyTabLink } from '@ngx-compat/material-legacy/legacy-tabs';
class Host {
    active = signal(false);
    disabled = signal(false);
    hasPanel = signal(true);
}
Component({
    selector: 'test-root',
    standalone: true,
    imports: [MatLegacyTabsModule],
    template: `
<nav mat-tab-nav-bar [tabPanel]="hasPanel() ? panel : undefined"><a mat-tab-link href="#target" [disabled]="disabled()" [active]="active()" (click)="active.set(true)">Link</a></nav><mat-tab-nav-panel #panel>Panel</mat-tab-nav-panel>`,
})(Host);
bootstrapApplication(Host, { providers: [provideZonelessChangeDetection()] }).then(app => {
    const host = app.components[0].instance;
    const link = () => document.querySelector('a.mat-tab-link');
    const instance = () => getDebugNode(link()).injector.get(MatLegacyTabLink);
    const wait = () => new Promise(r => setTimeout(r, 20));
    window.keyCases = {
        async run({ disabled, panel, key, keyCode, altKey, ctrlKey, reference }) {
            host.active.set(false);
            host.disabled.set(disabled);
            host.hasPanel.set(panel);
            await wait();
            const element = link(), item = instance();
            let clicks = 0;
            const capture = () => clicks++;
            element.addEventListener('click', capture);
            const event = new KeyboardEvent('keydown', { key, keyCode, which: keyCode, bubbles: true, cancelable: true, altKey: !!altKey, ctrlKey: !!ctrlKey });
            if (reference) {
                window.taggedHandler.call(item, event);
            } else {
                element.dispatchEvent(event);
            }
            element.removeEventListener('click', capture);
            return { clicks, defaultPrevented: event.defaultPrevented, keyCode: event.keyCode };
        },
        async configure({disabled, panel}) {
            host.active.set(false);
            host.disabled.set(disabled);
            host.hasPanel.set(panel);
            await wait();
            link().focus();
            window.observed = [];
        },
        destroy() {
            app.destroy();
        },
    };
    document.addEventListener('keydown', e => window.observed?.push({ key: e.key, altKey: e.altKey, ctrlKey: e.ctrlKey, defaultPrevented: e.defaultPrevented }));
    window.probeReady = true;
}).catch(e => window.probeError = String(e?.stack || e));
