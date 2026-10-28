/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four reviewed packed repairs and their finite tooling epoch; never runtime admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {allConsumerCaseIds,loadExportKeys} from './packed-consumer-evidence.mjs';
import {packedValueAccessorCases} from './value-accessor-packed-contract.mjs';
import {packedMenuLazyCase} from './chip-menu-tooltip-packed-contract.mjs';
import {packedTableOnPushCase} from './table-onpush-packed-contract.mjs';
import {autocompleteSelectionReaderSubject} from './autocomplete-selection-spec-subject.mjs';
export const PACKED_REPAIR_PRODUCT_PATHS=Object.freeze([
 'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts',
 'projects/ngx-material-legacy/legacy-menu/internal/menu-content-base.ts',
 'projects/ngx-material-legacy/legacy-table/public-api.ts',
 'projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts',
]);
export const PACKED_REPAIR_TOOL_PATHS=Object.freeze([
 'compatibility/rc/api/export-name-allowlist.json',
 'scripts/bidi-isolated-packed-fixture.mjs','scripts/generated-identity-packed-fixture.mjs',
 'scripts/menu-item-token-packed-fixture.mjs','scripts/packed-consumer-aot-smoke.mjs',
 'scripts/radio-identity-packed-fixture.mjs','scripts/select-detach-packed-fixture.mjs',
 'scripts/select-focus-click-packed-fixture.mjs','scripts/table-onpush-packed-fixture.mjs',
 'scripts/write-draft-run.mjs','tests/menu_overlay_exit_probe.mjs','tests/tab_body_motion_runtime_probe.mjs',
]);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),gitCache=new Map();
function git(root,args){
 const key=JSON.stringify([root,args]);if(gitCache.has(key))return Buffer.from(gitCache.get(key));
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const k of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[k];
 const bytes=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:16*1024*1024});gitCache.set(key,Buffer.from(bytes));return bytes;
}
function change(text,before,after){assert.equal(text.split(before).length,2,'packed repair is not one exact edit');return text.replace(before,after);}
function productRepair(path,before){
 if(path===PACKED_REPAIR_PRODUCT_PATHS[0])return change(before,'  _isAnimating: boolean;','  _isAnimating = false;');
 if(path===PACKED_REPAIR_PRODUCT_PATHS[1]){
  let after=change(before,' * Copyright Google LLC All Rights Reserved.\n',' * Copyright Google LLC All Rights Reserved.\n * Copyright (c) 2026 Ryan Lester.\n');
  return change(after,'      this._portal.detach();\n','      this._portal.detach();\n      // Refresh content queries after the embedded view has been destroyed.\n      this._changeDetectorRef.markForCheck();\n');
 }
 if(path===PACKED_REPAIR_PRODUCT_PATHS[2])return change(before,"export {_LegacyTableDefinitionOwner} from './internal/definition-owner';\n","export {_LegacyTableDefinitionOwner} from './internal/definition-owner';\n// Angular's partial compiler needs NgModule-exported directives at this entrypoint.\nexport {_LegacyTableColumnClasses as ɵLegacyTableColumnClasses} from './internal/column-classes';\n");
 assert.equal(path,PACKED_REPAIR_PRODUCT_PATHS[3]);
 let after=change(before,'  private readonly _ngZone = tabBodyNgZone();','  private readonly _ngZone = tabBodyNgZone();\n  private readonly _changeDetectorRef: ChangeDetectorRef;');
 after=change(after,'  ) {\n    if (_dir) {','  ) {\n    this._changeDetectorRef = changeDetectorRef;\n    if (_dir) {');
 return change(after,"    this._elementRef.nativeElement.classList.remove('mat-tab-body-animating');\n    this._translateTabComplete.next(transition);","    this._elementRef.nativeElement.classList.remove('mat-tab-body-animating');\n    this._changeDetectorRef.markForCheck();\n    this._translateTabComplete.next(transition);");
}
export function qualifyPackedProductSourceRepairs({root,read,line,data,history,registry}){
 assert.equal(data.schema_version,1);assert.equal(data.line,line);
 assert.deepEqual(data.targets.map(t=>t.path),PACKED_REPAIR_PRODUCT_PATHS);
 assert.deepEqual(data.tooling.map(t=>t.path),PACKED_REPAIR_TOOL_PATHS);
 assert.deepEqual(data.members.map(m=>m.path),['scripts/packed-product-source-recovery.mjs']);
 const nativeSpec=autocompleteSelectionReaderSubject({root,read,line});
 for(const member of data.members){const current=nativeSpec.qualify(member)??member;assert.equal(hash(read(member.path)),current.sha256,'changed packed repair implementation');}
 // Reject unrelated resource edits before running the larger source review graph.
 // The original full check below its semantic qualifications remains mandatory.
 assert.equal(history.product_members.length,1142);
 const currentTargets=[...data.targets,...registry.owned_contracts.targets,...registry.service_defaults.targets,
  ...registry.dialog_config.targets,registry.delta,registry.dialog.delta,registry.tooltip.delta,registry.menu_type.delta];
 for(const member of history.product_members){
  const target=currentTargets.find(t=>t.path===member.path),qualified=nativeSpec.qualify(target??member);
  let expected=qualified?.sha256??target?.sha256??member.sha256;
  if(member.path===nativeSpec.spec.path){assert.equal(member.sha256,nativeSpec.spec.before.sha256);assert.equal(currentTargets.some(t=>t.path===member.path),false);expected=nativeSpec.spec.after.sha256;}
  assert.equal(hash(read(member.path)),expected,'changed raw current product/resource '+member.path);
 }

 const authority=data.qualification.source_parent;assert.match(authority,/^[0-9a-f]{40}$/);
 function record(ref,compressed=false,parse=true){
  assert.ok(ref.path.startsWith('compatibility/rc/packed-cva-current-artifact-'));
  const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed packed repair evidence '+ref.path);
  assert.equal(hash(git(root,['show',authority+':'+ref.path])),ref.sha256,'unauthenticated packed repair evidence');
  const bytes=compressed?gunzipSync(raw):raw;if(ref.raw_sha256)assert.equal(hash(bytes),ref.raw_sha256);return parse?JSON.parse(bytes):bytes;
 }
 assert.equal(data.qualification.path,'compatibility/rc/packed-cva-current-artifact-paired-qualification.json');
 const proof=record(data.qualification);assert.equal(proof.line,line);assert.equal(proof.g11_claim,'not-passed');
 assert.deepEqual(proof.subjects.map(s=>s.line),['main','21.x']);assert.notEqual(proof.subjects[0].artifact.sha256,proof.subjects[1].artifact.sha256);
 const subject=proof.subjects.find(s=>s.line===line);assert.deepEqual(data.targets,subject.product_deltas);
 assert.equal(subject.source.line,line);assert.equal(subject.source.clean,true);assert.match(subject.source.commit,/^[0-9a-f]{40}$/);
 assert.equal(git(root,['rev-parse',subject.source.commit+'^{tree}']).toString().trim(),subject.source.git_tree_sha);
 const run=record(subject.reports.run,true),detail=record(subject.reports.detail,true),report=record(subject.reports.report,true);
 assert.deepEqual(Object.keys(subject.reports),['run','detail','report','pack-log','consumer-log']);
 record(subject.reports['pack-log'],true,false);record(subject.reports['consumer-log'],true,false);
 assert.deepEqual(run.source,subject.source);assert.deepEqual(run.artifacts.find(a=>a.id==='library'),subject.artifact);
 assert.equal(detail.tarball.sha256,subject.artifact.sha256);assert.equal(report.result,'pass');
 assert.equal(detail.status,'ok');assert.deepEqual(detail.errors,[]);assert.equal(detail.aot.status,'ok');assert.equal(detail.harness.status,'ok');assert.equal(detail.harness.result.ok,true);
 const expected=allConsumerCaseIds(loadExportKeys());assert.equal(expected.length,106);
 assert.deepEqual(detail.acceptanceCases.map(c=>c.case_id).sort(),[...expected].sort());assert.ok(detail.acceptanceCases.every(c=>c.result==='pass'));
 assert.equal(detail.isolation.consumer_outside_repository,true);assert.equal(detail.isolation.node_path,'unset');assert.deepEqual(detail.isolation.workspace_symlinks,[]);
 assert.equal(detail.isolation.declaration_program_ok,true);assert.equal(detail.isolation.declaration_check,'skipLibCheck:false');assert.equal(detail.harness.bundle.input_paths_confined,true);
 const observed=detail.harness.result,six=packedValueAccessorCases(observed.valueAccessorRegistration);assert.ok(six.every(c=>c.result==='pass'));
 assert.equal(packedMenuLazyCase(observed.menuLazyObservation).result,'pass');assert.equal(packedTableOnPushCase(observed.tableOnPushRendering).result,'pass');
 assert.equal(observed.tableAngularDiConstruction,true);assert.deepEqual(observed.rawOwnershipObservation,Array(6).fill(true));
 const lifetime=proof.lifecycle_regression_evidence.map(ref=>record(ref));
 const idle=lifetime.find(p=>p.idle_regression),tab=lifetime.find(p=>p.own_line_protocols);assert.ok(idle&&tab);
 const menuCases=record(idle.reports[line==='main'?'idle-main-constructor-pass':'idle-21-constructor-pass'],true);
 assert.equal(menuCases.line,line);assert.equal(menuCases.cases.length,18);assert.deepEqual(menuCases.failures,[]);assert.equal(menuCases.mutations.length,14);
 const tabCases=record(tab.reports[line==='main'?'main-lifecycle-pass':'branch-lifecycle-pass'],true);
 assert.equal(tabCases.passed,47);assert.equal(tabCases.failed,0);assert.equal(tabCases.mutants.length,22);
 const preimages=new Map(),current=new Map(),historyByPath=new Map(history.product_members.map(m=>[m.path,m]));assert.equal(historyByPath.size,1142);
 for(const target of [...data.targets,...data.tooling]){
  const bytes=read(target.path);assert.equal(hash(bytes),target.sha256,'changed current packed repair input '+target.path);assert.equal(bytes.length,target.bytes);
  assert.equal(hash(git(root,['show',subject.source.commit+':'+target.path])),target.sha256,'packed source does not own current repair input');
  const before=git(root,['show',subject.source_before_packed_repairs+':'+target.path]);assert.equal(hash(before),target.before_sha256,'changed packed repair preimage');
  let proposed=before.toString();
  if(PACKED_REPAIR_PRODUCT_PATHS.includes(target.path)){
   assert.equal(historyByPath.get(target.path)?.sha256,target.before_sha256,'packed repair does not extend immutable product preimage');proposed=productRepair(target.path,proposed);
  }else{assert.ok(target.edits.length>0);assert.equal(typeof target.reason,'string');assert.ok(target.reason.length>30);for(const edit of target.edits)proposed=change(proposed,edit.before,edit.after);}
  assert.equal(proposed,bytes.toString(),'packed repair exceeds the reviewed exact delta '+target.path);preimages.set(target.path,Buffer.from(before));current.set(target.path,target.sha256);
 }
 const menuPath=PACKED_REPAIR_PRODUCT_PATHS[0],tabPath=PACKED_REPAIR_PRODUCT_PATHS[3];
 assert.equal(menuCases.source_members.find(m=>m.path===menuPath)?.sha256,current.get(menuPath));assert.equal(tabCases.source_sha256,current.get(tabPath));
 assert.equal(menuCases.producer_sha256,current.get('tests/menu_overlay_exit_probe.mjs'));assert.equal(tab.test_source_sha256,current.get('tests/tab_body_motion_runtime_probe.mjs'));
 const beforeApi=JSON.parse(preimages.get(PACKED_REPAIR_TOOL_PATHS[0])),afterApi=JSON.parse(read(PACKED_REPAIR_TOOL_PATHS[0]));
 const extra=afterApi.extras.filter(row=>row.name==='ɵLegacyTableColumnClasses');assert.equal(extra.length,1);assert.equal(extra[0].category,'owned-private-helper');assert.deepEqual(extra[0].entries,['legacy-table/primary']);
 assert.deepEqual({...afterApi,extras:afterApi.extras.filter(row=>row.name!=='ɵLegacyTableColumnClasses')},beforeApi,'unrelated API allowance changed');
 assert.equal(preimages.size,16);
 // Every projected read rechecks the actual file, including after qualification.
 const nativeBound=new Map(nativeSpec.bound.map(ref=>[ref.path,ref.sha256]));
 const assertCurrent=path=>{if(current.has(path))assert.equal(hash(read(path)),current.get(path),'late current packed repair mutation '+path);
  if(nativeBound.has(path))assert.equal(hash(read(path)),nativeBound.get(path),'late current native spec input '+path);};
 const priorRead=path=>{assertCurrent(path);return preimages.has(path)?Buffer.from(preimages.get(path)):read(path);};
 return {line,read:priorRead,raw:read,assertCurrent,targets:data.targets,preimages,product_changes:4,tooling_changes:12,source:subject.source,artifact:subject.artifact,source_scope_only:true,current_coordinator_native_or_floor_qualified:false};
}
