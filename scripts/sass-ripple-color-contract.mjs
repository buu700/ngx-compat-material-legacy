/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**39 finite insertions into complete untouched16 CSS;3 legacy-core-color controls stay exact. */
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=readFileSync(new URL('../fixtures/sass/ripple-color-contracts.json',import.meta.url));
if(sha(bytes)!=='8a925af4d5bb8c44be9fc16e60f0fa9c05db9f3dec8a614e093814852b8b0cab')throw Error('finite ripple color catalog changed');
const catalog=JSON.parse(bytes),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const names=['ripple-color','ripple-theme','core-color','core-theme','legacy-core-color','legacy-core-theme','all-component-colors','all-component-themes','all-legacy-component-colors','all-legacy-component-themes'];
const args=JSON.parse(readFileSync(new URL('../fixtures/sass/mixin-argument-contracts.json',import.meta.url)));
const owned=JSON.parse(readFileSync(new URL('../fixtures/sass/owned-aggregate-contracts.json',import.meta.url)));
const ids=[...names.map(n=>'mixin-css/'+n),...args.cases.filter(p=>names.includes(p.mixin)).map(p=>p.case_id),
 ...owned.cases.filter(p=>['themes','colors'].includes(p.dimension)).map(p=>p.case_id),'06-aggregate-and-companions','08-core-theme'];
const controls=['mixin-css/legacy-core-color','mixin-argument/legacy-core-color/custom-full-theme','mixin-argument/legacy-core-color/raw-color-config'];
if(catalog.schema_version!==1||!equal(Object.keys(catalog.cases).sort(),ids.sort())||ids.length!==42
 ||catalog.inputs.some(i=>sha(readFileSync(new URL('../'+i.path,import.meta.url)))!==i.sha256))throw Error('ripple immutable recipe or exact roster changed');
export const RIPPLE_COLOR_CONTRACT='historical-ripple-colors-with-owned-public-binding';
export const RIPPLE_COLOR_CONTROL_CASES=Object.freeze(Object.fromEntries(controls.map(id=>[id,catalog.cases[id]])));
export const RIPPLE_COLOR_BINDING_CASES=Object.freeze(Object.fromEntries(ids.filter(id=>!controls.includes(id)).map(id=>[id,catalog.cases[id]])));
const individual=e=>!e.name.startsWith('all-');
export const RIPPLE_COLOR_DEFAULT_CASES=Object.freeze(Object.fromEntries(Object.entries(RIPPLE_COLOR_BINDING_CASES).filter(([,e])=>e.kind==='default'&&individual(e))));
export const RIPPLE_COLOR_ARGUMENT_CASES=Object.freeze(Object.fromEntries(Object.entries(RIPPLE_COLOR_BINDING_CASES).filter(([,e])=>e.kind==='argument'&&individual(e))));
export const RIPPLE_COLOR_OWNED_CASES=Object.freeze(Object.fromEntries(Object.entries(RIPPLE_COLOR_BINDING_CASES).filter(([,e])=>e.kind==='owned')));
export const RIPPLE_COLOR_ORDERED_CASES=Object.freeze({'08-core-theme':RIPPLE_COLOR_BINDING_CASES['08-core-theme']});
const entry=id=>Object.hasOwn(RIPPLE_COLOR_BINDING_CASES,id)?RIPPLE_COLOR_BINDING_CASES[id]:null;
const ownedPaths=['_index.scss','styles/core/ripple/_ripple-theme.scss','styles/core/theming/_theming.scss','styles/core/theming/_palette.scss','styles/core/density/private/_compatibility.scss','styles/core/style/_sass-utils.scss'];
const ownedSources=ownedPaths.map(path=>{const bytes=readFileSync(new URL('../projects/ngx-material-legacy/'+path,import.meta.url));return {root:0,path,sha256:sha(bytes),bytes:bytes.length};});
const sameSource=(a,b)=>Object.keys(a??{}).sort().join('|')==='bytes|path|root|sha256'&&Object.keys(b??{}).sort().join('|')==='bytes|path|root|sha256'&&['root','path','sha256','bytes'].every(k=>a[k]===b[k]);
const marker=(i,part)=>`/*!__ripple_color_${i}_${part}__*/`;
export const rippleColorPeerProgram=id=>entry(id)?.peer_program??null;
export function measureRippleColorPeer(options){
 const program=rippleColorPeerProgram(options.caseId);if(!program)throw Error('unknown ripple binding case');
 return measureM2PeerProgram({...options,program});
}
function peerMembers(id,peer,aggregate=false){
 const e=entry(id),floor=e&&Object.hasOwn(e.peers,peer?.line)?e.peers[peer.line]:null;if(!floor)return null;
 const ss=catalog.peer_source_sets[floor.source_set];
 if(aggregate){
  const paths=['_index.scss','core/ripple/_ripple-theme.scss','core/ripple/_m3-ripple.scss','core/tokens/_token-utils.scss'];
  const required=Object.fromEntries(paths.map(path=>{const s=ss.find(s=>s.root===0&&s.path===path);if(!s)throw Error('authenticated public ripple API source missing');return [path,[s.sha256,s.bytes]];}));
  if(!peerMeasurementMatches(peer,peer.program,required))return null;
 }else if(!peerMeasurementMatches(peer,e.peer_program,{})||peer.css!==floor.css||peer.css_sha256!==floor.css_sha256||peer.css_bytes!==floor.css_bytes
  ||peer.sources.length!==ss.length||ss.some(s=>!peer.sources.some(v=>sameSource(s,v))))return null;
 return floor.member_css;
}
/** Only an already-authenticated expected model is composed. Candidate CSS is never searched or normalized. */
export function insertRippleColorInExpectedModel(id,css,peer,{aggregate=false}={}){
 const e=entry(id),members=peerMembers(id,peer,aggregate);if(!e||!members||typeof css!=='string'||members.length!==e.slots.length)return null;
 const counts=new Map();for(const s of e.slots)counts.set(s.anchor,(counts.get(s.anchor)||0)+1);
 if([...counts].some(([anchor,count])=>css.split(anchor).length-1!==count))return null;
 let cursor=0,result='';
 for(const s of e.slots){
  const at=css.indexOf(s.anchor,cursor);if(at<cursor)return null;
  const end=at+s.anchor.length;
  if(css.slice(end).startsWith(s.separator+members[s.index]))return null;
  result+=css.slice(cursor,end)+s.separator+members[s.index]+s.after_separator;cursor=end;
 }
 return result+css.slice(cursor);
}
export function rippleColorOriginalOkay(id,original){
 const e=entry(id);if(!e||!original||['css','css_sha256','css_bytes','program_sha256'].some(k=>original[k]!==e.original[k]))return false;
 const ss=catalog.original_source_sets[e.original.source_set];
 return Array.isArray(original.sources)&&original.sources.length===ss.length&&ss.every(s=>original.sources.some(v=>sameSource(s,v)));
}
export function rippleColorExpectedCss(id,original,peer){
 return rippleColorOriginalOkay(id,original)?insertRippleColorInExpectedModel(id,original.css,peer):null;
}
export function rippleColorResultsMatch(id,original,actual,peer){
 const expected=rippleColorExpectedCss(id,original,peer);
 return expected!==null&&actual?.css===expected&&actual.css_sha256===sha(expected)&&actual.css_bytes===Buffer.byteLength(expected);
}
export function rippleColorMeasurementOkay(id,m,line){
 const e=entry(id);if(!e||m?.line!==line||!Object.hasOwn(e.peers,line)||m.program_sha256!==e.program_sha256
  ||typeof m.css!=='string'||m.css_sha256!==sha(m.css)||m.css_bytes!==Buffer.byteLength(m.css)
  ||typeof m.sass_version!=='string'||!m.sass_version.startsWith('dart-sass\t1.104.1\t'))return false;
 const ss=m.sources;
 if(!Array.isArray(ss)||!ss.length||ss.some(s=>!Number.isInteger(s.root)||![0,1,2].includes(s.root)||typeof s.path!=='string'||!s.path||s.path.startsWith('/')||s.path.includes('\\')||s.path.split('/').includes('..')||!/^[a-f0-9]{64}$/.test(s.sha256)||!Number.isInteger(s.bytes)||s.bytes<1)
  ||new Set(ss.map(s=>s.root+'/'+s.path)).size!==ss.length)return false;
 return ownedSources.every(source=>ss.some(s=>sameSource(s,source)));
}
// Constructor/operator/control metadata does not grant a Sass pass. Validate
// every stored slot against the authentic complete CSS and public API recipe.
for(const [id,e] of Object.entries(catalog.cases)){
 if(sha(e.program)!==e.program_sha256||sha(e.original.css)!==e.original.css_sha256||Buffer.byteLength(e.original.css)!==e.original.css_bytes
  ||!catalog.original_source_sets[e.original.source_set])throw Error('ripple original identity changed: '+id);
 if(controls.includes(id)){if(e.slots.length!==0||e.name!=='legacy-core-color')throw Error('non-ripple control broadened');continue;}
 if(e.slots.length<1||e.slots.length>2||e.slots.some((s,i)=>s.index!==i||e.original.css.slice(s.original_offset,s.original_offset+s.anchor.length)!==s.anchor
  ||s.anchor!==(s.scope==='html'?'':s.scope+' ')+'.mat-ripple-element {\n  background-color: '+s.token+';'+(s.opacity?'\n  opacity: '+s.opacity+';':'')+'\n}'
  ||s.after_separator!==(s.scope!=='html'&&s.original_offset+s.anchor.length<e.original.css.length?'\n':'')))throw Error('ripple occurrence boundary changed');
 const program="@use '@angular/material' as peer;\n"+e.slots.map(s=>marker(s.index,'begin')+'\n'+s.scope+' { @include peer.ripple-overrides((color: '+s.token+')); }\n'+marker(s.index,'end')).join('\n')+'\n';
 if(program!==e.peer_program||Object.keys(e.peers).sort().join('|')!=='21.x|main')throw Error('ripple public recipe changed');
 for(const line of ['main','21.x']){
  const p=e.peers[line],ss=catalog.peer_source_sets[p.source_set];
  if(!peerMeasurementMatches({...p,sources:ss},program,{})||p.member_css.length!==e.slots.length
   ||p.member_css.some((css,i)=>css!==e.slots[i].scope+' {\n  --mat-ripple-color: '+e.slots[i].token+';\n}'))throw Error('public ripple override evidence changed');
 }
}

/** Reconstruct only the immutable original capsule; callers cannot mutate the catalog. */
export function rippleColorOriginalMeasurement(id){
 const e=entry(id);return e?structuredClone({...e.original,sources:catalog.original_source_sets[e.original.source_set]}):null;
}
export function rippleColorDefaultResultsMatch(id,actual,contract){
 if(!Object.hasOwn(RIPPLE_COLOR_DEFAULT_CASES,id)||contract?.classification!=='conforming-current-companion'||contract.contract!==RIPPLE_COLOR_CONTRACT)return false;
 const m=actual?.actual_measurement;
 return rippleColorMeasurementOkay(id,m,contract.peer?.line)&&m.css===actual.css&&m.css_sha256===actual.sha256
  &&rippleColorResultsMatch(id,rippleColorOriginalMeasurement(id),m,contract.peer);
}
export function rippleColorArgumentResultsMatch(id,original,actual,contract){
 if(!(Object.hasOwn(RIPPLE_COLOR_ARGUMENT_CASES,id)||Object.hasOwn(RIPPLE_COLOR_OWNED_CASES,id))||contract?.classification!=='conforming-current-companion'||contract.contract!==RIPPLE_COLOR_CONTRACT)return false;
 return rippleColorMeasurementOkay(id,actual,contract.peer?.line)&&rippleColorResultsMatch(id,original,actual,contract.peer);
}
export function measureOrderedRippleColor({id,source,fixtureFile,result,roots,sass,line}){
 const e=RIPPLE_COLOR_ORDERED_CASES[id];if(!e||roots.length!==3||sha(source.replace("'@angular/material'","'__entry__'"))!==e.program_sha256)throw Error('ordered ripple fixture recipe changed');
 const invocation=realpathSync(fixtureFile),fixtureHash=sha(readFileSync(new URL('../'+e.fixture,import.meta.url)));
 if(sha(source)!==fixtureHash||sha(readFileSync(invocation))!==fixtureHash)throw Error('ordered ripple fixture bytes changed');
 roots=roots.map(path=>realpathSync(path));
 const sources=result.loadedUrls.map(url=>{if(url.protocol!=='file:')throw Error('ordered ripple non-file source');const file=realpathSync(fileURLToPath(url));if(file===invocation)return null;const which=roots.findIndex(base=>{const p=relative(base,file);return !isAbsolute(p)&&p!=='..'&&!p.startsWith('../');});if(which<0)throw Error('ordered ripple source outside artifact/peers');const bytes=readFileSync(file);return {root:which,path:relative(roots[which],file).replaceAll('\\','/'),sha256:sha(bytes),bytes:bytes.length};}).filter(Boolean).sort((a,b)=>a.root-b.root||a.path.localeCompare(b.path));
 const m={line,css:result.css,css_sha256:sha(result.css),css_bytes:Buffer.byteLength(result.css),program_sha256:e.program_sha256,sass_version:sass.info,sources};
 if(!rippleColorMeasurementOkay(id,m,line))throw Error('ordered ripple measurement incomplete');return m;
}
export function orderedRippleColorResultsMatch(row,record){
 const id=record?.id,e=RIPPLE_COLOR_ORDERED_CASES[id],m=record?.actual_measurement,c=record?.current_companion;
 return !!e&&!Object.hasOwn(record,'current_infrastructure')&&row?.status==='blocked'&&record.status==='compiled'&&record.module==='@ngx-compat/material-legacy'&&record.fixture_sha256===sha(readFileSync(new URL('../'+e.fixture,import.meta.url)))
  &&record.css_sha256===m?.css_sha256&&record.css_bytes===m?.css_bytes&&row?.baseline_sha256===e.original.css_sha256
  &&row?.candidate_sha256===m?.css_sha256&&c?.classification==='conforming-current-companion'&&c.contract===RIPPLE_COLOR_CONTRACT
  &&rippleColorMeasurementOkay(id,m,c.peer?.line)&&rippleColorResultsMatch(id,rippleColorOriginalMeasurement(id),m,c.peer);
}
