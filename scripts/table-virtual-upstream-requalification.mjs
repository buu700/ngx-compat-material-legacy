/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Requalify six existing source-scope contexts; do not grant runtime inheritance. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {buildScopeEvidenceOk} from './upstream-build-scope-evidence.mjs';
import {testConsolidationBatchOk,testConsolidationEntryOk} from './upstream-test-consolidation-evidence.mjs';
import {testImportOwnershipContext,testImportBatchOk,testImportEntryOk} from './upstream-test-import-cleanup-evidence.mjs';
import {reviewSliderInputScope,sliderInputScopeEvidenceOk} from './upstream-slider-input-scope.mjs';
import {reviewSliderThumbDestroyScope,sliderThumbDestroyEvidenceOk} from './upstream-slider-thumb-destroy-scope.mjs';
import {reviewBazelBuildContext,bazelBuildEvidenceOk} from './upstream-bazel-build-scope.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const TABLE_UPSTREAM_INPUTS='compatibility/rc/table-virtual-upstream-inputs.json';
const inputHashes={main:'6acea0942aed59c312c7706944028c32fb4c86d518e4b87ad27980bc9ce2cca5','21.x':'fc5485fd99af3c695367213506fe0c643463d4baa800205294648f28aee343a8'};
const table='projects/ngx-material-legacy/legacy-table/table.ts';
const spec='projects/ngx-material-legacy/legacy-table/table.spec.ts';
const inventory='testing/legacy-runner/historical-inventory.json';
const ledgerPath='compatibility/f10/disposition-ledger/ledger.json';
const prefix='compatibility/f10/disposition-ledger/evidence/';
const names=['closeout-fourteen-build-scope-review','closeout-test-consolidation-source-review',
 'closeout-three-slider-input-source-review','closeout-slider-thumb-destroy-review',
 'closeout-thirty-one-test-import-source-review','closeout-bazel-build-only-review'];
const paths=names.map(name=>prefix+name+'.json');
const populationFields=new Set(['product_source_files','product_source_population_sha256']);
const withoutPopulation=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!populationFields.has(key)));
function historicalDelta(before,after,read){
 assert.deepEqual(Object.keys(after),Object.keys(before));
 for(const key of Object.keys(before).filter(k=>k!=='rows'))assert.deepEqual(after[key],before[key],'historical non-row metadata changed');
 assert.equal(before.rows.length,57);assert.equal(after.rows.length,57);
 const changed=[];
 for(const [index,old]of before.rows.entries()){
  const current=after.rows[index];assert.equal(current.candidate,old.candidate);
  if(JSON.stringify(old)===JSON.stringify(current))continue;
  const expected=structuredClone(old),note=current.execution.note;
  const {candidate_sha256,adaptation,execution}=old;
  expected.prior_candidate_snapshots=[...(old.prior_candidate_snapshots||[]),
   {candidate_sha256,adaptation,execution:structuredClone(execution),current_source_binding:false}];
  expected.candidate_sha256=hash(read(current.candidate));expected.adaptation='adapted';
  expected.execution={state:'not-executed',bound_to_current_head:false,receipt:null,note};
  assert.equal(old.execution.state,'not-executed');assert.equal(old.execution.bound_to_current_head,false);
  assert.equal(old.execution.receipt,null);assert.equal(typeof note,'string');assert.ok(note.length>40);
  assert.deepEqual(current,expected,'historical record changed beyond candidate binding/history/unexecuted note');
  changed.push({candidate:current.candidate,before_sha256:old.candidate_sha256,current_sha256:current.candidate_sha256,
   historical_sha256:current.historical_sha256,execution_qualified:false});
 }
 assert.deepEqual(changed.map(r=>r.candidate),['checkbox/checkbox','menu/menu','paginator/paginator',
  'slide-toggle/slide-toggle','snack-bar/snack-bar','table/table','tabs/tab-group']
  .map(name=>'projects/ngx-material-legacy/legacy-'+name+'.spec.ts'));
 return changed;
}
export async function inspectTableVirtualUpstream({root=rootDefault,readMember}={}){
 const read=path=>readMember?readMember(path):readFileSync(resolve(root,path));
 const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
 const bytes=read(TABLE_UPSTREAM_INPUTS);assert.equal(hash(bytes),inputHashes[line],'upstream context input changed');
 const inputs=JSON.parse(bytes);assert.equal(inputs.line,line);assert.deepEqual(inputs.reports,paths);assert.equal(inputs.rows,83);
 const unpack=member=>{const stored=read(member.path);assert.equal(hash(stored),member.sha256,'context archive changed');const raw=gunzipSync(stored);assert.equal(hash(raw),member.raw_sha256,'context preimage changed');return JSON.parse(raw);};
 const prior=unpack(inputs.prior_contexts),preimages=unpack(inputs.preimages);
 assert.equal(prior.line,line);assert.equal(prior.entries.length,83);assert.deepEqual(prior.reports.map(r=>r.path),paths);
 const oldDocs=new Map(prior.reports.map(row=>{assert.equal(hash(row.text),row.sha256);return [row.path,Buffer.from(row.text)];}));
 const oldSources=new Map(preimages.map(row=>{assert.equal(hash(row.before),row.before_sha256);assert.equal(hash(read(row.path)),row.current_sha256,'changed bounded source: '+row.path);return [row.path,Buffer.from(row.before)];}));
 assert.deepEqual([...oldSources.keys()],[table,spec,inventory]);
 assert.equal(hash(read(inputs.helper.path)),inputs.helper.sha256,'changed tested table helper');
 assert.equal(inputs.helper.sha256,'9edd40a3915297b0ad36f6cc812649979c7a00bf8e40eabfc363aecdf6ea6771');
 for(const evidence of inputs.evidence)assert.equal(hash(read(evidence.path)),evidence.sha256,'changed constructor/role evidence');
 const repair=JSON.parse(read(inputs.evidence[0].path));
 for(const path of [table,spec,inputs.helper.path])assert.equal(hash(read(path)),repair.source_members.find(m=>m.path===path)?.sha256);
 const currentTable=read(table).toString();
 assert.equal(currentTable.replace("import {preserveLegacyTableViewport} from './internal/table-construction-context';\n",'')
  .replace('@preserveLegacyTableViewport\n',''),oldSources.get(table).toString(),'existing table class changed');
 const oldSpec=oldSources.get(spec).toString();
 const imported=oldSpec.replace("import {DataSource} from '@angular/cdk/collections';",
  "import {DataSource} from '@angular/cdk/collections';\nimport {CDK_VIRTUAL_SCROLL_VIEWPORT, CdkVirtualScrollViewport, ScrollingModule} from '@angular/cdk/scrolling';")
  .replace('Component, OnInit, ViewChild, AfterViewInit}','ChangeDetectionStrategy, Component, Directive, inject, OnInit, ViewChild, AfterViewInit}');
 const currentSpec=read(spec).toString();assert.ok(currentSpec.startsWith(imported),'preceding table assertions changed');
 const addition=currentSpec.slice(imported.length);assert.ok(addition.startsWith('\n\n// The viewport belongs to the consumer.'));
 assert.match(addition,/renders all flex and native rows, preserves layout inputs and cell injection/);
 const historicalChanges=historicalDelta(JSON.parse(oldSources.get(inventory)),JSON.parse(read(inventory)),read);
 const tracked=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','ls-files','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'}).trim().split('\n');
 const old=paths.map(path=>JSON.parse(oldDocs.get(path))),[build,consolidation,slider,thumb,testImports,bazel]=old;
 assert.equal(build.candidate_context.product_members.length,1140);assert.equal(tracked.length,1141);
 assert.deepEqual(tracked.filter(p=>p!==inputs.helper.path),build.candidate_context.tracked_product_paths);
 assert.deepEqual(bazel.candidate_context.product_paths,build.candidate_context.tracked_product_paths);
 const changed=[];
 for(const member of build.candidate_context.product_members){const actual=read(member.path),oldValue=oldSources.get(member.path)||actual;
  assert.equal(hash(oldValue),member.sha256,'unreviewed preceding product change');assert.equal(oldValue.length,member.bytes);
  if(hash(actual)!==member.sha256)changed.push({path:member.path,before_sha256:member.sha256,current_sha256:hash(actual)});
 }
 assert.deepEqual(changed.map(r=>r.path).sort(),[table,spec].sort());
 for(const member of [...build.candidate_context.files,...bazel.candidate_context.files,...bazel.candidate_context.pack_module_graph]){
  const actual=read(member.path);assert.equal(hash(actual),member.sha256,'build input/module changed: '+member.path);assert.equal(actual.length,member.bytes);
 }
 const productPaths=()=>candidateProductSourcePaths(root),oldProductPaths=()=>productPaths().filter(p=>p!==inputs.helper.path);
 const oldRead=path=>oldDocs.get(path)||oldSources.get(path)||read(path);
 const validate=(documents,entries,reader,product,sourceProduct)=>{
  const rows=documents.map(b=>JSON.parse(b));const selected=path=>entries.filter(e=>e.evidence_report===path);
  for(const entry of selected(paths[0]))assert.ok(buildScopeEvidenceOk(rows[0],entry,reader,product()),'build source scope rejected');
  const cb=testConsolidationBatchOk(rows[1],reader,product());assert.equal(cb,true,'consolidation source scope rejected');
  for(const entry of selected(paths[1]))assert.ok(testConsolidationEntryOk(rows[1],entry,reader,cb));
  for(const entry of selected(paths[2]))assert.ok(sliderInputScopeEvidenceOk(rows[2],entry,reader,sourceProduct,line),'slider input scope rejected');
  for(const entry of selected(paths[3]))assert.ok(sliderThumbDestroyEvidenceOk(rows[3],entry,reader,sourceProduct,line),'slider destroy scope rejected');
  const ib=testImportBatchOk(rows[4],reader,line);assert.equal(ib,true,'test import source scope rejected');
  for(const entry of selected(paths[4]))assert.ok(testImportEntryOk(rows[4],entry,reader,ib));
  for(const entry of selected(paths[5]))assert.ok(bazelBuildEvidenceOk(rows[5],entry,reader,product,line),'Bazel-only source scope rejected');
  return {build:14,consolidation:32,slider_input:3,slider_destroy:1,test_import:31,bazel_build:2};
 };
 const oldTracked=()=>build.candidate_context.tracked_product_paths;
 const archivedLedger=JSON.parse(read(ledgerPath));
 const oldLedger={...archivedLedger,entries:archivedLedger.entries.map(e=>prior.entries.find(p=>p.sha===e.sha)||e)};
 const beforeRead=path=>path===ledgerPath?Buffer.from(JSON.stringify(oldLedger)):oldRead(path);
 validate(prior.reports.map(r=>Buffer.from(r.text)),prior.entries,beforeRead,oldTracked,oldProductPaths);
 const proposed=structuredClone(old),[b,c,s,t,i,z]=proposed;
 const context={schema_version:1,line,source_parent:inputs.source_parent,
  original_decisions_hunks_and_analyses_retained:true,changed,added:[inputs.helper],removed:[],
  unchanged_preceding_product_files:1138,unchanged_build_inputs:11,unchanged_extended_build_inputs:13,
  unchanged_pack_module_graph:bazel.candidate_context.pack_module_graph,
  historical_candidate_only_updates:historicalChanges,
  evidence:inputs.evidence,prior_contexts:inputs.prior_contexts,
  scope:'Only the tested table parent-construction boundary, two test imports plus a new viewport regression, and seven candidate-source inventory bindings changed. No Bazel/compiler patch/docs/localize/highlight/test-runner path is introduced. Existing source-exclusion judgments retain their original scope; real table/native/packed/floor behavior remains required.',g11_claim:'not-passed'};
 b.candidate_context={...b.candidate_context,source_commit:inputs.source_parent,
  source_tree:execFileSync('git',['rev-parse',inputs.source_parent+'^{tree}'],{cwd:root,encoding:'utf8'}).trim(),
  tracked_product_paths:tracked,tracked_product_paths_sha256:hash(Buffer.from(tracked.join('\n')+'\n')),
  product_members:tracked.map(path=>{const raw=read(path);return {path,sha256:hash(raw),bytes:raw.length};})};
 for(const body of proposed)body.table_viewport_context_requalification=context;
 const nextDocs=new Map();const save=index=>nextDocs.set(paths[index],Buffer.from(JSON.stringify(proposed[index],null,2)+'\n'));
 save(0);c.candidate_context.sha256=hash(nextDocs.get(paths[0]));
 for(const ref of c.historical_suite_context)if(ref.path===inventory)ref.sha256=hash(read(inventory));save(1);
 const freshSlider=reviewSliderInputScope(read,productPaths,line);assert.deepEqual(withoutPopulation(freshSlider),withoutPopulation(slider.source_scope));
 assert.equal(freshSlider.product_source_files,slider.source_scope.product_source_files+1);s.source_scope=freshSlider;save(2);
 const freshThumb=reviewSliderThumbDestroyScope(read,productPaths,line);
 assert.deepEqual({...freshThumb,retained_architecture:withoutPopulation(freshThumb.retained_architecture)},
  {...thumb.source_scope,retained_architecture:withoutPopulation(thumb.source_scope.retained_architecture)});
 t.source_scope=freshThumb;save(3);
 const ownership=testImportOwnershipContext(read,line),oldOwnership=structuredClone(testImports.ownership_context);
 const oldInput=oldOwnership.inputs.find(r=>r.path===inventory);oldInput.sha256=hash(read(inventory));assert.deepEqual(ownership,oldOwnership);
 i.ownership_context=ownership;save(4);
 z.candidate_context=reviewBazelBuildContext(read,()=>tracked,line);
 assert.deepEqual(z.candidate_context.files,bazel.candidate_context.files);assert.deepEqual(z.candidate_context.pack_module_graph,bazel.candidate_context.pack_module_graph);save(5);
 for(const [index,body]of proposed.entries())for(const field of ['reviews','source_analysis','decision','hunk_reviews','prior_entry','prior_entry_sha256'])
  if(Object.hasOwn(old[index],field))assert.deepEqual(body[field],old[index][field],'original source judgment altered');
 const entries=structuredClone(prior.entries);
 for(const entry of entries)if(entry.source_check)entry.source_check.evidence_report_sha256=hash(nextDocs.get(entry.evidence_report));
 const afterRead=path=>nextDocs.get(path)|| (path===ledgerPath?Buffer.from(JSON.stringify({...archivedLedger,entries:archivedLedger.entries.map(e=>entries.find(p=>p.sha===e.sha)||e)})):read(path));
 const validations=validate(paths.map(path=>nextDocs.get(path)),entries,afterRead,()=>tracked,productPaths);
 for(const path of paths){const current=read(path);assert.ok(current.equals(oldDocs.get(path))||current.equals(nextDocs.get(path)),'live source review changed outside the bounded context');}
 assert.equal(archivedLedger.entries.length,1697);
 for(const priorEntry of prior.entries){const actual=archivedLedger.entries.find(e=>e.sha===priorEntry.sha),updated=entries.find(e=>e.sha===priorEntry.sha);
  assert.ok(JSON.stringify(actual)===JSON.stringify(priorEntry)||JSON.stringify(actual)===JSON.stringify(updated),'live ledger judgment changed');}
 return {schema_version:1,line,source_parent:inputs.source_parent,input_capsule_sha256:hash(bytes),context,
  validations,prior_entries:prior.entries,entries,documents:[...nextDocs].map(([path,raw])=>({path,text:raw.toString(),sha256:hash(raw)})),
  sensitive_context_findings:[
   {sha:'b5d4de9794cd6c826a9a2d4fb27e7e9e3cb884ac',finding:'The rootDir LogicalProjectStrategy compiler patch is still absent: unchanged package/lock/compiler inputs have no patchedDependencies; the exact maintained ng-packagr/npm graph is unchanged. The new helper changes synchronous runtime DI of one owned table, without compiler options, aliases, WORKSPACE or rule setup.'},
   {sha:'ae9678df4b22be90ae27cec25224e364e91963f5',finding:'The six non-Bazel demo/dev-app/localize changes retain their individual source analysis. Neither the table helper nor additive historical fixture introduces those entrypoints or localize init; current CdkTable already owns scrolling, and every build/package input is unchanged. The actual original 57 legacy selection and test-source compile exclusion remain separate.'},
   {sha:'5d27e7c0b454ef721b7a4dfdf99e18884f690378',finding:'The highlight.js require-to-default-import change remains confined to the upstream documentation generator. No maintained pack-module dependency or product route to that tool was added; the new helper has only public core/table/scrolling dependencies.'},
   {sha:'e500a8ea9ad5043dd2775b39e395204b5cbdb78b',finding:'The default/default2 Bazel macro merge still has no maintained build or release execution path. All tracked product members are accounted for; the only new member is the exact previously tested constructor helper, not a build rule or wrapper.'},
  ],native_upstream_tests_build_pack_floors_or_security_qualified:false,g11_claim:'not-passed'};
}
export async function recordTableVirtualUpstream(root=rootDefault){
 const read=path=>readFileSync(resolve(root,path));const inputs=JSON.parse(read(TABLE_UPSTREAM_INPUTS));
 assert.equal(hash(read(ledgerPath)),inputs.ledger_before_sha256,'ledger changed before bounded requalification');
 const reportPath='compatibility/rc/table-virtual-upstream-requalification.json';assert.equal(existsSync(resolve(root,reportPath)),false,'contexts already recorded');
 const result=await inspectTableVirtualUpstream({root});
 const ledger=JSON.parse(read(ledgerPath)),before=structuredClone(ledger);
 for(const entry of result.entries){const index=ledger.entries.findIndex(e=>e.sha===entry.sha);assert.ok(index>=0);assert.deepEqual(ledger.entries[index],result.prior_entries.find(e=>e.sha===entry.sha));ledger.entries[index]=entry;}
 const strip=entry=>{const copy=structuredClone(entry);if(copy.source_check)delete copy.source_check.evidence_report_sha256;return copy;};
 assert.deepEqual(ledger.entries.map(strip),before.entries.map(strip),'ledger decision/history changed');
 for(const doc of result.documents)writeFileSync(resolve(root,doc.path),doc.text);
 writeFileSync(resolve(root,ledgerPath),JSON.stringify(ledger,null,2)+'\n');
 const report={...result,producer_sha256:hash(read('scripts/table-virtual-upstream-requalification.mjs'))};
 delete report.documents;delete report.entries;delete report.prior_entries;
 report.requalified_reports=result.documents.map(({path,sha256})=>({path,sha256}));
 writeFileSync(resolve(root,reportPath),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return {line:result.line,source_scope_rows:83,original_judgments_unchanged:true,source_only:true,g11_claim:'not-passed'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 assert.deepEqual(process.argv.slice(2),['--record']);console.log(JSON.stringify(await recordTableVirtualUpstream()));
}
