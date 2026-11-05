/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Historical transport remains exact data; current production execution is 21-only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,symlinkSync,rmSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {measureM3ThemeBoundary} from '../scripts/measure-m3-theme-boundary-contracts.mjs';
import {currentM3ThemeBoundarySubject} from '../scripts/current-m3-theme-boundary-contract.mjs';
import {currentSassToolReferenceSubject} from '../scripts/current-sass-tool-references.mjs';
import {M3_TRANSPORT_CODE,M3_PORTABLE_WITNESSES,m3MeasurementSourceEpoch,historicalM3MeasurementView} from '../scripts/m3-measurement-transport.mjs';
import admission from '../scripts/upstream-m3-theme-boundary-admission.cjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const ts=createRequire(join(root,'package.json'))('typescript'),parent='cd577db612745ea0a18a6b775b4e2f671b28b16c',prefix='compatibility/rc/21x-c04-m3-theme-boundary-';
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
const git=path=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:1024*1024});
const epoch=m3MeasurementSourceEpoch({root,read}),tools=currentSassToolReferenceSubject({root,read});
for(const ref of M3_TRANSPORT_CODE){const current=epoch.currentRefs.find(r=>r.path===ref.path);assert.deepEqual(tools.qualify({path:ref.path,sha256:ref.after,bytes:ref.after_bytes}),current);assert.equal(hash(read(ref.path)),current.sha256);assert.equal(epoch.beforeRead(ref.path).equals(git(ref.path)),true);}
const rawPath='projects/ngx-material-legacy/legacy-dialog/dialog-content-directives.ts';assert.equal(epoch.beforeRead(rawPath).equals(read(rawPath)),true);
const before=git(M3_TRANSPORT_CODE[0].path).toString(),portableCode=tools.comparisonBytes({path:M3_TRANSPORT_CODE[0].path,sha256:M3_TRANSPORT_CODE[0].after,bytes:M3_TRANSPORT_CODE[0].after_bytes}).toString();
const source=body=>ts.createSourceFile('measurement.mjs',body,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const declaration=(file,name)=>file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
const bFile=source(before),pFile=source(portableCode),bFunction=declaration(bFile,'compileWarningModel'),pFunction=declaration(pFile,'compileWarningModel');assert.ok(bFunction&&pFunction);
assert.equal(before.replace(bFunction.getText(bFile),'<program-identity>'),portableCode.replace(pFunction.getText(pFile),'<program-identity>'));
const portableProbe=tools.comparisonBytes({path:M3_TRANSPORT_CODE[1].path,sha256:M3_TRANSPORT_CODE[1].after,bytes:M3_TRANSPORT_CODE[1].after_bytes}).toString();
assert.equal(git(M3_TRANSPORT_CODE[1].path).toString().replace("measurement-'+line+'.json","measurement-portable-'+line+'.json"),portableProbe);
const oldHandler=source(git('scripts/upstream-m3-theme-boundary-admission.cjs').toString()),newHandler=source(read('scripts/upstream-m3-theme-boundary-admission.cjs').toString());
for(const name of ['boundaryProof','metadataOk'])assert.equal(declaration(oldHandler,name).getText(oldHandler),declaration(newHandler,name).getText(newHandler));
const peerReadInsertion=" if(path==='node_modules/@angular/core/package.json'||/^node_modules\\/sass\\/(?:package\\.json|sass\\.node\\.js|sass\\.dart\\.js)$/.test(path))return require('./historical-contract-repair-readers.mjs').readHistoricalContractRepairOwnerMember(root,path);\n";
assert.equal(declaration(newHandler,'regular').getText(newHandler),declaration(oldHandler,'regular').getText(oldHandler).replace('function regular(root,path){\n','function regular(root,path){\n'+peerReadInsertion));
assert.equal(hash(read('compatibility/f10/disposition-ledger/ledger.json')),'22f775835030f175795d8865e9b30920b0b7fea5b908cbd6a9dca7775a71d779');
const lines=[];
for(const [line,suffix]of [['21.x','21x'],['main','main']]){
 const portable=JSON.parse(read(M3_PORTABLE_WITNESSES[line].path)),historical=JSON.parse(read(prefix+'measurement-'+suffix+'.json'));
 assert.deepEqual(historicalM3MeasurementView({portable,historical}),historical);
 lines.push({line,historical_program_hashes_reconstructed:26,retained_portable_and_historical_data_exact:true,current_producer_execution:line==='21.x'});
}
const current=currentM3ThemeBoundarySubject({root,read}),actual=measureM3ThemeBoundary({root});assert.deepEqual(current.assertSuccessor(actual),current.portable);
const inspected=admission.inspectBoundarySource({root,read}),temp=mkdtempSync(join(tmpdir(),'ngx-m3-portable-evidence-'));
try{
 for(const ref of inspected.bound){if(ref.path.startsWith('node_modules/'))continue;const target=join(temp,ref.path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,read(ref.path));}
 writeFileSync(join(temp,'package.json'),read('package.json'));mkdirSync(join(temp,'node_modules/@angular'),{recursive:true});
 for(const name of ['@angular/core','@angular/material','@angular/cdk','sass'])symlinkSync(join(root,'node_modules',name),join(temp,'node_modules',name),'dir');
 const gitDir=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim();writeFileSync(join(temp,'.git'),'gitdir: '+gitDir+'\n');
 const relocated=measureM3ThemeBoundary({root:temp});assert.deepEqual(relocated,actual,'relocation changed current21 report');assert.deepEqual(current.assertSuccessor(relocated),current.portable);
}finally{rmSync(temp,{recursive:true,force:true});}
assert.equal(existsSync(temp),false);
let rejected=0;const portable=JSON.parse(read(M3_PORTABLE_WITNESSES['21.x'].path)),historical=JSON.parse(read(prefix+'measurement-21x.json'));
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
for(const path of ['scripts/m3-measurement-transport.mjs',...M3_TRANSPORT_CODE.map(ref=>ref.path),...Object.values(M3_PORTABLE_WITNESSES).map(ref=>ref.path)]){late=path;assert.equal(admission.sourceOk(args),false,path);rejected++;}late=null;assert.equal(admission.sourceOk(args),true);
assert.throws(()=>m3MeasurementSourceEpoch({root,read:path=>path===M3_TRANSPORT_CODE[0].path?git(path):read(path)}));rejected++;
const report={schema_version:1,line:'21.x',portable_lines:lines,logical_and_historical_programs_each_line:26,metadata_before_images:2,raw_execution_reader_unchanged:true,historical_portable_code_delta_preserved:true,pure_metadata_and_proof_functions_unchanged:2,exact_four_peer_file_read_transport_verified:true,current_exact_tool_successor_guarded:true,canonical_ledger_unchanged:true,current_producer_execution_lines:['21.x'],main_current_producer_executed:false,current_and_relocated_measurements_equal:true,rejections:rejected,all_temporary_roots_removed:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
