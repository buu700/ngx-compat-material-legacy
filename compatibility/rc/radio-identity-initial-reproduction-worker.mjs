import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const [line]=process.argv.slice(2);await import('zone.js/node');await import('@angular/compiler');
const core=await import('@angular/core'),common=await import('@angular/common'),browser=await import('@angular/platform-browser'),peer=await import('@angular/material/radio');
const payload=JSON.parse(readFileSync(new URL('./names-payload.json',import.meta.url)));
const {UniqueSelectionDispatcher}=await import('@angular/cdk/collections');const {coerceBooleanProperty}=await import('@angular/cdk/coercion');
const providers=[core.provideZoneChangeDetection(),{provide:line==='original'?common.DOCUMENT:core.DOCUMENT,useValue:{head:{children:[]}}},{provide:core.RendererFactory2,useValue:{createRenderer:()=>({})}}];if(common.IMAGE_CONFIG)providers.push({provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}});
const app=await browser.createApplication({providers}),detector={markForCheck(){}};let context;
try{
 context=core.createEnvironmentInjector([{provide:core.ChangeDetectorRef,useValue:detector}],app.injector);
 let legacyName;
 if(line==='original') {const legacy=await import('@angular/material/legacy-radio');legacyName=core.runInInjectionContext(context,()=>new legacy.MatLegacyRadioGroup(detector)).name;}
 else {const Type=new Function(payload.nameProbe+';return NameProbe;')();legacyName=new Type().name;}
 const modern=core.runInInjectionContext(context,()=>line==='original'?new peer.MatRadioGroup(detector):new peer.MatRadioGroup());
 const exported={};new Function('exports','coerceBooleanProperty',payload.replay)(exported,coerceBooleanProperty);
 const dispatcher=app.injector.get(UniqueSelectionDispatcher),legacyRadio=new exported.RadioReplay(),modernRadio=Object.create(peer.MatRadioButton.prototype);
 const initialize=(radio,id,name,value)=>{Object.assign(radio,{id,name:undefined,_checked:false,_value:value,_disabled:false,_changeDetector:detector,_radioDispatcher:dispatcher,_elementRef:new core.ElementRef({}),_focusMonitor:{stopMonitoring(){}},change:new core.EventEmitter(),radioGroup:{name,value,selected:null,disabled:false,_controlValueAccessorChangeFn(){},_emitChangeEvent(){}}});radio.ngOnInit();};
 initialize(legacyRadio,'explicit-legacy-id',legacyName,'legacy-value');initialize(modernRadio,'explicit-peer-id',modern.name,'peer-value');
 const before={legacy:legacyRadio.checked,peer:modernRadio.checked};assert.deepEqual(before,{legacy:true,peer:true});
 legacyRadio.checked=false;legacyRadio._onInputInteraction({stopPropagation(){}});
 const after={legacy:legacyRadio.checked,peer:modernRadio.checked};legacyRadio.ngOnDestroy();modernRadio.ngOnDestroy();
 console.log(JSON.stringify({line,app_id:app.injector.get(core.APP_ID),legacy_default_name:legacyName,peer_default_name:modern.name,collision:legacyName===modern.name,before,after,unrelated_peer_radio_was_unchecked:!after.peer,legacy_source_kind:line==='original'?'genuine-tagged-public-class-name-and-owned-identical-radio-methods':'exact-owned-counter-field-and-complete-method-replay',peer_source_kind:'genuine-public-group-constructor-and-radio-prototype-methods',whole_owned_or_peer_radio_component_node_qualified:false}));
}finally{context?.destroy();app.destroy();core.destroyPlatform();}
