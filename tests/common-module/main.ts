/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import 'zone.js';
import type {} from './api-surface';
import {Component, createNgModule, NgModule, ViewChild} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {Dir} from '@angular/cdk/bidi';
import {MatLegacyCommonModule as Core, MATERIAL_LEGACY_SANITY_CHECKS} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyAutocompleteModule} from '@ngx-compat/material-legacy/legacy-autocomplete';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {MatLegacyCardModule} from '@ngx-compat/material-legacy/legacy-card';
import {MatLegacyCheckboxModule} from '@ngx-compat/material-legacy/legacy-checkbox';
import {MatLegacyChipsModule} from '@ngx-compat/material-legacy/legacy-chips';
import {MatLegacyDialogModule} from '@ngx-compat/material-legacy/legacy-dialog';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
import {MatLegacyListModule} from '@ngx-compat/material-legacy/legacy-list';
import {MatLegacyMenuModule} from '@ngx-compat/material-legacy/legacy-menu';
import {MatLegacyPaginatorModule} from '@ngx-compat/material-legacy/legacy-paginator';
import {MatLegacyProgressBarModule} from '@ngx-compat/material-legacy/legacy-progress-bar';
import {MatLegacyProgressSpinnerModule} from '@ngx-compat/material-legacy/legacy-progress-spinner';
import {MatLegacyRadioModule} from '@ngx-compat/material-legacy/legacy-radio';
import {MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';
import {MatLegacySlideToggleModule} from '@ngx-compat/material-legacy/legacy-slide-toggle';
import {MatLegacySliderModule} from '@ngx-compat/material-legacy/legacy-slider';
import {MatLegacySnackBarModule} from '@ngx-compat/material-legacy/legacy-snack-bar';
import {MatLegacyTableModule} from '@ngx-compat/material-legacy/legacy-table';
import {MatLegacyTabsModule} from '@ngx-compat/material-legacy/legacy-tabs';
import {MatLegacyTooltipModule} from '@ngx-compat/material-legacy/legacy-tooltip';
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
@NgModule({}) class MissingCommonModule {}
class ForeignCommonModule {}
@NgModule({providers:[{provide:Core,useClass:ForeignCommonModule}]}) class ForeignCommonProvider {}
@NgModule({providers:[{provide:Core,useValue:{constructor:Core}}]}) class SameConstructorProvider {}
function isOwnedCommon(instance: Core | null): boolean {
  return instance instanceof Core && instance.constructor === Core;
}
const familyModules = [MatLegacyAutocompleteModule, MatLegacyButtonModule, MatLegacyCardModule,
  MatLegacyCheckboxModule, MatLegacyChipsModule, MatLegacyDialogModule, MatLegacyFormFieldModule,
  MatLegacyInputModule, MatLegacyListModule, MatLegacyMenuModule, MatLegacyPaginatorModule,
  MatLegacyProgressBarModule, MatLegacyProgressSpinnerModule, MatLegacyRadioModule,
  MatLegacySelectModule, MatLegacySlideToggleModule, MatLegacySliderModule,
  MatLegacySnackBarModule, MatLegacyTableModule, MatLegacyTabsModule, MatLegacyTooltipModule];
(window as any).start=async (which:string)=>{
  const warnings:string[]=[];
  const old=console.warn;
  console.warn=(...x:unknown[])=>{warnings.push(x.map(String).join(' '));};
  try {
    const mod=await platformBrowserDynamic().bootstrapModule(modules[which]);
    const bootstrapWarnings=warnings.slice();
    const missing:string[]=[];
    for (const family of familyModules) {
      const ref=createNgModule(family,mod.injector);
      try {
        const instance=ref.injector.get(Core,null,{self:true});
        if (!isOwnedCommon(instance)) missing.push(family.name);
      } finally { ref.destroy(); }
    }
    const empty=createNgModule(MissingCommonModule,mod.injector);
    let missingRejected=false;
    try { missingRejected=empty.injector.get(Core,null,{self:true}) === null; }
    finally { empty.destroy(); }
    const foreign=createNgModule(ForeignCommonProvider,mod.injector);
    let foreignRejected=false;
    try {
      const instance=foreign.injector.get(Core,null,{self:true});
      foreignRejected=instance instanceof ForeignCommonModule && !isOwnedCommon(instance);
    } finally { foreign.destroy(); }
    const spoof=createNgModule(SameConstructorProvider,mod.injector);
    let spoofRejected=false;
    try {
      const instance=spoof.injector.get(Core,null,{self:true});
      spoofRejected=!!instance && instance.constructor === Core && !isOwnedCommon(instance);
    } finally { spoof.destroy(); }
    return {missing,same:missing.length===0 && missingRejected && foreignRejected && spoofRejected,
      missingRejected,foreignRejected,spoofRejected,instance:mod.injector.get(Core,null) instanceof Core,
      bidi:(window as any).bidi,warnings:bootstrapWarnings,classes:Array.from(document.body.classList),
      userAgent:navigator.userAgent};
  } finally { console.warn=old; }
};
