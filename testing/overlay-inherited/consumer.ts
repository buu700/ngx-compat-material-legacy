/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import 'zone.js';
import {Component, ElementRef, Injector, NgModule, NgZone, TemplateRef, ViewChild, ViewContainerRef, inject, signal, provideZoneChangeDetection} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {Overlay, OverlayModule, CdkConnectedOverlay, OVERLAY_DEFAULT_CONFIG, createOverlayRef} from '@angular/cdk/overlay';
import {TemplatePortal} from '@angular/cdk/portal';
import {ScrollDispatcher} from '@angular/cdk/scrolling';
import {Subject} from 'rxjs';
import {MatLegacyTooltip, MatLegacyTooltipModule} from '@ngx-compat/material-legacy/legacy-tooltip';
import {MatLegacySelect, MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';
const fault=new URLSearchParams(location.search).get('fault');
const wait=(n:number)=>new Promise(resolve=>setTimeout(resolve,n));
@Component({standalone:false,selector:'select-off',providers:[{provide:OVERLAY_DEFAULT_CONFIG,useValue:{usePopover:fault==='optout'}}],template:`<mat-select placeholder="choose"><mat-option value="a">Alpha</mat-option></mat-select>`})
class SelectOff { @ViewChild(MatLegacySelect) select!:MatLegacySelect; }
@Component({standalone:false,selector:'directive-inline',template:`<button cdkOverlayOrigin #origin="cdkOverlayOrigin" #anchor>directive origin</button><ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="origin" [cdkConnectedOverlayOpen]="show()" [cdkConnectedOverlayUsePopover]="location"><div>inline content</div></ng-template>`})
class DirectiveInline { show=signal(false); location:'inline'|'global'=fault==='location'?'global':'inline'; @ViewChild(CdkConnectedOverlay) overlay!:CdkConnectedOverlay; @ViewChild('anchor',{read:ElementRef}) anchor!:ElementRef<HTMLElement>; }

@Component({standalone:false,selector:'directive-global',template:`<button cdkOverlayOrigin #origin="cdkOverlayOrigin" #anchor>Global</button><ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="origin" [cdkConnectedOverlayOpen]="show()" [cdkConnectedOverlayUsePopover]="'global'"><div>Global content</div></ng-template>`})
class DirectiveGlobal { show=signal(false); @ViewChild(CdkConnectedOverlay) overlay!:CdkConnectedOverlay; @ViewChild('anchor',{read:ElementRef}) anchor!:ElementRef<HTMLElement>; }
@Component({standalone:false,selector:'directive-null',template:`<button cdkOverlayOrigin #origin="cdkOverlayOrigin" #anchor>Null</button><ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="origin" [cdkConnectedOverlayOpen]="show()" [cdkConnectedOverlayUsePopover]="null"><div>Null content</div></ng-template>`})
class DirectiveNull { show=signal(false); @ViewChild(CdkConnectedOverlay) overlay!:CdkConnectedOverlay; @ViewChild('anchor',{read:ElementRef}) anchor!:ElementRef<HTMLElement>; }
@Component({standalone:false,selector:'directive-default',template:`<button cdkOverlayOrigin #origin="cdkOverlayOrigin" #anchor>Default</button><ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="origin" [cdkConnectedOverlayOpen]="show()" ><div>Default content</div></ng-template>`})
class DirectiveDefault { show=signal(false); @ViewChild(CdkConnectedOverlay) overlay!:CdkConnectedOverlay; @ViewChild('anchor',{read:ElementRef}) anchor!:ElementRef<HTMLElement>; }
@Component({standalone:false,selector:'probe-root',template:`
<div #scrollbox id="scrollbox" style="width:180px;height:120px;overflow:auto;position:relative;margin:100px;border:1px solid black"><div style="height:600px"><button #anchor id="anchor" style="margin-top:55px" matTooltip="clip-test" matTooltipPosition="below">origin</button></div></div>
<select-off></select-off><directive-inline></directive-inline><directive-global></directive-global><directive-null></directive-null><directive-default></directive-default><button #outside id="outside">outside</button><ng-template #content><div id="pane-content" style="width:60px;height:30px">contents</div></ng-template>`})
class ProbeRoot {
 @ViewChild('scrollbox',{read:ElementRef}) box!:ElementRef<HTMLElement>;
 @ViewChild('anchor',{read:ElementRef}) origin!:ElementRef<HTMLElement>;
 @ViewChild(MatLegacyTooltip) tooltip!:MatLegacyTooltip;
 @ViewChild(SelectOff) selectOff!:SelectOff;
 @ViewChild(DirectiveInline) directive!:DirectiveInline;
 @ViewChild(DirectiveGlobal) global!:DirectiveGlobal; @ViewChild(DirectiveNull) nullDir!:DirectiveNull; @ViewChild(DirectiveDefault) defaultDir!:DirectiveDefault;
 @ViewChild('content',{read:TemplateRef}) content!:TemplateRef<unknown>;
 private overlay=inject(Overlay);private injector=inject(Injector);private vcr=inject(ViewContainerRef);private dispatcher=inject(ScrollDispatcher);private zone=inject(NgZone);
 ngAfterViewInit(){(window as any).probe=this;document.documentElement.dataset.ready='yes'}
 execute(){return this.zone.run(()=>this.run())}
 async run(){
  const out:any={nonce:new URLSearchParams(location.search).get('nonce')};const events=new Subject<Event>();const target={getElementRef:()=>this.box,elementScrolled:()=>events.asObservable()};if(fault!=='target')this.dispatcher.register(target);
  let scrolled=0;let sub=this.dispatcher.scrolled(0).subscribe(e=>{if(e===target)scrolled++});
  const ancestors=this.dispatcher.getAncestorScrollContainers(this.origin);out.customTarget={registered:ancestors.includes(target),before:scrolled};events.next(new Event('scroll'));await wait(20);out.customTarget.after=scrolled;
  const strategy=this.overlay.position().flexibleConnectedTo(this.origin).withFlexibleDimensions(false).withPush(false).withScrollableContainers([target]).withPositions([{originX:'start',originY:'bottom',overlayX:'start',overlayY:'top'}]);
  let positions=0;strategy.positionChanges.subscribe(()=>positions++);
  const ref=this.overlay.create({positionStrategy:strategy,usePopover:false});ref.attach(new TemplatePortal(this.content,this.vcr));await wait(50);strategy.apply();let count1=positions;const beforePane=ref.overlayElement.getBoundingClientRect().toJSON();const beforeBox=this.box.nativeElement.getBoundingClientRect().toJSON();strategy.apply();let count2=positions;
  this.box.nativeElement.style.height='35px';if(fault!=='position')strategy.apply();let count3=positions;out.position={count1,count2,count3,beforePane,beforeBox,paneRect:ref.overlayElement.getBoundingClientRect().toJSON(),boxRect:this.box.nativeElement.getBoundingClientRect().toJSON()};ref.dispose();this.box.nativeElement.style.height='120px';
  this.tooltip.show(0);await wait(100);let initial=!!document.querySelector('.mat-tooltip');this.box.nativeElement.scrollTop=100;events.next(new Event('scroll'));await wait(200);let clipped=!!document.querySelector('.mat-tooltip');out.tooltip={initial,afterScroll:clipped,scrollTop:this.box.nativeElement.scrollTop};this.tooltip.hide(0);await wait(50);this.box.nativeElement.scrollTop=0;this.tooltip.show(0);await wait(100);let beforeOutside=!!document.querySelector('.mat-tooltip');document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,composed:true}));if(fault!=='shadow')document.body.dispatchEvent(new MouseEvent('click',{bubbles:true,composed:true}));await wait(100);out.tooltipOutside={before:beforeOutside,after:!!document.querySelector('.mat-tooltip')};this.tooltip.hide(0);await wait(40);
  const shadowRef=this.overlay.create({usePopover:false});shadowRef.attach(new TemplatePortal(this.content,this.vcr));let external=0;shadowRef.outsidePointerEvents().subscribe(()=>external++);const host=document.createElement('div');shadowRef.overlayElement.appendChild(host);const inner=document.createElement('button');host.attachShadow({mode:'open'}).appendChild(inner);
  const down=(node:Element)=>node.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,composed:true}));const click=(node:Element)=>node.dispatchEvent(new MouseEvent('click',{bubbles:true,composed:true}));down(fault==='shadow'?document.body:inner);click(fault==='shadow'?document.body:inner);let inside=external;down(inner);click(document.body);let crossing=external;down(document.body);click(document.body);out.shadow={inside,crossing,outside:external};shadowRef.dispose();
  this.selectOff.select.open();await wait(100);const selectPanel=document.querySelector('.mat-select-panel');const selectHost=selectPanel?.closest('.cdk-overlay-connected-position-bounding-box');out.selectOff={open:this.selectOff.select.panelOpen,panel:!!selectPanel,popover:!!selectPanel?.closest('[popover]'),container:!!selectPanel?.closest('.cdk-overlay-container'),host:!!selectHost};this.selectOff.select.close();await wait(100);
  const child=Injector.create({parent:this.injector,providers:[{provide:OVERLAY_DEFAULT_CONFIG,useValue:{usePopover:fault==='optout'}}]});const off=createOverlayRef(child,{});off.attach(new TemplatePortal(this.content,this.vcr));out.popoverOff={config:off.getConfig().usePopover,attribute:off.hostElement.getAttribute('popover'),inContainer:!!off.hostElement.closest('.cdk-overlay-container')};off.dispose();
  const make=(loc:'global'|'inline')=>{const pos=this.overlay.position().flexibleConnectedTo(this.origin).withPopoverLocation(fault==='location'&&loc==='inline'?'global':loc).withPositions([{originX:'start',originY:'bottom',overlayX:'start',overlayY:'top'}]);const o=createOverlayRef(this.injector,{positionStrategy:pos,usePopover:true});o.attach(new TemplatePortal(this.content,this.vcr));const v={location:loc,config:o.getConfig().usePopover,attribute:o.hostElement.getAttribute('popover'),inContainer:!!o.hostElement.closest('.cdk-overlay-container'),adjacent:this.origin.nativeElement.nextElementSibling===o.hostElement};o.dispose();return v};
  out.popover={supported:'showPopover' in document.body,global:make('global'),inline:make('inline')};this.directive.show.set(true);await wait(100);const directiveHost=this.directive.overlay.overlayRef?.hostElement;out.directiveInline={attribute:directiveHost?.getAttribute('popover')??null,inContainer:!!directiveHost?.closest('.cdk-overlay-container'),adjacent:this.directive.anchor.nativeElement.nextElementSibling===directiveHost};this.directive.show.set(false);await wait(40);for(const d of [this.global,this.nullDir,this.defaultDir])d.show.set(true);await wait(100);const view=(d:DirectiveGlobal|DirectiveNull|DirectiveDefault)=>{const h=d.overlay.overlayRef?.hostElement;return {popover:h?.getAttribute('popover')??null,inContainer:!!h?.closest('.cdk-overlay-container'),adjacent:d.anchor.nativeElement.nextElementSibling===h}};out.directiveVariants={global:view(this.global),null:view(this.nullDir),default:view(this.defaultDir)};for(const d of [this.global,this.nullDir,this.defaultDir])d.show.set(false);await wait(40);sub.unsubscribe();this.dispatcher.deregister(target);out.customTarget.removed=!this.dispatcher.getAncestorScrollContainers(this.origin).includes(target);events.complete();return out;
 }
}
@NgModule({imports:[BrowserModule,OverlayModule,MatLegacyTooltipModule,MatLegacySelectModule],declarations:[ProbeRoot,SelectOff,DirectiveInline,DirectiveGlobal,DirectiveNull,DirectiveDefault],providers:[{provide:MATERIAL_ANIMATIONS,useValue:{animationsDisabled:true}}],bootstrap:[ProbeRoot]})class AppModule{}
platformBrowserDynamic().bootstrapModule(AppModule,{applicationProviders:[provideZoneChangeDetection()]}).catch(e=>document.body.textContent=String(e));
