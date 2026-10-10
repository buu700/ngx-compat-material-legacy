/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const[mode,production]=process.argv.slice(2);
if(production==='true')globalThis.ngDevMode=false;
if(mode==='zoneful')await import('zone.js/node');
await import('@angular/compiler');
const core=await import('@angular/core'),browser=await import('@angular/platform-browser');
const server=await import('@angular/platform-server'),material=await import('@angular/material/core');
const platform=await import('@angular/cdk/platform'),a11y=await import('@angular/cdk/a11y'),coercion=await import('@angular/cdk/coercion');
const payload=JSON.parse(readFileSync(new URL('./ripple-hydration-ssr-payload.json',import.meta.url)));
const modules=new Map(),external={'@angular/core':core,'@angular/cdk/platform':platform,'@angular/cdk/a11y':a11y,'@angular/cdk/coercion':coercion};
function load(key){if(modules.has(key))return modules.get(key);const exports={};modules.set(key,exports);
 const require=specifier=>external[specifier]||load({'./ripple-ref':'ref','./ripple-event-manager':'manager','../internal/dom/shadow-dom':'helper'}[specifier]);
 assert.equal(typeof payload[key],'string',key);new Function('exports','require',payload[key])(exports,require);return exports;}
const renderer=load('renderer'),helper=load('helper'),exported={};
new Function('exports','Component','ViewChild','ElementRef','NgZone','inject','signal','Platform','MatLegacyRipple','MatLegacyRippleModule','LegacyRippleRenderer','legacyGetEventTarget',payload.fixture)
 (exported,core.Component,core.ViewChild,core.ElementRef,core.NgZone,core.inject,core.signal,platform.Platform,
 material.MatRipple,material.MatRippleModule,renderer.LegacyRippleRenderer,helper.legacyGetEventTarget);
const hash=value=>createHash('sha256').update(value).digest('hex');
const options={document:'<!doctype html><html><head></head><body><ripple-hydration-lab></ripple-hydration-lab></body></html>',
 url:'http://127.0.0.1:9999/',allowedHosts:['127.0.0.1']};
const bootstrap=context=>browser.bootstrapApplication(exported.RippleHydrationLab,{providers:[server.provideServerRendering(),
 browser.provideClientHydration(browser.withEventReplay()),core[mode==='zoneful'?'provideZoneChangeDetection':'provideZonelessChangeDetection']()]},context);
const html=await server.renderApplication(bootstrap,options);
assert.match(html,/<ripple-hydration-lab[^>]*\bngh="0"[^>]*>/);
assert.match(html,/<button[^>]*id="replay-peer"[^>]*class="mat-ripple"[^>]*jsaction="mousedown:;mouseup:;click:;"[^>]*>Hydration 0<\/button>/);
assert.match(html,/<div[^>]*id="replay-owned"[^>]*class="mat-ripple"/);
assert.match(html,/<button[^>]*id="native-peer"[^>]*class="mat-ripple"[^>]*>Native peer only<\/button>/);
assert.match(html,/id="ng-state"[^>]*>\{"__nghData__":/);
await assert.rejects(()=>server.renderApplication(bootstrap,{...options,allowedHosts:[]}),error=>error.code===5706);
console.log(JSON.stringify({html,html_sha256:hash(html),genuine_peer_directive_SSR:true,owned_component_and_helpers_loaded:true,
 actual_server_DOM_and_public_renderApplication:true,hydration_metadata:true,replay_event_bindings:3,
 exact_loopback_allowlist_negative:true,public_server_version:server.VERSION.full,peer_directive_version:material.VERSION.full,
 actual_client_hydration_or_replayed_event_or_owned_renderer_instance_executed:false}));
