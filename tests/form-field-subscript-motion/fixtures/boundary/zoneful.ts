/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import 'zone.js';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, NgModule, NgZone, inject} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {MatLegacyFormField, MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
@Component({standalone:false,selector:'lab-root',changeDetection:ChangeDetectionStrategy.OnPush,template:`@if(show) {<mat-form-field><mat-label>Label</mat-label><input matInput [formControl]="control"><mat-hint>Hint</mat-hint><mat-error>Error</mat-error></mat-form-field>}`})
export class LabRoot {
 control = new FormControl('', Validators.required); show = true; cdr=inject(ChangeDetectorRef); zone=inject(NgZone);
 ngAfterViewInit() { (window as any).lab={batch:(states:boolean[])=>this.zone.run(()=>{for(const invalid of states){if(invalid){this.control.setValue('');this.control.markAsTouched();}else{this.control.setValue('valid');}}this.cdr.markForCheck();}),set:(invalid:boolean)=>this.zone.run(()=>{if(invalid){this.control.setValue('');this.control.markAsTouched();} else {this.control.setValue('valid');}this.cdr.markForCheck();}),destroy:()=>this.zone.run(()=>{this.show=false;this.cdr.markForCheck();})}; }
}
@NgModule({imports:[BrowserModule,ReactiveFormsModule,MatLegacyFormFieldModule,MatLegacyInputModule],declarations:[LabRoot],bootstrap:[LabRoot],providers:[{provide:MATERIAL_ANIMATIONS,useValue:{animationsDisabled:false}}]}) export class LabModule {}
platformBrowserDynamic().bootstrapModule(LabModule).catch(err=>{const node=document.createElement('pre');node.id='bootstrap-error';node.textContent=String(err);document.body.appendChild(node)});
