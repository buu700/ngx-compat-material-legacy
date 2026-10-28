/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Bounded diagnostic using unchanged finite contracts; no source disposition. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {posix} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {reviewInspectionCompatibilitySource} from '../../scripts/upstream-inspection-compatibility-source-review.mjs';
import {sortPeerProgram,sortCompanionResultsMatch} from '../../scripts/sass-sort-companion-contract.mjs';
import {treePeerProgram,treeCompanionResultsMatch} from '../../scripts/sass-tree-companion-contract.mjs';
import {companionAdditionPeerProgram,companionAdditionResultsMatch} from '../../scripts/sass-companion-addition-contract.mjs';
import {formFieldStatePeerProgram,formFieldStateArgumentResultsMatch} from '../../scripts/sass-form-field-state-contract.mjs';
import {rippleColorPeerProgram,rippleColorOriginalMeasurement,rippleColorArgumentResultsMatch,RIPPLE_COLOR_CONTRACT} from '../../scripts/sass-ripple-color-contract.mjs';
const sass=createRequire(import.meta.url)('sass'),hash=b=>createHash('sha256').update(b).digest('hex'),prefix='compatibility/rc/21x-c04-foundation-m3-theme-';
const read=p=>readFileSync(p),shared=reviewInspectionCompatibilitySource(),capsule=JSON.parse(gunzipSync(read(prefix+'tagged-sass-inputs.json.gz'))),catalog=JSON.parse(read('fixtures/sass/mixin-argument-contracts.json'));
const reference=Object.fromEntries(capsule.members.map(m=>['/'+m.path,m.body])),owned={},peers={},fullOwned={};
for(const ref of shared.bound){const base='projects/ngx-material-legacy/';if(ref.path.startsWith(base)&&ref.path.endsWith('.scss')){const rel=ref.path.slice(base.length);fullOwned['/owned/package/'+rel]=read(ref.path).toString();if(rel.startsWith('styles/'))owned['/owned/material/'+rel.slice(7)]=read(ref.path).toString();}for(const f of ['material','cdk']){const p='node_modules/@angular/'+f+'/';if(ref.path.startsWith(p)&&ref.path.endsWith('.scss'))peers['/@angular/'+f+'/'+ref.path.slice(p.length)]=read(ref.path).toString();}}
const families=['slide-toggle','sort','stepper','table','tabs','tree','form-field','input','list','grid-list','icon','legacy-slide-toggle','legacy-table','legacy-tabs','legacy-form-field','legacy-input','legacy-list','icon-button'];
const names=families.flatMap(f=>['color','typography',...(f.startsWith('legacy-')?[]:['density']),'theme'].map(d=>f+'-'+d)),selected=catalog.cases.filter(p=>names.includes(p.mixin));assert.equal(selected.length,132);
export function compile(program,modules){
 const importer={canonicalize(value,ctx){if(value.startsWith('sass:'))return null;const path=value.startsWith('review:')?new URL(value).pathname:value.startsWith('@')?'/'+value:posix.normalize(posix.join(posix.dirname(ctx.containingUrl?.pathname??'/'),value));const parent=posix.dirname(path),name=posix.basename(path),choices=[path.endsWith('.scss')?path:path+'.scss',parent+'/'+(name.startsWith('_')?'':'_')+name+(name.endsWith('.scss')?'':'.scss'),path+'/_index.scss',path+'/index.scss'];const found=[...new Set(choices.filter(p=>Object.hasOwn(modules,p)))];if(!found.length)return null;assert.equal(found.length,1);return new URL('review:'+found[0]);},load(url){return {contents:modules[url.pathname],syntax:'scss'};}};
 const out=sass.compileString(program,{style:'expanded',charset:false,importers:[importer],silenceDeprecations:['import','if-function','global-builtin','color-functions','slash-div'],logger:{warn(){},debug(){}}});
 assert.ok(out.loadedUrls.every(u=>u.protocol==='review:'));return {css:out.css,css_sha256:hash(out.css),css_bytes:Buffer.byteLength(out.css),loaded_sources:out.loadedUrls.map(u=>({path:u.pathname,sha256:hash(modules[u.pathname]),bytes:Buffer.byteLength(modules[u.pathname])})).sort((a,b)=>a.path.localeCompare(b.path))};
}
function peer(program){const out=compile(program,peers),pkg=read('node_modules/@angular/material/package.json');return {line:'21.x',peer_version:JSON.parse(pkg).version,peer_package_json_sha256:hash(pkg),program,program_sha256:hash(program),...out,sources:out.loaded_sources.map(s=>({root:s.path.startsWith('/@angular/material/')?0:1,path:s.path.replace(/^\/@angular\/(material|cdk)\//,''),sha256:s.sha256,bytes:s.bytes})).sort((a,b)=>a.root-b.root||a.path.localeCompare(b.path))};}
const rows=[];
for(const p of selected){
 const family=families.find(f=>p.mixin.startsWith(f+'-')&&['color','typography','density','theme'].includes(p.mixin.slice(f.length+1)));assert.ok(family);
 const harness="@forward 'core/theming/theming' show define-palette, define-light-theme, define-dark-theme, get-color-config;\n@forward 'core/theming/palette' show $indigo-palette, $pink-palette, $red-palette;\n@forward 'core/typography/typography' show define-typography-level, define-typography-config, define-legacy-typography-config;\n@forward '"+family+'/'+family.replace(/^legacy-/,'')+"-theme' as "+family+'-* show '+names.filter(n=>n.startsWith(family+'-')&&!n.startsWith('icon-button-')||family==='icon-button'&&n.startsWith('icon-button-')).join(', ')+';\n';
 const program=base=>'@use "review:'+base+'/_selected-foundation-entry.scss" as m;\n'+catalog.setup+'\n'+p.call+'\n';
 try{
  const expected=compile(program('/@angular/material'),{...reference,'/@angular/material/_selected-foundation-entry.scss':harness}),actual=compile(program('/owned/material'),{...owned,...peers,'/owned/material/_selected-foundation-entry.scss':harness});let contract='exact-untouched16',proof=null,match=actual.css===expected.css;
  for(const [label,recipe,predicate]of [['form-field-state',formFieldStatePeerProgram,formFieldStateArgumentResultsMatch],['sort',sortPeerProgram,sortCompanionResultsMatch],['tree',treePeerProgram,treeCompanionResultsMatch],['companion-addition',companionAdditionPeerProgram,companionAdditionResultsMatch]]){const code=recipe(p.case_id);if(code){proof=peer(code);contract=label;match=predicate(p.case_id,expected,actual,proof);break;}}
  rows.push({case_id:p.case_id,family,result:match?'pass':'fail',contract,expected,actual,peer:proof});console.log(JSON.stringify({case_id:p.case_id,result:match?'pass':'fail',contract}));
 }catch(e){rows.push({case_id:p.case_id,family,result:'error',error:String(e.stack||e)});console.log(JSON.stringify({case_id:p.case_id,result:'error',error:String(e.message)}));}
}
const ripple=[];for(const p of catalog.cases.filter(p=>['ripple-color','ripple-theme'].includes(p.mixin))){
 const logical="@use '__entry__' as m;\n"+catalog.setup+'\n'+p.call+'\n';
 try{
  const expectedRaw=compile(logical.replace("'__entry__'","'review:/@angular/material/_index.scss'"),reference),actualRaw=compile(logical.replace("'__entry__'","'review:/owned/package/_index.scss'"),{...fullOwned,...peers});
  const expected={...expectedRaw,program_sha256:hash(logical),sources:expectedRaw.loaded_sources.map(s=>({root:0,path:s.path.slice(1),sha256:s.sha256,bytes:s.bytes})).sort((a,b)=>a.path.localeCompare(b.path))};
  const actual={...actualRaw,line:'21.x',sass_version:sass.info,program_sha256:hash(logical),sources:actualRaw.loaded_sources.map(s=>({root:s.path.startsWith('/owned/package/')?0:s.path.startsWith('/@angular/material/')?1:2,path:s.path.replace(/^\/(?:owned\/package|@angular\/(?:material|cdk))\//,''),sha256:s.sha256,bytes:s.bytes})).sort((a,b)=>a.root-b.root||a.path.localeCompare(b.path))};
  const original=rippleColorOriginalMeasurement(p.case_id);assert.equal(expected.css,original.css);assert.deepEqual(expected.sources,original.sources);assert.equal(expected.program_sha256,original.program_sha256);
  const evidence=peer(rippleColorPeerProgram(p.case_id)),ok=rippleColorArgumentResultsMatch(p.case_id,expected,actual,{classification:'conforming-current-companion',contract:RIPPLE_COLOR_CONTRACT,peer:evidence});ripple.push({case_id:p.case_id,result:ok?'pass':'fail',expected,actual,peer:evidence});console.log(JSON.stringify({case_id:p.case_id,result:ok?'pass':'fail',contract:'ripple-color'}));
 }catch(e){ripple.push({case_id:p.case_id,result:'error',error:String(e.stack||e)});console.log(JSON.stringify({case_id:p.case_id,result:'error',error:String(e.message)}));}
}
shared.assertCurrent();writeFileSync(prefix+'measurement-diagnostic.json',JSON.stringify({schema_version:1,role:'Diagnostic only; no source or native qualification',rows,ripple,canonical_dispositions_changed:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({total:rows.length+ripple.length,failed:[...rows,...ripple].filter(p=>p.result!=='pass').map(r=>({case_id:r.case_id,result:r.result,error:r.error?.slice(0,600)}))}));
