/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Two finite source-report successors. No CSS, program or error normalization. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {lstatSync,readFileSync,realpathSync} from 'node:fs';
import {isAbsolute,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spinnerSnackC04Source} from './sass-spinner-snack-c04-source.mjs';
import {captureCurrentSassMetadata} from './current-sass-inspection-scope.mjs';

const SELF='scripts/current-sass-slider-selector-reports.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const equal=Buffer.prototype.equals,equalBytes=(actual,supplied)=>Buffer.isBuffer(supplied)&&Reflect.apply(equal,actual,[supplied]);
const REPORTS={
 'selector-density':{path:'compatibility/rc/21x-c04-selector-density-source-review.json',sha256:'a14eb5cd3a75a1a8ce6de86c6b8988f55112c33766813a259174a73b4d037df1',bytes:165835},
 'slider-m3-repairs':{path:'compatibility/rc/21x-c04-slider-m3-repairs-source-review.json',sha256:'2aed7df6f65661ad75484d3ab0af7cc8d2b444c2b597d75dbbbb006965165ce7',bytes:406098},
};
const SHARED={path:'compatibility/rc/21x-c04-inspection-compatibility-source-review.json',sha256:'852cf937178ada91b0c604d349cf214cd810266af6118122c19e0dd534c55118',bytes:135386};
const union=refs=>[...new Map(refs.map(ref=>[ref.path,ref])).values()].sort((a,b)=>a.path.localeCompare(b.path));
const common=()=>[{path:SELF,sha256:hash(image),bytes:image.length},...Object.values(REPORTS),SHARED];

export function currentSliderSelectorReportReference(kind){
 assert.ok(Object.hasOwn(REPORTS,kind));return structuredClone(REPORTS[kind]);
}

/** This pure model requires externally authenticated source/qualifier inputs.
 * Calling it alone grants no physical-source, compiler, CSS or artifact admission. */
export function currentSliderSelectorExpectedReport({kind,historical,historicalShared,source}={}){
 assert.ok(Object.hasOwn(REPORTS,kind));
 historical=captureCurrentSassMetadata(historical);historicalShared=captureCurrentSassMetadata(historicalShared);
 assert.equal(hash(JSON.stringify(historical,null,2)+'\n'),REPORTS[kind].sha256);
 assert.equal(hash(JSON.stringify(historicalShared,null,2)+'\n'),SHARED.sha256);
 assert.equal(historical.line,'21.x');assert.equal(historicalShared.current_source_bindings.length,610);
 const bound=captureCurrentSassMetadata(source.bound),summary=captureCurrentSassMetadata(source.summary),qualify=source.qualify;
 assert.equal(typeof qualify,'function');assert.equal(summary.sources.length,5);
 assert.deepEqual(summary.sources.map(row=>row.path).sort(),['button','card','checkbox','progress-spinner','snack-bar'].map(name=>'projects/ngx-material-legacy/styles/'+name+'/_'+name+'-theme.scss').sort());
 const expected=structuredClone(historical);
 expected.current_source_bindings=union([...bound,...historical.current_source_bindings.map(ref=>qualify(ref)),...common()]);
 expected.current_public_bridge=summary;
 expected.public_override_boundaries=9;expected.historical_public_override_boundaries=4;
 if(kind==='selector-density'){
  assert.equal(historical.current_source_bindings.length,619);assert.equal(historical.public_override_boundaries,4);
  // Exact insertion/source proof: checkbox retains its existing three calls;
  // button, spinner and snack add no current-selector-or-root call sites.
  assert.equal(historical.selector_callers.length,20);assert.equal(historical.selector_callers.reduce((n,row)=>n+row.calls,0),41);
  assert.deepEqual(historical.selector_callers.filter(row=>/\/(?:checkbox|button|progress-spinner|snack-bar)\//.test(row.path)),[{path:'projects/ngx-material-legacy/styles/checkbox/_checkbox-theme.scss',calls:3}]);
 }else{
  assert.equal(historical.current_source_bindings.length,638);assert.equal(historical.shared_source_bindings,610);
  expected.shared_source_bindings=union([...bound,...historicalShared.current_source_bindings.map(ref=>qualify(ref))]).length;
  expected.shared_measurement_inputs=historical.shared_measurement_inputs.map(ref=>qualify(ref));
  assert.equal(historical.slider_measurement.case_count,14);
  for(const row of expected.slider_measurement.cases){
   assert.equal(row.comparison,'exact-untouched16');assert.equal(row.peer,null);
   assert.equal(row.actual.css,row.expected.css);assert.equal(row.actual.css_sha256,row.expected.css_sha256);assert.equal(row.actual.css_bytes,row.expected.css_bytes);
   row.actual.loaded_sources=row.actual.loaded_sources.map(ref=>{
    if(!ref.path.startsWith('/owned/material/'))return ref;
    const current=qualify({...ref,path:'projects/ngx-material-legacy/styles/'+ref.path.slice('/owned/material/'.length)});
    return {...ref,sha256:current.sha256,bytes:current.bytes};
   });
  }
 }
 return expected;
}

/** Pure relationship only; source/artifact authority remains external. */
export function currentSliderSelectorReportMatches({kind,historical,historicalShared,source,current}={}){
 try{
  const before=captureCurrentSassMetadata(current);
  assert.deepEqual(before,currentSliderSelectorExpectedReport({kind,historical,historicalShared,source}));
  assert.deepEqual(captureCurrentSassMetadata(current),before);return true;
 }catch{return false;}
}

function physical(root,path){
 assert.equal(typeof path,'string');assert.ok(path&&!isAbsolute(path)&&!path.includes('\\')&&!path.includes('\0')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));
 const regular=(base,parts)=>{let cursor=base;for(const part of parts){cursor=join(cursor,part);assert.equal(lstatSync(cursor).isSymbolicLink(),false);}assert.ok(lstatSync(cursor).isFile());return readFileSync(cursor);};
 const peer=/^node_modules\/(@angular\/(?:core|material|cdk)|sass)\/(.+)$/.exec(path);
 if(!peer)return regular(root,path.split('/'));
 const container=join(root,'node_modules');assert.ok(lstatSync(container).isDirectory()&&!lstatSync(container).isSymbolicLink());
 if(peer[1].startsWith('@angular/'))assert.ok(lstatSync(join(container,'@angular')).isDirectory()&&!lstatSync(join(container,'@angular')).isSymbolicLink());
 const base=realpathSync(join(container,peer[1]));assert.ok(lstatSync(base).isDirectory());
 if(peer[1]==='sass')assert.ok(['package.json','sass.node.js','sass.dart.js'].includes(peer[2]));
 assert.equal(JSON.parse(regular(base,['package.json'])).name,peer[1]);return regular(base,peer[2].split('/'));
}

/** Actual current C04/tool authority plus only these pinned report inputs. */
export function createCurrentSliderSelectorReports({root=process.cwd(),read:providedRead=path=>readFileSync(join(root,path))}={}){
 root=resolve(root);assert.ok(lstatSync(root).isDirectory()&&!lstatSync(root).isSymbolicLink());
 const retained=new Map();
 const read=path=>{let actual;try{actual=physical(root,path);}catch(error){
   if(error.code!=='ENOENT')throw error;
   let absent=false;try{providedRead(path);}catch(supplied){assert.equal(supplied.code,'ENOENT');absent=true;}
   assert.ok(absent,'nonphysical supplied absent input '+path);throw error;
  }const prior=retained.get(path);if(prior)assert.ok(equalBytes(actual,prior));else retained.set(path,Buffer.from(actual));
  assert.ok(equalBytes(actual,providedRead(path)),'nonphysical slider/selector input '+path);assert.ok(equalBytes(physical(root,path),actual),'slider/selector input changed during read '+path);return actual;};
 const finalPhysical=()=>{for(const[path,raw]of retained)assert.ok(equalBytes(physical(root,path),raw),'changed final slider/selector input '+path);};
 const owner=spinnerSnackC04Source({root,read}),qualify=owner.qualify,ownerCurrent=owner.assertCurrent;
 const privateSource={bound:captureCurrentSassMetadata(owner.bound),summary:captureCurrentSassMetadata(owner.summary),qualify};
 assert.equal(privateSource.summary.current_source.source_modules.length,5);
 const historical=new Map();
 for(const ref of common()){
  const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);
  if(ref.path!==SELF)historical.set(ref.path,JSON.parse(raw));
 }
 const assertCurrent=()=>{ownerCurrent();for(const ref of common()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}finalPhysical();};
 const expectedReport=kind=>currentSliderSelectorExpectedReport({kind,historical:historical.get(REPORTS[kind]?.path),historicalShared:historical.get(SHARED.path),source:privateSource});
 const assertReportSuccessor=(kind,current)=>{
  const snapshot=captureCurrentSassMetadata(current),expected=expectedReport(kind);
  assert.deepEqual(snapshot,expected,'source report differs beyond finite slider/selector metadata successor: '+kind);
  assertCurrent();assert.deepEqual(captureCurrentSassMetadata(current),snapshot,'current slider/selector report changed during guards');
  const result=structuredClone(historical.get(REPORTS[kind].path));finalPhysical();return result;
 };
 const bound=union([...privateSource.bound,...common()]);
 const result={read,qualify,assertCurrent,assertReportSuccessor,bound:structuredClone(bound),summary:structuredClone(privateSource.summary)};
 assertCurrent();finalPhysical();return result;
}
