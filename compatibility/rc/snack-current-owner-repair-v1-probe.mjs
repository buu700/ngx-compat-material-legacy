/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exercise actual current function bodies; comparison code before-images are never evaluated. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {readHistoricalContractRepairOwnerMember} from '../../scripts/historical-contract-repair-readers.mjs';
import {autocompleteSelectionReaderSubject} from '../../scripts/autocomplete-selection-spec-subject.mjs';
import {SNACK_SOURCE,DIALOG_PORTAL_SOURCE,TOOLTIP_SOURCE} from '../../scripts/snack-dom-source-context.mjs';
import {MENU_CONTENT_PANEL_SOURCE} from '../../scripts/menu-panel-content-boundary.mjs';
const ts=createRequire(import.meta.url)('typescript'),root=process.cwd(),prefix='compatibility/rc/snack-current-owner-repair-',out=process.argv[2],start=performance.now(),hash=b=>createHash('sha256').update(b).digest('hex');assert.ok(out?.startsWith(prefix));assert.equal(existsSync(out),false);
const report={schema_version:1,focused_current_body_tests_only:true,historical_programs_executed:false,full_snack_owner_or_applied_CVA_reader_qualified:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
try{
 const disk=p=>readHistoricalContractRepairOwnerMember(root,p),code=disk('scripts/snack-dom-source-context.mjs').toString(),ast=ts.createSourceFile('owner.mjs',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0);
 const fn=name=>{const nodes=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.equal(nodes.length,1);return nodes[0];},owner=fn('snackDomSourceContext'),overlay=fn('inspectSnackCurrentOverlayContracts');
 const registration=owner.body.statements.filter(n=>ts.isExpressionStatement(n)&&['packedCurrentEpochs.set','branded.set'].includes(n.expression.expression?.getText(ast)));assert.equal(registration.length,2);
 const maps={branded:new WeakMap(),packed:new WeakMap()},raw=p=>Buffer.from('current:'+p),before=p=>Buffer.from('historical:'+p),qualified={read:before,tag:'qualified-packed-subject'};
 const register=Function('root','rawCurrent','packed','packedCurrentEpochs','branded',registration.map(n=>n.getText(ast)).join('\n')+'\nreturn packed.read;');
 const unwrap=Function('assert','packedUpstreamLedgerRawRead','currentAuthoredRosterRawRead','branded','return '+fn('currentRaw').getText(ast))(assert,({read})=>read,({read})=>read,maps.branded);
 const registered=register(root,raw,qualified,maps.packed,maps.branded);assert.equal(registered,before);assert.equal(unwrap(root,registered),raw);assert.equal(registered('x').toString(),'historical:x');assert.equal(unwrap(root,registered)('x').toString(),'current:x');
 const unrelated=p=>Buffer.from('unregistered:'+p);assert.equal(unwrap(root,unrelated),unrelated);assert.throws(()=>unwrap(root+'/wrong',registered));
 const outer=p=>registered(p);maps.branded.set(outer,{root,raw:registered});assert.equal(unwrap(root,outer),raw);
 let fallbackCalls=0;
 const inspect=Function('root','read','packedCurrentEpochs','currentRaw','assert','packedCvaMetadataToolingEpoch','packedRepairEpoch',overlay.body.statements.slice(0,5).map(n=>n.getText(ast)).join('\n')+'\nreturn {actual,packed};');
 const composed=inspect(root,registered,maps.packed,unwrap,assert,()=>({}),()=>{fallbackCalls++;return qualified;});assert.equal(composed.actual,raw);assert.equal(composed.packed,qualified);assert.equal(fallbackCalls,0);
 const ordinary=inspect(root,raw,maps.packed,unwrap,assert,()=>({}),()=>{fallbackCalls++;return qualified;});assert.equal(ordinary.actual,raw);assert.equal(fallbackCalls,1);
 const line=JSON.parse(disk('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',sources=JSON.parse(disk('compatibility/rc/historical-contract-repair-source-inputs.json')).images.filter(r=>r.path.startsWith('projects/'));
 let late=null;const current=p=>p===late?Buffer.concat([disk(p),Buffer.from('\n')]):disk(p),native=autocompleteSelectionReaderSubject({root,read:current,line});
 const loops=owner.body.statements.filter(n=>ts.isForOfStatement(n)&&n.expression.getText(ast)==='history.product_members');assert.equal(loops.length,1);
 const run=Function('history','packed','owned','service','config','qualified','nativeSpec','rawCurrent','hash','assert','SNACK_SOURCE','DIALOG_PORTAL_SOURCE','TOOLTIP_SOURCE','MENU_CONTENT_PANEL_SOURCE',loops[0].getText(ast));
 const history={product_members:sources.map(r=>({path:r.path,...r.before}))},packed={targets:[history.product_members.find(m=>m.path.endsWith('/menu-base.ts'))]},owned={targets:[]},service={targets:[history.product_members.find(m=>m.path.endsWith('/snack-bar-base.ts'))]},config={targets:[]};
 const exercise=(h=history,p=packed,o=owned,s=service,c=config,q={})=>run(h,p,o,s,c,q,native,current,hash,assert,SNACK_SOURCE,DIALOG_PORTAL_SOURCE,TOOLTIP_SOURCE,MENU_CONTENT_PANEL_SOURCE);
 exercise();const rejected=['wrong-root'];
 for(const row of sources){late=row.path;assert.throws(()=>exercise());rejected.push('late-current/'+row.path);late=null;}
 const snack=service.targets[0];for(const [id,bad]of [['hash',{...snack,sha256:'0'.repeat(64)}],['size',{...snack,bytes:snack.bytes+1}]]){assert.throws(()=>exercise(history,packed,owned,{targets:[bad]}));rejected.push('unqualified-selected-service-'+id);}
 const sourceInputs=JSON.parse(disk('compatibility/rc/snack-dom-source-context-inputs.json')),capture=disk(sourceInputs.history_product.path);assert.equal(hash(capture),sourceInputs.history_product.sha256);const all=JSON.parse(gunzipSync(capture)).product_members;
 const unchanged=all.find(m=>m.path.endsWith('.scss')&&hash(disk(m.path))===m.sha256);assert.ok(unchanged);exercise({product_members:[unchanged]},{targets:[]},{targets:[]},{targets:[]},{targets:[]});native.assertCurrent();
 Object.assign(report,{status:'pass',line,registration_and_current_unwrap_actual_code:true,overlay_retains_internal_qualification_before_unwrap:true,actual_product_loop_with_real_native_source_subject:true,repaired_product_cases:sources.length,unchanged_historical_resource:unchanged.path,negative_controls:rejected.length,rejected_case_ids:rejected,source_program:{path:'scripts/snack-dom-source-context.mjs',sha256:hash(disk('scripts/snack-dom-source-context.mjs'))}});
}catch(e){Object.assign(report,{status:'rejected',error:e.stack});process.exitCode=1;}
report.seconds=(performance.now()-start)/1000;writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,line:report.line,seconds:report.seconds,controls:report.negative_controls,error:report.error}));
