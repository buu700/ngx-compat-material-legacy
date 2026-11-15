/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import 'zone.js';
import {AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Directive, ErrorHandler, inject, NgModule, provideCheckNoChangesConfig, provideZoneChangeDetection, provideZonelessChangeDetection, ViewChild} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MAT_CHECKBOX_DEFAULT_OPTIONS} from '@angular/material/checkbox';
import {MatLegacyCheckbox, MatLegacyCheckboxModule} from '@ngx-compat/material-legacy/legacy-checkbox';
const errors:string[]=[];
class Capture implements ErrorHandler { handleError(e:any){errors.push(String(e));} }
const tpl=`@if (show) {<mat-checkbox [indeterminate]="value" (indeterminateChange)="events.push('indeterminate:'+ $event)" (change)="onChange($event.checked)">Label</mat-checkbox>}`;
@Directive() abstract class Case implements AfterViewInit {
 abstract id:string; value:any=false; show=true; events:string[]=[]; cdr=inject(ChangeDetectorRef); @ViewChild(MatLegacyCheckbox) box!:MatLegacyCheckbox;
 ngAfterViewInit(){(window as any).cases[this.id]=this;}
 update(value:any){this.value=value;this.cdr.detectChanges();}
 onChange(checked:boolean){this.events.push('change:'+checked);this.events.push('inside-indeterminate:'+this.box.indeterminate);if(this.id==='destroy')this.destroy();}
 destroy(){this.show=false;this.cdr.detectChanges();}
}
@Component({selector:'case-default',standalone:false,changeDetection:ChangeDetectionStrategy.OnPush,template:tpl}) class Default extends Case {id='default';}
@Component({selector:'case-check',standalone:false,changeDetection:ChangeDetectionStrategy.OnPush,template:tpl,providers:[{provide:MAT_CHECKBOX_DEFAULT_OPTIONS,useValue:{clickAction:'check'}}]}) class Check extends Case {id='check';}
@Component({selector:'case-noop',standalone:false,changeDetection:ChangeDetectionStrategy.OnPush,template:tpl,providers:[{provide:MAT_CHECKBOX_DEFAULT_OPTIONS,useValue:{clickAction:'noop'}}]}) class Noop extends Case {id='noop';}
@Component({selector:'case-destroy',standalone:false,changeDetection:ChangeDetectionStrategy.OnPush,template:tpl}) class Destroy extends Case {id='destroy';}
@Component({selector:'control-case',standalone:false,changeDetection:ChangeDetectionStrategy.OnPush,template:'{{value}}'}) class Control implements AfterViewInit {value='before';ngAfterViewInit(){(window as any).control=this;}}
@Component({selector:'lab-root',standalone:false,template:'<case-default/><case-check/><case-noop/><case-destroy/><control-case/>'}) class Lab {}
(window as any).cases={}; (window as any).errors=errors;
const zoneful=new URL(location.href).searchParams.has('zoneful');
@NgModule({imports:[BrowserModule,MatLegacyCheckboxModule],declarations:[Lab,Default,Check,Noop,Destroy,Control],bootstrap:[Lab],providers:[{provide:ErrorHandler,useClass:Capture},provideCheckNoChangesConfig({exhaustive:true,interval:20}),zoneful?provideZoneChangeDetection():provideZonelessChangeDetection()]}) class LabModule {}
platformBrowserDynamic().bootstrapModule(LabModule).catch(err=>{const n=document.createElement('pre');n.id='bootstrap-error';n.textContent=String(err);document.body.appendChild(n)});
