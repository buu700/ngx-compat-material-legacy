/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import {ANIMATION_MODULE_TYPE,ApplicationRef,ChangeDetectorRef,Component,ElementRef,Inject,NgModule,NgZone,Optional,ViewChild,inject,provideZonelessChangeDetection} from '@angular/core';
import {Subject} from 'rxjs';
import {Directionality} from '@angular/cdk/bidi';
import {Platform} from '@angular/cdk/platform';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MAT_LEGACY_FORM_FIELD_DEFAULT_OPTIONS,MatLegacyFormField,MatLegacyFormFieldDefaultOptions,MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
@Component({standalone:false,selector:'derived-field',template:`<div class="mat-form-field-wrapper" #connectionContainer #inputContainer><div class="mat-form-field-subscript-wrapper"><div>Message</div></div></div>`})
class DerivedField extends MatLegacyFormField {
 constructor(element:ElementRef,detector:ChangeDetectorRef,@Optional() direction:Directionality,
  @Optional() @Inject(MAT_LEGACY_FORM_FIELD_DEFAULT_OPTIONS) defaults:MatLegacyFormFieldDefaultOptions,
  platform:Platform,zone:NgZone,@Optional() @Inject(ANIMATION_MODULE_TYPE) mode:string){
  super(element,detector,direction,defaults,platform,zone,mode);
 }

 kind:'hint'|'error'='hint'; calls=0; fieldCdr=inject(ChangeDetectorRef);
 mark():void {this.fieldCdr.markForCheck();}
 private initControl=(this._control={id:'control',errorState:false,disabled:false,autofilled:false,focused:false,empty:true,shouldLabelFloat:false,required:false,ngControl:null,stateChanges:new Subject<void>(),setDescribedByIds() {}} as any,0);
 override _getDisplayedMessages():'hint'|'error' {return this.kind;}
 ngAfterViewChecked():void {this.calls++;}
}
@Component({standalone:false,selector:'lab-root',template:`@if (show) {<derived-field></derived-field>}`})
class LabRoot {
 @ViewChild(DerivedField) field!:DerivedField; cdr=inject(ChangeDetectorRef); app=inject(ApplicationRef); zone=inject(NgZone); show=true;
 ngAfterViewInit(){(window as any).lab={field:this.field,nodeScope:()=>((this.field as any)._injector?.get(ElementRef).nativeElement===document.querySelector('derived-field')),set:(kind:'hint'|'error')=>this.zone.run(()=>{this.field.kind=kind;this.field.mark();this.cdr.markForCheck();this.app.tick();}),destroy:()=>this.zone.run(()=>{this.show=false;this.cdr.markForCheck();this.app.tick();})};}
}
@NgModule({imports:[BrowserModule,MatLegacyFormFieldModule],declarations:[DerivedField,LabRoot],bootstrap:[LabRoot],providers:[provideZonelessChangeDetection()]}) class LabModule {}
platformBrowserDynamic().bootstrapModule(LabModule).catch(err=>{const node=document.createElement('pre');node.id='bootstrap-error';node.textContent=String(err);document.body.appendChild(node);});
