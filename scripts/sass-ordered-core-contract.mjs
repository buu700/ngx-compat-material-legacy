/** Two root core fixtures preserve owned16 CSS around exact public CDK contributions. */
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {isAbsolute,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const catalog=JSON.parse(readFileSync(new URL('../fixtures/sass/ordered-core-cdk-contracts.json',import.meta.url)));
const recipes={'02-core':"@use '@angular/material' as mat;\n@include mat.core();\n",'03-legacy-core':"@use '@angular/material' as mat;\n@include mat.legacy-core();\n"};
const originals={};
if(catalog.schema_version!==1||JSON.stringify(Object.keys(catalog.cases).sort())!==JSON.stringify(Object.keys(recipes).sort()))throw Error('ordered core scope changed');
for(const [id,source] of Object.entries(recipes)){
 const e=catalog.cases[id],bytes=readFileSync(new URL('../'+e.reference,import.meta.url));
 if(e.reference!==`reference/material-16.2.14/sass-css/${id}.css`||e.fixture!==`fixtures/sass/${id}.scss`
   ||e.fixture_sha256!==sha(source)||e.program_sha256!==sha(source.replace("'@angular/material'","'__entry__'"))
   ||e.reference_sha256!=='fac41823e947b8730a19e2386dfedd984703692b7ddbf701a767240774407de8'
   ||sha(bytes)!==e.reference_sha256||bytes.length!==e.reference_bytes)throw Error('ordered core frozen inputs changed');
 originals[id]=bytes.toString('utf8');
}
export const ORDERED_CORE_CASES=Object.freeze(catalog.cases);
export const ORDERED_CORE_CONTRACT='historical-ordered-core-with-public-cdk-contributions';
const order=['a11y-visually-hidden','overlay','text-field-autosize','text-field-autofill'];
const names=['ripple_force','focus_mat_force','focus_mdc_force',...order];
export function measureOrderedCorePeer(options){
 const peer=measureM2PeerProgram({...options,program:catalog.peer_program});
 const raw=readFileSync(join(options.cdkRoot,'package.json'));
 return {...peer,cdk_version:JSON.parse(raw).version,cdk_package_json_sha256:sha(raw)};
}
function parts(peer){
 const floor=catalog.peers[peer?.line];
 if(!floor||!peerMeasurementMatches(peer,catalog.peer_program,{})||peer.css_sha256!==floor.css_sha256
   ||peer.cdk_version!==floor.cdk_version||peer.cdk_package_json_sha256!==floor.cdk_package_json_sha256
   ||peer.sources.length!==floor.sources.length||floor.sources.some(s=>!peer.sources.some(v=>v.root===s.root&&v.path===s.path&&v.sha256===s.sha256&&v.bytes===s.bytes)))return null;
 const p={};
 for(const n of names){
  const begin=`/*!__ordered_core_cdk_${n}_begin__*/`,end=`/*!__ordered_core_cdk_${n}_end__*/`;
  if(peer.css.split(begin).length!==2||peer.css.split(end).length!==2)return null;
  p[n]=peer.css.split(begin)[1].split(end)[0].trim();
 }
 return p;
}
export function orderedCoreExpectedCss(id,peer){
 const old=originals[id],p=parts(peer),ripple=catalog.original_ripple;if(!old||!p||!old.startsWith(ripple))return null;
 let previous=ripple.length;
 for(const n of order){
  const member=catalog.original_cdk_members[n];if(!member||old.split(member).length!==2)return null;
  const start=old.indexOf(member);if(old.slice(previous,start)!=='\n\n')return null;previous=start+member.length;
 }
 const tail=old.slice(previous);if(!tail.startsWith('\n\n.mat-focus-indicator {'))return null;
 const boundary='\n\n.mat-mdc-focus-indicator {';
 if(tail.slice(2).split(boundary).length!==2)return null;
 const [mat,mdc]=tail.slice(2).split(boundary);
 return ripple+'\n\n'+p.ripple_force+order.map(n=>'\n\n'+p[n]).join('')+'\n\n'+mat+'\n\n'+p.focus_mat_force+'\n'+boundary.slice(2)+mdc+'\n\n'+p.focus_mdc_force;
}
export function orderedCoreMeasurementOk(id,m,line){
 const e=ORDERED_CORE_CASES[id];
 if(!e||!Object.hasOwn(catalog.peers,line)||m?.line!==line||m.program_sha256!==e.program_sha256||typeof m.css!=='string'
   ||m.css_sha256!==sha(m.css)||m.css_bytes!==Buffer.byteLength(m.css)||typeof m.sass_version!=='string'||!m.sass_version.startsWith('dart-sass\t1.104.1\t'))return false;
 const ss=m.sources;
 if(!Array.isArray(ss)||!ss.length||ss.some(s=>!Number.isInteger(s.root)||![0,1,2].includes(s.root)||typeof s.path!=='string'
   ||!s.path||s.path.startsWith('/')||s.path.includes('\\')||s.path.split('/').includes('..')||!/^[0-9a-f]{64}$/.test(s.sha256)||!Number.isInteger(s.bytes)||s.bytes<1)
   ||new Set(ss.map(s=>`${s.root}/${s.path}`)).size!==ss.length)return false;
 return ['_index.scss','styles/core/_core.scss','styles/core/style/_high-contrast.scss','styles/core/ripple/_ripple.scss','styles/core/focus-indicators/_private.scss'].every(path=>ss.some(s=>s.root===0&&s.path===path));
}
export function measureOrderedCore({id,source,fixtureFile,result,roots,sass,line}){
 const e=ORDERED_CORE_CASES[id];if(!e||sha(source)!==e.fixture_sha256||roots.length!==3)throw Error('ordered core invocation scope changed');
 const invocationPath=realpathSync(fixtureFile);
 if(sha(readFileSync(invocationPath))!==e.fixture_sha256)throw Error('ordered core fixture bytes changed');
 const bases=roots.map(p=>realpathSync(p));
 const sources=result.loadedUrls.map(url=>{
  if(url.protocol!=='file:')throw Error('ordered core loaded a non-file source');
  const path=realpathSync(fileURLToPath(url));
  // compileString's URL is the authenticated invocation,not an imported
  // library source. Only that exact byte-checked file is accounted separately.
  if(path===invocationPath)return null;
  const root=bases.findIndex(base=>{const rel=relative(base,path);return !isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('../');});
  if(root<0)throw Error('ordered core loaded a foreign source');
  const raw=readFileSync(path);return {root,path:relative(bases[root],path).replaceAll('\\','/'),sha256:sha(raw),bytes:raw.length};
 }).filter(Boolean).sort((a,b)=>a.root-b.root||a.path.localeCompare(b.path));
 const m={line,css:result.css,css_sha256:sha(result.css),css_bytes:Buffer.byteLength(result.css),program_sha256:sha(source.replace("'@angular/material'","'__entry__'")),sass_version:sass.info,sources};
 if(!orderedCoreMeasurementOk(id,m,line))throw Error('ordered core measurement incomplete');return m;
}
export function orderedCoreResultMatches(id,row,record){
 const e=ORDERED_CORE_CASES[id],m=record?.actual_measurement,c=record?.current_infrastructure;
 if(!m||!c)return false;
 return !!e&&row?.status==='blocked'&&row.baseline_sha256===e.reference_sha256&&row.candidate_sha256===m?.css_sha256
  &&record.status==='compiled'&&record.module==='@ngx-compat/material-legacy'&&record.fixture_sha256===e.fixture_sha256&&record.css_sha256===m.css_sha256
  &&c?.classification==='conforming-current-infrastructure'&&c.contract===ORDERED_CORE_CONTRACT&&c.peer?.line===m.line
  &&orderedCoreMeasurementOk(id,m,m.line)&&orderedCoreExpectedCss(id,c.peer)===m.css;
}
