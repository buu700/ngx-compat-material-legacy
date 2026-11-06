/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Fixed public-peer density proof for exactly three ordinary aggregate cases. */
import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {readFileSync} from 'node:fs';import {join} from 'node:path';
import {SCENARIOS,themeSass} from './companion-bridge-peer-oracle.mjs';import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';
const compiler=createRequire(import.meta.url)('sass'),compile=compiler.compileString,info=compiler.info,sha=b=>createHash('sha256').update(b).digest('hex');
const data=JSON.parse(readFileSync(new URL('../fixtures/sass/default-aggregate-contracts.json',import.meta.url))),inputs=data.peer_inputs;
const profiles={default:{scenario:'contract',program:'e64c306af8ada1587482de320d6ebab1c61bb5fe1e7e0ec538e5c4577f41f8b4',css:'6ebd93bd01d7014112896ab45de29a19ef5236d85fad99a11e41657160eeb450',bytes:3162},argument:{scenario:'closeout-custom-2018-light',program:'b0dc83dd9f5572a3d0d64a1ed628783ca6722697eb28457b40a12178013184ae',css:'2aea7214055a951a6aee02768eaee1dd45620b16d503e1590d42bfa985cbbf80',bytes:3156}};
const cases={'mixin-css/all-component-densities':'default','mixin-argument/all-component-densities/custom-full-theme':'argument','mixin-argument/all-component-densities/raw-density-config':'argument'};
export const ORDINARY_DENSITY_CASES=Object.freeze(Object.keys(cases));
const keys=['--mat-checkbox-state-layer-size','--mat-checkbox-touch-target-size','--mat-checkbox-touch-target-display',...['text','filled','protected','outlined'].flatMap(k=>['container-height','touch-target-size','touch-target-display'].map(x=>`--mat-button-${k}-${x}`))];
export function ordinaryDensityPeerProgram(caseId){const p=profiles[cases[caseId]],s=SCENARIOS.find(x=>x.id===p?.scenario);if(!p||!s)return null;const program="@use '@angular/material' as peer;\n"+themeSass('peer',s,{m2Prefix:'m2-'})+'\n.peer { @include peer.checkbox-base($theme); @include peer.checkbox-density($theme); @include peer.button-base($theme); @include peer.button-density($theme); }\n';const pinned=readFileSync(new URL('../fixtures/sass/peer-programs/ordinary-density-'+cases[caseId]+'.scss',import.meta.url),'utf8');return program===pinned&&sha(pinned)===p.program?program:null;}
export function measureOrdinaryDensityPeer({sass,materialRoot,cdkRoot,caseId,line}){
 if(sass!==compiler||sass.compileString!==compile||sass.info!==info||!info.startsWith('dart-sass\t1.104.1\t'))throw Error('ordinary density compiler identity mismatch');const program=ordinaryDensityPeerProgram(caseId);if(!program)throw Error('unknown ordinary density peer program');const peer=measureM2PeerProgram({sass,materialRoot,cdkRoot,program,line}),raw=readFileSync(join(cdkRoot,'package.json'));return {...peer,cdk_version:JSON.parse(raw).version,cdk_package_json_sha256:sha(raw),sass_version:info};
}
function properties(css){const p={};for(const m of css.matchAll(/(--mat-[a-z0-9-]+): ([^;\n]+);/g))p[m[1]]=m[2];return p;}
export function ordinaryDensityPeerOk(caseId,peer,line){try{
 const p=profiles[cases[caseId]],source=inputs[line],program=ordinaryDensityPeerProgram(caseId);if(!peer || Object.getPrototypeOf(peer)!==Object.prototype || JSON.stringify(Object.keys(peer).sort())!==JSON.stringify(['cdk_package_json_sha256','cdk_version','css','css_bytes','css_sha256','line','peer_package_json_sha256','peer_version','program','program_sha256','sass_version','sources']) || !Array.isArray(peer.sources) || peer.sources.some(s=>!s || Object.getPrototypeOf(s)!==Object.prototype || JSON.stringify(Object.keys(s).sort())!==JSON.stringify(['bytes','path','root','sha256'])))return false;if(!p||!source||!program||peer?.line!==line||peer.sass_version!==info||!peerMeasurementMatches(peer,program,{})||peer.css_sha256!==p.css||peer.css_bytes!==p.bytes||peer.cdk_version!==source.cdk_version||peer.cdk_version!==peer.peer_version||peer.cdk_package_json_sha256!==source.cdk_package_json_sha256)return false;
 const tuple=s=>JSON.stringify([s.root,s.path,s.sha256,s.bytes]),wanted=new Set(source.sources.map(tuple)),actual=new Set(peer.sources.map(tuple));return actual.size===peer.sources.length&&actual.size===wanted.size&&[...actual].every(x=>wanted.has(x));
 }catch{return false}}
/** Compares peer tokens to the authenticated expected CSS at exact density scopes. */
export function ordinaryDensityPeerMatches(caseId,peer,line,css){try{
 if(!ordinaryDensityPeerOk(caseId,peer,line)||typeof css!=='string')return false;const scope=caseId.startsWith('mixin-css/')?'.sass-api-probe':'.sass-argument-probe',button=['mat-mdc-button','mat-mdc-raised-button','mat-mdc-unelevated-button','mat-mdc-outlined-button'].map(x=>scope+' .'+x+'.mat-mdc-button-base').join(',\n'),seen=new Map();
 for(const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){const sel=m[1].trim();for(const x of m[2].matchAll(/(--mat-(?:checkbox|button-(?:text|filled|protected|outlined))-[a-z0-9-]+): ([^;\n]+);/g)){if(!keys.includes(x[1])||sel!==(x[1].startsWith('--mat-checkbox-')?scope:button))return false;(seen.get(x[1])||seen.set(x[1],[]).get(x[1])).push(x[2]);}}
 const p=properties(peer.css);return keys.every(k=>seen.has(k)&&seen.get(k).at(-1)===p[k]);
 }catch{return false}}
