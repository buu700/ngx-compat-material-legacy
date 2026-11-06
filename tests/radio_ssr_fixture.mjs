/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Run in a separately installed, pinned packed consumer. No install or publication occurs. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,join,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
assert.ok(process.argv[2],'usage: node radio_ssr_fixture.mjs <consumer-root> [--expect-document-error] [--html-out <path>]');
const root=realpathSync(process.argv[2]),require=createRequire(join(root,'package.json'));
const packages=realpathSync(join(root,'node_modules'))+sep;
async function load(name){const path=realpathSync(require.resolve(name));assert.ok(path.startsWith(packages),'module outside consumer: '+name);return import(pathToFileURL(path).href);}
await load('zone.js/node');await load('@angular/compiler');
const {Component,ChangeDetectionStrategy,provideZoneChangeDetection,ErrorHandler}=await load('@angular/core');
const {bootstrapApplication}=await load('@angular/platform-browser');
const {renderApplication,provideServerRendering}=await load('@angular/platform-server');
const {MatLegacyRadioModule}=await load('@ngx-compat/material-legacy/legacy-radio');
assert.equal(typeof globalThis.document,'undefined');assert.equal(typeof globalThis.window,'undefined');
const errors=[];
class RadioRoot {}
Component({selector:'radio-root',standalone:true,changeDetection:ChangeDetectionStrategy.Eager??ChangeDetectionStrategy.Default,imports:[MatLegacyRadioModule],template:'<mat-radio-group value="b"><mat-radio-button value="a">A</mat-radio-button><mat-radio-button value="b">B</mat-radio-button></mat-radio-group>'})(RadioRoot);
const html=await renderApplication(context=>bootstrapApplication(RadioRoot,{providers:[provideServerRendering(),provideZoneChangeDetection(),{provide:ErrorHandler,useValue:{handleError(error){errors.push({name:error?.name,message:error?.message});}}}]},context),{document:'<!doctype html><html><body><radio-root></radio-root></body></html>',url:'http://localhost/',allowedHosts:['localhost']});
await new Promise(done=>setTimeout(done,10));
assert.equal((html.match(/class="mat-radio-input/g)||[]).length,2);assert.ok(html.includes('value="b"'));
const baseline=process.argv.includes('--expect-document-error');assert.equal(errors.length,baseline?1:0,JSON.stringify(errors));
if(baseline){assert.equal(errors[0].name,'ReferenceError');assert.equal(errors[0].message,'document is not defined');}
assert.equal(typeof globalThis.document,'undefined');assert.equal(typeof globalThis.window,'undefined');
const outIndex=process.argv.indexOf('--html-out');if(outIndex!==-1){assert.ok(process.argv[outIndex+1]);writeFileSync(resolve(process.argv[outIndex+1]),html);}
const hash=b=>createHash('sha256').update(b).digest('hex');
const radio=join(root,'node_modules/@ngx-compat/material-legacy/fesm2022/ngx-compat-material-legacy-legacy-radio.mjs');
console.log(JSON.stringify({scope:'Actual Angular server render of a packed consumer; no global document/window',node:process.version,baseline,errors,radios:2,html_sha256:hash(html),radio_fesm_sha256:hash(readFileSync(radio)),consumer_lock_sha256:hash(readFileSync(join(root,'package-lock.json')))}));
