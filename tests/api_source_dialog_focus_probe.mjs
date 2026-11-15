/** Focused source-diagnostic controls; input is a separately emitted synthetic runtime. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {verifySourceDialogFocus,challengeSourceDialogFocusDetector,sourceDialogFocusObservationProblems} from '../scripts/api-source-dialog-focus-context.mjs';
import {ownedDialogFocusObservationProblems} from '../scripts/api-owned-dialog-focus-context.mjs';
await import('@angular/compiler');
const original=process.argv[2];assert.ok(original,'provide actual emitted dialog runtime path');
const runtime=await import(pathToFileURL(original).href),Owner=runtime._MatLegacyDialogContainerBase;
const originalText=readFileSync(original,'utf8'),match=original.match(/api-full-factory-source-[A-Za-z0-9]{6}/);assert.ok(match);
const temp=mkdtempSync(join(tmpdir(),'api-full-factory-source-'));const file=join(temp,'runtime/fesm2022/ngx-compat-material-legacy-legacy-dialog.mjs');mkdirSync(dirname(file),{recursive:true});
const originalRoot=dirname(dirname(dirname(original)));
const valid=originalText.replaceAll('// '+relative(process.cwd(),join(originalRoot,'emitted'))+'/', '// '+relative(process.cwd(),join(temp,'emitted'))+'/').replaceAll(pathToFileURL(join(originalRoot,'runtime/fesm2022')+'/').href,pathToFileURL(join(temp,'runtime/fesm2022')+'/').href);writeFileSync(file,valid);
try {
 const proof=verifySourceDialogFocus(file,Owner).proof;assert.equal(proof.normalized_source_sha256,'43691b071ebc1bebf65cceb8d2cbd8485d11b7a6f956477d1cc22a72e1b64d1e');
 assert.throws(()=>verifySourceDialogFocus(file,class Forged{}));
 assert.throws(()=>verifySourceDialogFocus(originalText,Owner));
 const fields=[['_legacyRenderInjector','Injector','@angular/core'],['_legacyApplicationRef','ApplicationRef','@angular/core'],['_legacyChangeDetector','ChangeDetectorRef','@angular/core'],['_legacyDialogRef','DialogRef','@angular/cdk/dialog'],['_legacyFocusPlatform','Platform','@angular/cdk/platform'],['_legacyFocusRenderer','Renderer2','@angular/core']];
 const packedRow={symbol:{symbol_id:'legacy-dialog/primary/_MatLegacyDialogContainerBase'},factory_outcome:'returned',factory_owned_dialog_focus_context:{symbol_id:'legacy-dialog/primary/_MatLegacyDialogContainerBase',source:proof,actual_negative_controls:['wrong-token','wrong-flags','forged-owner','copied-node-scope','wrong-artifact'],verified:true,public_control_outcome:'returned',render_node_scope_verified:true,manual_constructor_verified:true,detector_scope_verified:true,borrowed_context_alive_after_owned_teardown:true,constructor_owner:{public_export:'_MatLegacyDialogContainerBase',depth:0,owned_class_identity_matched:true},total_requests:6,retained_requests:0,classified_requests:6,requests:fields.map(([field,ident,spec],i)=>({field,ident,spec,identity_matched:true,value_matched:i===0?'same-node-scope':true,unresolved:false,optional:true,self:false,skipSelf:false,host:false}))}};
 assert.deepEqual(sourceDialogFocusObservationProblems(packedRow),[]);assert.ok(ownedDialogFocusObservationProblems(packedRow).length,'complete source observation must fail packed receipt');
 let rejected=0;
 for(const [a,b] of [['_legacyRenderInjector = ambientService(Injector)','_legacyRenderInjector = ambientService(ApplicationRef)'],['optional: true','optional: false'],['var _MatDialogContainerBase = class','var _MatDialogContainerBase = function'],['function ambientService','function alteredService'],['extends BasePortalOutlet','extends Object'],['// '+relative(process.cwd(),join(temp,'emitted'))+'/', '// xx-forged/'],[pathToFileURL(join(temp,'runtime/fesm2022')+'/').href,'file:///tmp/foreign/runtime/fesm2022/'],['var _MatDialogContainerBase = class','const escapedRoot = '+JSON.stringify(temp.split('/').at(-1))+'; var _MatDialogContainerBase = class']]) {
  assert.ok(valid.includes(a),a);writeFileSync(file,valid.replace(a,b));assert.throws(()=>verifySourceDialogFocus(file,Owner));rejected++;
 }
 writeFileSync(file,valid);assert.doesNotThrow(()=>verifySourceDialogFocus(file,Owner));
 const fixture={element:{destroyed:false},template:{destroyed:false},environment:{destroyed:false}};const value={_legacyFocusDestroyed:true,_legacyChangeDetector:{destroy(){fixture.element.destroyed=true;fixture.template.destroyed=true}}},observation={};challengeSourceDialogFocusDetector(value,fixture,observation);assert.equal(observation.detector_scope_verified,true);assert.equal(observation.borrowed_context_alive_after_owned_teardown,true);
 assert.throws(()=>challengeSourceDialogFocusDetector(value,fixture,{}));
 console.log(JSON.stringify({valid:true,forged_owner_rejected:true,source_mutants_rejected:rejected,recovery:true,detector_lifetime_checked:true}));
} finally {rmSync(temp,{recursive:true,force:true});}
