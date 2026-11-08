/** Targeted fail-closed controls for an actual packed portal observation. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tabPortalHelperProof,tabPortalObservationProblems} from './api-tab-portal-context.mjs';
import {settleDi} from './api-completeness.mjs';
const [bundle,report]=process.argv.slice(2);assert.ok(bundle&&report,'expected bundle and targeted JSON report');
const source=readFileSync(bundle,'utf8'),row=JSON.parse(readFileSync(report,'utf8')).row;
assert.deepEqual(row.problems,[]);assert.deepEqual(tabPortalObservationProblems(row),[]);
tabPortalHelperProof(source,bundle);
for(const [name,before,after] of [
 ['wrong-token','token === ViewContainerRef','token === Injector'],
 ['wrong-flags','this.parent.get(token, notFoundValue, options)','this.parent.get(token, notFoundValue, {optional: true})'],
 ['wrong-borrowed-injector','document, container.injector','document, Injector.NULL'],
 ['wrong-constructor-route','new.target, viewContainerRef, _document','new.target, viewContainerRef, null'],
 ['wrong-import',"{ DOCUMENT, CommonModule } from '@angular/common'","{ DOCUMENT, CommonModule } from '@angular/core'"],
]) {assert.ok(source.includes(before),name);assert.throws(()=>tabPortalHelperProof(source.replace(before,after),bundle),undefined,name);}
for(const [name,mutate] of [
 ['missing-control',x=>x.factory_tab_portal_context.public_control_requests=0],
 ['wrong-control-token',x=>x.factory_tab_portal_context.requests[1].ident='ViewContainerRef'],
 ['wrong-control-flag',x=>x.factory_tab_portal_context.requests[0].optional=false],
 ['wrong-retained-count',x=>x.factory_tab_portal_context.outer_requests=0],
 ['borrowed-view-destroyed',x=>x.factory_tab_portal_parent_context.borrowed_parent_view_alive_after_child_teardown=false],
 ['lost-manual-overrides',x=>x.factory_tab_portal_context.manual_argument_overrides=false],
 ['missing-owned-helper',x=>delete x.factory_tab_portal_context.packed_helper],
 ['wrong-peer-module',x=>x.factory_tab_portal_context.parent_source.module='@angular/cdk/portal#Other'],
 ['wrong-peer-file-hash',x=>x.factory_tab_portal_context.parent_source.sha256='0'.repeat(64)],
 ['wrong-peer-class-hash',x=>x.factory_tab_portal_context.parent_source.parent_text_sha256='0'.repeat(64)],
 ['extra-peer-field',x=>x.factory_tab_portal_context.parent_source.path='/forged/portal.mjs'],
 ['wrong-packed-path',x=>x.factory_tab_portal_context.packed_helper.file='elsewhere/ngx-compat-material-legacy-legacy-tabs.mjs'],
 ['wrong-packed-hash',x=>x.factory_tab_portal_context.packed_helper.sha256='0'.repeat(64)],
 ['wrong-packed-class-hash',x=>x.factory_tab_portal_context.packed_helper.class_text_sha256='0'.repeat(64)],
 ['wrong-packed-constructor-hash',x=>x.factory_tab_portal_context.packed_helper.constructor_sha256='0'.repeat(64)],
 ['wrong-helper-hash',x=>x.factory_tab_portal_context.packed_helper.helper_sha256.LegacyTabPortalConstructorInjector='0'.repeat(64)],
 ['extra-packed-field',x=>x.factory_tab_portal_context.packed_helper.path='/forged/tabs.mjs'],

]) {const changed=structuredClone(row);mutate(changed);assert.ok(tabPortalObservationProblems(changed).length,name);assert.equal(settleDi(changed,[]).result,'fail',name);}
console.log('portal observer: five source mutants and seventeen evidence mutants rejected');

// Actual public-peer source and export binding; synthetic comment decoys parse
// cleanly and must never serve as a class declaration witness.
const {portalParentScopeFromSource}=await import('./api-tab-portal-context.mjs');
const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);
await import('@angular/compiler');
const peer=await import('@angular/cdk/portal'),peerFile=require.resolve('@angular/cdk/portal'),peerSource=readFileSync(peerFile,'utf8');
portalParentScopeFromSource(peer.CdkPortalOutlet,peerSource,peerFile);
const stub='class CdkPortalOutlet {}';
const Synthetic=class CdkPortalOutlet {_moduleRef=inject(NgModuleRef,{optional:true});_document=inject(DOCUMENT);_viewContainerRef=inject(ViewContainerRef);};
const imports="import {inject,NgModuleRef,DOCUMENT,ViewContainerRef} from '@angular/core';\n";
const fake=imports+stub+'\n/* '+Synthetic.toString()+' */\nexport {CdkPortalOutlet};';
assert.throws(()=>portalParentScopeFromSource(Synthetic,fake,'peer-comment.mjs'));
const actualText=Function.prototype.toString.call(peer.CdkPortalOutlet);assert.ok(peerSource.includes(actualText));
for(const [name,altered] of [
 ['changed-peer',peerSource.replace(actualText,stub)],
 ['decoy-unexported',peerSource.replace(actualText,actualText.replace('class CdkPortalOutlet','class DecoyPortalOutlet')+'\n'+stub)],
 ['swapped-export',peerSource.replace(actualText,actualText+'\nclass CounterfeitPortalOutlet {}').replace('export { BasePortalOutlet, CdkPortal, CdkPortalOutlet,','export { BasePortalOutlet, CdkPortal, CounterfeitPortalOutlet as CdkPortalOutlet,')],
 ['shadowed-inject',peerSource+'\nconst inject = 1;'],
 ['shadowed-token',peerSource+'\nconst DOCUMENT = 1;'],
]) {assert.notEqual(altered,peerSource,name);assert.throws(()=>portalParentScopeFromSource(peer.CdkPortalOutlet,altered,'peer-mutant.mjs'),undefined,name);}
console.log('portal public peer: comment, changed class, decoy, swapped export and two shadow mutations rejected');
