/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import {AfterViewInit, ChangeDetectorRef, Component, Directive, ElementRef, NgModule, NgZone, ViewChild, inject, provideZonelessChangeDetection} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MediaMatcher} from '@angular/cdk/layout';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {LEGACY_ANIMATION_MODE, LEGACY_ANIMATIONS_TEST_OVERRIDE} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyProgressBar, MatLegacyProgressBarModule} from '@ngx-compat/material-legacy/legacy-progress-bar';
const normal={matchMedia:()=>({matches:false})}, reduced={matchMedia:()=>({matches:true})};
const tpl=`@if (show) {<mat-progress-bar [mode]="mode" [value]="40" [bufferValue]="60" (animationEnd)="events.push($event.value)"></mat-progress-bar>}`;
@Directive() abstract class TestCase implements AfterViewInit {
 abstract id:string; mode:'determinate'|'buffer'|'indeterminate'|'query'='determinate'; show=true; events:number[]=[];
 @ViewChild(MatLegacyProgressBar) bar!:MatLegacyProgressBar; cdr=inject(ChangeDetectorRef);
 ngAfterViewInit(){(window as any).cases[this.id]=this;}
 update(mode:'determinate'|'buffer'|'indeterminate'|'query'){this.mode=mode;this.cdr.detectChanges();}
 destroy(){this.show=false;this.cdr.detectChanges();}
}
@Component({selector:'case-absent',standalone:false,template:tpl,providers:[{provide:MediaMatcher,useValue:normal}]}) class Absent extends TestCase {id='absent';}
@Component({selector:'case-browser',standalone:false,template:tpl,providers:[{provide:MediaMatcher,useValue:normal},{provide:LEGACY_ANIMATION_MODE,useValue:'BrowserAnimations'}]}) class Browser extends TestCase {id='browser';}
@Component({selector:'case-noop',standalone:false,template:tpl,providers:[{provide:MediaMatcher,useValue:normal},{provide:LEGACY_ANIMATION_MODE,useValue:'NoopAnimations'}]}) class Noop extends TestCase {id='noop';}
@Component({selector:'case-custom',standalone:false,template:tpl,providers:[{provide:MediaMatcher,useValue:normal},{provide:LEGACY_ANIMATION_MODE,useValue:'custom'}]}) class Custom extends TestCase {id='custom';}
@Component({selector:'case-disabled',standalone:false,template:tpl,providers:[{provide:MediaMatcher,useValue:normal},{provide:MATERIAL_ANIMATIONS,useValue:{animationsDisabled:true}}]}) class Disabled extends TestCase {id='disabled';}
@Component({selector:'case-reduced',standalone:false,template:tpl,providers:[{provide:MediaMatcher,useValue:reduced}]}) class Reduced extends TestCase {id='reduced';}
@Component({selector:'case-browser-disabled',standalone:false,template:tpl,providers:[{provide:MediaMatcher,useValue:normal},{provide:LEGACY_ANIMATION_MODE,useValue:'BrowserAnimations'},{provide:MATERIAL_ANIMATIONS,useValue:{animationsDisabled:true}}]}) class BrowserDisabled extends TestCase {id='browser-disabled';}
@Component({selector:'case-override-reduced',standalone:false,template:tpl,providers:[{provide:MediaMatcher,useValue:normal},{provide:LEGACY_ANIMATION_MODE,useValue:'BrowserAnimations'},{provide:LEGACY_ANIMATIONS_TEST_OVERRIDE,useValue:'reduced-motion'}]}) class OverrideReduced extends TestCase {id='override-reduced';}
@Component({selector:'case-override-enabled',standalone:false,template:tpl,providers:[{provide:MediaMatcher,useValue:normal},{provide:LEGACY_ANIMATION_MODE,useValue:'BrowserAnimations'},{provide:MATERIAL_ANIMATIONS,useValue:{animationsDisabled:true}},{provide:LEGACY_ANIMATIONS_TEST_OVERRIDE,useValue:'enabled'}]}) class OverrideEnabled extends TestCase {id='override-enabled';}
@Component({selector:'lab-root',standalone:false,template:`<case-absent/><case-browser/><case-noop/><case-custom/><case-disabled/><case-reduced/><case-browser-disabled/><case-override-reduced/><case-override-enabled/>`}) class Lab implements AfterViewInit {zone=inject(NgZone); ngAfterViewInit(){(window as any).manual=(mode?:string)=>{const x=new MatLegacyProgressBar(new ElementRef(document.createElement('div')),this.zone,mode);const result={mode:x._animationMode,noop:x._isNoopAnimation};x.ngOnDestroy();return result;};}}
(window as any).cases={};
@NgModule({imports:[BrowserModule,MatLegacyProgressBarModule],declarations:[Lab,Absent,Browser,Noop,Custom,Disabled,Reduced,BrowserDisabled,OverrideReduced,OverrideEnabled],bootstrap:[Lab],providers:[provideZonelessChangeDetection()]}) class LabModule {}
platformBrowserDynamic().bootstrapModule(LabModule).catch(err=>{const node=document.createElement('pre');node.id='bootstrap-error';node.textContent=String(err);document.body.appendChild(node)});
