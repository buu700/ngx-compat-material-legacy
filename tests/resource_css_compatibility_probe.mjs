/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete CSS for three restored resources; actual rendered/browser/packed scope remains separate. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),sass=require('sass'),esbuild=require('esbuild'),sha=b=>createHash('sha256').update(b).digest('hex');
const args=process.argv.slice(2),options={};assert.equal(args.length,10);for(let i=0;i<args.length;i+=2){assert.ok(['--original-root','--main-root','--maintenance-root','--parser-root','--report'].includes(args[i]));assert.ok(!options[args[i]]);options[args[i]]=resolve(args[i+1]);}assert.equal(existsSync(options['--report']),false);
const parserPackage=JSON.parse(readFileSync(join(options['--parser-root'],'package.json')));assert.equal(parserPackage.name,'postcss');assert.equal(parserPackage.version,'8.5.28');const postcss=require(join(options['--parser-root'],'lib/postcss.js'));
const pins={'legacy-chips/chips.scss':'2dad061a250718c7977b726e5378bfa67b508a0e863bff53dee283d1b060f16a','legacy-paginator/paginator.scss':'fac3097c6684068573c6af65ad4ffb767adc87c61a2ebc78d59afffa2ebe100d','legacy-checkbox/checkbox.scss':'e27cfb000644622cf0d42ce350fe99824e82f70a0aa3fede676a17dc25fbbccd','legacy-paginator/paginator.html':'cc9f27769734dd241cf5ae4ddcdd70b5dd9c92c0bfc1af1e23048c6c8d794d57'};
const originals=new Map();for(const [file,pin]of Object.entries(pins)){const text=readFileSync(join(root,'reference/material-16.2.14/component-structural-sources',file),'utf8');assert.equal(sha(text),pin,'tagged resource changed');originals.set(file,text);}
const template=readFileSync(join(root,'projects/ngx-material-legacy/legacy-paginator/paginator.html'),'utf8');const validateTemplate=text=>assert.equal(text,originals.get('legacy-paginator/paginator.html'),'historical paginator template changed');validateTemplate(template);
const identity=JSON.parse(readFileSync(join(root,'compatibility/rc/original16-sass-source-diagnostic-identity.json'))),knownOriginal=new Map();for(const list of Object.values(identity.loaded_source_sets))for(const m of list)knownOriginal.set(m.path,m);
const publicSources=[['--original-root','dd7e20cc3b362ed0140de0b277b8d192720cb72c4e480337910a499a0f5bfed5'],['--main-root','534372c8fe2542a439818bf5dddc76264e3cbe1dfb0cf3188a39b8a14fa1d159'],['--maintenance-root','534372c8fe2542a439818bf5dddc76264e3cbe1dfb0cf3188a39b8a14fa1d159']];for(const [key,pin]of publicSources)assert.equal(sha(readFileSync(join(options[key],'@angular/cdk/a11y/_index.scss'))),pin,'public Sass subject changed');
const syntax=css=>{const r=esbuild.transformSync(css,{loader:'css',minifyWhitespace:true,minifySyntax:false,minifyIdentifiers:false});assert.equal(r.warnings.length,0,'invalid diagnostic CSS');return r.code;};
function compile(text,url,paths){return sass.compileString(text,{url:pathToFileURL(url),loadPaths:paths,style:'expanded',logger:{warn(){},debug(){}}});}
function partition(css){const tree=postcss.parse(css),native=[];tree.walkAtRules('media',n=>{if(n.params==='(forced-colors: active)'){native.push(n.toString());n.remove();}});return {historical:tree.toString(),native:native.join('\n')};}
function nativeTaggedSource(file,text){let adapted=text.replace(/cdk\.high-contrast\(active, off\)/g,'cdk.high-contrast(active)');if(file==='legacy-checkbox/checkbox.scss'){const start=adapted.indexOf('@include cdk.high-contrast(black-on-white, off)');assert.ok(start>=0);let end=adapted.indexOf('{',start),depth=1;for(end++;depth;end++){if(adapted[end]==='{')depth++;if(adapted[end]==='}')depth--;}adapted=adapted.slice(0,start)+adapted.slice(end);}return adapted;}
const models=new Map();
for(const [file,text]of originals){if(!file.endsWith('.scss'))continue;const virtual=join(options['--original-root'],'@angular/material',file),reference=compile(text,virtual,[options['--original-root']]),old=partition(reference.css);assert.equal(old.native,'');const loaded=[];for(const url of reference.loadedUrls){const path=fileURLToPath(url);if(path===virtual){loaded.push({path,sha256:sha(text),tagged_virtual_entry:true});continue;}const bytes=readFileSync(url),rel=path.slice(options['--original-root'].length+1),pin=knownOriginal.get(rel);assert.ok(pin,'unknown original Sass member '+rel);assert.equal(sha(bytes),pin.sha256);assert.equal(bytes.length,pin.bytes);loaded.push({path,sha256:pin.sha256,bytes:pin.bytes});}models.set(file,{text,virtual,reference,old,loaded});}
function assess(file,peer,override){const model=models.get(file),path=join(root,'projects/ngx-material-legacy',file),text=override??readFileSync(path,'utf8'),candidate=compile(text,path,[peer]),parts=partition(candidate.css);assert.equal(syntax(parts.historical),syntax(model.old.historical),'complete historical resource CSS differs');const native=compile(nativeTaggedSource(file,model.text),model.virtual,[peer,options['--original-root']]);assert.equal(syntax(parts.native),syntax(partition(native.css).native),'complete independent native resource CSS differs');return {file,candidate_source_sha256:sha(text),original_source_sha256:sha(model.text),original_css_sha256:sha(model.reference.css),candidate_css_sha256:sha(candidate.css),public_native_css_sha256:sha(partition(native.css).native),full_historical_css_equal:true,full_public_native_css_equal:true,original_loaded_urls:model.loaded,candidate_loaded_urls:candidate.loadedUrls.map(u=>({path:fileURLToPath(u),sha256:sha(readFileSync(u))}))};}
const observations=[],mutations=[];
for(const key of ['--main-root','--maintenance-root']){
 for(const file of models.keys())observations.push({peer:key,...assess(file,options[key])});
 const paginator='legacy-paginator/paginator.scss',chips='legacy-chips/chips.scss',checkbox='legacy-checkbox/checkbox.scss',read=f=>readFileSync(join(root,'projects/ngx-material-legacy',f),'utf8');
 for(const [id,file,changed]of [
  ['paginator-wrap-modernization',paginator,read(paginator).replace('flex-wrap: wrap-reverse;','flex-wrap: wrap;')],
  ['paginator-currentcolor',paginator,read(paginator).replace('fill: CanvasText;','fill: currentColor;')],
  ['paginator-touch-target-addition',paginator,read(paginator)+'\n.mat-paginator-touch-target { height:48px; }'],
  ['chips-touch-padding',chips,read(chips)+'\n.mat-standard-chip .mat-chip-remove { padding:15px; }'],
  ['chips-disabled-color-adjust',chips,read(chips)+'\n.mat-standard-chip.mat-chip-disabled { @include cdk.high-contrast(active) { forced-color-adjust:none; } }'],
  ['checkbox-focus-shape',checkbox,read(checkbox)+'\n.mat-checkbox .mat-checkbox-ripple::before { border-radius:50%; }'],
  ['redundant-position-rule',checkbox,read(checkbox)+'\n.mat-checkbox .mat-checkbox-ripple { position:absolute; }'],
  ['arbitrary-native-addition',chips,read(chips)+'\n@media (forced-colors: active) { .unrelated { display:none; } }'],
 ]){assert.notEqual(changed,read(file));assert.throws(()=>assess(file,options[key],changed),/complete historical resource CSS differs|complete independent native resource CSS differs/);mutations.push({peer:key,id,rejected:true});}
}
assert.throws(()=>validateTemplate(template+'\n<div class="mat-paginator-touch-target"></div>\n'),/historical paginator template changed/);mutations.push({id:'template-touch-overlay-reintroduction',rejected:true,method:'exact untouched tagged template equality rejects appended overlay'});
const report={schema_version:1,line:JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main',node:process.version,sass:sass.info,css_parser:parserPackage.version,esbuild:esbuild.version,original_resources:[...originals].map(([file,text])=>({file,sha256:sha(text),bytes:Buffer.byteLength(text)})),observations,mutations,scope:'Complete historical CSS syntax/selector/declaration order for three styles; entire paginator HTML equals untouched tag. Independent current-native emission compiled from tagged sources through actual minimum CDK, with only active/off argument adaptation and exclusion of the original checkbox black-on-white target (retained as its historical class). Formatting whitespace only is normalized; syntax/declarations/order remain compared. No golden modification or opaque exception.',native_browser_or_angular_or_packed_execution:false,g11_claim:'not-passed'};writeFileSync(options['--report'],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({line:report.line,full_styles:observations.length,mutations:mutations.length,template_exact:true}));
