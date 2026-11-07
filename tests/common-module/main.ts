/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import 'zone.js';
import {Component, NgModule, ViewChild} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {Dir} from '@angular/cdk/bidi';
import {MatCommonModule as Core, MATERIAL_LEGACY_SANITY_CHECKS} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyCardModule, MatCommonModule as Card} from '@ngx-compat/material-legacy/legacy-card';
import {MatLegacyProgressBarModule, MatCommonModule as Bar} from '@ngx-compat/material-legacy/legacy-progress-bar';
import {MatLegacyProgressSpinnerModule, MatCommonModule as Spinner} from '@ngx-compat/material-legacy/legacy-progress-spinner';
import {MatCommonModule as Root} from '@ngx-compat/material-legacy';
import {MatCommonModule as M0} from '@ngx-compat/material-legacy/legacy-autocomplete';
import {MatCommonModule as M1} from '@ngx-compat/material-legacy/legacy-button';
import {MatCommonModule as M2} from '@ngx-compat/material-legacy/legacy-checkbox';
import {MatCommonModule as M3} from '@ngx-compat/material-legacy/legacy-chips';
import {MatCommonModule as M4} from '@ngx-compat/material-legacy/legacy-dialog';
import {MatCommonModule as M5} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatCommonModule as M6} from '@ngx-compat/material-legacy/legacy-input';
import {MatCommonModule as M7} from '@ngx-compat/material-legacy/legacy-list';
import {MatCommonModule as M8} from '@ngx-compat/material-legacy/legacy-menu';
import {MatCommonModule as M9} from '@ngx-compat/material-legacy/legacy-paginator';
import {MatCommonModule as M10} from '@ngx-compat/material-legacy/legacy-radio';
import {MatCommonModule as M11} from '@ngx-compat/material-legacy/legacy-select';
import {MatCommonModule as M12} from '@ngx-compat/material-legacy/legacy-slide-toggle';
import {MatCommonModule as M13} from '@ngx-compat/material-legacy/legacy-slider';
import {MatCommonModule as M14} from '@ngx-compat/material-legacy/legacy-snack-bar';
import {MatCommonModule as M15} from '@ngx-compat/material-legacy/legacy-table';
import {MatCommonModule as M16} from '@ngx-compat/material-legacy/legacy-tabs';
import {MatCommonModule as M17} from '@ngx-compat/material-legacy/legacy-tooltip';
import {MatButtonModule} from '@angular/material/button';
@Component({selector:'lab-root',standalone:false,template:'<div dir="rtl">OK</div>'}) class App0 { @ViewChild(Dir) dir!:Dir; ngAfterViewInit(){(window as any).bidi=this.dir.value;} }
@Component({selector:'lab-root',standalone:false,template:'<div dir="rtl">OK</div>'}) class App1 { @ViewChild(Dir) dir!:Dir; ngAfterViewInit(){(window as any).bidi=this.dir.value;} }
@Component({selector:'lab-root',standalone:false,template:'<div dir="rtl">OK</div>'}) class App2 { @ViewChild(Dir) dir!:Dir; ngAfterViewInit(){(window as any).bidi=this.dir.value;} }
@Component({selector:'lab-root',standalone:false,template:'<div dir="rtl">OK</div>'}) class App3 { @ViewChild(Dir) dir!:Dir; ngAfterViewInit(){(window as any).bidi=this.dir.value;} }
@Component({selector:'lab-root',standalone:false,template:'<div dir="rtl">OK</div>'}) class App4 { @ViewChild(Dir) dir!:Dir; ngAfterViewInit(){(window as any).bidi=this.dir.value;} }
@Component({selector:'lab-root',standalone:false,template:'<div dir="rtl">OK</div>'}) class App5 { @ViewChild(Dir) dir!:Dir; ngAfterViewInit(){(window as any).bidi=this.dir.value;} }
const on={provide:MATERIAL_LEGACY_SANITY_CHECKS,useValue:true}, off={provide:MATERIAL_LEGACY_SANITY_CHECKS,useValue:false};
@NgModule({imports:[BrowserModule,MatLegacyCardModule],declarations:[App0],bootstrap:[App0],providers:[on]}) class CardOn {}
@NgModule({imports:[BrowserModule,MatLegacyProgressBarModule],declarations:[App1],bootstrap:[App1],providers:[on]}) class BarOn {}
@NgModule({imports:[BrowserModule,MatLegacyProgressSpinnerModule],declarations:[App2],bootstrap:[App2],providers:[on]}) class SpinnerOn {}
@NgModule({imports:[BrowserModule,MatLegacyCardModule],declarations:[App3],bootstrap:[App3],providers:[off]}) class CardOff {}
@NgModule({imports:[BrowserModule,MatLegacyProgressBarModule,MatLegacyCardModule,MatLegacyProgressSpinnerModule,MatButtonModule],declarations:[App4],bootstrap:[App4],providers:[on]}) class LegacyFirst {}
@NgModule({imports:[BrowserModule,MatButtonModule,MatLegacyProgressSpinnerModule,MatLegacyCardModule,MatLegacyProgressBarModule],declarations:[App5],bootstrap:[App5],providers:[on]}) class ModernFirst {}
const modules:any={card:CardOn,bar:BarOn,spinner:SpinnerOn,disabled:CardOff,legacyFirst:LegacyFirst,modernFirst:ModernFirst};
(window as any).start=async (which:string)=>{const warnings:string[]=[];const old=console.warn;console.warn=(...x:unknown[])=>{warnings.push(x.map(String).join(' '));};try{const mod=await platformBrowserDynamic().bootstrapModule(modules[which]);return {same:[Root,Card,Bar,Spinner,M0,M1,M2,M3,M4,M5,M6,M7,M8,M9,M10,M11,M12,M13,M14,M15,M16,M17].every(module => (module as unknown) === Core),instance:mod.injector.get(Core,null) instanceof Core,bidi:(window as any).bidi,warnings,classes:Array.from(document.body.classList),userAgent:navigator.userAgent};}finally{console.warn=old;}};
