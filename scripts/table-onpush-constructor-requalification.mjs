/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Source-only OnPush dependency repair; actual packed execution remains mandatory. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {TABLE_ONPUSH_MEMBERS,TABLE_ONPUSH_SHA,TABLE_ONPUSH_PATCH,validateArtifactBehavior} from './upstream-artifact-behavior-evidence.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const ONPUSH_CONSTRUCTOR_INPUTS='compatibility/rc/table-onpush-constructor-inputs.json';
const inputHashes={main:'ddc531b61a33f124227cbb73a48ed5c64261d90296680abb64e78938f079a534','21.x':'919e8817596bfdd523fa60532951296a3f221541b3fdcbdd8e246886e7ee3882'};
const guard='scripts/upstream-artifact-behavior-evidence.mjs';
const table='projects/ngx-material-legacy/legacy-table/table.ts';
const ledgerPath='compatibility/f10/disposition-ledger/ledger.json';
const parse=(path,text)=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
export function inspectOnPushConstructor({root=rootDefault,readMember}={}){
 const read=path=>readMember?readMember(path):readFileSync(resolve(root,path));
 const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
 const raw=read(ONPUSH_CONSTRUCTOR_INPUTS);assert.equal(hash(raw),inputHashes[line],'OnPush inputs changed');
 const inputs=JSON.parse(raw),stored=read(inputs.prior_contexts.path);assert.equal(hash(stored),inputs.prior_contexts.sha256,'prior artifact context changed');
 const decoded=gunzipSync(stored);assert.equal(hash(decoded),inputs.prior_contexts.raw_sha256);const prior=JSON.parse(decoded);assert.equal(prior.line,line);
 const added="  'projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts',\n";
 const guardText=read(guard).toString();assert.equal(guardText.split(added).length,2,'helper source requirement absent/duplicated');
 assert.equal(guardText.replace(added,''),prior.guard.text,'shared admission changed outside required helper member');
 assert.equal(hash(prior.guard.text),'15a5155eaaf3276e8204652dc706baa5535e4a9f997f9f0af39a2ab46e142d89');
 assert.equal(TABLE_ONPUSH_MEMBERS.length,14);assert.equal(new Set(TABLE_ONPUSH_MEMBERS).size,14);
 assert.equal(hash(read(inputs.helper.path)),inputs.helper.sha256,'tested helper changed');
 assert.equal(inputs.helper.sha256,'9edd40a3915297b0ad36f6cc812649979c7a00bf8e40eabfc363aecdf6ea6771');
 for(const evidence of inputs.evidence)assert.equal(hash(read(evidence.path)),evidence.sha256,'constructor evidence changed');
 const repair=JSON.parse(read(inputs.evidence[0].path));
 const roleInputsPath='compatibility/rc/table-virtual-context-evidence-inputs.json';
 const roleProof=JSON.parse(read(inputs.evidence[1].path));assert.equal(hash(read(roleInputsPath)),roleProof.input_capsule_sha256);
 const preimage=JSON.parse(read(roleInputsPath)).preimage,packed=read(preimage.path);assert.equal(hash(packed),preimage.stored_sha256);
 const oldTable=gunzipSync(packed);assert.equal(hash(oldTable),preimage.sha256);
 const tableText=read(table).toString();assert.equal(tableText.replace("import {preserveLegacyTableViewport} from './internal/table-construction-context';\n",'')
  .replace('@preserveLegacyTableViewport\n',''),oldTable.toString(),'table rendering/source changed outside constructor boundary');
 const sf=parse(table,tableText),cls=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyTable');
 assert.equal(cls.heritageClauses[0].types[0].getText(sf),'CdkTable<T>');
 const delegated=['renderRows','_observeRenderChanges','_updateNoDataRow','_switchDataSource'];
 for(const name of delegated)assert.ok(!cls.members.some(m=>m.name?.getText(sf)===name),'owned rendering override introduced');
 const detector=repair.api_factory_diagnostic.primary_observation.public_node_requests.find(r=>r.ident==='ChangeDetectorRef');
 assert.equal(detector.identity_matched,true);assert.equal(detector.spec,'@angular/core');
 assert.ok(['optional','self','skipSelf','host'].every(flag=>detector[flag]===false));
 assert.ok(repair.api_factory_diagnostic.primary_observation.parent_comparison.every(r=>r.token_objects_equal&&r.options_equal&&r.trace_kinds_equal));
 const runtime=repair.actual_minimum_constructor_diagnostics.results.filter(r=>r.mode==='owned');assert.equal(runtime.length,2);
 assert.deepEqual(runtime.map(r=>r.framework).sort(),['21.2.23','22.1.7']);
 for(const row of runtime){assert.equal(row.direct.later_injector_viewport_preserved,true);assert.equal(row.consumer_subclass_fields_preserved,true);assert.equal(row.exception_context_restored,true);}
 const modules=['22.1.7','21.2.14'].map(version=>{
  const path=`compatibility/rc/table-public-module-sources/cdk-${version}-table.mjs`,bytes=read(path),file=parse(path,bytes.toString());
  const base=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='CdkTable');assert.ok(base);
  const methods=delegated.map(name=>{const member=base.members.find(m=>m.name?.getText(file)===name);assert.ok(member?.body);return {name,sha256:hash(member.getText(file))};});
  const noData=base.members.find(m=>m.name?.getText(file)==='_updateNoDataRow');
  assert.deepEqual(noData.body.statements.slice(-2).map(n=>n.getText(file)),['this._isShowingNoDataRow = shouldShow;','this._changeDetectorRef.markForCheck();'],'minimum no-data mark changed');
  return {path,sha256:hash(bytes),version,methods,no_data_visibility_mark_retained:true};
 });
 const patchPath='compatibility/rc/table-onpush-original.patch',patch=read(patchPath).toString();assert.equal(hash(patch),TABLE_ONPUSH_PATCH,'original OnPush patch changed');
 assert.equal(patch.split('\n').filter(row=>row.startsWith('@@')).length,8);
 assert.deepEqual(patch.split('\n').filter(row=>row.startsWith('diff --git ')).map(row=>row.split(' b/')[1]),['src/cdk/table/table.spec.ts','src/cdk/table/table.ts']);
 const context={schema_version:1,line,source_parent:inputs.source_parent,prior_contexts:inputs.prior_contexts,
  shared_guard_before_sha256:prior.guard.sha256,shared_guard_current_sha256:hash(read(guard)),
  complete_guard_recovered_by_removing_only_helper_member:true,reviewed_table_source_members:14,
  whole_preceding_table_recovered:true,owned_renderer_overrides:[],detector_node_lookup_forwarded:true,
  actual_minimum_constructor_namespaces:runtime.map(r=>({framework:r.framework,cdk:r.cdk,node:r.node})),
  minimum_renderer_modules:modules,complete_original_files:2,complete_original_hunks:8,
  constructor_diagnostic_scope:'Genuine minimum public CdkTable constructors/node DI with renderer/viewport/service protocols and lifecycle substitutions; focused Angular22 full/partial AOT fixture. Not a full legacy view, compiler21, packed/native or floor pass.',
  source_only:true,semantic_pass:false,g11_claim:'not-passed'};
 const documents=prior.reports.map(record=>{
  assert.equal(hash(record.text),record.sha256);const body=JSON.parse(record.text),old=structuredClone(body);
  for(const evidence of body.independent_evidence){
   if(evidence.path===guard){assert.equal(evidence.sha256,prior.guard.sha256);evidence.sha256=hash(read(guard));}
   else assert.equal(hash(read(evidence.path)),evidence.sha256,'unrelated prior evidence changed');
  }
  if(body.sha===TABLE_ONPUSH_SHA){
   assert.equal(body.reviewed_source_members.length,13);assert.equal(body.runtime_qualification.required,true);assert.equal(body.semantic_pass,false);
   for(const member of body.reviewed_source_members){if(member.path===table)assert.equal(member.sha256,preimage.sha256);else assert.equal(hash(read(member.path)),member.sha256,'unrelated reviewed source changed');}
   body.reviewed_source_members=TABLE_ONPUSH_MEMBERS.map(path=>({path,sha256:hash(read(path))}));
   body.source_conclusion+=' Constructor-source requalification: the only owned table edits add a local class decorator/import. Its exact reviewed helper constructs the genuine public CdkTable with the original new.target and node services, suppressing only the optional viewport during parent construction. The change-detector request is forwarded to the original node context, and no render/data-source/no-data method is overridden. Existing table metadata, outlets and rendering bodies are unchanged. This preserves the source delegation claim; real current packed OnPush rendering remains mandatory.';
   body.constructor_context_review=context;
   body.independent_evidence.push(...inputs.evidence,{path:inputs.helper.path,sha256:inputs.helper.sha256});
   assert.deepEqual(body.hunk_reviews,old.hunk_reviews);assert.deepEqual(body.installed_member,old.installed_member);
   assert.deepEqual(body.caller_flow,old.caller_flow);assert.deepEqual(body.runtime_qualification,old.runtime_qualification);
  }else{assert.deepEqual(body.reviewed_source_members,old.reviewed_source_members);assert.deepEqual(body.hunk_reviews,old.hunk_reviews);}
  body.shared_guard_source_requalification=context;
  for(const flag of ['semantic_pass','actual_packed_or_native_executed'])assert.equal(body[flag],false);
  assert.equal(body.g11_claim,'not-passed');return {path:record.path,text:JSON.stringify(body,null,2)+'\n'};
 });
 const entries=structuredClone(prior.entries);
 const entry=entries.find(r=>r.sha===TABLE_ONPUSH_SHA),review=JSON.parse(documents.find(r=>r.path===entry.evidence_report).text);
 entry.reason=review.source_conclusion;entry.individual_proof.decision=review.source_conclusion;
 entry.individual_proof.artifact_behavior.source_members=review.reviewed_source_members;
 const rejected=validateArtifactBehavior({root,entry,proof:entry.individual_proof,request:null});
 assert.equal(rejected.ok,false);assert.equal(rejected.detail,'missing coordinator run','real source must reach runtime gate without receiving qualification');
 for(const record of prior.reports){const current=read(record.path);assert.ok(current.equals(Buffer.from(record.text))||current.equals(Buffer.from(documents.find(r=>r.path===record.path).text)),'live artifact judgment changed');}
 const current=JSON.parse(read(ledgerPath));
 for(const old of prior.entries){const actual=current.entries.find(r=>r.sha===old.sha),next=entries.find(r=>r.sha===old.sha);assert.ok(JSON.stringify(actual)===JSON.stringify(old)||JSON.stringify(actual)===JSON.stringify(next),'live artifact ledger changed');}
 return {schema_version:1,line,source_parent:inputs.source_parent,input_capsule_sha256:hash(raw),context,documents,entries,
  prior_entries:prior.entries,real_runtime_admission:rejected,semantic_pass:false,g11_claim:'not-passed'};
}
export function recordOnPushConstructor(root=rootDefault){
 const read=path=>readFileSync(resolve(root,path)),inputs=JSON.parse(read(ONPUSH_CONSTRUCTOR_INPUTS));
 assert.equal(hash(read(ledgerPath)),inputs.ledger_before_sha256,'ledger changed before source requalification');
 const reportPath='compatibility/rc/table-onpush-constructor-requalification.json';assert.equal(existsSync(resolve(root,reportPath)),false,'OnPush context already recorded');
 const result=inspectOnPushConstructor({root}),ledger=JSON.parse(read(ledgerPath));
 const previous=structuredClone(ledger.entries);
 for(const entry of result.entries){const index=ledger.entries.findIndex(r=>r.sha===entry.sha);assert.deepEqual(ledger.entries[index],result.prior_entries.find(r=>r.sha===entry.sha));ledger.entries[index]=entry;}
 assert.deepEqual(ledger.entries.filter(r=>r.sha!==TABLE_ONPUSH_SHA),previous.filter(r=>r.sha!==TABLE_ONPUSH_SHA));
 for(const record of result.documents)writeFileSync(resolve(root,record.path),record.text);
 writeFileSync(resolve(root,ledgerPath),JSON.stringify(ledger,null,2)+'\n');
 const report={...result,producer_sha256:hash(read('scripts/table-onpush-constructor-requalification.mjs'))};
 delete report.documents;delete report.entries;delete report.prior_entries;
 report.requalified_source_judgments=result.documents.map(r=>({path:r.path,sha256:hash(r.text)}));
 writeFileSync(resolve(root,reportPath),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return {line:result.line,table_source_members:14,source_judgments:3,runtime_gate:result.real_runtime_admission.detail,semantic_pass:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 assert.deepEqual(process.argv.slice(2),['--record']);console.log(JSON.stringify(recordOnPushConstructor()));
}
