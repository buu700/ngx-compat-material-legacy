/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Nine aggregate source deltas only; no packed, untouched16 or gate claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,readdirSync,lstatSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {currentSpinnerSnackBridgeSourceSubject} from './parallel-spinner-snack-public-bridge-integration-source-subject.mjs';
import {SPINNER_SNACK_AGGREGATE_CASES,insertSpinnerSnackIntoAggregateModel} from '../../scripts/sass-spinner-snack-aggregate-contract.mjs';
assert.equal(process.versions.node,'24.21.0');assert.equal(process.argv.length,5);
const root=resolve(process.argv[2]),line=process.argv[3],output=resolve(process.argv[4]);
assert.ok(output.startsWith(join(root,'compatibility/rc/parent-spinner-snack-aggregate-integration-')));
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(join(root,p));
const source=currentSpinnerSnackBridgeSourceSubject({root,read});assert.equal(source.line,line);
const oracle=JSON.parse(read('compatibility/rc/oracles/material-16.2.14-sass-api.json'));
const defaults=JSON.parse(read('fixtures/sass/default-aggregate-contracts.json'));
const argumentsCatalog=JSON.parse(read('fixtures/sass/mixin-argument-contracts.json'));
const before=JSON.parse(read('compatibility/rc/parallel-spinner-snack-public-bridge-before-state.json')).branches[line];
for(const module of before.before_modules){assert.equal(hash(module.source),module.sha256);source.assertHistoricalSource(module.path,module.source);}
const sass=createRequire(join(root,'package.json'))('sass');assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'));
const temp=mkdtempSync(join(tmpdir(),'spinner-snack-aggregate-before-')),copied=[];
const product='projects/ngx-material-legacy';
function copyScss(path){
 const current=join(root,path),stat=lstatSync(current);assert.equal(stat.isSymbolicLink(),false);
 if(stat.isDirectory()){for(const name of readdirSync(current).sort())if(name!=='node_modules')copyScss(path+'/'+name);}
 else if(path.endsWith('.scss')){assert.equal(stat.isFile(),true);const target=join(temp,path);mkdirSync(dirname(target),{recursive:true});copyFileSync(current,target);copied.push({path,sha256:hash(read(path))});}
}
function compile(logical,entry){
 const program=logical.replace("'__entry__'",JSON.stringify(entry)),start=performance.now();
 const measured=sass.compileString(program,{url:pathToFileURL(join(root,'compatibility/rc/parent-spinner-snack-aggregate-integration-virtual.scss')),loadPaths:[root,join(root,'node_modules')],style:'expanded',charset:false,silenceDeprecations:['import','if-function','global-builtin','color-functions','slash-div'],logger:{warn(){},debug(){}}});
 return {css:measured.css,css_sha256:hash(measured.css),css_bytes:Buffer.byteLength(measured.css),logical_program_sha256:hash(logical),physical_program_sha256:hash(program),elapsed_ms:Math.round(performance.now()-start),loaded_urls:measured.loadedUrls.map(url=>url.href)};
}
const rows=[];try{
 copyScss(product);assert.equal(copied.length,409);
 for(const module of before.before_modules)writeFileSync(join(temp,module.path),module.source);
 for(const caseId of SPINNER_SNACK_AGGREGATE_CASES){
  const isDefault=caseId.startsWith('mixin-css/'),probe=isDefault?defaults.cases[caseId]:argumentsCatalog.cases.find(row=>row.case_id===caseId);assert.ok(probe);
  const setup=isDefault?oracle.standard_theme:argumentsCatalog.setup;
  const program="@use '__entry__' as m;\n"+setup+'\n'+probe.call+'\n';
  const historical=compile(program,join(temp,product)),current=compile(program,join(root,product));
  const expected=insertSpinnerSnackIntoAggregateModel({caseId,css:historical.css});assert.notEqual(expected,null,caseId);assert.equal(current.css,expected,caseId);
  const mutations=[current.css+'\n',current.css.replace('--mat-snack-bar-supporting-text-', '--mat-snack-bar-unexpected-'),current.css.replace('  --mat-snack-bar-supporting-text-', '  unexpected: true;\n  --mat-snack-bar-supporting-text-')];
  assert.ok(mutations.every(css=>css!==expected));
  rows.push({case_id:caseId,call:probe.call,setup_sha256:hash(setup),historical,current,modeled_sha256:hash(expected),finite_model_matches:true,whole_css_mutants_rejected:mutations.length,untouched16_original_measurement:false});
  console.log(JSON.stringify({line,caseId,finite_model_matches:true}));
 }
 for(const ref of copied)assert.equal(hash(read(ref.path)),ref.sha256,'late product change '+ref.path);
 source.assertCurrent();
}finally{rmSync(temp,{recursive:true,force:true});}
const report={schema_version:1,line,node:process.version,compiler:sass.info,role:'Nine exact aggregate source-delta observations; historical side is guarded pre-repair owned source, not untouched16.',worksheet:'compatibility/rc/parent-spinner-snack-aggregate-integration-worksheet-v2.json',source_inputs:source.bound,copied_scss_population:copied,rows,case_count:rows.length,compile_calls:rows.length*2,baseline_is_separate_disposable_physical_view:true,current_reader_received_old_product_bytes:false,old_aggregate_models_or_gates_edited:false,actual_packed_browser_floor_full_gate_or_audit_qualified:false,g11_claim:'not-passed'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line,cases:rows.length,compiles:report.compile_calls,full_gate:false}));
