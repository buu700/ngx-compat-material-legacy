/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Targeted a488 trigger DI settlement; public node, source and negative controls.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {deriveSurface} from '../scripts/api-surface.mjs';
import {observeRuntimeDi,loadRuntimeModule} from '../scripts/api-di-observe.mjs';
import {settleDi} from '../scripts/api-completeness.mjs';
import {menuTriggerOwnedToken} from '../scripts/api-menu-trigger-token.mjs';
import {originalContextDi} from '../scripts/api-original-factory-contexts.mjs';
import {createPublicFactoryContext} from '../scripts/api-public-node-context.mjs';
const arg=name=>{const i=process.argv.indexOf(name);assert.ok(i>=0&&process.argv[i+1],name+' required');return resolve(process.argv[i+1]);};
const root=arg('--package-root'),reference=arg('--reference-root'),tarball=arg('--tarball'),artifactContext={tarball,packageRoot:root,referenceRoot:reference},req=createRequire(import.meta.url),load=s=>import(pathToFileURL(req.resolve(s)).href);
await load('@angular/compiler');const peer=await load('@angular/material/menu'),loaded=await loadRuntimeModule(root,'legacy-menu','primary');
const core=await load('@angular/core');
const decoy={wrongModernItem:true};class Decoy {injector=core.inject(core.Injector);}
core.Directive({selector:'[menuTokenDecoy]',standalone:true,providers:[{provide:peer.MatMenuItem,useValue:decoy}]})(Decoy);
class DecoyHost {}
core.ViewChild(Decoy)(DecoyHost.prototype,'decoy');core.ViewChild(loaded.MatLegacyMenuTrigger)(DecoyHost.prototype,'trigger');
core.Component({standalone:true,imports:[loaded.MatLegacyMenuModule,Decoy],template:'<button menuTokenDecoy [matMenuTriggerFor]="menu">Open</button><mat-menu #menu="matMenu"></mat-menu>'})(DecoyHost);
const nodeContext=await createPublicFactoryContext(core,load,{providers:[core.importProvidersFrom(loaded.MatLegacyMenuModule)]});let nodeHost;try{const element=nodeContext.document.createElement('div');nodeContext.document.body.appendChild(element);nodeHost=core.createComponent(DecoyHost,{hostElement:element,environmentInjector:nodeContext.environment});nodeHost.changeDetectorRef.detectChanges();assert.equal(nodeHost.instance.decoy.injector.get(peer.MatMenuItem,null,{self:true,optional:true}),decoy);assert.equal(nodeHost.instance.trigger._menuItemInstance,null);assert.equal(nodeHost.instance.trigger.triggersSubmenu(),false);}finally{nodeHost?.destroy();nodeContext.close();}
const surface=deriveSurface(reference),symbols=surface.symbols.filter(x=>x.family==='legacy-menu').map(x=>x.name==='MatLegacyMenuTrigger'?x:{...x,di_id:null}),symbol=symbols.find(x=>x.name==='MatLegacyMenuTrigger');
const [actual]=await observeRuntimeDi(root,symbols,[],load,artifactContext),row=settleDi(actual,[]);assert.equal(row.result,'pass',JSON.stringify(row.problems));assert.equal(row.status,'intentional-legacy-difference');const request=row.runtime_requests[5];assert.equal(request.identity_matched,false);assert.equal(request.owned_menu_item_replacement.owned_identity_matched,true);assert.equal(request.optional,true);assert.equal(request.self,true);

const [noContext]=await observeRuntimeDi(root,symbols,[],load);assert.equal(settleDi(noContext,[]).result,'fail','actual DI settlement rejects absent archive context');
const [badContext]=await observeRuntimeDi(root,symbols,[],load,{...artifactContext,tarball:join(root,'package.json')});assert.equal(settleDi(badContext,[]).result,'fail','actual DI settlement rejects forged archive context');
const [noReference]=await observeRuntimeDi(root,symbols,[],load,{tarball,packageRoot:root});assert.equal(settleDi(noReference,[]).result,'fail','actual DI settlement rejects missing reference root');
const [wrongReference]=await observeRuntimeDi(root,symbols,[],load,{...artifactContext,referenceRoot:root});assert.equal(settleDi(wrongReference,[]).result,'fail','actual DI settlement rejects wrong reference root');
const param=originalContextDi(symbol.shape,row.runtime_context)[5],owned=Object.getPrototypeOf(loaded.MatLegacyMenuItem),source=readFileSync(join(root,'fesm2022/ngx-compat-material-legacy-legacy-menu.mjs'),'utf8');let negative=0;
assert.ok(await menuTriggerOwnedToken(symbol,param,loaded,peer,owned,root,{artifactContext}));
for(const [name,args] of [
 ['modern-token',[symbol,param,loaded,peer,peer.MatMenuItem,root]],
 ['same-name-token',[symbol,param,loaded,peer,class _LegacyMenuItemBase{},root]],
 ['wrong-peer',[symbol,param,loaded,{...peer,MatMenuItem:owned},owned,root]],
 ['wrong-owned-export',[symbol,param,{...loaded,MatLegacyMenuItem:class MatLegacyMenuItem{}},peer,owned,root]],
 ['wrong-panel-token',[symbol,param,{...loaded,MAT_LEGACY_MENU_PANEL:peer.MAT_MENU_PANEL},peer,owned,root]],
 ['wrong-source',[symbol,param,loaded,peer,owned,root,{sourceOverride:source+'\n// foreign'}]],
 ['source-provider-mutant',[symbol,param,loaded,peer,owned,root,{sourceOverride:source.replace('provide: _LegacyMenuItemBase, useExisting: MatLegacyMenuItem','provide: MatMenuItem, useExisting: MatLegacyMenuItem')}]],
 ['wrong-optional-flag',[symbol,{...param,optional:false},loaded,peer,owned,root]],
 ['wrong-self-flag',[symbol,{...param,self:false},loaded,peer,owned,root]],
 ['wrong-original-shape',[{...symbol,shape:{...symbol.shape,kind:'forged'}},param,loaded,peer,owned,root]],
]){const extra=args[6]||{};assert.equal(await menuTriggerOwnedToken(...args.slice(0,6),{...extra,artifactContext}),null,name);negative++;}
assert.equal(await menuTriggerOwnedToken(symbol,param,loaded,peer,owned,root),null,'missing artifact context');negative++;
assert.equal(await menuTriggerOwnedToken(symbol,param,loaded,peer,owned,root,{artifactContext:{...artifactContext,tarball:join(root,'package.json')}}),null,'forged tarball');negative++;
for(const [name,mutate]of [
 ['factory-threw',r=>r.factory_outcome='threw'],
 ['not-owned-instance',r=>r.factory_returned_owned_instance=false],
 ['wrong-node',r=>r.factory_node_kind='template'],
 ['missing-caller-module',r=>r.factory_context_modules=[]],
 ['missing-other-token',r=>r.runtime_requests.pop()],
 ['forged-other-identity',r=>r.runtime_requests[0].identity_matched=false],
 ['missing-role',r=>delete r.runtime_requests[5].owned_menu_item_replacement],
 ['forged-original-identity',r=>r.runtime_requests[5].identity_matched=true],
 ['forged-replacement-identity',r=>r.runtime_requests[5].owned_menu_item_replacement.owned_identity_matched=false],
 ['wrong-token-label',r=>r.runtime_requests[5].observed_label='MatMenuItem'],
 ['wrong-optional',r=>r.runtime_requests[5].optional=false],
 ['wrong-self',r=>r.runtime_requests[5].self=false],
 ['wrong-reference-receipt',r=>r.runtime_requests[5].owned_menu_item_replacement.historical_reference.sources['menu/menu-trigger.ts']='0'.repeat(64)],
 ['wrong-peer-source',r=>r.runtime_requests[5].owned_menu_item_replacement.source_sha256='0'.repeat(64)],
 ['wrong-original-context',r=>r.symbol.shape.originalFactoryContext.parameter_factory_key='forged'],
]){const changed=structuredClone(actual);mutate(changed);let result;try{result=settleDi(changed,[]).result;}catch{result='fail';}assert.equal(result,'fail',name);negative++;}
console.log(JSON.stringify({result:row.result,status:row.status,actual_node:row.factory_node_kind,request_count:row.runtime_requests.length,negative_controls:negative,actual_settlement_context_negatives:4,actual_same_node_modern_token_decoy_rejected:true,scope:'actual packed source and public Angular node factory; submenu/browser handled separately'}));
