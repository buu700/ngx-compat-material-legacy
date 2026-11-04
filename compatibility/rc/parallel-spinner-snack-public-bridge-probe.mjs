/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current ordinary bridges only; no expansion of13legacy-aggregate companions. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

assert.equal(process.versions.node,'24.21.0');assert.equal(process.argv.length,5);
const root=resolve(process.argv[2]),line=process.argv[3],output=resolve(process.argv[4]);
assert.ok(['21.x','main'].includes(line));
const ownDirectory=dirname(fileURLToPath(import.meta.url)),snapshotPath=join(ownDirectory,'parallel-spinner-snack-public-bridge-before-state.json');
const snapshot=JSON.parse(readFileSync(snapshotPath)),subject=snapshot.branches[line];assert.equal(subject.root,root);
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const sourceBindings=[];
for(const ref of subject.protected_inputs){const raw=readFileSync(join(root,ref.path));assert.equal(hash(raw),ref.sha256,'protected input changed '+ref.path);assert.equal(raw.length,ref.bytes);}
const expectedVersions=line==='21.x'?{core:'21.2.23',cdk:'21.2.14',material:'21.2.14'}:{core:'22.1.7',cdk:'22.1.7',material:'22.1.7'};
for(const[name,version]of Object.entries(expectedVersions))assert.equal(JSON.parse(readFileSync(join(root,'node_modules/@angular/'+name+'/package.json'))).version,version);
const compilerRefs=[['node_modules/sass/package.json','c6d07347951e35cf2fee0f4ffb14b9a298daba837d1f8d515d2e8cac064022a7',856],['node_modules/sass/sass.node.js','eb7a01ba57a04a0a421bdef0bf2f43558af4790b540a45501ec83900b07b0625',343],['node_modules/sass/sass.dart.js','30a2f37d9a2ee27d125681477ef5e1f3c29b446137921472bb9802f10d9e64e1',5675052]];
for(const[path,expected,bytes]of compilerRefs){const raw=readFileSync(join(root,path));assert.equal(hash(raw),expected);assert.equal(raw.length,bytes);}
const sass=createRequire(join(root,'package.json'))('sass');assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'));
const rename=new Map([
 ['--mdc-circular-progress-active-indicator-color','--mat-progress-spinner-active-indicator-color'],
 ['--mdc-snackbar-container-color','--mat-snack-bar-container-color'],
 ['--mdc-snackbar-supporting-text-color','--mat-snack-bar-supporting-text-color'],
 ['--mdc-snackbar-supporting-text-font','--mat-snack-bar-supporting-text-font'],
 ['--mdc-snackbar-supporting-text-size','--mat-snack-bar-supporting-text-size'],
 ['--mdc-snackbar-supporting-text-weight','--mat-snack-bar-supporting-text-weight'],
 ['--mdc-snackbar-supporting-text-line-height','--mat-snack-bar-supporting-text-line-height'],
]);
const modernNames=new Set(rename.values());
function rules(css){
 assert.equal(css.includes('@media'),false);assert.equal(css.includes('@keyframes'),false);
 const result=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match=>({selector:match[1].trim(),declarations:match[2].split(';').map(s=>s.trim()).filter(Boolean).map(s=>{const colon=s.indexOf(':');assert.ok(colon>0);return [s.slice(0,colon),s.slice(colon+1).trim()];})}));
 assert.ok(result.length>30);return result;
}
function assertBridge(actualCss,beforeCss){
 const actual=rules(actualCss),before=rules(beforeCss);
 const historical=actual.map(rule=>({...rule,declarations:rule.declarations.filter(([name])=>!modernNames.has(name))})).filter(rule=>rule.declarations.length);
 assert.deepEqual(historical,before,'historical ordered selectors/declarations or existing button token changed');
 let mirrors=0;const seen=new Set();
 for(const rule of actual){
  const declarations=new Map(rule.declarations);
  for(const[oldName,newName]of rename){
   if(!declarations.has(oldName))continue;
   assert.equal(rule.declarations.filter(([name])=>name===newName).length,1,'missing/duplicate current token '+newName+' at '+rule.selector);
   assert.equal(declarations.get(newName),declarations.get(oldName),'current token differs from untouched historical value');mirrors++;seen.add(newName);
  }
  for(const[name]of rule.declarations)if(modernNames.has(name))assert.ok([...rename].some(([old,modern])=>modern===name&&declarations.has(old)),'modern token leaked outside historical selector/value region');
 }
 assert.equal(seen.size,rename.size);assert.ok(mirrors>50);
 assert.ok(before.filter(rule=>rule.selector.startsWith('.legacy-byte-check')).length>5);
 return {historical_rules:before.length,current_rules:actual.length,appended_token_declarations:mirrors,distinct_current_tokens:seen.size};
}
const program=(spinner,snack)=>`@use 'sass:map';
@use 'sass:meta';
@use 'projects/ngx-material-legacy' as owned;
@use '${spinner}' as spinner;
@use '${snack}' as snack;
$primary: owned.define-palette(map.merge(owned.$indigo-palette,(500: #123456)));
$accent: owned.define-palette(map.merge(owned.$pink-palette,(A200: #fedcba)),A200,A100,A400);
$warn: owned.define-palette(map.merge(owned.$red-palette,(500: #654321)));
$type: owned.define-typography-config($font-family: 'Bridge Custom Font');
$legacy-type: owned.define-legacy-typography-config($font-family: 'Bridge Legacy Font');
$light: owned.define-light-theme((color:(primary:$primary,accent:$accent,warn:$warn),typography:$type));
$dark: owned.define-dark-theme((color:(primary:$primary,accent:$accent,warn:$warn),typography:$type));
$direct-light: owned.get-color-config($light);
$direct-dark: owned.get-color-config($dark);
$positional: owned.define-light-theme($primary,$accent,$warn);
$before-inputs: meta.inspect(($light,$dark,$direct-light,$direct-dark,$type,$legacy-type));
// Root includes exercise default/root emission without an enclosing marker.
@include spinner.color($light);
@include snack.color($light);
@include snack.typography($type);
.nested-light { @include spinner.theme($light); @include snack.theme($light); }
.nested-dark { @include spinner.theme($dark); @include snack.theme($dark); }
.direct-light { @include spinner.color($direct-light); @include snack.color($direct-light); }
.direct-dark { @include spinner.color($direct-dark); @include snack.color($direct-dark); }
.direct-theme { @include spinner.theme($direct-light); @include snack.theme($direct-light); }
.old-positional { @include spinner.theme($positional); @include snack.theme($positional); }
.color-only { @include spinner.theme((color:$direct-light)); @include snack.theme((color:$direct-light)); }
.type-only { @include spinner.typography($type); @include snack.typography($type); }
.theme-type-only { @include spinner.theme((typography:$type)); @include snack.theme((typography:$type)); }
.legacy-type { @include snack.typography($legacy-type); }
.null-type { @include snack.typography(null); }
.deep { .nested { @include spinner.color($dark); @include snack.color($dark); @include snack.typography($legacy-type); } }
.legacy-byte-check { @include owned.legacy-progress-spinner-theme($light); @include owned.legacy-snack-bar-theme($light); }
@if meta.inspect(($light,$dark,$direct-light,$direct-dark,$type,$legacy-type)) != $before-inputs { @error 'consumer map input mutated'; }
`;
const temporary=mkdtempSync(join(tmpdir(),'spinner-snack-public-bridge-'));
let report;
try{
 const current=[],before=[];
 for(const ref of subject.before_modules){
  const actual=readFileSync(join(root,ref.path),'utf8');const expected=ref.source;
  const stripped=actual.replace("@use '@angular/material' as mat;\n",'').replace(/^\s*@include mat\.(?:progress-spinner|snack-bar)-overrides\([^\n]+\);\n/gm,'');
  assert.equal(stripped,expected,'source differs beyond the enumerated public override addition '+ref.path);
  assert.equal(/@use ['"][^'"]*m2-|@use ['"]@angular\/material\//.test(actual),false);
  const baseline=ref.source.replace(/@use '([^']+)'/g,(all,path)=>path.startsWith('.')?"@use '"+resolve(root,dirname(ref.path),path)+"'":all);
  const file=join(temporary,ref.path.includes('progress-spinner')?'spinner.scss':'snack.scss');writeFileSync(file,baseline);
  before.push(file);current.push(resolve(root,ref.path));sourceBindings.push({path:ref.path,before_sha256:ref.sha256,current_sha256:hash(actual),current_bytes:Buffer.byteLength(actual)});
 }
 const compile=source=>{const warnings=[];const result=sass.compileString(source,{style:'expanded',charset:false,loadPaths:[root,join(root,'node_modules')],url:pathToFileURL(join(root,'compatibility/rc/parallel-spinner-snack-public-bridge-virtual.scss')),silenceDeprecations:['if-function','global-builtin','color-functions','import','slash-div'],logger:{warn(message){warnings.push(message);},debug(){}}});return {css:result.css,css_sha256:hash(result.css),warnings,loaded_urls:result.loadedUrls.map(url=>url.href)};};
 const baseline=compile(program(...before)),candidate=compile(program(...current));
 const observations=assertBridge(candidate.css,baseline.css);
 const negative=[];
 const rejects=(id,css)=>{assert.throws(()=>assertBridge(css,baseline.css),id);negative.push({id,rejected:true});};
 rejects('actual-compiled-pre-repair-missing-bridges',baseline.css);
 for(const name of modernNames){
  rejects('missing-'+name,candidate.css.replaceAll(new RegExp('^\\s*'+name+':[^;]+;\\n','gm'),''));
  rejects('wrong-value-'+name,candidate.css.replaceAll(new RegExp('('+name+':)[^;]+;','g'),'$1 deliberately-wrong;'));
 }
 rejects('selector-scope-relocated',candidate.css.replace('.nested-dark .mat-mdc-progress-spinner {','.wrong-scope .mat-mdc-progress-spinner {'));
 rejects('accent-and-primary-swapped',candidate.css.replace('--mat-progress-spinner-active-indicator-color: #fedcba;','--mat-progress-spinner-active-indicator-color: #123456;'));
 rejects('existing-action-token-mutated',candidate.css.replace('--mat-snack-bar-button-color: #fedcba;','--mat-snack-bar-button-color: #000000;'));
 const actualConsumers={};
 for(const family of ['progress-spinner','snack-bar']){
  const path='node_modules/@angular/material/fesm2022/'+family+'.mjs',raw=readFileSync(join(root,path));
  const css=[...raw.toString().matchAll(/\bstyles:\s*\[\s*("(?:[^"\\]|\\.)*")/g)].map(match=>JSON.parse(match[1])).join('\n');
  actualConsumers[family]={path,sha256:hash(raw),variables:[...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map(match=>match[1]))].sort()};
 }
 for(const name of modernNames)assert.ok(Object.values(actualConsumers).some(row=>row.variables.includes(name)),name+' not consumed by actual peer styles');
 for(const ref of subject.protected_inputs)assert.equal(hash(readFileSync(join(root,ref.path))),ref.sha256,'late protected input changed '+ref.path);
 report={schema_version:1,line,root,kind:'focused-explicit-current-spinner-snack-sass-bridge-qualification',node:process.versions.node,compiler:sass.info,actual_minimum_versions:expectedVersions,compiler_refs:compilerRefs,
  source_bindings:sourceBindings,protected_file_count:subject.protected_inputs.length,all_protected_files_unchanged:true,legacy_sources_and_compiled_legacy_rules_unchanged:true,
  classification:'These ordinary exports are explicit-current-component-bridge symbols in research/sass-symbols.json; neither family extends the13ordinary companions of all-legacy aggregate.',
  scenarios:['stylesheet root','nested and deep scopes','custom primary/accent/warn palettes','custom2018font','direct2014typography','light/dark','color-only/typography-only/theme forms','old positional theme and direct color-config forms','null typography fallback','consumer map immutability','separate legacy output'],
  compile_calls:2,actual_compiler_emission_executed:true,program:program(...current),program_sha256:hash(program(...current)),baseline:{...baseline,historical_expected_source:'Authenticated before-state ordinary module source (exact tagged16model apart from owned vendored paths); shared token generators are protected unchanged.'},candidate,observations,actual_minimum_peer_component_consumers:actualConsumers,
  negative_controls:negative,negative_controls_rejected:negative.length,passed:true,
  baseline_candidate_css_difference_is_visible:true,only_approved_modern_declaration_names_projected_for_historical_comparison:[...modernNames],goldens_or_allowances_modified:false,
  limitation:'Minimum public Sass API and emitted-token qualification only. No Angular build, packed consumer, browser/computed style, motion, runtime floor, full Sass gate or canonical admission.',
  actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
}finally{rmSync(temporary,{recursive:true,force:true});}
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line,result:'pass',compile_calls:report.compile_calls,protected_files:report.protected_file_count,appended_declarations:report.observations.appended_token_declarations,negative_controls_rejected:report.negative_controls_rejected,computed_style_or_build_qualified:false}));
