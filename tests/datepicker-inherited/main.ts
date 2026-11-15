/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import 'zone.js';
import {ApplicationRef, ChangeDetectorRef, Component, createComponent, EnvironmentInjector, ErrorHandler, inject, NgModule, provideZoneChangeDetection, provideZonelessChangeDetection, ViewChild} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DateAdapter} from '@angular/material/core';
import {MatCalendar, MatCalendarCellClassFunction, MatDatepicker, MatDatepickerModule} from '@angular/material/datepicker';
import {MatLegacyNativeDateModule, LegacyNativeDateAdapter} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
const errors:string[]=[];
window.addEventListener('error',e=>errors.push('window error: '+e.message));window.addEventListener('unhandledrejection',e=>errors.push('unhandled rejection: '+String(e.reason)));
class Capture implements ErrorHandler {handleError(e:unknown){errors.push(String(e));}}
@Component({selector:'lab-root',standalone:false,template:`
<mat-calendar [startAt]="start" [minDate]="min" [maxDate]="max" [dateClass]="dateClass" [dateFilter]="filter"></mat-calendar>
<mat-calendar id="default-calendar" [startAt]="start"></mat-calendar>
<mat-date-range-input [rangePicker]="rangePicker" [dateFilter]="inputFilter"><input matStartDate [formControl]="rangeStart"><input matEndDate [formControl]="rangeEnd"></mat-date-range-input><mat-date-range-picker #rangePicker></mat-date-range-picker>
<mat-form-field><input matInput [matDatepicker]="picker" [formControl]="control" [matDatepickerFilter]="inputFilter"><mat-datepicker #picker></mat-datepicker></mat-form-field>
`})
class Lab {
 rangeStart=new FormControl<Date|null>(new Date(2024,1,15)); rangeEnd=new FormControl<Date|null>(new Date(2024,1,16));
 @ViewChild(MatDatepicker) picker!:MatDatepicker<Date>; control=new FormControl<Date|null>(new Date(2024,1,15));
 @ViewChild(MatCalendar) calendar!:MatCalendar<Date>;
 start=new Date(2024,1,15); min:Date|null=new Date(2024,0,1);max:Date|null=new Date(2024,2,31);
 invalidFilter=42; badClass=42;
 dateClass:MatCalendarCellClassFunction<Date>=()=>'';
 filter:((date:Date)=>boolean)|null|undefined=undefined;
 inputFilter:((date:Date|null)=>boolean)|null|undefined=undefined;
 cdr=inject(ChangeDetectorRef);adapter=inject(DateAdapter);env=inject(EnvironmentInjector);app=inject(ApplicationRef);
 update(){this.cdr.detectChanges();}
 setClass(v:string|string[]|Set<string>|Record<string,any>){this.dateClass=()=>v;this.update();this.calendar.updateTodaysDate();this.update();}
 setFilter(v:'null'|'undefined'|'function'|'functionEnd'){this.filter=v==='null'?null:v==='undefined'?undefined:(d:Date)=>d.getDate()!==(v==='functionEnd'?16:15);this.inputFilter=v==='null'?null:v==='undefined'?undefined:(d:Date|null)=>!!d&&d.getDate()!==(v==='functionEnd'?16:15);this.update();}
 async early(fault:'none'|'focus'|'today'='none'){const host=document.createElement('div');document.body.appendChild(host);const ref=createComponent(MatCalendar<Date>,{environmentInjector:this.env,hostElement:host});this.app.attachView(ref.hostView);let focusCall="ok",todayCall="ok";try {if(fault==='focus')throw new Error("fault:focus");ref.instance.focusActiveCell();}catch(e){focusCall=String(e);}try {if(fault==='today')throw new Error("fault:today");ref.instance.updateTodaysDate();}catch(e){todayCall=String(e);}ref.setInput('startAt',this.start);ref.changeDetectorRef.detectChanges();ref.instance.focusActiveCell();this.app.tick();await new Promise(r=>setTimeout(r,100));const focused=host.contains(document.activeElement)&&!!(document.activeElement as HTMLElement)?.classList.contains('mat-calendar-body-cell');ref.destroy();const destroyed=!host.querySelector('.mat-calendar');host.remove();return {focusCall,todayCall,focused,destroyed};}
}
(window as any).errors=errors; (window as any).fixtureNonce='__FIXTURE_NONCE__';
const zoneful=new URL(location.href).searchParams.has('zoneful');
@NgModule({imports:[BrowserModule,ReactiveFormsModule,MatDatepickerModule,MatLegacyNativeDateModule,MatLegacyFormFieldModule,MatLegacyInputModule],declarations:[Lab],bootstrap:[Lab],providers:[{provide:ErrorHandler,useClass:Capture},zoneful?provideZoneChangeDetection():provideZonelessChangeDetection()]}) class LabModule {}
platformBrowserDynamic().bootstrapModule(LabModule).then(m=>{const app=m.injector.get(ApplicationRef);(window as any).lab=app.components[0].instance;(window as any).adapterOwned=(window as any).lab.adapter instanceof LegacyNativeDateAdapter;}).catch(err=>{const n=document.createElement('pre');n.id='bootstrap-error';n.textContent=String(err);document.body.appendChild(n)});
