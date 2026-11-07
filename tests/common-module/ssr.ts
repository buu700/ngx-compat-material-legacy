/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import 'zone.js/node';
import '@angular/compiler';
import {Component} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {provideServerRendering, renderApplication} from '@angular/platform-server';
import {MatLegacyCardModule} from '@ngx-compat/material-legacy/legacy-card';
import {MatLegacyProgressBarModule} from '@ngx-compat/material-legacy/legacy-progress-bar';
import {MatLegacyProgressSpinnerModule} from '@ngx-compat/material-legacy/legacy-progress-spinner';
@Component({selector:'lab-root',standalone:true,imports:[MatLegacyCardModule,MatLegacyProgressBarModule,MatLegacyProgressSpinnerModule],template:'<mat-card>Server card</mat-card><mat-progress-bar></mat-progress-bar><mat-spinner></mat-spinner><div dir="rtl">Bidi</div>'}) class App {}
if(typeof globalThis.document!=='undefined'||typeof globalThis.window!=='undefined')throw Error('Unexpected DOM global');
for(let i=0;i<2;i++){const html=await renderApplication(context=>bootstrapApplication(App,{providers:[provideServerRendering()]},context),{document:'<!doctype html><html><head></head><body><lab-root></lab-root></body></html>'});if(!html.includes('Server card')||!html.includes('mat-progress-bar')||!html.includes('mat-progress-spinner')||!html.includes('dir="rtl"'))throw Error('Missing server output');console.log(JSON.stringify({request:i,passed:true,bytes:html.length,hasBrowserGlobal:typeof globalThis.window!=='undefined'}));}
