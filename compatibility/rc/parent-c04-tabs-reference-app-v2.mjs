/* C04 independent Material 16 consumer fixture. Requires a separately pinned Angular 16 environment. */
import 'zone.js';
import '@angular/compiler';
import {Component, Input, NgZone, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {bootstrapApplication} from '@angular/platform-browser';
import {provideAnimations, provideNoopAnimations} from '@angular/platform-browser/animations';
import {MatLegacyTabsModule} from '@angular/material/legacy-tabs';

const lifecycle = [];
let nextInstance = 0;
class PanelProbe {
  constructor() { this.instance = ++nextInstance; }
  ngOnInit() { lifecycle.push({type:'create', panel:this.panel, instance:this.instance}); }
  ngOnDestroy() { lifecycle.push({type:'destroy', panel:this.panel, instance:this.instance}); }
}
Input()(PanelProbe.prototype, 'panel');
Component({selector:'c04-panel-probe', standalone:true, imports:[CommonModule], template:`
  <section [attr.data-panel-probe]="panel" [attr.data-instance]="instance">
    <span>Panel {{panel}} instance {{instance}}</span>
    <button type="button" [attr.data-focus-target]="panel">Focus {{panel}}</button>
    <input [attr.data-input-target]="panel" [attr.aria-label]="'Input ' + panel">
  </section>`})(PanelProbe);

const events = [];
let actionId = 0;
const record = (type, details={}) => events.push({type, ...details, time:performance.now(), actionId});
class Host {
  constructor() {
    this.zone = inject(NgZone);
    const query = new URLSearchParams(location.search);
    this.selected = query.get('selected') === '1' ? 1 : 0;
    this.preserve = query.get('preserve') === 'true';
    this.contentTabIndex = query.get('contentTabIndex') === '0' ? 0 : null;
    this.animationDuration = '300ms';
  }
  tabChanged(event) { record('selectedTabChange', {index:event.index, label:event.tab?.textLabel ?? null}); }
  indexChanged(index) { record('selectedIndexChange', {index}); this.selected = index; }
  animationDone() { record('animationDone'); }
}
Component({selector:'c04-root', standalone:true, imports:[CommonModule, MatLegacyTabsModule, PanelProbe], template:`
  <mat-tab-group [selectedIndex]="selected" [contentTabIndex]="contentTabIndex"
      [preserveContent]="preserve" [animationDuration]="animationDuration"
      (selectedTabChange)="tabChanged($event)" (selectedIndexChange)="indexChanged($event)"
      (animationDone)="animationDone()">
    <mat-tab label="Alpha"><ng-template matTabContent><c04-panel-probe panel="alpha"></c04-panel-probe></ng-template></mat-tab>
    <mat-tab label="Beta"><ng-template matTabContent><c04-panel-probe panel="beta"></c04-panel-probe></ng-template></mat-tab>
  </mat-tab-group>`})(Host);

const mode = new URLSearchParams(location.search).get('animations') === 'noop' ? 'noop' : 'enabled';
if (!document.querySelector('c04-root')) document.body.appendChild(document.createElement('c04-root'));
bootstrapApplication(Host, {providers:[mode === 'noop' ? provideNoopAnimations() : provideAnimations()]})
  .then(app => {
    const host = app.components[0].instance;
    const describe = node => {
      if (!node) return null;
      const panel = node.closest?.('[role="tabpanel"]');
      return {tag:node.tagName ?? null, id:node.id || null, role:node.getAttribute?.('role') ?? null,
        focusTarget:node.getAttribute?.('data-focus-target') ?? null,
        inputTarget:node.getAttribute?.('data-input-target') ?? null,
        connected:node.isConnected, panelId:panel?.id ?? null};
    };
    const visual = n => { const style=getComputedStyle(n), rect=n.getBoundingClientRect();
      return {display:style.display, visibility:style.visibility, opacity:style.opacity, transform:style.transform,
        rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}, connected:n.isConnected}; };
    const animationState = () => {
      const root=document.querySelector('c04-root mat-tab-group');
      if (!root || typeof root.getAnimations !== 'function') return {supported:false, reason:'getAnimations unavailable', items:[]};
      try { return {supported:true, items:root.getAnimations({subtree:true}).map(a=>{
        const target=a.effect?.target;
        return {playState:a.playState, pending:a.pending, currentTime:typeof a.currentTime==='number' ? a.currentTime : null,
          target:target ? {tag:target.tagName ?? null,id:target.id || null,classes:typeof target.className==='string' ? target.className : null} : null};
      })}; } catch (e) { return {supported:false, reason:String(e), items:[]}; }
    };
    const snapshot = () => ({mode, actionId, animations:animationState(), config:{selected:host.selected, preserve:host.preserve, contentTabIndex:host.contentTabIndex},
      tabs:[...document.querySelectorAll('c04-root [role="tab"]')].map(n => ({id:n.id, text:n.textContent.trim(), selected:n.getAttribute('aria-selected'), controls:n.getAttribute('aria-controls'), tabindex:n.getAttribute('tabindex'), active:n.classList.contains('mat-tab-label-active')})),
      panels:[...document.querySelectorAll('c04-root [role="tabpanel"]')].map(n => {const child=n.querySelector('[data-panel-probe]'), content=n.querySelector('.mat-tab-body-content'); return {id:n.id, labelledby:n.getAttribute('aria-labelledby'), tabindex:n.getAttribute('tabindex'), ariaHidden:n.getAttribute('aria-hidden'), active:n.classList.contains('mat-tab-body-active'), visual:visual(n), content:content ? visual(content) : null, child:child ? {panel:child.getAttribute('data-panel-probe'), instance:Number(child.getAttribute('data-instance')), visual:visual(child), descendants:[...child.querySelectorAll('button,input')].map(d=>({element:describe(d), visual:visual(d)}))} : null};}),
      focus:describe(document.activeElement), events:events.map(x=>({...x})), lifecycle:lifecycle.map(x=>({...x}))});
    window.c04 = Object.freeze({snapshot,
      markExternalAction() { return ++actionId; },
      select(index) { if (![0,1].includes(index)) throw Error('index must be 0 or 1'); const id=++actionId; host.zone.run(()=>{host.selected=index;}); return id; },
      focusPanel(name) { if (!['alpha','beta'].includes(name)) throw Error('unknown panel'); const target=document.querySelector(`[data-focus-target="${name}"]`); if (!target) throw Error('panel target is not attached'); const id=++actionId; host.zone.run(()=>target.focus()); return id; },
      setPreserve(value) { if (typeof value!=='boolean') throw Error('preserve must be boolean'); const id=++actionId; host.zone.run(()=>{host.preserve=value;}); return id; },
      setContentTabIndex(value) { if (value!==null && value!==0) throw Error('contentTabIndex must be null or 0'); const id=++actionId; host.zone.run(()=>{host.contentTabIndex=value;}); return id; },
      /* Completion requires selected DOM agreement, two equal rendered frames, no running/pending local animation, and optionally a new public animationDone. Deadline rejects; time alone never passes a case. */
      waitFor({index, afterEvent=0, requireAnimationDone=false, deadlineMs=5000}) {
        if (![0,1].includes(index) || !Number.isInteger(afterEvent) || afterEvent<0 || !Number.isFinite(deadlineMs) || deadlineMs<=0) return Promise.reject(Error('invalid wait arguments'));
        return new Promise((resolve,reject)=>{ const end=performance.now()+deadlineMs; let last='', stable=0;
          const step=()=>{const s=snapshot(), selected=s.tabs.filter(t=>t.selected==='true'), active=s.panels.filter(p=>p.active);
            const agrees=selected.length===1 && selected[0]===s.tabs[index] && active.length===1 && active[0]===s.panels[index] && host.selected===index;
            if (!s.animations.supported) return reject(Error('inconclusive: local animation inspection unsupported: '+s.animations.reason));
            const done=!requireAnimationDone || s.events.slice(afterEvent).some(e=>e.type==='animationDone');
            const quiet=s.animations.items.every(a=>!a.pending && a.playState!=='running');
            const signature=JSON.stringify({tabs:s.tabs,panels:s.panels,focus:s.focus,events:s.events,lifecycle:s.lifecycle,animations:s.animations});
            stable=signature===last ? stable+1 : 0; last=signature;
            if (agrees && done && quiet && stable>=2) return resolve(s);
            if (performance.now()>=end) return reject(Error('completion deadline: '+JSON.stringify(s)));
            requestAnimationFrame(step);
          }; requestAnimationFrame(step);
        });
      }});
    window.dispatchEvent(new Event('c04-ready'));
  }).catch(error => { window.c04BootstrapError=String(error?.stack || error); window.dispatchEvent(new Event('c04-error')); });
