/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Retained report composition only: no current source constructor or compiler. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {composeCurrentM3BoundaryReport,assertCurrentM3BoundaryReportSuccessor} from '../scripts/current-m3-theme-boundary-contract.mjs';
import {historicalM3MeasurementView} from '../scripts/m3-measurement-transport.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),read=path=>readFileSync(new URL('../'+path,import.meta.url));
const prefix='compatibility/rc/21x-c04-m3-theme-boundary-',packet=JSON.parse(read('compatibility/rc/current-sass-source-inputs-v2.json'));
const base=JSON.parse(read(packet.historical_source_packet.path)),checks=[],lines=[];
const check=(name,fn)=>{fn();checks.push(name);};
for(const [line,suffix] of [['21.x','21x'],['main','main']]){
 const portable=JSON.parse(read(prefix+'measurement-portable-'+suffix+'.json')),historical=JSON.parse(read(prefix+'measurement-'+suffix+'.json'));
 check(line+' exact26 program transport remains historical',()=>assert.deepEqual(historicalM3MeasurementView({portable,historical}),historical));
 const transitions=[...base.branches[line].modules,...packet.additional_modules],sources=new Map(transitions.map(row=>[row.path,row]));
 const refs=[...portable.input_members,...portable.loaded_sources,...portable.measurement_tools_from_review_worktree,portable.producer],pairs=new Map();
 for(const before of refs){const row=sources.get(before.path),current=row?{...before,sha256:row.current.sha256,bytes:row.current.bytes}:{...before};pairs.set(JSON.stringify(before),{before,current});}
 // This fixture is only a metadata composition view, not a current authority.
 const projection={portable,referencePairs:[...pairs.values()],sourceBindings:transitions.map(row=>row.current),currentPublicBridge:{role:'modeled source summary only',current_source:{source_modules:transitions.map(row=>row.current)},actual_source_qualification:false}};
 const expected=composeCurrentM3BoundaryReport(projection);
 check(line+' whole report successor',()=>assert.deepEqual(assertCurrentM3BoundaryReportSuccessor({projection,current:expected}),portable));
 const changed=expected.historical_default_CSS_cases.filter((row,i)=>row.css!==portable.historical_default_CSS_cases[i].css).map(row=>row.case_id);
 check(line+' exactly four raw CSS rows',()=>assert.deepEqual(changed,['mixin-css/card-color','mixin-css/card-theme','mixin-css/checkbox-color','mixin-css/checkbox-theme']));
 for(let i=0;i<16;i++){
  const row=expected.historical_default_CSS_cases[i],prior=portable.historical_default_CSS_cases[i];
  check(line+' CSS digest '+row.case_id,()=>{assert.equal(hash(row.css),row.css_sha256);assert.equal(Buffer.byteLength(row.css),row.css_bytes);assert.equal(row.program_sha256,prior.program_sha256);assert.deepEqual(row.warnings,prior.warnings);});
  for(const field of ['css','css_sha256','css_bytes','program_sha256','warnings','case_id','result'])check(line+' rejects '+row.case_id+'/'+field,()=>{const current=structuredClone(expected),r=current.historical_default_CSS_cases[i];if(field==='warnings')r.warnings.push('unexpected');else if(field==='css_bytes')r[field]++;else r[field]+='changed';assert.throws(()=>assertCurrentM3BoundaryReportSuccessor({projection,current}));});
 }
 for(const field of Object.keys(expected).filter(k=>k!=='historical_default_CSS_cases'))check(line+' rejects complete field '+field,()=>{const current=structuredClone(expected);if(Array.isArray(current[field]))current[field].push({unexpected:true});else if(current[field]&&typeof current[field]==='object')current[field].unexpected=true;else current[field]=typeof current[field]==='boolean'?!current[field]:String(current[field])+'changed';assert.throws(()=>assertCurrentM3BoundaryReportSuccessor({projection,current}));});
 for(const fault of ['missing-pair','duplicate-pair','foreign-pair','changed-portable','extra-current','missing-current','CSS-space','CSS-token-value','CSS-order','duplicate-source-binding','conflicting-source-binding'])check(line+' rejects '+fault,()=>{const p=structuredClone(projection),current=structuredClone(expected);if(fault==='missing-pair')p.referencePairs.pop();else if(fault==='duplicate-pair')p.referencePairs.push(p.referencePairs[0]);else if(fault==='foreign-pair')p.referencePairs[0].before.path='foreign';else if(fault==='changed-portable')p.portable.role+='changed';else if(fault==='extra-current')current.extra=true;else if(fault==='missing-current')delete current.original_inspection_cases;else if(fault==='CSS-space')current.historical_default_CSS_cases[6].css+=' ';else if(fault==='CSS-token-value')current.historical_default_CSS_cases[6].css=current.historical_default_CSS_cases[6].css.replace('--mat-card','--foreign-card');else if(fault==='duplicate-source-binding')p.sourceBindings.push(p.sourceBindings[0]);else if(fault==='conflicting-source-binding')p.sourceBindings.find(r=>r.path.endsWith('/card/_card-theme.scss')).sha256='0'.repeat(64);else current.historical_default_CSS_cases.reverse();assert.throws(()=>assertCurrentM3BoundaryReportSuccessor({projection:p,current}));});
 let getterCalls=0,proxyCalls=0;
 check(line+' getter not executed',()=>assert.throws(()=>composeCurrentM3BoundaryReport({get portable(){getterCalls++;return portable;},referencePairs:projection.referencePairs,sourceBindings:[],currentPublicBridge:{}})));
 check(line+' proxy not executed',()=>assert.throws(()=>composeCurrentM3BoundaryReport(new Proxy(projection,{ownKeys(){proxyCalls++;return Reflect.ownKeys(projection);}}))));
 assert.equal(getterCalls,0);assert.equal(proxyCalls,0);
 lines.push({line,changed_css_rows:changed.length,retained_unchanged_css_rows:12,transport_programs_reconstructed:26,expected_css_bytes:expected.historical_default_CSS_cases.map(row=>({case_id:row.case_id,bytes:row.css_bytes,sha256:row.css_sha256})),modeled_metadata_only:true});
}
const report={schema_version:1,checks:checks.length,lines,source_constructors:0,compiler_calls:0,producer_runs:0,actual_source_or_artifact_acceptance:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
