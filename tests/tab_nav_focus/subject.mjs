/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Native tab-nav behavior fixture.
 */
import '@angular/compiler';
import {Component,ViewChild,getDebugNode,provideZonelessChangeDetection,signal} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {MatLegacyTabsModule,MatLegacyTabNav,MatLegacyTabLink} from '@ngx-compat/material-legacy/legacy-tabs';
class Host {items=signal([0]);active=signal(-1);disabled=signal(true);disabledIndex=signal(-1);hasPanel=signal(true);custom=signal(0);}
ViewChild(MatLegacyTabNav)(Host.prototype,'nav');
Component({selector:'test-root',standalone:true,imports:[MatLegacyTabsModule],template:`
<button id="before">Before</button>
<nav mat-tab-nav-bar [tabPanel]="hasPanel() ? panel : undefined">
 @for(item of items(); track item) {<a mat-tab-link [disabled]="disabled() || disabledIndex() === item" [active]="active() === item" [tabIndex]="custom()" (click)="active.set(item)">Item {{item}}</a>}
</nav><mat-tab-nav-panel #panel>Panel</mat-tab-nav-panel><button id="after">After</button>`})(Host);
bootstrapApplication(Host,{providers:[provideZonelessChangeDetection()]}).then(app=>{
 const host=app.components[0].instance;
 window.tabProbe={async set(values){for(const [key,value] of Object.entries(values))host[key].set(value);await new Promise(r=>setTimeout(r,80));},setFocus(index){host.nav.focusIndex=index;},snapshot(){const links=[...document.querySelectorAll('a.mat-tab-link')];return {state:{active:host.active(),disabled:host.disabled(),items:host.items()},indices:links.map(x=>x.tabIndex),disabled:links.map(x=>x.getAttribute('aria-disabled')),focused:links.findIndex(x=>x===document.activeElement),roles:links.map(x=>x.getAttribute('role')),focusIndex:host.nav.focusIndex,selectedIndex:host.nav.selectedIndex,itemCount:host.nav._items.length,method:links.map(x=>getDebugNode(x).injector.get(MatLegacyTabLink)._getTabIndex()),same:links.map(x=>host.nav._items.get(0)===getDebugNode(x).injector.get(MatLegacyTabLink))};},destroy(){app.destroy();}};
 window.keyProbe=[];document.addEventListener('keydown',e=>window.keyProbe.push({key:e.key,prevented:e.defaultPrevented}));
 window.probeReady=true;
}).catch(e=>window.probeError=String(e?.stack||e));
