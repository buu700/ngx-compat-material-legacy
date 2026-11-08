import {writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {installConsumer,buildLab,versionsFor,readPackedPackage,withChromium} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/check-companion-computed-styles.mjs';
const out='/home/parallels/.codex/closeout-state/2026-11-07-recovery/paginator-tabbody-contract-a488-v1';
const root='/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy';
const tarball='/home/parallels/.codex/closeout-state/2026-11-07-recovery/root-disabled-composition-v1/ngx-compat-material-legacy-22.0.0-rc.0.tgz';
const versions=versionsFor(readPackedPackage(tarball));
const {consumer,env}=installConsumer(tarball,versions);
const source=`import 'zone.js';
import {Component, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MatLegacyPaginatorModule} from '@ngx-compat/material-legacy/legacy-paginator';
@Component({selector:'lab-root',standalone:false,template:\`
@if (show) { <section id="default-ltr" dir="ltr"><mat-paginator (page)="record($event)" [length]="100" [pageSize]="10" [pageSizeOptions]="[10,25,50]"></mat-paginator></section> }
<section id="default-rtl" dir="rtl"><mat-paginator (page)="record($event)" [length]="100" [pageSize]="10" [pageSizeOptions]="[10,25,50]"></mat-paginator></section>
<section id="dense-ltr" class="dense" dir="ltr"><mat-paginator (page)="record($event)" [length]="100" [pageSize]="10" [pageSizeOptions]="[10,25,50]"></mat-paginator></section>
<section id="dense-rtl" class="dense" dir="rtl"><mat-paginator (page)="record($event)" [length]="100" [pageSize]="10" [pageSizeOptions]="[10,25,50]"></mat-paginator></section>
<section id="disabled" dir="ltr"><mat-paginator (page)="record($event)" [length]="100" [disabled]="true" [pageSize]="10" [pageSizeOptions]="[10,25,50]"></mat-paginator></section><section id="hidden"><mat-paginator [hidePageSize]="true" [length]="100" [pageSizeOptions]="[10,25]"></mat-paginator></section>\`}) class App { events: any[] = []; show = true; record(e: any) { this.events.push({...e}); } constructor() { (window as any).lab = this; } }
@NgModule({imports:[BrowserModule,MatLegacyPaginatorModule],declarations:[App],bootstrap:[App]}) class AppModule {}
platformBrowserDynamic().bootstrapModule(AppModule).catch(e=>{document.body.setAttribute('data-error',String(e));});`;
await buildLab(consumer,env,versions,source);
const require=createRequire(root+'/package.json'); const sass=require('sass');
const scss=`@use '@ngx-compat/material-legacy' as l; $p:l.define-palette(l.$indigo-palette); $a:l.define-palette(l.$pink-palette, A200,A100,A400); $base:l.define-light-theme((color:(primary:$p,accent:$a),typography:l.define-legacy-typography-config(),density:0)); $dense:l.define-light-theme((color:(primary:$p,accent:$a),typography:l.define-legacy-typography-config(),density:-3)); @include l.legacy-core(); @include l.all-legacy-component-themes($base); .dense { @include l.all-legacy-component-themes($dense); }`;
const css=sass.compileString(scss,{loadPaths:[join(consumer,'node_modules')],silenceDeprecations:['if-function','global-builtin','color-functions','import']});
writeFileSync(join(consumer,'dist/theme.css'),css.css);
writeFileSync(join(consumer,'dist/index.html'),'<html><head><link rel="stylesheet" href="/theme.css"><style>body{margin:0} section{height:100px} *,*::before,*::after{animation:none!important;transition:none!important}</style></head><body><lab-root></lab-root><script src="/app.js"></script></body></html>');
writeFileSync(out+'/runtime.json',JSON.stringify({tarball,versions,consumer,cssLoaded:css.loadedUrls.map(String)},null,2));
