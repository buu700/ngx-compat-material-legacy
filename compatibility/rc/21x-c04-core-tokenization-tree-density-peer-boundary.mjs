/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Read-only endpoint reproduction; not a golden, exception or admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {posix} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {reviewInspectionCompatibilitySource} from '../../scripts/upstream-inspection-compatibility-source-review.mjs';
import {treePeerProgram} from '../../scripts/sass-tree-companion-contract.mjs';
import {verifyFoundationThemeReference} from '../../scripts/upstream-foundation-m3-theme-source-review.mjs';
const read=p=>readFileSync(p),hash=raw=>createHash('sha256').update(raw).digest('hex'),sass=createRequire(import.meta.url)('sass');
const shared=reviewInspectionCompatibilitySource(),prefix='compatibility/rc/21x-c04-foundation-m3-theme-';
const reference=verifyFoundationThemeReference(JSON.parse(gunzipSync(read(prefix+'tagged-sass-inputs.json.gz'))),JSON.parse(read('compatibility/rc/original16-sass-source-diagnostic-identity.json')),JSON.parse(gunzipSync(read(prefix+'originals.json.gz'))));
const owned={},peers={};
for(const ref of shared.bound){const base='projects/ngx-material-legacy/styles/';if(ref.path.startsWith(base)&&ref.path.endsWith('.scss'))owned['/owned/'+ref.path.slice(base.length)]=read(ref.path).toString();for(const family of ['material','cdk']){const start='node_modules/@angular/'+family+'/';if(ref.path.startsWith(start)&&ref.path.endsWith('.scss'))peers['/@angular/'+family+'/'+ref.path.slice(start.length)]=read(ref.path).toString();}}
function compile(program,modules){
 const importer={canonicalize(value,ctx){if(value.startsWith('sass:'))return null;const path=value.startsWith('review:')?new URL(value).pathname:value.startsWith('@')?'/'+value:posix.normalize(posix.join(posix.dirname(ctx.containingUrl?.pathname??'/'),value)),parent=posix.dirname(path),name=posix.basename(path),choices=[path.endsWith('.scss')?path:path+'.scss',parent+'/'+(name.startsWith('_')?'':'_')+name+(name.endsWith('.scss')?'':'.scss'),path+'/_index.scss',path+'/index.scss'],found=[...new Set(choices.filter(p=>Object.hasOwn(modules,p)))];if(!found.length)return null;assert.equal(found.length,1);return new URL('review:'+found[0]);},load(url){assert.ok(Object.hasOwn(modules,url.pathname));return {contents:modules[url.pathname],syntax:'scss'};}};
 try{const out=sass.compileString(program,{style:'expanded',charset:false,importers:[importer],silenceDeprecations:['import','if-function','global-builtin','color-functions','slash-div'],logger:{warn(){},debug(){}}});assert.ok(out.loadedUrls.every(url=>url.protocol==='review:'));return {css:out.css,sha256:hash(out.css),sources:out.loadedUrls.map(url=>({path:url.pathname,sha256:hash(modules[url.pathname]),bytes:Buffer.byteLength(modules[url.pathname])})).sort((a,b)=>a.path.localeCompare(b.path))};}
 catch(error){if(!error.sassMessage)throw error;return {error:error.sassMessage};}
}
const peerTemplate=treePeerProgram('mixin-argument/tree-density/raw-density-config');assert.equal(peerTemplate.split('density: -2').length,2);
const rows=[];
for(const scale of [0,-1,-2,-3,-4,-5,-6,-7,'minimum','maximum','default']){
 const argument=JSON.stringify(scale),program=entry=>'@use "review:'+entry+'" as tree;\n.probe { @include tree.density('+argument+'); }\n';
 const original=compile(program('/@angular/material/tree/_tree-theme.scss'),reference),actual=compile(program('/owned/tree/_tree-theme.scss'),{...owned,...peers});
 const peer=compile(peerTemplate.replace('density: -2','density: '+argument),peers);
 const peerToken=/--mat-tree-node-min-height: ([^;\n]+);/.exec(peer.css??'')?.[1]??null;
 const originalHeight=/min-height: ([^;\n]+);/.exec(original.css??'')?.[1]??null,actualFallback=/min-height: var\(--mat-tree-node-min-height, ([^)]+)\)/.exec(actual.css??'')?.[1]??null,actualPublicToken=/--mat-tree-node-min-height: ([^;\n]+);/.exec(actual.css??'')?.[1]??null;
 rows.push({scale,original,actual,peer,peerToken,current_peer_token_matches_owned:!original.error&&!actual.error&&!peer.error&&actualPublicToken===peerToken,originalHeight,actualFallback,actualPublicToken,historical_height_reaches_owned_nodes:!!original.error?!!actual.error:!actual.error&&originalHeight===actualFallback&&originalHeight===actualPublicToken});
 console.log(JSON.stringify({scale,originalHeight,actualFallback,actualPublicToken,originalError:original.error,actualError:actual.error,peerToken,peerError:peer.error}));
}
shared.assertCurrent();
const report={schema_version:1,role:'Read-only ordinary-current-peer boundary check; historical fallbacks and peer tokens remain separate, no new exception or admission',rows,source_bindings:shared.bound,tagged_reference_sass_executed:true,approved_installed_public_peer_sass_executed:true,captured_post16_patch_code_executed:false,product_changes:0,canonical_decisions_changed:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
writeFileSync('compatibility/rc/21x-c04-core-tokenization-tree-density-peer-boundary.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
