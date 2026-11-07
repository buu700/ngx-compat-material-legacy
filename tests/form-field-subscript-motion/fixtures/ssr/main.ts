/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 * Copyright (c) 2026 Ryan Lester.
 */
import 'zone.js/node';
import '@angular/compiler';
import {ChangeDetectorRef, Component, inject, PLATFORM_ID, ApplicationRef, provideEnvironmentInitializer} from '@angular/core';
import {isPlatformServer, DOCUMENT} from '@angular/common';
import {bootstrapApplication} from '@angular/platform-browser';
import {renderApplication, provideServerRendering} from '@angular/platform-server';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
const assert={equal:(a:any,b:any,n='')=>{if(a!==b)throw Error(n+': '+JSON.stringify(a)+' != '+JSON.stringify(b));},ok:(a:any)=>{if(!a)throw Error('assert ok failed');},deepEqual:(a:any,b:any)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error('deep equal failed: '+JSON.stringify(a));},match:(a:string,b:RegExp)=>{if(!b.test(a))throw Error('match failed '+b);},doesNotMatch:(a:string,b:RegExp)=>{if(b.test(a))throw Error('unexpected match '+b);}};
const observations:any = {platform:null,states:[],destroyed:false,geometry:[],animations:0};
@Component({selector:'lab-root',imports:[ReactiveFormsModule,MatLegacyFormFieldModule,MatLegacyInputModule],template:`@if(show) {<mat-form-field><mat-label>Label</mat-label><input matInput [formControl]="control"><mat-hint>Hint</mat-hint><mat-error>Error</mat-error></mat-form-field>}`})
class App {
 control = new FormControl('valid', Validators.required); show=true; cdr=inject(ChangeDetectorRef); doc=inject(DOCUMENT);
 constructor(){ observations.platform=isPlatformServer(inject(PLATFORM_ID)); }
 ngAfterViewInit(){
  const capture=(name:string)=>{const field=this.doc.querySelector('mat-form-field')!; observations.states.push({name,html:field.outerHTML});};
  capture('hint');
  this.control.setValue(''); this.control.markAsTouched(); this.cdr.detectChanges(); capture('error');
  this.control.setValue('valid'); this.cdr.detectChanges(); capture('hint-again');
  this.show=false; this.cdr.detectChanges(); observations.removed=!this.doc.querySelector('mat-form-field');
  this.show=true; this.cdr.detectChanges(); this.control.setValue(''); this.control.markAsTouched(); this.cdr.detectChanges(); capture('recreated-error');
 }
 ngOnDestroy(){observations.destroyed=true;}
}
function instrument(){
 const doc=inject(DOCUMENT); Object.defineProperty(Object.getPrototypeOf(doc.createElement('div')), 'animate', {configurable:true, value:()=>{observations.animations++; throw Error('unexpected server animation');}}); let p:any=Object.getPrototypeOf(doc.createElement('div')); const seen=new Set<string>();
 while(p){for(const name of ['getBoundingClientRect','getClientRects','offsetWidth','offsetHeight','clientWidth','clientHeight','scrollWidth','scrollHeight']){if(seen.has(name))continue;const d=Object.getOwnPropertyDescriptor(p,name);if(!d || !d.configurable)continue;seen.add(name);if(typeof d.value==='function'){const original=d.value;Object.defineProperty(p,name,{...d,value:function(...args:any[]){observations.geometry.push(name);return original.apply(this,args);}});}else if(d.get){const original=d.get;Object.defineProperty(p,name,{...d,get:function(){observations.geometry.push(name);return original.call(this);}});}}p=Object.getPrototypeOf(p);}
 for(const name of ['getBoundingClientRect','getClientRects','offsetWidth','offsetHeight','clientWidth','clientHeight','scrollWidth','scrollHeight']){if(seen.has(name))continue;const trap=()=>{observations.geometry.push(name);throw Error('unexpected server geometry read: '+name);};Object.defineProperty(Object.getPrototypeOf(doc.createElement('div')),name,name.startsWith('get')?{configurable:true,value:trap}:{configurable:true,get:trap});seen.add(name+' (absent on server; trap)');}
 observations.instrumented=[...seen];
}
let ref:ApplicationRef;
const html=await renderApplication(async (context)=>{ref=await bootstrapApplication(App,{providers:[provideServerRendering(),provideEnvironmentInitializer(instrument),{provide:MATERIAL_ANIMATIONS,useValue:{animationsDisabled:false}}]},context);return ref;},{document:'<!doctype html><html><head></head><body><lab-root></lab-root></body></html>'});
assert.equal(observations.platform,true);
assert.ok(observations.instrumented.some((x:string)=>x.startsWith('getBoundingClientRect')));
assert.deepEqual(observations.geometry,[]);
assert.equal(observations.animations,0);
assert.equal(observations.removed,true);
assert.equal(observations.destroyed,true);
for(const s of observations.states){const error=s.name.includes('error');assert.equal(s.html.includes('mat-error'),error,s.name);assert.equal(s.html.includes('mat-hint'),!error,s.name);if(error){assert.match(s.html,/<mat-error[^>]*aria-live="polite"/);assert.match(s.html,/<mat-error[^>]*aria-atomic="true"/);}assert.doesNotMatch(s.html,/mat-form-field-subscript-message/);const id=s.html.match(error?/id="(mat-error-\d+)"/:/id="(mat-hint-\d+)"/);assert.ok(id);assert.ok(s.html.includes('aria-describedby="'+id![1]+'"'));}
assert.match(html,/mat-error/);assert.doesNotMatch(html,/mat-hint/);
console.log('FORM_FIELD_SSR_RESULT '+JSON.stringify({observations,serialized:html}));
