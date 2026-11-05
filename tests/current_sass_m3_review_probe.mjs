/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Pure finite successors and exact metadata seams; no owner construction/compiler. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {types} from 'node:util';
import {authenticateM3HistoricalReport,currentM3ReviewExpectedReport,m3ReviewSourceInputs,m3ReviewBindingUnion} from '../scripts/current-sass-m3-review-source.mjs';
const require=createRequire(import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p);
const packet=JSON.parse(read('compatibility/rc/current-sass-source-inputs-v1.json'));
const oldPacketRaw=read(packet.historical_source_packet.path);assert.equal(hash(oldPacketRaw),packet.historical_source_packet.sha256);
const oldPacket=JSON.parse(oldPacketRaw),products=[...oldPacket.branches['21.x'].modules,...packet.additional_modules];assert.equal(products.length,4);
const current=new Map(products.map(r=>[r.path,r.current]));
for(const r of packet.additional_modules){const b=read(r.afterimage.path);assert.equal(hash(b),r.current.sha256);assert.equal(b.length,r.current.bytes);}
const keys={'core-tokenization':'argument_measurement','foundation-m3-theme':'foundation_measurement','surface-m3-theme':'surface_measurement'};
const expectedCounts={'core-tokenization':642,'foundation-m3-theme':641,'surface-m3-theme':634};
const handlerNames={'core-tokenization':'coreTokenizationProof','foundation-m3-theme':'foundationM3ThemeProof','surface-m3-theme':'surfaceM3ThemeProof'};
const positive=[],rejected=[],populations=[];
for(const kind of Object.keys(keys)){
 const input=m3ReviewSourceInputs(kind)[0],raw=read(input.path),historical=authenticateM3HistoricalReport(kind,raw);positive.push(kind+'/authenticate-original');
 assert.throws(()=>authenticateM3HistoricalReport(kind,Buffer.concat([raw,Buffer.from(' ')])));rejected.push(kind+'/changed-original');
 const known=new Map(historical.current_source_bindings.map(r=>[r.path,r]));
 const qualify=ref=>{if(current.has(ref.path)){const p=products.find(r=>r.path===ref.path);assert.ok([p.before.sha256,p.current.sha256].includes(ref.sha256));assert.equal(ref.bytes,ref.sha256===p.before.sha256?p.before.bytes:p.current.bytes);return {...ref,sha256:p.current.sha256,bytes:p.current.bytes};}
  if(/^(?:scripts|tests)\//.test(ref.path)){const original=known.get(ref.path);assert.ok(original);assert.equal(ref.sha256,original.sha256);if(ref.bytes!==undefined)assert.equal(ref.bytes,original.bytes);const bytes=read(ref.path);return {...ref,sha256:hash(bytes),...(ref.bytes===undefined?{}:{bytes:bytes.length})};}return structuredClone(ref);};
 const ownerBound=[{path:'mock/current-owner',sha256:'a'.repeat(64),bytes:1}],summary={line:'21.x',mock_source_context:true},sharedBound=[{path:'mock/shared',sha256:'b'.repeat(64),bytes:2}];
 const args={kind,historical,qualify,ownerBound,summary,sharedBound},actual=currentM3ReviewExpectedReport(args);positive.push(kind+'/whole-finite-successor');
 const normalized=structuredClone(actual);normalized.current_source_bindings=structuredClone(historical.current_source_bindings);delete normalized.current_public_bridge;
 const toolKey=kind==='surface-m3-theme'?'existing_companion_contract_inputs':'shared_contract_inputs';normalized[toolKey]=structuredClone(historical[toolKey]);
 let changed=0,rows=0;
 for(const list of ['cases','ripple'])for(const [i,row]of (normalized[keys[kind]][list]??[]).entries()){
  const before=historical[keys[kind]][list][i];assert.deepEqual(row.expected,before.expected);assert.deepEqual(row.peer,before.peer);assert.equal(row.actual.css,before.actual.css);assert.equal(row.actual.css_sha256,before.actual.css_sha256);assert.equal(row.actual.css_bytes,before.actual.css_bytes);
  assert.equal(row.actual.loaded_sources.length,before.actual.loaded_sources.length);assert.deepEqual(row.actual.loaded_sources.map(r=>r.path),before.actual.loaded_sources.map(r=>r.path));
  changed+=row.actual.loaded_sources.filter((r,j)=>r.sha256!==before.actual.loaded_sources[j].sha256).length;
  row.actual.loaded_sources=structuredClone(before.actual.loaded_sources);if(Object.hasOwn(row.actual,'sources'))row.actual.sources=structuredClone(before.actual.sources);rows++;
 }
 if(kind==='core-tokenization')for(const [i,row]of normalized.tree_density_boundary.rows.entries()){
  const before=historical.tree_density_boundary.rows[i];assert.equal(row.actual.css,before.actual.css);if(Object.hasOwn(row.actual,'loaded_sources'))row.actual.loaded_sources=structuredClone(before.actual.loaded_sources);
 }
 if(kind==='surface-m3-theme')normalized.shared_source_bindings=historical.shared_source_bindings;
 assert.deepEqual(normalized,historical,'no unenumerated historical report field may move');positive.push(kind+'/all-other-fields-and-css-exact');
 assert.deepEqual(actual.current_source_bindings,m3ReviewBindingUnion(ownerBound,historical.current_source_bindings.map(qualify),m3ReviewSourceInputs(kind)));positive.push(kind+'/exact-binding-union');
 const toolCurrent=actual[toolKey].find(r=>r.path.startsWith('scripts/'));assert.ok(toolCurrent);
 for(const [id,mutate]of [['css',d=>d[keys[kind]].cases[0].actual.css+=' '],['expected',d=>d[keys[kind]].cases[0].expected.css+=' '],['program',d=>d[keys[kind]].cases[0].case_id='unknown'],['extra-row',d=>d[keys[kind]].cases.push(structuredClone(d[keys[kind]].cases[0]))],['bridge',d=>d.current_public_bridge.line='main'],['binding',d=>d.current_source_bindings.pop()]]){
  const bad=structuredClone(actual);mutate(bad);assert.notDeepEqual(bad,currentM3ReviewExpectedReport(args));rejected.push(kind+'/'+id);
 }
 assert.throws(()=>currentM3ReviewExpectedReport({...args,kind:'unknown'}));rejected.push(kind+'/unknown-kind');
 const getter=structuredClone(historical);let calls=0;Object.defineProperty(getter[keys[kind]].cases[0].actual,'css',{enumerable:true,get(){calls++;return '';}});assert.throws(()=>currentM3ReviewExpectedReport({...args,historical:getter}));assert.equal(calls,0);rejected.push(kind+'/descriptor-getter');
 const code=read('scripts/upstream-'+kind+'-admission.cjs').toString(),start=code.indexOf('const functionText='),end=code.indexOf('\nfunction '+handlerNames[kind]);assert.ok(start>0&&end>start);
 const seam=vm.runInThisContext('(function(assert,types,readFileSync,join,ROOT){'+code.slice(start,end)+';return {captureArgs,assertLoadedFunction};})')(assert,types,readFileSync,(...p)=>p.join('/'),process.cwd());
 const meta={entry:{sha:'abc',individual_proof:{proof_kind:'known'}},body:{reviews:[]},root:process.cwd(),read};const snap=seam.captureArgs(meta,['entry','body','review','proof']);snap.same();positive.push(kind+'/metadata-capture');
 for(const field of ['entry','body','root','read']){const x={...meta},saved=x[field],bound=seam.captureArgs(x,['entry','body','review','proof']);x[field]=field==='read'?()=>Buffer.alloc(0):field==='root'?'different':structuredClone(saved);assert.throws(()=>bound.same());x[field]=saved;bound.same();rejected.push(kind+'/late-outer-'+field);}
 const nested={...meta,entry:structuredClone(meta.entry)},live=seam.captureArgs(nested,['entry','body','review','proof']);let getters=0;Object.defineProperty(nested.entry.individual_proof,'proof_kind',{enumerable:true,get(){getters++;return 'known';}});assert.throws(()=>live.same());assert.equal(getters,0);rejected.push(kind+'/late-nested-getter');
 const fake=function(){};fake.toString=()=>code;assert.throws(()=>seam.assertLoadedFunction('scripts/upstream-'+kind+'-source-review.mjs','review'+(kind==='core-tokenization'?'CoreTokenizationSource':kind==='foundation-m3-theme'?'FoundationM3ThemeSource':'SurfaceThemeSource'),fake));rejected.push(kind+'/substituted-spoofed-producer');
 const handler=require('../scripts/upstream-'+kind+'-admission.cjs'),prefix='compatibility/rc/21x-c04-'+kind+'-',body=JSON.parse(read(prefix+(kind==='surface-m3-theme'?'individual-review.json':'canonical-review.json'))),ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
 for(const row of body.reviews){const entry=ledger.entries.find(e=>e.sha===row.sha);assert.ok(entry);assert.deepEqual(handler[handlerNames[kind]](row),entry.individual_proof);assert.equal(handler.metadataOk({entry,body,review:row}),true);positive.push(kind+'/immutable-proof/'+row.sha);const bad=structuredClone(entry);bad.individual_proof[Object.keys(bad.individual_proof).find(k=>k.endsWith('_source_scope'))].handler.sha256='0'.repeat(64);assert.equal(handler.metadataOk({entry:bad,body,review:row}),false);rejected.push(kind+'/wrong-proof-handler/'+row.sha);}
 populations.push({kind,historical_source_bindings:expectedCounts[kind],modeled_measurement_rows:rows,modeled_changed_loaded_refs:changed});
}
const report={schema_version:1,result:'pass',scope:'Pure report reconstruction and exact extracted metadata/function seams with mocked qualified source refs',positive_controls:positive.length,rejected_controls:rejected.length,positive,rejected,populations,actual_current_source_or_tool_owner_constructed:false,current_producers_executed:false,sass_compiles:0,canonical_or_artifact_admission_granted:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
