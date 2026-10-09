/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Untouched historical selectors plus independently emitted public native styles; no browser qualification. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),sass=require('sass'),esbuild=require('esbuild'),sha=b=>createHash('sha256').update(b).digest('hex');
const helper='projects/ngx-material-legacy/styles/core/style/_component-high-contrast.scss',helperText=readFileSync(join(root,helper),'utf8');
const args=process.argv.slice(2);assert.equal(args.length,8,'require --original-root --main-root --maintenance-root --report');const parsed={};for(let i=0;i<args.length;i+=2){assert.ok(['--original-root','--main-root','--maintenance-root','--report'].includes(args[i]));assert.ok(!parsed[args[i]]);parsed[args[i]]=resolve(args[i+1]);}assert.equal(existsSync(parsed['--report']),false);
const pins={'--original-root':'dd7e20cc3b362ed0140de0b277b8d192720cb72c4e480337910a499a0f5bfed5','--main-root':'534372c8fe2542a439818bf5dddc76264e3cbe1dfb0cf3188a39b8a14fa1d159','--maintenance-root':'534372c8fe2542a439818bf5dddc76264e3cbe1dfb0cf3188a39b8a14fa1d159'},subjects=[];
for(const [key,pin]of Object.entries(pins)){const p=join(parsed[key],'@angular/cdk/a11y/_index.scss'),bytes=readFileSync(p);assert.equal(sha(bytes),pin);subjects.push({root:parsed[key],path:p,sha256:pin,bytes:bytes.length});}
const compile=(source,peer)=>sass.compileString(source,{loadPaths:[peer],style:'expanded',logger:{warn(){},debug(){}}}).css;
// Parse and normalize whitespace only; preserve selector/declaration order and syntax.
const cssSyntax=css=>esbuild.transformSync(css,{loader:'css',minifyWhitespace:true,minifySyntax:false,minifyIdentifiers:false}).code;
const cases=[
 {id:'single-explicit',selector:'.legacy-control',explicit:true},
 {id:'comma-explicit',selector:'.legacy-a, .legacy-b',explicit:true},
 {id:'root-explicit',selector:null,explicit:true},
 {id:'nested-explicit',selector:'.legacy-parent { .legacy-child',nested:true,explicit:true},
 {id:'single-default',selector:'.legacy-disabled',explicit:false},
 {id:'comma-default',selector:'.legacy-a, .legacy-b',explicit:false},
 {id:'root-default',selector:null,explicit:false},
 {id:'nested-default',selector:'.legacy-parent { .legacy-child',nested:true,explicit:false},
];
function invocation(c,call){const content=c.selector?'outline: solid 1px; opacity: 0.5;':'.legacy-root-content { outline: solid 1px; opacity: 0.5; }',body=`@include ${call} { ${content} }`;return c.selector?`${c.selector} { ${body} }${c.nested?' }':''}`:body;}
function check(c,peer,override){const old=compile("@use '@angular/cdk' as cdk;\n"+invocation(c,c.explicit?'cdk.high-contrast(active, off)':'cdk.high-contrast'),parsed['--original-root']),native=compile("@use '@angular/cdk' as cdk;\n"+invocation(c,'cdk.high-contrast(active)'),peer),candidate=compile((override===undefined?`@use '${join(root,helper)}' as cdk;\n`:override+'\n')+invocation(c,(override===undefined?'cdk.':'')+(c.explicit?'high-contrast(active)':'high-contrast')),peer);
 const historicalRules=(old.match(/^\.cdk-high-contrast-active/gm)||[]).length,nativeBlocks=(native.match(/@media \(forced-colors: active\)/g)||[]).length;assert.ok(historicalRules&&nativeBlocks);assert.equal(cssSyntax(candidate),cssSyntax(old+'\n'+native),'historical selector/declaration order or public native addition differs');return {id:c.id,original_css_sha256:sha(old),public_native_css_sha256:sha(native),candidate_css_sha256:sha(candidate),historical_rules:historicalRules,native_blocks:nativeBlocks};}
const observations=[],mutations=[];for(const key of ['--main-root','--maintenance-root']){for(const c of cases)observations.push({peer:key,...check(c,parsed[key])});for(const [id,changed]of [
 ['missing-historical-class',helperText.replace('  @include _class-content() {\n    @content;\n  }','')],
 ['wrong-class',helperText.replace("'.cdk-high-contrast-active'","'.cdk-high-contrast-wrong'")],
 ['missing-default-host',helperText.replace('@if $target == null {','@if false {')],
 ['comma-context-loses-branch',helperText.replace('#{$selector-context} {',".legacy-a {" )],
 ['missing-native',helperText.replace('  @include current-cdk.high-contrast(active) {\n    @content;\n  }','')],
]){assert.notEqual(changed,helperText);assert.throws(()=>check(cases.find(c=>c.id===(id==='missing-default-host'?'comma-default':'comma-explicit')),parsed[key],changed),/historical selector\/declaration order/);mutations.push({peer:key,id,rejected:true});}}
const line=JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main';const report={schema_version:1,line,node:process.version,sass:sass.info,helper:{path:helper,sha256:sha(helperText)},subjects,observations,mutations,claims:{historical_selectors_declarations_order_preserved:true,public_native_addition_independent:true,consumer_css_scss_changes_required:false,full_component_or_native_browser_qualification:false},limits:'Eight scoped root/comma/nested/explicit/default content cases against untouched16.2.14 and both actual minimum Sass sources; no full Sass seal, component render, Angular runtime, packed artifact or G11 clearance.'};writeFileSync(parsed['--report'],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({line,cases:observations.length,negative_controls:mutations.length}));
