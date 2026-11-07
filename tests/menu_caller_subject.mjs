/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual owned/tagged constructors and decorator objects; node/CDR/zone payloads are protocols. */
import assert from 'node:assert/strict';
const [line,mode]=process.argv.slice(2);
await import('@angular/compiler');
const core=await import('@angular/core'),peer=await import('@angular/material/menu'),a11y=await import('@angular/cdk/a11y');
if(mode==='production')core.enableProdMode();
const api=line==='original'?await import('@angular/material/legacy-menu'):await import('./projects/ngx-material-legacy/legacy-menu/public-api.mjs');
const Menu=api.MatLegacyMenu,Item=api.MatLegacyMenuItem,Content=api.MatLegacyMenuContent,Trigger=api.MatLegacyMenuTrigger;
const cases=[],observations={configs:[],items:[],content:[],tokens:[]},classes=new Set();
const host={className:'',classList:{add(...v){v.forEach(x=>classes.add(x));},remove(...v){v.forEach(x=>classes.delete(x));}},getAttribute(){return null;},setAttribute(){},removeAttribute(){},addEventListener(){},removeEventListener(){},focus(){},cloneNode(){return{textContent:' Label ',querySelectorAll(){return[];}};}};
const element=new core.ElementRef(host),detector={markForCheck(){},detectChanges(){}},zone={run:f=>f(),runOutsideAngular:f=>f(),onStable:new core.EventEmitter()};
const configs=[{xPosition:'after',yPosition:'below',overlapTrigger:true},{xPosition:'before',yPosition:'above',overlapTrigger:false,hasBackdrop:false,backdropClass:'backdrop',overlayPanelClass:['one','two']},{xPosition:'after',yPosition:'above',overlapTrigger:false,hasBackdrop:true,overlayPanelClass:'pane'},{xPosition:'before',yPosition:'below',overlapTrigger:true,overlayPanelClass:''}];
for(let i=0;i<configs.length;i++){
 const config=Object.freeze(configs[i]),menu=new Menu(element,zone,config,detector);assert.equal(menu.xPosition,config.xPosition);assert.equal(menu.yPosition,config.yPosition);assert.equal(menu.overlapTrigger,config.overlapTrigger);assert.equal(menu.hasBackdrop,config.hasBackdrop);assert.equal(menu.backdropClass,config.backdropClass);assert.equal(menu.overlayPanelClass,config.overlayPanelClass||'');assert.equal(menu.close,menu.closed);menu.ngOnInit();
 observations.configs.push({index:i,x:menu.xPosition,y:menu.yPosition,overlap:menu.overlapTrigger,backdrop:menu.hasBackdrop,backdropClass:menu.backdropClass,panelClass:menu.overlayPanelClass});cases.push('actual-manual-menu-config-'+i);
}
const menu=new Menu(element,zone,configs[0],detector),monitor={focusVia(){},monitor(){},stopMonitoring(){}},document={activeElement:host};
for(const args of [[element],[element,document,monitor,menu,detector]]){
 const item=new Item(...args);assert.equal(item._getHostElement(),host);assert.equal(item.role,'menuitem');assert.equal(item._parentMenu,args.length===1?undefined:menu);item.disabled=true;assert.equal(item._getTabIndex(),'-1');item.disabled=false;assert.equal(item.getLabel(),'Label');item.ngOnDestroy();observations.items.push({args:args.length,hostIdentity:true,parentIdentity:true,manualOutsideDI:true});cases.push('actual-manual-item-'+args.length);
}
const payload={template:{},resolver:{},app:{},injector:{},view:{},document:{},detector};const contentArgs=[payload.template,...(line==='original'?[payload.resolver]:[]),payload.app,payload.injector,payload.view,payload.document,payload.detector],content=new Content(...contentArgs);if(line==='original')assert.throws(()=>content.detach(),TypeError);else content.detach();content.ngOnDestroy();observations.content.push({manualOutsideDI:true,constructorArguments:contentArgs.length,unattachedDetachThrows:line==='original',unattachedDestroySafe:true});cases.push('actual-manual-unattached-content');
for(const [legacy,current]of [['MAT_LEGACY_MENU_CONTENT','MAT_MENU_CONTENT'],['MAT_LEGACY_MENU_DEFAULT_OPTIONS','MAT_MENU_DEFAULT_OPTIONS'],['MAT_LEGACY_MENU_SCROLL_STRATEGY','MAT_MENU_SCROLL_STRATEGY']]){assert.equal(api[legacy],peer[current]);observations.tokens.push({legacy,current,same:true});cases.push('public-alias-'+current);}
// Test-only reflection reads the real decorator objects. It does not render or
// execute generated template/content-query instructions; packed native gates do that.
if(line!=='original'){
 const { _LegacyMenuItemBase:ItemBase }=await import('./projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.mjs');
 const {_MatMenuBase:MenuBase}=await import('./projects/ngx-material-legacy/legacy-menu/internal/menu-base.mjs');
 const {_MatMenuTriggerBase:TriggerBase}=await import('./projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.mjs');
 const annotation=Class=>{const values=Object.getOwnPropertyDescriptor(Class,'__annotations__')?.value;assert.ok(Array.isArray(values));return values.at(-1);};
 const item=new Item(element,document,monitor,menu,detector);
 const itemProviders=annotation(Item).providers;assert.ok(itemProviders.some(p=>p.provide===peer.MatMenuItem&&p.useExisting===Item));assert.ok(itemProviders.some(p=>p.provide===ItemBase&&p.useExisting===Item));
 const itemInjector=core.Injector.create({providers:[...itemProviders,{provide:Item,useValue:item}]});try{assert.equal(itemInjector.get(peer.MatMenuItem),item);assert.equal(itemInjector.get(ItemBase),item);}finally{itemInjector.destroy();}
 const contentProviders=annotation(Content).providers;assert.ok(contentProviders.some(p=>p.provide===peer.MAT_MENU_CONTENT&&p.useExisting===Content));const contentInjector=core.Injector.create({providers:[...contentProviders,{provide:Content,useValue:content}]});try{assert.equal(contentInjector.get(peer.MAT_MENU_CONTENT),content);}finally{contentInjector.destroy();}
 const panel=api.MAT_LEGACY_MENU_PANEL;assert.notEqual(panel,peer.MAT_MENU_PANEL);assert.ok(annotation(Menu).providers.some(p=>p.provide===panel&&p.useExisting===Menu));const panelInjector=core.Injector.create({providers:[...annotation(Menu).providers,{provide:Menu,useValue:menu},{provide:peer.MAT_MENU_PANEL,useValue:{modern:true}}]});try{assert.equal(panelInjector.get(panel),menu);assert.notEqual(panelInjector.get(peer.MAT_MENU_PANEL),menu);}finally{panelInjector.destroy();}
 const prop=Object.getOwnPropertyDescriptor(MenuBase,'__prop__metadata__').value;assert.ok(prop._allItems.some(q=>q.selector===peer.MatMenuItem&&q.descendants===true));assert.ok(prop.items.some(q=>q.selector===peer.MatMenuItem&&q.descendants===false));assert.ok(prop.lazyContent.some(q=>q.selector===peer.MAT_MENU_CONTENT));
 const params=Object.getOwnPropertyDescriptor(TriggerBase,'__parameters__').value;assert.ok(params[4].some(p=>p.token===panel));assert.ok(params[5].some(p=>p.token===ItemBase));
 // Test-only JIT decorator reflection: this source-emission fixture has unresolved
 // component resources. A packed successor separately executes public module DI.
 const {Overlay}=await import('@angular/cdk/overlay');const providers=annotation(api.MatLegacyMenuModule).providers;const provider=providers.find(p=>p.provide===peer.MAT_MENU_SCROLL_STRATEGY);assert.ok(provider);assert.equal(typeof provider.useFactory,'function');assert.deepEqual(provider.deps,[Overlay]);let calls=0;const strategy={reposition(){calls++;return{strategy:calls};},noop(){return{strategy:'noop'};}};const injector=core.Injector.create({providers:[provider,{provide:Overlay,useValue:{scrollStrategies:strategy}}]});try{const closure=injector.get(api.MAT_LEGACY_MENU_SCROLL_STRATEGY);assert.equal(typeof closure,'function');assert.deepEqual(closure(),{strategy:1});assert.deepEqual(closure(),{strategy:2});}finally{injector.destroy();}
 cases.push('actual-item-useExisting-provider-array','actual-content-useExisting-provider-array','distinct-panel-provider-with-modern-adversary','actual-query-decorator-selectors','actual-trigger-injection-decorators','actual-owned-scroll-factory-provider');
 assert.equal(item instanceof peer.MatMenuItem,false);assert.ok(item instanceof ItemBase); // approved owned historical-item boundary.
 observations.ownedProviderQueries={peerItemProvider:true,ownedItemProvider:true,contentProvider:true,distinctPanel:true,descendantQueryToken:true,directQueryToken:true,lazyQueryToken:true,triggerTokens:true,generatedQueriesExecuted:false};
}
console.log(JSON.stringify({line,mode,cases,observations,actual_tagged_or_owned_constructors:true,test_only_decorator_metadata_reflection:line!=='original',native_nodes_queries_or_templates_executed:false,actual_native_packed_AOT_or_full_floor_qualified:false}));
