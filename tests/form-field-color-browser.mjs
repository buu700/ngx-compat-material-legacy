#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Diagnostic-only main-floor packed Sass probe. Never grants matrix credit.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,readFileSync,readdirSync,realpathSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {withChromium} from '../scripts/check-companion-computed-styles.mjs';
import {browserCompilerOptions} from '../scripts/browser-peer-versions.mjs';
import {PLAN,observationOkay} from './form-field-color-browser-plan.mjs';

const root=process.cwd(), require=createRequire(join(root,'package.json'));
const [tarballArg,manifestArg,reportArg]=process.argv.slice(2);
if (!tarballArg || !manifestArg || !reportArg || process.argv.length!==5)
 throw Error('usage: node tests/form-field-color-browser.mjs diagnostic.tgz diagnostic.json report.json');
const tarball=resolve(tarballArg),manifest=JSON.parse(readFileSync(manifestArg)),sha=b=>createHash('sha256').update(b).digest('hex');
if(manifest.classification!=='diagnostic-only'||manifest.other_member_bytes_equal!==true||sha(readFileSync(tarball))!==manifest.derived_sha256)
 throw Error('diagnostic artifact identity mismatch');
const versions={'@angular/core':'22.1.7','@angular/common':'22.1.7','@angular/cdk':'22.1.7','@angular/material':'22.1.7','@angular/forms':'22.1.7','@angular/compiler':'22.1.7','@angular/compiler-cli':'22.1.7','@angular/platform-browser':'22.1.7','@angular/platform-browser-dynamic':'22.1.7','rxjs':'7.8.2','zone.js':'0.16.3','typescript':'6.0.3'};
const digests={'@angular/core':'fd7e79e557a78aa4ac6617a6056dbb461b07286ee5915bceec9af9e07742acbf','@angular/common':'610955815577349ba2ed3b9984e59e301e024a7dce9407419d38c1c461ac2baf','@angular/cdk':'ec60a5803a214c9b9d8bcdc2de0b0c294ecdd420d680d0e95e686f7aa4d46933','@angular/material':'5d33c35b56f9834d36a3be0ce4dc37892e689bceb1727de0cf223f10ab8f28af','@angular/forms':'41772be758b68eb139786af0f08c403dd87962f0e20384d5b85fcd0b4ba30e30','@angular/compiler':'f80d2d7613d473e1eb91c54b05f4976ab269a67e960f270c6c4f14dc3e438bbb','@angular/compiler-cli':'6cbb4b21a9236d2124d6acde1ff08428b3858a1d021e9ec753540fe8f7ac5f18','@angular/platform-browser':'87ecc7faef6583eb05d97d43203974400d4808f0942074a200fb0c4b1677b948','@angular/platform-browser-dynamic':'09458ca231de6cc534acd482c61827c449a371b3df562bedabc4f266e3dd37d1','rxjs':'2399f5d968d1d693ecd206e7972fd26cb7e3daa45931ecc12202b3a924be38b7','zone.js':'8195927048e4864e8aa1d01f9b24b423c0d8e5fc430b64bfa9b851e247f38b6e','typescript':'9332e97c30d3e53ed54910b89207ed657fb444066484df6e5b6965bf130865e9'};
const identities=Object.fromEntries(Object.entries(versions).map(([name,version])=>{
 const bytes=readFileSync(require.resolve(name+'/package.json')),manifest=JSON.parse(bytes),digest=sha(bytes);
 if(manifest.name!==name||manifest.version!==version||digest!==digests[name])throw Error('unexpected installed package: '+name);
 return [name,{version,manifest_sha256:digest}];
}));
if(process.versions.node!=='24.21.0')throw Error('unexpected Node version');
const peer=identities['@angular/material'];
const consumer=mkdtempSync(join(tmpdir(),'form-color-browser-'));
mkdirSync(join(consumer,'node_modules/@ngx-compat'),{recursive:true});
for(const entry of readdirSync(join(root,'node_modules')))
 if(entry!=='@ngx-compat')symlinkSync(join(root,'node_modules',entry),join(consumer,'node_modules',entry),'dir');
const unpack=join(consumer,'node_modules/@ngx-compat/material-legacy');mkdirSync(unpack);
const extracted=spawnSync('tar',['xzf',tarball,'--strip-components=1','-C',unpack],{encoding:'utf8'});
if(extracted.status!==0)throw Error(extracted.stderr);
for(const [path,digest] of Object.entries(manifest.replacements)){
 const actual=sha(readFileSync(join(unpack,path.replace(/^package\//,''))));
 if(actual!==digest.derived_sha256)throw Error('extracted Sass differs from diagnostic manifest');
}
const sass=require('sass');
const css=sass.compileString(`@use '@ngx-compat/material-legacy' as legacy;
$primary: legacy.define-palette(legacy.$indigo-palette);
$accent: legacy.define-palette(legacy.$pink-palette, A200, A100, A400);
$light: legacy.define-light-theme((color: (primary: $primary, accent: $accent)));
$dark-primary: legacy.define-palette(legacy.$indigo-palette, 700, 200, 900, 300);
$dark-warn: legacy.define-palette(legacy.$red-palette, 900);
$dark: legacy.define-dark-theme((color: (primary: $dark-primary, accent: $accent, warn: $dark-warn)));
@include legacy.core();
:where(.light) { @include legacy.form-field-color($light); }
:where(.dark) { @include legacy.form-field-color($dark); }
`,{loadPaths:[join(consumer,'node_modules')],style:'expanded',logger:{warn(){},debug(){}}}).css;
const field=(tone,appearance,variant)=>{
 const cls=variant==='accent'||variant==='warn'?` class="mat-${variant}"`:'';
 const control=variant==='error'?' [formControl]="invalid"':variant==='disabled'?' disabled':'';
 return `<mat-form-field id="${tone}-${appearance}-${variant}" appearance="${appearance==='filled'?'fill':'outline'}"${cls}><mat-label>Label</mat-label><input matInput placeholder="Placeholder"${control}></mat-form-field>`;
};
const body=['light','dark'].map(tone=>`<div class="${tone}">${['filled','outlined'].flatMap(a=>['normal','disabled','error','accent','warn'].map(v=>field(tone,a,v))).join('')}</div>`).join('');
mkdirSync(join(consumer,'src'));mkdirSync(join(consumer,'dist'));
writeFileSync(join(consumer,'src/main.ts'),`import 'zone.js';
import {Component,NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormControl,ReactiveFormsModule,Validators} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
@Component({standalone:false,selector:'test-root',template:\`${body}\`})
class App {invalid=new FormControl('',Validators.required);constructor(){this.invalid.markAsTouched();}}
@NgModule({imports:[BrowserModule,ReactiveFormsModule,MatInputModule,MatFormFieldModule],declarations:[App],bootstrap:[App],providers:[{provide:MATERIAL_ANIMATIONS,useValue:{animationsDisabled:true}}]}) class AppModule {}
platformBrowserDynamic().bootstrapModule(AppModule).catch(e=>{document.body.setAttribute('data-error',String(e));});`);
writeFileSync(join(consumer,'tsconfig.json'),JSON.stringify({compilerOptions:browserCompilerOptions({typescript:require('typescript/package.json').version}),files:['src/main.ts'],angularCompilerOptions:{compilationMode:'full',strictTemplates:true}}));
const ngc=join(consumer,'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
const built=spawnSync(process.execPath,[ngc,'-p','tsconfig.json'],{cwd:consumer,encoding:'utf8',timeout:180000});
if(built.status!==0)throw Error((built.stderr||'')+(built.stdout||''));
const linkerRequire=createRequire(realpathSync(join(consumer,'node_modules/@angular/compiler-cli/package.json')));
const {transformSync}=linkerRequire('@babel/core'),linker=linkerRequire('@angular/compiler-cli/linker/babel').default,{needsLinking}=linkerRequire('@angular/compiler-cli/linker');
await require('esbuild').build({absWorkingDir:consumer,entryPoints:['out/main.js'],bundle:true,format:'iife',outfile:'dist/app.js',platform:'browser',logLevel:'silent',plugins:[{name:'ng-linker',setup(build){build.onLoad({filter:/\.m?js$/},args=>{const source=readFileSync(args.path,'utf8');if(!source.includes('ɵɵngDeclare')||!needsLinking(args.path,source))return null;return {contents:transformSync(source,{filename:args.path,compact:false,configFile:false,babelrc:false,plugins:[[linker,{linkerJitMode:false}]]}).code,loader:'js'};});}}]});
const bundle=readFileSync(join(consumer,'dist/app.js'));
if(bundle.includes('ɵɵngDeclare'))throw Error('unlinked Angular declarations in bundle');
const bundleSha256=sha(bundle);
if(bundleSha256!=='0a9877e1087e2c0c316a520d03749b5d5ddda999c8e790402fc8bcb8a20ed304'||sha(css)!=='3ed6d7a21fcc95e406f51f9b4264a5c8508c66c3e5755fd293739e9d57f372a6')throw Error('unreviewed bundle or compiled Sass');
writeFileSync(join(consumer,'dist/app.css'),css);
writeFileSync(join(consumer,'dist/index.html'),'<!doctype html><html><head><link rel="stylesheet" href="/app.css"></head><body><test-root></test-root><script src="/app.js"></script></body></html>');
if(process.env.FORM_COLOR_PREPARE_ONLY==='1'){console.log(JSON.stringify({consumer,artifact_sha256:manifest.derived_sha256,compiled_css_sha256:sha(css),bundle_sha256:bundleSha256,identities,result:'prepared; browser not executed'}));process.exit(0);}
const catalog=JSON.parse(readFileSync(join(root,'fixtures/sass/form-field-state-contracts.json')));
function historical(tone,appearance,token,variant){
 const e=catalog.cases[tone==='dark'?'mixin-argument/form-field-theme/custom-dark-theme':'mixin-css/form-field-color'];
 const css=e.color.css;
 const suffix=token.replace(appearance+'-','');
 const orig=suffix==='hover-label-text-color'?'label-text-color':suffix==='error-hover-label-text-color'?'error-label-text-color':suffix;
 const prefix=`--mdc-${appearance}-text-field-${orig}: `;
 const selector=e.scope+' .mat-mdc-form-field.mat-'+variant+' {';
 const part=variant==='accent'||variant==='warn'?css.slice(css.indexOf(selector)).split('\n}')[0]:css.split('\n\n')[0];
 const matches=part.split('\n').filter(line=>line.trimStart().startsWith(prefix));
 if(matches.length!==1)throw Error('historical role missing: '+tone+'/'+token+'/'+variant);
 return matches[0].trim().slice(prefix.length,-1);
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];let browserVersion=null,seedObservations=null,served=null,nativeControl=null;
await withChromium(join(consumer,'dist'),async({send,browser})=>{
 browserVersion=browser;const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result?.value;
 await send('Runtime.enable');await send('Emulation.setEmulatedMedia',{features:[{name:'hover',value:'hover'}]});
 for(let n=0;n<100&&!await evaluate('!!document.querySelector("#light-filled-normal input")');n++)await sleep(100);
 if(await evaluate('document.body.hasAttribute("data-error")'))throw Error('Angular bootstrap failed');
 served=await evaluate(`(async()=>{const digest=async url=>{const r=await fetch(url,{cache:'no-store'}),b=await r.arrayBuffer(),h=await crypto.subtle.digest('SHA-256',b);return {status:r.status,sha256:[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')};};return {bundle:await digest('/app.js'),css:await digest('/app.css')};})()`);
 if(served?.bundle?.status!==200||served?.css?.status!==200||served.bundle.sha256!==bundleSha256||served.css.sha256!==sha(css))throw Error('Chromium HTTP response bytes changed');
 // Separate native DOM control records, rather than assumes, CSSOM behavior.
 nativeControl=await evaluate(`(()=>{const run=clearFirst=>{const host=document.createElement('div'),child=document.createElement('span');child.style.color='var(--closeout-probe, rgb(1, 2, 3))';host.appendChild(child);document.body.appendChild(host);const original=host.getAttribute('style'),baseline=getComputedStyle(child).color;host.style.setProperty('--closeout-probe','rgb(255, 0, 255)');const negative=getComputedStyle(child).color;if(clearFirst)host.style.removeProperty('--closeout-probe');host.removeAttribute('style');const immediate=host.getAttribute('style'),recovered=getComputedStyle(child).color,afterRead=host.getAttribute('style');host.remove();return {original,baseline,negative,immediate,recovered,afterRead};};return {v4:run(false),repaired:run(true)};})()`);
 if(!nativeControl?.v4||!nativeControl?.repaired)throw Error('native CSSOM control missing');
 // Seed all three real host attribute states after Angular has stabilized. The
 // unrelated custom property must not alter any representative field color.
 seedObservations=await evaluate(`(()=>{const hosts=[...document.querySelectorAll('test-root mat-form-field')];return hosts.map((host,i)=>{
  const read=()=>{const input=host.querySelector('input'),label=host.querySelector('.mdc-floating-label'),wrapper=host.querySelector('.mdc-text-field');return [getComputedStyle(input).color,getComputedStyle(input).caretColor,getComputedStyle(label).color,getComputedStyle(wrapper).backgroundColor]};
  const before=read(),kind=['absent','empty','populated'][i%3];
  if(kind==='absent')host.removeAttribute('style');else host.setAttribute('style',kind==='empty'?'':'--closeout-unrelated-marker: 7;');
  return {id:host.id,kind,attribute:host.getAttribute('style'),before,after:read()};});})()`);
 if(!Array.isArray(seedObservations)||seedObservations.length!==20||new Set(seedObservations.map(row=>row.kind)).size!==3||seedObservations.some(row=>JSON.stringify(row.before)!==JSON.stringify(row.after)||row.attribute!==({absent:null,empty:'',populated:'--closeout-unrelated-marker: 7;'})[row.kind]))throw Error('host style seed missing or changed theme');
 const seededById=Object.fromEntries(seedObservations.map(row=>[row.id,row]));
 for(const tone of ['light','dark'])for(const plan of PLAN){
  const variants=['normal'];if(['caret-color','focus-label-text-color','focus-active-indicator-color','focus-outline-color'].some(x=>plan.token.endsWith('-'+x)))variants.push('accent','warn');
  for(const palette of variants){
   const variant=plan.state.startsWith('error')?'error':plan.state==='disabled'?'disabled':palette;
   if(palette!=='normal' && variant!==palette)continue;
   const id=`${tone}-${plan.appearance}-${variant}`;
   await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
   await evaluate(`document.activeElement?.blur();document.getElementById(${JSON.stringify(id)}).scrollIntoView({block:'center'});`);
   if(plan.state==='focus'||plan.state==='error-focus')await evaluate(`document.querySelector('#'+${JSON.stringify(id)}+' input').focus()`);
   if(plan.state==='hover'||plan.state==='error-hover'){
    const p=await evaluate(`(()=>{const r=document.querySelector('#'+${JSON.stringify(id)}+' .mdc-text-field').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});
   }
   await sleep(100);
   const expected=historical(tone,plan.appearance,plan.token,palette);
   const expression=`(()=>{const host=document.getElementById(${JSON.stringify(id)}),wrapper=host?.querySelector('.mdc-text-field'),target=host?.querySelector(${JSON.stringify(plan.target)}),input=host?.querySelector('input');
    const value=()=>target?getComputedStyle(target,${JSON.stringify(plan.pseudo)})[${JSON.stringify(plan.property)}]:null;
    const color=document.createElement('span');color.style.color=${JSON.stringify(expected)};document.body.appendChild(color);const expected=getComputedStyle(color).color;color.remove();
    const state=${JSON.stringify(plan.state)};const state_ok=!!wrapper&&((state.startsWith('error'))===wrapper.classList.contains('mdc-text-field--invalid'))&&((state==='disabled')===wrapper.classList.contains('mdc-text-field--disabled'))&&((state==='focus'||state==='error-focus')===wrapper.classList.contains('mdc-text-field--focused'))&&((state==='hover'||state==='error-hover')===wrapper.matches(':hover'));
    const original_style=host?.getAttribute('style')??null,baseline=value();host.style.setProperty('--mat-form-field-'+${JSON.stringify(plan.token)},'rgb(255, 0, 255)');const negative=value();
    // Clear the live CSSStyleDeclaration before restoring the exact attribute;
    // then check the attribute both before and after reading the recovered color.
    host.style.removeProperty('--mat-form-field-'+${JSON.stringify(plan.token)});
    if(original_style===null){const attr=host.getAttributeNode('style');if(attr)host.removeAttributeNode(attr);}else host.setAttribute('style',original_style);
    const immediately_restored_style=host.getAttribute('style'),recovered=value(),restored_style=host.getAttribute('style');
    return {state_ok,target_present:!!target,expected,baseline,negative,recovered,original_style,immediately_restored_style,restored_style};})()`;
   const observed=await evaluate(expression),seed=seededById[id];rows.push({tone,palette,...plan,...observed,seed_kind:seed?.kind??null,ok:!!seed&&observed?.original_style===seed.attribute&&observed?.immediately_restored_style===seed.attribute&&observationOkay(observed)});
  }
 }
});
if(sha(readFileSync(join(consumer,'dist/app.js')))!==bundleSha256||sha(readFileSync(join(consumer,'dist/app.css')))!==sha(css))throw Error('served files changed after browser');
const report={classification:'diagnostic-only',artifact_sha256:manifest.derived_sha256,baseline_sha256:manifest.baseline_sha256,material_version:peer.version,identities,node_version:process.versions.node,sass:sass.info,browser:browserVersion,compiled_css_sha256:sha(css),bundle_sha256:bundleSha256,served,native_control:nativeControl,seed_observations:seedObservations,case_count:rows.length,ok:rows.length===104&&rows.every(row=>row.ok)&&['absent','empty','populated'].every(kind=>rows.some(row=>row.seed_kind===kind)),rows};
writeFileSync(reportArg,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({case_count:rows.length,ok:report.ok,failed:rows.filter(row=>!row.ok).map(row=>({tone:row.tone,palette:row.palette,token:row.token,state:row.state}))},null,2));if(!report.ok)process.exitCode=1;
