/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Verify canonical portal comparison plus actual current-loop source guards. */
import assert from 'node:assert/strict';
import {writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readHistoricalContractRepairOwnerMember} from '../../scripts/historical-contract-repair-readers.mjs';
import {autocompleteSelectionReaderSubject} from '../../scripts/autocomplete-selection-spec-subject.mjs';
import {tooltipPriorCallerRead} from '../../scripts/snack-dom-source-context.mjs';
import {dialogPortalPrior,reviewDialogPortalSource,DIALOG_PORTAL_SOURCE} from '../../scripts/dialog-portal-failure-recovery.mjs';
const ts=createRequire(import.meta.url)('typescript'),root=process.cwd(),prefix='compatibility/rc/portal-contract-source-epoch-',out=process.argv[2],start=performance.now(),hash=b=>createHash('sha256').update(b).digest('hex');assert.ok(out?.startsWith(prefix));assert.equal(existsSync(out),false);Error.stackTraceLimit=30;
const report={schema_version:1,full_snack_owner_or_canonical_admission_qualified:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
try{
 const raw=p=>readHistoricalContractRepairOwnerMember(root,p),comparison=tooltipPriorCallerRead({root,read:raw}),prior=dialogPortalPrior(root,raw),line=prior.line;
 const result=reviewDialogPortalSource(root,comparison,{currentSourceRead:raw});assert.equal(result.independently_qualified_contract_sources.length,4);
 const {independently_qualified_native_test_source:spec,independently_qualified_silent_Sass_notices:notices,independently_qualified_contract_sources:repairs,...historical}=result;
 const product=JSON.parse(raw('compatibility/rc/snack-dom-source-context-product-inputs.json')),originalReport=JSON.parse(raw(product.dialog.qualification.path));historical.other_product_resource_members_unchanged=1141;assert.deepEqual(historical,originalReport.source);
 const native=autocompleteSelectionReaderSubject({root,read:raw,line}),input='compatibility/rc/historical-contract-repair-source-inputs.json',bound=native.bound.find(r=>r.path===input);assert.ok(bound);assert.equal(hash(raw(input)),bound.sha256);const images=JSON.parse(raw(input)).images.filter(r=>r.path.startsWith('projects/'));
 const ast=ts.createSourceFile('portal.mjs',raw('scripts/dialog-portal-failure-recovery.mjs').toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0);const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='reviewDialogPortalSource'),loops=fn.body.statements.filter(n=>ts.isForOfStatement(n)&&n.expression.getText(ast)==='prior.product_members');assert.equal(loops.length,1);
 const loop=Function('prior','nativeSpec','read','currentSourceRead','contractSources','DIALOG_PORTAL_SOURCE','hash','assert',loops[0].getText(ast)),history={product_members:prior.product_members.filter(m=>images.some(r=>r.path===m.path))};assert.equal(history.product_members.length,4);
 const run=(oldRead=comparison,currentRead=raw,refs=repairs)=>loop(history,native,oldRead,currentRead,refs,DIALOG_PORTAL_SOURCE,hash,assert);run();const rejected=[];
 for(const member of history.product_members){
  assert.throws(()=>run(p=>p===member.path?Buffer.concat([comparison(p),Buffer.from('\n')]):comparison(p)));rejected.push('historical-source/'+member.path);
  assert.throws(()=>run(comparison,p=>p===member.path?Buffer.concat([raw(p),Buffer.from('\n')]):raw(p)));rejected.push('current-source/'+member.path);
 }
 assert.throws(()=>reviewDialogPortalSource(root,raw,{currentSourceRead:raw}));rejected.push('same-reader');assert.throws(()=>reviewDialogPortalSource(root,p=>raw(p),{currentSourceRead:raw}));rejected.push('unregistered-historical-reader');
 for(const [id,patch]of [['hash',{sha256:'0'.repeat(64)}],['size',{bytes:repairs[0].bytes+1}]]){assert.throws(()=>run(comparison,raw,repairs.map((r,i)=>i? r:{...r,...patch})));rejected.push('unqualified-after-'+id);}
 native.assertCurrent();Object.assign(report,{status:'pass',line,actual_public_portal_review_passed:true,original_historical_source_report_preserved:true,canonical_comparison_required:true,current_contract_source_references:repairs,historical_contract_members:history.product_members,prepacked_menu_image_preserved:history.product_members.find(m=>m.path.endsWith('/menu-base.ts')).sha256!==images.find(m=>m.path.endsWith('/menu-base.ts')).before.sha256,independently_qualified_silent_Sass_notices:notices,negative_controls:rejected.length,rejected_case_ids:rejected,actual_current_loop_executed:true,historical_programs_executed:false,current_body_source_sha256:hash(raw('scripts/dialog-portal-failure-recovery.mjs'))});
}catch(e){Object.assign(report,{status:'rejected',error:e.stack});process.exitCode=1;}
report.seconds=(performance.now()-start)/1000;writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,line:report.line,seconds:report.seconds,controls:report.negative_controls,error:report.error}));
