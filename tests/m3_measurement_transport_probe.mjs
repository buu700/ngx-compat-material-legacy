/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,cpSync,mkdtempSync,mkdirSync,symlinkSync,rmSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {measureM3ThemeBoundary} from '../scripts/measure-m3-theme-boundary-contracts.mjs';
import {M3_TRANSPORT_CODE,M3_PORTABLE_WITNESSES,m3MeasurementSourceEpoch,historicalM3MeasurementView} from '../scripts/m3-measurement-transport.mjs';
import admission from '../scripts/upstream-m3-theme-boundary-admission.cjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const ts=createRequire(join(root,'package.json'))('typescript'),parent='cd577db612745ea0a18a6b775b4e2f671b28b16c',prefix='compatibility/rc/21x-c04-m3-theme-boundary-';
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
const git=path=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:1024*1024});
const epoch=m3MeasurementSourceEpoch({read});
for(const ref of M3_TRANSPORT_CODE){assert.equal(hash(read(ref.path)),ref.after);assert.equal(epoch.beforeRead(ref.path).equals(git(ref.path)),true);}
const rawPath='projects/ngx-material-legacy/legacy-dialog/dialog-content-directives.ts';assert.equal(epoch.beforeRead(rawPath).equals(read(rawPath)),true);
const before=git(M3_TRANSPORT_CODE[0].path).toString(),after=read(M3_TRANSPORT_CODE[0].path).toString();
const source=body=>ts.createSourceFile('measurement.mjs',body,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const declaration=(file,name)=>file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
const bFile=source(before),aFile=source(after),bFunction=declaration(bFile,'compileWarningModel'),aFunction=declaration(aFile,'compileWarningModel');assert.ok(bFunction&&aFunction);
assert.equal(before.replace(bFunction.getText(bFile),'<program-identity>'),after.replace(aFunction.getText(aFile),'<program-identity>'));
assert.equal(git(M3_TRANSPORT_CODE[1].path).toString().replace('measurement-\'+line+\'.json','measurement-portable-\'+line+\'.json'),read(M3_TRANSPORT_CODE[1].path).toString());
const oldHandler=source(git('scripts/upstream-m3-theme-boundary-admission.cjs').toString()),newHandler=source(read('scripts/upstream-m3-theme-boundary-admission.cjs').toString());
for(const name of ['boundaryProof','metadataOk','regular'])assert.equal(declaration(oldHandler,name).getText(oldHandler),declaration(newHandler,name).getText(newHandler));
const oldOwner=git('scripts/packed-upstream-ledger-epoch.mjs').toString(),newOwner=read('scripts/packed-upstream-ledger-epoch.mjs').toString();
assert.equal(oldOwner.replace('0f849a2c0230e7ebeb496fad34cbd9ecd5c4cb6d15ead8cdbff6181223221e27',hash(read('scripts/upstream-m3-theme-boundary-admission.cjs'))),newOwner);
for(const path of ['scripts/check-upstream-audit-disposition.mjs','scripts/upstream-source-contract-registry.mjs','scripts/upstream-individual-evidence-scope.mjs','scripts/upstream-registered-source-review.mjs'])assert.equal(read(path).equals(git(path)),true);
assert.equal(hash(read('compatibility/f10/disposition-ledger/ledger.json')),'22f775835030f175795d8865e9b30920b0b7fea5b908cbd6a9dca7775a71d779');
const lines=[],temporaryRoots=[];
for(const [line,directory,suffix]of [['21.x',root,'21x'],['main',resolve(root,'../../codex-closeout-main/ngx-compat-material-legacy'),'main']]){
 const portable=measureM3ThemeBoundary({root:directory}),recorded=JSON.parse(read(M3_PORTABLE_WITNESSES[line].path)),historical=JSON.parse(read(prefix+'measurement-'+suffix+'.json'));
 assert.deepEqual(portable,recorded);assert.deepEqual(historicalM3MeasurementView({portable,historical}),historical);
 const temp=mkdtempSync(join(tmpdir(),'ngx-m3-portable-evidence-'));temporaryRoots.push(temp);
 try{
  cpSync(join(directory,'projects/ngx-material-legacy'),join(temp,'projects/ngx-material-legacy'),{recursive:true});cpSync(join(directory,'package.json'),join(temp,'package.json'));symlinkSync(join(directory,'node_modules'),join(temp,'node_modules'),'dir');
  for(const path of ['compatibility/rc/oracles/material-16.2.14-sass-api.json','compatibility/rc/oracles/material-16.2.14-sass-argument-cases.json','compatibility/rc/component-high-contrast-source-proof.json']){mkdirSync(dirname(join(temp,path)),{recursive:true});cpSync(join(directory,path),join(temp,path));}
  const relocated=measureM3ThemeBoundary({root:temp});assert.deepEqual(relocated,portable,'relocation changed measured data '+line);assert.deepEqual(historicalM3MeasurementView({portable:relocated,historical}),historical);
  lines.push({line,historical_program_hashes_reconstructed:26,full_current_and_relocated_measurements_equal:true,full_historical_view_equal:true});
 }finally{rmSync(temp,{recursive:true,force:true});}
}
assert.ok(temporaryRoots.every(path=>!existsSync(path)));
let rejected=0;
const portable=JSON.parse(read(M3_PORTABLE_WITNESSES['21.x'].path)),historical=JSON.parse(read(prefix+'measurement-21x.json'));
for(const fault of ['program-hash','program-body','CSS','warning','density-state','loaded-source','added-field','missing-case','old-hash','old-producer']){
 const p=structuredClone(portable),h=structuredClone(historical);
 if(fault==='program-hash')p.historical_warning_and_density_cases[0].owned.program_sha256='0'.repeat(64);
 else if(fault==='program-body')p.historical_warning_and_density_cases[0].owned.authored_program+='\n';
 else if(fault==='CSS')p.historical_default_CSS_cases[0].css+='\n';
 else if(fault==='warning')p.historical_warning_and_density_cases[0].owned.warnings.pop();
 else if(fault==='density-state')p.historical_warning_and_density_cases[0].owned.css+='\n.bad { density-styles: false; }';
 else if(fault==='loaded-source')p.loaded_sources[0].sha256='0'.repeat(64);
 else if(fault==='added-field')p.discarded=false;
 else if(fault==='missing-case')p.original_inspection_cases.pop();
 else if(fault==='old-hash')h.historical_warning_and_density_cases[0].owned.program_sha256='0'.repeat(64);
 else h.producer.sha256='0'.repeat(64);
 assert.throws(()=>historicalM3MeasurementView({portable:p,historical:h}),undefined,fault);rejected++;
}
let late=null;const currentRead=path=>path===late?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
const body=JSON.parse(read(admission.BOUNDARY_REVIEW)),entry=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')).entries.find(e=>e.sha===admission.BOUNDARY_SHAS[0]);
const args={root,read:currentRead,body,entry,review:body.reviews[0],proof:entry.individual_proof};assert.equal(admission.sourceOk(args),true);
for(const path of ['scripts/m3-measurement-transport.mjs',...M3_TRANSPORT_CODE.map(ref=>ref.path),...Object.values(M3_PORTABLE_WITNESSES).map(ref=>ref.path)]){late=path;assert.equal(admission.sourceOk(args),false,path);rejected++;}late=null;
assert.equal(admission.sourceOk(args),true);
assert.throws(()=>m3MeasurementSourceEpoch({read:path=>path===M3_TRANSPORT_CODE[0].path?git(path):read(path)}));rejected++;
const report={schema_version:1,line:'21.x',portable_lines:lines,logical_and_historical_programs_each_line:26,metadata_before_images:2,raw_execution_reader_unchanged:true,only_measurement_function_changed:true,only_current_probe_witness_path_changed:true,pure_metadata_and_proof_functions_unchanged:3,owner_changes_one_handler_digest:true,root_checker_registry_and_dispatcher_unchanged:true,canonical_ledger_unchanged:true,rejections:rejected,all_temporary_roots_removed:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
