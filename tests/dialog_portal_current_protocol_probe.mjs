/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current public outlet, original constructor/focus assertions and a tagged lifecycle oracle. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {loadTaggedPortalProtocol,currentContainerProgram,currentOutlet,taggedOutlet} from './dialog_portal_protocol_subject.mjs';
import {fixture,load} from './dialog_initial_focus_runtime_probe.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),url=name=>pathToFileURL(require.resolve(name)).href,hash=raw=>createHash('sha256').update(raw).digest('hex');
await import(url('@angular/compiler'));const core=await import(url('@angular/core')),portal=await import(url('@angular/cdk/portal'));
assert.equal(process.versions.node,JSON.parse(readFileSync(join(root,'toolchain-lock.json'))).repository.node);
const line=JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main';
assert.equal(core.VERSION.full,line==='21.x'?'21.2.23':'22.1.7');assert.equal(JSON.parse(readFileSync(require.resolve('@angular/cdk/package.json'))).version,line==='21.x'?'21.2.14':'22.1.7');
const oracle=await loadTaggedPortalProtocol({root}),program=currentContainerProgram({root});
const current=await import(program.url);assert.equal(current.report.cases.length,28);assert.equal(current.report.mutations.length,8);assert.ok(current.report.cases.every(row=>row.result==='pass'));
const observations=[],checks=[];
for(const epoch of ['tagged16','current-public'])for(const dispatch of ['typed','generic'])for(const kind of ['component','template','dom']){
 const actual=epoch==='tagged16'?taggedOutlet(oracle,core):currentOutlet(portal,core),api=epoch==='tagged16'?oracle.portal:portal;
 const p=kind==='component'?new api.ComponentPortal(class Content{}):kind==='template'?new api.TemplatePortal({},{}):new api.DomPortal(actual.dom.element);
 try{
  const result=dispatch==='generic'?actual.outlet.attach(p):actual.outlet['attach'+kind[0].toUpperCase()+kind.slice(1)+'Portal'](p);
  assert.equal(result,kind==='dom'?undefined:actual[kind]);assert.equal(actual.outlet.hasAttached(),true);assert.equal(p.isAttached,true);
  if(kind==='dom')assert.equal(actual.dom.element.parentNode,actual.dom.target);
  assert.throws(()=>actual.outlet.attach(new api.ComponentPortal(class Duplicate{})),/already/);
  actual.outlet.detach();assert.equal(actual.outlet.hasAttached(),false);assert.equal(p.isAttached,false);
  if(kind==='dom')assert.equal(actual.dom.element.parentNode,actual.dom.origin);
  actual.outlet.dispose();assert.throws(()=>actual.outlet.attach(p),/disposed/);
  checks.push(epoch+'/'+dispatch+'/'+kind+'/identity-state-duplicate-detach-dispose');
 }finally{actual.destroy();}
}
const Owned=await load();
for(const epoch of ['tagged16-outlet','tagged16-container','current-public','current-owned'])for(const dispatch of ['typed','generic'])for(const kind of ['component','template','dom']){
 const historical=epoch.startsWith('tagged16'),actual=historical?taggedOutlet(oracle,core):currentOutlet(portal,core),api=historical?oracle.portal:portal;let host=actual.outlet,f;
 if(epoch==='tagged16-container'){class Host extends oracle.dialog.CdkDialogContainer{_contentAttached(){}}host=new Host({},null,actual.dom.document,{},null,null,null);host._portalOutlet=actual.outlet;}
 if(epoch==='current-owned'){f=fixture(Owned,false,true,{manual:true});f.instance._portalOutlet=actual.outlet;host=f.instance;}
 const p=kind==='component'?new api.ComponentPortal(class Content{}):kind==='template'?new api.TemplatePortal({},{}):new api.DomPortal(actual.dom.element);
 try{
  host.dispose();let error=null;try{if(dispatch==='generic')host.attach(p);else host['attach'+kind[0].toUpperCase()+kind.slice(1)+'Portal'](p);}catch(caught){error=caught.message;}
  if(dispatch==='generic')assert.match(error??'',/disposed/);
  if(epoch!=='current-owned'&&dispatch==='typed')assert.equal(error,null,'tagged/current public typed behavior changed');
  if(epoch==='current-owned'&&dispatch==='typed'&&kind!=='dom')assert.equal(error,null);
  observations.push({epoch,dispatch,kind,after_empty_dispose:error?{throws:error}:{attaches:true}});
 }finally{f?.destroy();actual.destroy();}
}
// A missing parent is rejected by both real outlets, before any DOM movement.
for(const epoch of ['tagged16','current-public']){
 const actual=epoch==='tagged16'?taggedOutlet(oracle,core):currentOutlet(portal,core),api=epoch==='tagged16'?oracle.portal:portal;
 actual.dom.origin.removeChild(actual.dom.element);
 try{assert.throws(()=>actual.outlet.attach(new api.DomPortal(actual.dom.element)),/parent node/);checks.push(epoch+'/parentless-dom-rejected');}finally{actual.destroy();}
}
const difference=observations.filter(row=>row.epoch==='current-owned'&&row.dispatch==='typed'&&row.kind==='dom');assert.equal(difference.length,1);assert.match(difference[0].after_empty_dispose.throws,/disposed/);
let rejectedOracleFaults=0;
for(const ref of oracle.bound){await assert.rejects(()=>loadTaggedPortalProtocol({root,read:path=>path===ref.path?Buffer.concat([readFileSync(join(root,path)),Buffer.from('\n')]):readFileSync(join(root,path))}));rejectedOracleFaults++;}
let late=null;const lateOracle=await loadTaggedPortalProtocol({root,read:path=>path===late?Buffer.concat([readFileSync(join(root,path)),Buffer.from('\n')]):readFileSync(join(root,path))});let rejectedLateOracleFaults=0;
for(const ref of lateOracle.bound){late=ref.path;assert.throws(()=>lateOracle.assertCurrent());rejectedLateOracleFaults++;}late=null;lateOracle.assertCurrent();
assert.throws(()=>currentContainerProgram({root,read:path=>path===program.original.path?Buffer.concat([readFileSync(join(root,path)),Buffer.from('\n')]):readFileSync(join(root,path))}));
const generated=Buffer.from(program.url.slice(program.url.indexOf(',')+1),'base64').toString();
const genericAssertion="assert.throws(() => f.instance.attach(new ComponentPortal(class Later {})), /disposed/);";
assert.equal(generated.split(genericAssertion).length,2);
const bypassed=generated.replace(genericAssertion,"assert.throws(() => f.instance.attachComponentPortal(new ComponentPortal(class Later {})), /disposed/);");
await assert.rejects(()=>import('data:text/javascript;base64,'+Buffer.from(bypassed).toString('base64')),error=>error.message.includes('detach-and-dispose-delegate-without-destroying-borrowed-services'));
oracle.assertCurrent();
const sources=['projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.ts','tests/dialog_portal_protocol_subject.mjs','tests/dialog_portal_current_protocol_probe.mjs'].map(path=>{const b=readFileSync(join(root,path));return {path,sha256:hash(b),bytes:b.length};});
const report={schema_version:1,line,role:'Actual current public outlet and authenticated tagged protocol comparison; source runtime only',node:process.version,framework:core.VERSION.full,original_program:program.original,original_observation_ids:current.report.cases.map(row=>row.id),original_observations_passed:28,original_mutations_rejected:8,original_assertion_calls_preserved:program.original_assertion_calls,fixture_and_protocol_literal_edits:program.literal_edits,tagged_oracle:oracle.bound,tagged_declarations:oracle.excerpts,Angular_metadata_blocks_excluded:oracle.removed,portal_checks:checks,disposal_observations:observations,oracle_byte_faults_rejected:rejectedOracleFaults,late_oracle_byte_faults_rejected:rejectedLateOracleFaults,original_program_byte_fault_rejected:true,generic_disposal_bypass_mutant_rejected:true,known_lifetime_difference:{case:difference[0],scope:'Typed DOM attachment after explicit disposal delegates to the stable public generic outlet operation; the tagged typed method bypassed its generic disposal guard.',status:'Outside the documented supported lifetime after explicit permanent disposal; exact observed difference retained for the complete audit.'},current_product_changes:0,consumer_HTML_CSS_SCSS_changes:0,sources,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.env.DIALOG_PORTAL_CURRENT_PROTOCOL_REPORT)writeFileSync(process.env.DIALOG_PORTAL_CURRENT_PROTOCOL_REPORT,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line,original_observations_passed:28,original_mutations_rejected:8,portal_checks:checks.length,disposal_observations:observations.length,oracle_byte_faults_rejected:rejectedOracleFaults,late_oracle_byte_faults_rejected:rejectedLateOracleFaults,generic_disposal_bypass_mutant_rejected:true,known_lifetime_differences:1,actual_native_artifact_browser_floor_or_full_audit_qualified:false}));
