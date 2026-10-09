import {existsSync,readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
import {approvedMenuItemContract} from './menu-item-construction-contract.mjs';
import {observeMenuItemFactory} from './api-menu-item-factory.mjs';
import {TABLE_SYMBOL, approvedTableContract} from './table-construction-contract.mjs';
import {observeTableFactory} from './api-table-factory.mjs';
import {RIPPLE_SYMBOL,approvedRippleContract} from './ripple-construction-contract.mjs';
import {observeRippleFactory} from './api-ripple-factory.mjs';
import {originalContextDi} from './api-original-factory-contexts.mjs';
import {createPublicFactoryContext} from './api-public-node-context.mjs';
import {attributeFactoryContract,executeAttributeFactory,challengeAttributeDetectorScopes} from './api-attribute-factory.mjs';
import {partitionPublicConstructorRequests} from './api-public-constructor-internals.mjs';
import {ownedMotionProfile,partitionOwnedSelectMotion} from './api-owned-motion-context.mjs';
import {originalPublicParentTokenRole} from './api-public-parent-token-role.mjs';
import {captureFactoryConstructorInputs} from './api-factory-constructor-inputs.mjs';
import {requiredParentFactoryProfile,observeRequiredParentInputs} from './api-required-parent-context.mjs';
import {callerConfigProfile,createCallerConfigContext,observeCallerConfigInputs,callerConfigLifetimeEvidence} from './api-caller-config-context.mjs';
import {ownedDialogFocusProfile,partitionOwnedDialogFocus,challengeOwnedDialogFocusDetector} from './api-owned-dialog-focus-context.mjs';
import {menuContentContract,observeMenuContentContext,finishMenuContentContext} from './api-menu-content-context.mjs';
import {simpleSnackProfile,createSimpleSnackContext,observeSimpleSnackInputs,finishSimpleSnackContext} from './api-simple-snack-context.mjs';
import {dialogOpenerProfile,createDialogOpenerContext,observeDialogOpenerContext,finishDialogOpenerContext} from './api-dialog-opener-context.mjs';
import {tabBodyProfile,partitionTabBodyZone} from './api-tab-body-context.mjs';
import {autocompleteProfile,autocompleteFormFieldTokenMatches,createAutocompleteCapture,observeAutocompleteInputs,finishAutocompleteContext} from './api-autocomplete-context.mjs';

// verify-lite imports the checker before node_modules exists. Load Angular
// only when a packed factory is actually executed.

const modules = new Map();

function labelOf(token) {
  if (token == null) return 'null';
  if (typeof token === 'function') return token.name || 'anonymous';
  const text = String(token);
  return text.replace(/^InjectionToken /, '');
}

export async function loadRuntimeModule(packageRoot, family, kind) {
  const name = kind === 'primary'
    ? `ngx-compat-material-legacy-${family}.mjs`
    : `ngx-compat-material-legacy-${family}-testing.mjs`;
  const file = resolve(packageRoot, 'fesm2022', name);
  const key = pathToFileURL(file).href;
  if (modules.has(key)) return modules.get(key);
  if (!existsSync(file)) return null;
  const loaded = await import(key);
  modules.set(key, loaded);
  return loaded;
}

export function runFactory(factory, Injector, runInInjectionContext, options = {}) {
  const requests=[];
  const borrowed=Boolean(options.injector);
  const base=options.injector || Injector.create({providers:[]});
  const tracing=new class extends Injector {
    get(token,notFound,flags){
      const decoded=typeof flags==='number'
        ?{optional:!!(flags&8),self:!!(flags&2),skipSelf:!!(flags&4),host:!!(flags&1)}
        :{optional:!!flags?.optional,self:!!flags?.self,skipSelf:!!flags?.skipSelf,host:!!flags?.host};
      const request={token,label:labelOf(token),...decoded};if(options.captureStack)request.stack=new Error().stack;options.onRequest?.(request);requests.push(request);
      try{return base.get(token,notFound,flags);}
      catch(caught){request.unresolved=true;request.resolution_error=String(caught?.message||caught);throw caught;}
    }
  };
  let outcome='returned',error=null,errorStack=null,value;
  try{value=runInInjectionContext(tracing,()=>factory());}
  catch(caught){outcome='threw';error=String(caught?.message||caught);errorStack=String(caught?.stack||caught);}
  finally{if(!borrowed)base.destroy?.();}
  return {requests,outcome,error,errorStack,value,context:borrowed?'caller-supplied public injector context':'empty-injector diagnostic; not node/application qualification'};
}

/** Original module ownership selects caller providers before the owned factory executes. */
function isOriginalModule(symbol){
  const factory=symbol.shape?.originalFactory;
  return Boolean(factory&&(factory.declaration.includes('.ɵɵFactoryTarget.NgModule')
    ||factory.declaration_kind==='published-jit-decorators'&&/\bNgModule\(/.test(factory.declaration)));
}

export async function observePublicNodeFactory(value,core,packageRoot,symbol,symbols,importModule,{providers=[],constructorFactory}={}){
  let fixture,factory,parentExecution,requiredParent,requiredParentType,requiredParentToken,requiredParentCapture;
  let requiredParentDestroyed=false,parentLifetimeSubscription;
  let callerConfig,menuContentState,simpleSnack,dialogOpener,autocompleteCapture,tabPortalParent;
  const menuContent=menuContentContract(symbol);
  const tabBody=tabBodyProfile(symbol);
  let nodeKind=null;
  const modules=[],behaviorProblems=[];
  try{
    for(const owner of symbols.filter(s=>s.family===symbol.family&&isOriginalModule(s)
      &&(s.kind==='primary'||s.kind===symbol.kind))){
      const loaded=await loadRuntimeModule(packageRoot,owner.family,owner.kind);
      if(typeof loaded?.[owner.name]!=='function')throw Error('missing caller module '+owner.symbol_id);
      modules.push({symbol_id:owner.symbol_id,value:loaded[owner.name]});
    }
    const parameters=symbol.shape.originalFactoryContext?.factory_parameters||symbol.shape.diParams||[];
    // Reauthenticate the original context before using its constructor parameters.
    expectedFactoryDi(symbol.shape,{devMode:core.isDevMode()});
    const attributes=parameters.filter(p=>p.attribute);
    const usesTemplate=parameters.some(p=>p.spec==='@angular/core'&&p.imported==='TemplateRef') || symbol.symbol_id==='legacy-tabs/primary/MatLegacyTabBodyPortal';
    nodeKind=usesTemplate?'template':'element';
    requiredParent=requiredParentFactoryProfile(symbol);
    let parentHost;
    if(requiredParent){
      if(usesTemplate||attributes.length)throw Error('required parent profile has an unsupported node contract');
      const owned=await loadRuntimeModule(packageRoot,symbol.family,'primary');
      requiredParentType=owned?.[requiredParent.owner_export];
      requiredParentToken=requiredParent.token_spec
        ?(await importModule(requiredParent.token_spec))[requiredParent.token_export]:owned?.[requiredParent.token_export];
      const ownerModule=owned?.[requiredParent.owner_module];
      if(typeof requiredParentType!=='function'||typeof requiredParentToken!=='function'||typeof ownerModule!=='function')
        throw Error('required parent public identities missing');
      parentHost={tag:requiredParent.parent_tag,attributes:requiredParent.parent_attributes,
        imports:[ownerModule],token:requiredParentToken};
    }
    if(symbol.symbol_id==='legacy-tabs/primary/MatLegacyTabBodyPortal'){
      const owned=await loadRuntimeModule(packageRoot,'legacy-tabs','primary');
      if(parentHost)throw Error('tab portal already has a caller parent');
      // The historical body is exported by the package, but intentionally not
      // by MatLegacyTabsModule. Its original tests declare it in a caller scope.
      class TabBodyCallerModule {}
      core.NgModule({declarations:[owned.MatLegacyTabBody,owned.MatLegacyTabBodyPortal],
        imports:[(await importModule('@angular/common')).CommonModule,(await importModule('@angular/cdk/portal')).PortalModule,
          (await importModule('@angular/cdk/scrolling')).ScrollingModule],exports:[owned.MatLegacyTabBody]})(TabBodyCallerModule);
      parentHost={tag:'mat-tab-body',imports:[TabBodyCallerModule],token:owned.MatLegacyTabBody};
      tabPortalParent=owned;
    }
    const configProfile=callerConfigProfile(symbol);
    if(configProfile){
      if(usesTemplate||attributes.length||requiredParent)throw Error('caller configuration profile has an unsupported node contract');
      callerConfig=createCallerConfigContext(configProfile,
        await loadRuntimeModule(packageRoot,symbol.family,'primary'),
        await importModule(configProfile.public_spec),await importModule('@angular/cdk/overlay'),core);
    }
    const snackProfile=simpleSnackProfile(symbol);
    if(snackProfile){
      if(parentHost||callerConfig||usesTemplate||attributes.length)throw Error('simple snack caller profile has unsupported node contract');
      simpleSnack=createSimpleSnackContext(snackProfile,await loadRuntimeModule(packageRoot,'legacy-snack-bar','primary'),
        await importModule('@angular/material/snack-bar'),await importModule('@angular/cdk/overlay'),core,
        await loadRuntimeModule(packageRoot,'legacy-core','primary'));
      parentHost=simpleSnack.parentHost;
    }
    const openerProfile=dialogOpenerProfile(symbol);
    if(openerProfile)dialogOpener=createDialogOpenerContext(openerProfile,value,await loadRuntimeModule(packageRoot,'legacy-dialog','primary'),core);
    const autocomplete=autocompleteProfile(symbol);
    if(autocomplete)autocompleteCapture=createAutocompleteCapture(autocomplete,core,value,await loadRuntimeModule(packageRoot,'legacy-autocomplete','primary'),resolve(packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-autocomplete.mjs'),await importModule('@angular/cdk/layout'));
    let attributeContract,parentContract,parentType,parentAlias,parentSymbol;
    if(attributes.length){
      if(usesTemplate)throw Error('attribute/template combination remains unsupported');
      const primary=await loadRuntimeModule(packageRoot,symbol.family,'primary');
      const loaded=await loadRuntimeModule(packageRoot,symbol.family,symbol.kind);
      const exports={...(primary||{}),...loaded};
      const source=readFileSync(resolve(packageRoot,'fesm2022',symbol.kind==='primary'
        ?`ngx-compat-material-legacy-${symbol.family}.mjs`:`ngx-compat-material-legacy-${symbol.family}-testing.mjs`),'utf8');
      attributeContract=await attributeFactoryContract(value,core,source,parameters,async(param,token)=>{
        const owned=param.ident==='ViewportRuler'?await loadRuntimeModule(packageRoot,'legacy-core','primary'):null;
        const viewport=ownedViewportIdentity(symbol.family,param,owned||{},token);
        return viewport!==null?viewport:runtimeTokenIdentity(symbol.family,param,exports,
          originalRuntimeAliases(symbols,symbol.family),token,importModule,packageRoot);
      });
      if(['legacy-tabs/primary/MatLegacyTabLink','legacy-tabs/primary/_MatLegacyTabLinkBase'].includes(symbol.symbol_id)){
        parentSymbol=symbols.find(s=>s.symbol_id==='legacy-tabs/primary/MatLegacyTabNav');
        if(!parentSymbol)throw Error('original tab-nav caller context missing');
        expectedFactoryDi(parentSymbol.shape,{devMode:core.isDevMode()});
        parentType=exports.MatLegacyTabNav;parentAlias=exports._MatLegacyTabNavBase;
        if(typeof parentType!=='function'||typeof parentAlias!=='function'
          ||!(parentType.prototype instanceof parentAlias))throw Error('owned tab-nav parent identities missing');
        parentContract=await attributeFactoryContract(parentType,core,source,parentSymbol.shape.originalFactoryContext.factory_parameters,async(param,token)=>{
          const owned=param.ident==='ViewportRuler'?await loadRuntimeModule(packageRoot,'legacy-core','primary'):null;
          const viewport=ownedViewportIdentity(symbol.family,param,owned||{},token);
          return viewport!==null?viewport:runtimeTokenIdentity(symbol.family,param,exports,
            originalRuntimeAliases(symbols,symbol.family),token,importModule,packageRoot);
        });
      }
    }
    fixture=await createPublicFactoryContext(core,importModule,
      {providers:[...(modules.length?[core.importProvidersFrom(...modules.map(m=>m.value))]:[]),...providers,...(simpleSnack?.providers||[])],
       ...(parentHost?{parentHost}:{}),
       ...(callerConfig?{parentProviders:callerConfig.providers}:{}),
       ...(simpleSnack?{parentProviders:simpleSnack.parentProviders}:{}),
       ...(dialogOpener||symbol.symbol_id==='legacy-autocomplete/primary/MatLegacyAutocompleteTrigger'?{defaultViewTarget:true}:{}),
       ...(parentContract?{parentProviders:[{provide:parentType,useFactory:()=>{
         parentExecution=executeAttributeFactory(parentType,core,parentContract,
           {injector:core.inject(core.Injector),element:core.inject(core.ElementRef)},runFactory);
         if(parentExecution.outcome!=='returned')throw Error('tab-nav parent construction: '+parentExecution.error);
         return parentExecution.value;
       }},{provide:parentAlias,useExisting:parentType}]}:{}),
       ...(attributeContract?{nodeFactory:node=>{factory=executeAttributeFactory(value,core,attributeContract,node,runFactory);return factory.value;}}:{})});
    if(tabPortalParent){
      const parent=fixture.parentNode.owner;
      if(!(parent instanceof tabPortalParent.MatLegacyTabBody)
        ||fixture.parentNode.injector.get(tabPortalParent.MatLegacyTabBody,undefined,{self:true})!==parent
        ||fixture.template.injector.get(tabPortalParent.MatLegacyTabBody)!==parent
        ||fixture.template.injector.get(tabPortalParent.MatLegacyTabBody,null,{self:true,optional:true})!==null
        ||parent._initialized!==true||!(parent._contentElement instanceof core.ElementRef)
        ||!(parent._portalHost instanceof tabPortalParent.MatLegacyTabBodyPortal)||parent._portalHost.hasAttached())
        throw Error('tab portal actual parent component/view/query/scope is incomplete');
    }
    if(requiredParent?.owner_export==='MatLegacyChip')
      parentLifetimeSubscription=fixture.parentNode.owner.destroyed.subscribe(()=>{requiredParentDestroyed=true;});
    if(!attributeContract){
      const injector=(usesTemplate?fixture.template:fixture.element).injector;
      const captureMotionMode=ownedMotionProfile(symbol.symbol_id)?.constructorAnimationIndex!==undefined;
      if(constructorFactory!==undefined&&typeof constructorFactory!=='function')throw Error('diagnostic constructor factory must be callable');
      factory=runFactory(requiredParent||callerConfig||captureMotionMode||menuContent||simpleSnack||dialogOpener||autocompleteCapture||tabBody?()=>captureFactoryConstructorInputs(value,constructorFactory||value.ɵfac,{beforeConstructor:autocompleteCapture?.beforeConstructor}):constructorFactory||value.ɵfac,
        core.Injector,core.runInInjectionContext,{injector,captureStack:true});
      autocompleteCapture?.restore();
      if((requiredParent||callerConfig||captureMotionMode||menuContent||simpleSnack||dialogOpener||autocompleteCapture||tabBody)&&factory.outcome==='returned'){
        requiredParentCapture=factory.value;factory.value=requiredParentCapture.value;
        if(requiredParent)factory.requiredParentContext=observeRequiredParentInputs(requiredParent,requiredParentCapture,
          fixture,requiredParentType,requiredParentToken,core);
        if(callerConfig)factory.callerConfigContext=observeCallerConfigInputs(callerConfig,requiredParentCapture,fixture,core);
        if(simpleSnack)factory.simpleSnackContext=observeSimpleSnackInputs(simpleSnack,requiredParentCapture,fixture);
      }
      if(factory.outcome==='returned'){
        const partition=partitionPublicConstructorRequests(factory.requests,core,runFactory,injector);
        factory.requests=partition.requests;factory.peerConstructorPartition=partition.observation;
      }
    }
    if(tabBody&&factory.outcome==='returned'){
      const partition=partitionTabBodyZone(factory.requests,core,await loadRuntimeModule(packageRoot,'legacy-tabs','primary'),value,symbol,
        resolve(packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs'),runFactory,fixture.element.injector,factory.value,requiredParentCapture);
      factory.requests=partition.requests;factory.tabBodyContext=partition.observation;
    }
    if(ownedDialogFocusProfile(symbol.symbol_id)&&factory.outcome==='returned'){
      const partition=await partitionOwnedDialogFocus(factory.requests,core,
        await loadRuntimeModule(packageRoot,'legacy-dialog','primary'),value,symbol,
        resolve(packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-dialog.mjs'),runFactory,
        fixture.element.injector,factory.value,importModule);
      factory.requests=partition.requests;factory.ownedDialogFocusContext=partition.observation;
    }
    if(ownedMotionProfile(symbol.symbol_id)&&factory.outcome==='returned'){
      const owned=await loadRuntimeModule(packageRoot,'legacy-core','primary');
      const partition=partitionOwnedSelectMotion(factory.requests,core,owned,
        await importModule('@angular/cdk/layout'),await importModule('@angular/material/core'),value,
        {core:resolve(packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-core.mjs'),
         caller:resolve(packageRoot,'fesm2022',`ngx-compat-material-legacy-${ownedMotionProfile(symbol.symbol_id).family}.mjs`)},
        runFactory,fixture.element.injector,factory.value,symbol.symbol_id,
        {familyExports:await loadRuntimeModule(packageRoot,symbol.family,'primary'),originalSymbol:symbol,constructorCapture:requiredParentCapture});
      factory.requests=partition.requests;factory.ownedMotionContext=partition.observation;
    }
    if(menuContent&&factory.outcome==='returned')menuContentState=observeMenuContentContext(menuContent,requiredParentCapture,fixture,core,await importModule('@angular/cdk/portal'));
    if(dialogOpener&&factory.outcome==='returned')factory.dialogOpenerContext=await observeDialogOpenerContext(dialogOpener,requiredParentCapture,fixture,core,runFactory);
    if(autocompleteCapture&&factory.outcome==='returned')factory.autocompleteContext=observeAutocompleteInputs(autocompleteCapture,requiredParentCapture,fixture);
    if(tabPortalParent&&factory.outcome==='returned'){
      if(factory.value._host!==fixture.parentNode.owner)throw Error('tab portal constructor received a different real parent');
      factory.tabPortalParentContext={actual_parent_component:true,actual_parent_view_initialized:true,actual_content_element_and_portal_queries:true,parent_self_provider_identical:true,child_ancestor_provider_identical:true,child_self_provider_absent:true,actual_constructor_parent_identical:true};
    }
    factory.context=fixture.context;
    if(factory.outcome==='returned'&&typeof factory.value?.ngOnDestroy==='function'){
      try{factory.value.ngOnDestroy();}catch(error){behaviorProblems.push('owned instance teardown: '+String(error?.message||error));}
    }
    if(fixture.component.hostView.destroyed)behaviorProblems.push('owned factory destroyed the borrowed fixture view');
    if(fixture.element.destroyed||fixture.template.destroyed)behaviorProblems.push('owned factory destroyed borrowed Angular node probes');
    if(fixture.environment.destroyed)behaviorProblems.push('owned factory destroyed the caller environment');
    if(callerConfig&&factory.outcome==='returned'){
      const lifetime=callerConfigLifetimeEvidence(callerConfig,fixture);
      factory.callerConfigContext={...factory.callerConfigContext,...lifetime};
      if(lifetime.borrowed_overlay_alive_after_teardown===false)behaviorProblems.push('owned factory disposed the caller overlay reference');
    }
    if(requiredParent&&factory.outcome==='returned'){
      if(requiredParentDestroyed||fixture.parentNode.destroyed||requiredParent.owner_export==='MatLegacySelectionList'
        &&fixture.parentNode.owner._isDestroyed===true)behaviorProblems.push('owned factory destroyed the borrowed parent');
      factory.requiredParentContext={...factory.requiredParentContext,
        borrowed_parent_alive_after_child_teardown:!requiredParentDestroyed&&!fixture.parentNode.destroyed
          &&!(requiredParent.owner_export==='MatLegacySelectionList'&&fixture.parentNode.owner._isDestroyed===true),
        borrowed_nodes_alive_after_child_teardown:!fixture.component.hostView.destroyed&&!fixture.element.destroyed&&!fixture.template.destroyed,
        borrowed_environment_alive_after_child_teardown:!fixture.environment.destroyed};
    }
    if(tabPortalParent&&factory.outcome==='returned'){
      const alive=fixture.parentNode.owner._destroyed!==true&&!fixture.parentNode.destroyed
        &&!fixture.component.hostView.destroyed&&!fixture.environment.destroyed;
      factory.tabPortalParentContext.borrowed_parent_view_alive_after_child_teardown=alive;
      if(!alive)behaviorProblems.push('tab portal destroyed borrowed parent/view context');
    }
    if(parentContract&&factory.outcome==='returned'&&!behaviorProblems.length){
      if(!parentExecution||!(parentExecution.value instanceof parentType)
        ||fixture.element.injector.get(parentType)!==parentExecution.value
        ||fixture.element.injector.get(parentAlias)!==parentExecution.value)
        throw Error('tab-nav parent provider identity differs');
      const elementIndex=parentContract.parameters.findIndex(param=>param.token===core.ElementRef);
      if(elementIndex<0||parentExecution.capturedInputs[elementIndex].nativeElement!==fixture.parentNode.element.nativeElement
        ||parentExecution.capturedInputs[elementIndex].nativeElement===fixture.element.element.nativeElement)
        throw Error('tab-nav parent factory executed on the wrong node');
      challengeAttributeDetectorScopes(parentExecution,fixture);
      factory.parentConstruction={symbol_id:parentSymbol.symbol_id,returned_owned_instance:true,
        parent_node:'actual parent Angular element',constructor_evidence:parentExecution.constructorEvidence,
        compiler_observation:parentExecution.compilerObservation,public_constructor_partition:parentExecution.peerConstructorPartition};
    }
    if(attributeContract&&factory.outcome==='returned'&&!behaviorProblems.length)
      challengeAttributeDetectorScopes(factory,fixture);
    if(factory.ownedDialogFocusContext&&factory.outcome==='returned'&&!behaviorProblems.length)
      challengeOwnedDialogFocusDetector(factory.value,fixture,factory.ownedDialogFocusContext);
    if(menuContentState&&factory.outcome==='returned'&&!behaviorProblems.length)
      factory.menuContentContext=finishMenuContentContext(menuContentState,factory.value,fixture);
    if(simpleSnack&&factory.outcome==='returned'&&!behaviorProblems.length)
      factory.simpleSnackContext=await finishSimpleSnackContext(simpleSnack,factory.value,fixture,factory.simpleSnackContext);
    if(dialogOpener&&factory.outcome==='returned'&&!behaviorProblems.length)
      factory.dialogOpenerContext=finishDialogOpenerContext(dialogOpener,factory.value,fixture,factory.dialogOpenerContext);
    if(autocompleteCapture&&factory.outcome==='returned'&&!behaviorProblems.length)
      factory.autocompleteContext=await finishAutocompleteContext(autocompleteCapture,factory.value,fixture,factory.autocompleteContext);
  }catch(error){
    factory={requests:[],outcome:'threw',error:String(error?.message||error),errorStack:String(error?.stack||error),value:undefined,
      context:'public node/application context setup failed; no qualification'};
  }finally{
    autocompleteCapture?.close();
    parentLifetimeSubscription?.unsubscribe();
    try{dialogOpener?.close();}catch(error){behaviorProblems.push('dialog opener caller cleanup: '+String(error?.message||error));}
    try{simpleSnack?.close();}catch(error){behaviorProblems.push('simple snack caller cleanup: '+String(error?.message||error));}
    try{callerConfig?.close();}catch(error){behaviorProblems.push('caller overlay cleanup: '+String(error?.message||error));}
    try{fixture?.close();}catch(error){behaviorProblems.push('caller fixture cleanup: '+String(error?.message||error));}
  }
  return {...factory,behaviorProblems,callerModules:modules.map(m=>m.symbol_id),nodeKind};
}

/** Execution evidence cannot be replaced by a matching request-name/count list. */
export function factoryExecutionProblems(originalKind, factory) {
  if (!['dependencies','inherited','invalid'].includes(originalKind)) return ['authenticated original factory contract missing'];
  if (originalKind === 'invalid') {
    return factory.outcome === 'threw'
      && /constructor was not compatible with Dependency Injection/.test(factory.error || '')
      ? [] : ['did not preserve the original non-injectable factory contract'];
  }
  const problems=[];
  if (factory.outcome !== 'returned') problems.push('factory execution incomplete: '+(factory.error || factory.outcome));
  const unresolved=factory.requests.filter(request=>request.unresolved);
  if (unresolved.length) problems.push('factory execution could not resolve providers: '+unresolved.map(request=>request.label).join(', '));
  return problems;
}

export function expectedFactoryDi(shape, context = {}) {
  const completeOriginal=originalContextDi(shape,context);
  if (completeOriginal) return completeOriginal;
  const original = shape.originalFactory;
  if (original?.family === 'core' && original.name === 'MatCommonModule') {
    // Untouched core.mjs also injects Platform inside the dev-mode constructor
    // body. Factory declaration deps describe its three parameters, not that
    // fourth contextual request. This adds an authentic requirement, no waiver.
    if (original.source_sha256 !== '38b761eb8e9b43297942f6e1412469437bc3ee0291342a766b001f715061d175'
        || original.deps_kind !== 'dependencies') throw new Error('unrecognized authentic common-module body');
    if (typeof context.devMode !== 'boolean') throw new Error('missing common-module dev-mode context');
    const direct = (shape.diParams || []).filter(param => !param.attribute);
    return context.devMode ? [...direct, {ident:'Platform',imported:'Platform',spec:'@angular/cdk/platform',optional:true}] : direct;
  }
  const inherited = shape.originalFactory?.inherited_factory;
  if (!inherited) return (shape.diParams || []).filter(param => !param.attribute);
  // Finite original parent declarations. Each dependency list must match the
  // authenticated16 factory bytes before it can become an expectation.
  const core=(ident,optional=false)=>({ident,imported:ident,spec:'@angular/core',optional});
  const peer=(ident,spec,optional=false)=>({ident,imported:ident,spec,optional});
  const records=[
    {family:'table',names:['CdkTable'],
      declaration: "deps: [{ token: i0.IterableDiffers }, { token: i0.ChangeDetectorRef }, { token: i0.ElementRef }, { token: 'role', attribute: true }, { token: i1.Directionality, optional: true }, { token: DOCUMENT }, { token: i2.Platform }, { token: _VIEW_REPEATER_STRATEGY }, { token: _COALESCED_STYLE_SCHEDULER }, { token: i3.ViewportRuler }, { token: STICKY_POSITIONING_LISTENER, optional: true, skipSelf: true }, { token: i0.NgZone, optional: true }]",
      // The role attribute belongs to node construction, not token injection.
      // Private historical dependencies remain strict unresolved identities.
      params:[core('IterableDiffers'),core('ChangeDetectorRef'),core('ElementRef'),
        peer('Directionality','@angular/cdk/bidi',true),core('DOCUMENT'),
        peer('Platform','@angular/cdk/platform'),peer('_VIEW_REPEATER_STRATEGY','@angular/cdk/collections'),
        peer('_COALESCED_STYLE_SCHEDULER','@angular/cdk/table'),peer('ViewportRuler','@angular/cdk/scrolling'),
        {...peer('STICKY_POSITIONING_LISTENER','@angular/cdk/table',true),skipSelf:true},core('NgZone',true)]},
    {family:'table',names:['CdkHeaderRowDef','CdkFooterRowDef','CdkRowDef'],
      declaration:'deps: [{ token: i0.TemplateRef }, { token: i0.IterableDiffers }, { token: CDK_TABLE, optional: true }]',
      params:[core('TemplateRef'),core('IterableDiffers'),peer('CDK_TABLE','@angular/cdk/table',true)]},
    {family:'table',names:['CdkCellDef','CdkHeaderCellDef','CdkFooterCellDef','CdkNoDataRow'],
      declaration:'deps: [{ token: i0.TemplateRef }]',params:[core('TemplateRef')]},
    {family:'table',names:['CdkCell','CdkHeaderCell','CdkFooterCell'],
      declaration:'deps: [{ token: CdkColumnDef }, { token: i0.ElementRef }]',
      params:[peer('CdkColumnDef','@angular/cdk/table'),core('ElementRef')]},
    {family:'table',names:['CdkColumnDef'],
      declaration:'deps: [{ token: CDK_TABLE, optional: true }]',
      params:[peer('CDK_TABLE','@angular/cdk/table',true)]},
    {family:'table',names:['CdkTextColumn'],
      declaration:'deps: [{ token: CdkTable, optional: true }, { token: TEXT_COLUMN_OPTIONS, optional: true }]',
      params:[peer('CdkTable','@angular/cdk/table',true),peer('TEXT_COLUMN_OPTIONS','@angular/cdk/table',true)]},
    {family:'menu',names:['MatMenuItem'],
      declaration:'deps: [{ token: i0.ElementRef }, { token: DOCUMENT }, { token: i1.FocusMonitor }, { token: MAT_MENU_PANEL, optional: true }, { token: i0.ChangeDetectorRef }]',
      params:[core('ElementRef'),core('DOCUMENT'),peer('FocusMonitor','@angular/cdk/a11y'),peer('MAT_MENU_PANEL','@angular/material/menu',true),core('ChangeDetectorRef')]},
    {family:'tabs',names:['MatTabLabel'],
      declaration:'deps: [{ token: i0.TemplateRef }, { token: i0.ViewContainerRef }, { token: MAT_TAB, optional: true }]',
      params:[core('TemplateRef'),core('ViewContainerRef'),peer('MAT_TAB','@angular/material/tabs',true)]},
    {family:'tabs',names:['MatTabContent'],
      declaration:'deps: [{ token: i0.TemplateRef }]',params:[core('TemplateRef')]},
  ];
  const record=records.find(record=>record.family===inherited.family&&record.names.includes(inherited.name));
  if (!record || !inherited.declaration.includes(record.declaration)) throw new Error('unrecognized authentic inherited DI declaration');
  return record.params;
}

// Historical constructors name the original token; the finite public export map
// exposes its independently owned legacy identity. Never match these by description.
const ownedTokenExports = {
  'legacy-menu': {MAT_MENU_PANEL: 'MAT_LEGACY_MENU_PANEL'},
  'legacy-core': {MATERIAL_SANITY_CHECKS: 'MATERIAL_LEGACY_SANITY_CHECKS'},
  'legacy-form-field': {
    MAT_FORM_FIELD: 'MAT_LEGACY_FORM_FIELD', MAT_ERROR: 'MAT_LEGACY_ERROR',
    MAT_PREFIX: 'MAT_LEGACY_PREFIX', MAT_SUFFIX: 'MAT_LEGACY_SUFFIX',
  },
  'legacy-progress-bar': {
    MAT_PROGRESS_BAR_LOCATION: 'MAT_LEGACY_PROGRESS_BAR_LOCATION',
    MAT_PROGRESS_BAR_DEFAULT_OPTIONS: 'MAT_LEGACY_PROGRESS_BAR_DEFAULT_OPTIONS',
  },
};

export function ownedTokenIdentity(family, param, loaded, observedToken) {
  const exported = ownedTokenExports[family]?.[param.ident];
  if (!exported) return null;
  return Object.hasOwn(loaded, exported) && loaded[exported] === observedToken;
}

/** Only these legacy consumers replace the original private viewport helper. */
export function ownedViewportIdentity(family, param, coreExports, observedToken) {
  if (!['legacy-autocomplete','legacy-progress-spinner','legacy-select','legacy-tabs'].includes(family)
      || param.ident !== 'ViewportRuler' || param.imported !== 'ViewportRuler'
      || param.spec !== '@angular/cdk/scrolling') return null;
  return Object.hasOwn(coreExports, '_LegacyViewport') && typeof coreExports._LegacyViewport === 'function'
    && coreExports._LegacyViewport === observedToken;
}

// Alias identities come from the original barrels/source before loading the
// candidate. Do not infer an owned alias from a candidate's spelling or label.
export function originalRuntimeAliases(symbols, family) {
  const aliases = Object.create(null);
  for (const symbol of symbols) {
    if (symbol.family !== family) continue;
    const original = symbol.shape?.tokenName || symbol.shape?.runtimeName;
    if (!original) continue;
    (aliases[original] ||= []).push(symbol.name);
  }
  return Object.fromEntries(Object.entries(aliases).map(([name,exports])=>[name,[...new Set(exports)]]));
}

export async function runtimeTokenIdentity(family, param, loaded, aliases, observedToken, importModule = spec => import(spec), packageRoot = null, originalSymbol = null) {
  const publicParent=originalPublicParentTokenRole(originalSymbol,param);
  if(publicParent){
    try{const module=await importModule(publicParent.public_spec);
      return Object.hasOwn(module,publicParent.public_export)&&module[publicParent.public_export]!=null
        &&module[publicParent.public_export]===observedToken;
    }catch{return false;}
  }
  if(param.ident==='ANIMATION_MODULE_TYPE'&&param.imported==='ANIMATION_MODULE_TYPE'
    &&param.spec==='@angular/platform-browser/animations'){
    const core=await importModule('@angular/core');
    return core.ANIMATION_MODULE_TYPE!=null&&core.ANIMATION_MODULE_TYPE===observedToken;
  }
  if(originalSymbol?.symbol_id==='legacy-autocomplete/primary/MatLegacyAutocompleteTrigger'&&param.ident==='MAT_FORM_FIELD'){
    if(!packageRoot)return false;
    return autocompleteFormFieldTokenMatches(originalSymbol,param,await loadRuntimeModule(packageRoot,'legacy-form-field','primary'),await importModule('@angular/material/form-field'),observedToken);
  }
  if(family==='legacy-select'&&param.ident==='MAT_FORM_FIELD'&&param.imported==='MAT_FORM_FIELD'
    &&param.spec==='@angular/material/form-field'){
    if(!packageRoot)return false;
    const owner=await loadRuntimeModule(packageRoot,'legacy-form-field','primary');
    const peer=await importModule('@angular/material/form-field');
    return Boolean(owner?.MAT_LEGACY_FORM_FIELD&&owner.MAT_LEGACY_FORM_FIELD!==peer.MAT_FORM_FIELD
      &&owner.MAT_LEGACY_FORM_FIELD===observedToken);
  }
  if (param.spec==='@angular/common' && param.imported==='DOCUMENT' && param.ident==='DOCUMENT') {
    // The original archive names Common's DOCUMENT. Both maintained minimum
    // peers expose its supported identity from Core; never load the deprecated
    // current Common re-export to resolve historical constructor metadata.
    const core=await importModule('@angular/core');
    return core.DOCUMENT!=null && core.DOCUMENT===observedToken;
  }
  const finite = ownedTokenIdentity(family, param, loaded, observedToken);
  if (finite !== null) return finite;
  const originalAliases = name => Object.hasOwn(aliases, name) && Array.isArray(aliases[name]) ? aliases[name] : [];
  const exported = [...new Set([...originalAliases(param.ident),...originalAliases(param.imported)])];
  if (exported.length) {
    // Original aliases of one class/token must still resolve to one object.
    if (exported.some(name=>!Object.hasOwn(loaded,name) || loaded[name] == null)) return false;
    const originals = new Set(exported.map(name=>loaded[name]));
    return originals.size === 1 && originals.has(observedToken);
  }
  if (param.spec && !param.spec.startsWith('.')) {
    try {
      const module = await importModule(param.spec);
      return Boolean(param.imported && Object.hasOwn(module,param.imported)
        && module[param.imported] != null && module[param.imported] === observedToken);
    } catch { return false; }
  }
  const keys=[...new Set([param.ident,param.imported].filter(Boolean))];
  const objects=keys.filter(name=>Object.hasOwn(loaded,name)&&loaded[name]!=null).map(name=>loaded[name]);
  return objects.length > 0 && objects.every(value=>value === observedToken);
}

export function injectionTokenMatches(value, InjectionToken, expectedDescription) {
  return value instanceof InjectionToken && String(value) === `InjectionToken ${expectedDescription}`;
}

export async function observeRuntimeDi(packageRoot, symbols, differences = [], importModule = spec => import(spec)) {
  const core=await importModule('@angular/core');
  const {Injector, InjectionToken, runInInjectionContext, isDevMode}=core;
  await importModule('@angular/compiler');
  const results = [];
  for (const symbol of symbols) {
    if (!symbol.di_id) continue;
    const loaded = await loadRuntimeModule(packageRoot, symbol.family, symbol.kind);
    const problems = [];
    if (!loaded || !loaded[symbol.name]) {
      problems.push(`missing runtime export ${symbol.symbol_id}`);
      results.push({symbol, problems, observed: []});
      continue;
    }
    const value = loaded[symbol.name];
    if (symbol.shape.token) {
      const text = String(value);
      if (!(value instanceof InjectionToken)) problems.push(`not an InjectionToken ${symbol.symbol_id}`);
      const description = symbol.shape.tokenDescription || '';
      const expected = description.replace(/^['"]|['"]$/g, '');
      if (expected && !injectionTokenMatches(value, InjectionToken, expected)) problems.push(`token identity/description ${text} != InjectionToken ${expected}`);
      results.push({symbol, problems, observed: [text]});
      continue;
    }
    if (typeof value.ɵfac !== 'function') {
      problems.push(`missing factory ${symbol.symbol_id}`);
      results.push({symbol, problems, observed: []});
      continue;
    }
    const construction = approvedMenuItemContract(symbol) || approvedTableContract(symbol) || approvedRippleContract(symbol);
    const originalKind = symbol.shape.originalFactoryContext?.effective_factory_kind || symbol.shape.originalFactory?.deps_kind;
    const factory = construction ? symbol.symbol_id === TABLE_SYMBOL
      ? await observeTableFactory(value, loaded, importModule) : symbol.symbol_id===RIPPLE_SYMBOL
      ? await observeRippleFactory(value,loaded,importModule,runFactory) : await observeMenuItemFactory(value, loaded, importModule)
      : originalKind==='invalid' ? runFactory(value.ɵfac,Injector,runInInjectionContext)
      : await observePublicNodeFactory(value,core,packageRoot,symbol,symbols,importModule);
    const observed = factory.requests;
    const publicNodeRequests=[];
    const runtimeRequests=[];
    const invalidReference = originalKind === 'invalid';
    const runtime_context = {devMode: isDevMode()};
    if (!construction && !invalidReference && factory.outcome==='returned' && !(factory.value instanceof value))
      problems.push(`factory ${symbol.symbol_id} did not return the owned class instance`);
    const expected = invalidReference ? [] : menuContentContract(symbol)?.runtime_requests || construction?.runtime_requests
      || expectedFactoryDi(symbol.shape, runtime_context);
    if (factory.behaviorProblems) problems.push(...factory.behaviorProblems.map(problem => `factory ${symbol.symbol_id} ${problem}`));
    for (const issue of factoryExecutionProblems(originalKind, factory)) {
      problems.push(`factory ${symbol.symbol_id} ${issue}`);
    }
    if (observed.length !== expected.length) {
      problems.push(`token count ${symbol.symbol_id} expected ${expected.length} observed ${observed.length} [${observed.map(item => item.label).join(', ')}]`);
    } else {
      for (let index = 0; index < expected.length; index += 1) {
        const param = expected[index];
        const got = observed[index];
        const primary = symbol.kind === 'primary' ? loaded : await loadRuntimeModule(packageRoot, symbol.family, 'primary');
        const exports = {...(primary || {}),...loaded};
        const coreExports = param.ident === 'ViewportRuler'
          ? await loadRuntimeModule(packageRoot, 'legacy-core', 'primary') : null;
        const ownedViewport = ownedViewportIdentity(symbol.family, param, coreExports || {}, got.token);
        const same = ownedViewport !== null ? ownedViewport : await runtimeTokenIdentity(symbol.family, param, exports,
          originalRuntimeAliases(symbols, symbol.family), got.token, importModule,packageRoot,symbol);
        runtimeRequests.push({expected_ident:param.ident,expected_spec:param.spec,identity_matched:same,
          expected_optional:Boolean(param.optional),expected_self:Boolean(param.self),
          expected_skipSelf:Boolean(param.skipSelf),expected_host:Boolean(param.host),
          public_parent_token_role:originalPublicParentTokenRole(symbol,param)});
        if (symbol.symbol_id===TABLE_SYMBOL) publicNodeRequests.push({ident:param.ident,spec:param.spec,
          observed_label:got.label+(got.optional?'?':''),identity_matched:same,
          optional:Boolean(got.optional),self:Boolean(got.self),skipSelf:Boolean(got.skipSelf),host:Boolean(got.host)});
        if (!same) problems.push(`token ${symbol.symbol_id}[${index}] expected ${param.ident} observed ${got.label}`);
        for (const flag of ['self','skipSelf','host']) if (Boolean(param[flag])!==Boolean(got[flag]))
          problems.push(`injection flag ${symbol.symbol_id}[${index}] ${flag} differs`);
        if (Boolean(param.optional) !== Boolean(got.optional)) {
          problems.push(`optional ${symbol.symbol_id}[${index}] expected ${Boolean(param.optional)} observed ${Boolean(got.optional)}`);
        }
      }
    }
    results.push({symbol, problems, runtime_context, factory_unresolved_provider_labels:observed.filter(request=>request.unresolved).map(request=>request.label), factory_outcome:factory.outcome, factory_error:factory.error, factory_error_stack:factory.errorStack||null, original_factory_kind:symbol.shape.originalFactory?.deps_kind ?? null, original_inherited_factory:symbol.shape.originalFactory?.inherited_factory?.name ?? null, effective_original_factory_kind:originalKind ?? null, factory_context:factory.context, factory_context_modules:factory.callerModules || [], factory_node_kind:factory.nodeKind || null, factory_constructor_evidence:factory.constructorEvidence || [], factory_compiler_observation:factory.compilerObservation || null, factory_peer_constructor_partition:factory.peerConstructorPartition || null, factory_parent_construction:factory.parentConstruction || null, factory_required_parent_context:factory.requiredParentContext || null, factory_caller_config_context:factory.callerConfigContext || null, factory_owned_dialog_focus_context:factory.ownedDialogFocusContext || null, factory_menu_content_context:factory.menuContentContext || null, factory_simple_snack_context:factory.simpleSnackContext || null, factory_dialog_opener_context:factory.dialogOpenerContext || null, factory_autocomplete_context:factory.autocompleteContext || null, factory_tab_body_context:factory.tabBodyContext || null, factory_tab_portal_parent_context:factory.tabPortalParentContext || null, factory_owned_motion_context:factory.ownedMotionContext || null, runtime_requests:observed.map((request,index)=>({...runtimeRequests[index],observation_evidence:request.evidence || 'public Injector request trace',observed_label:request.label,optional:Boolean(request.optional),self:Boolean(request.self),skipSelf:Boolean(request.skipSelf),host:Boolean(request.host),unresolved:Boolean(request.unresolved)})), factory_returned_owned_instance:factory.outcome==='returned' && (construction ? factory.behaviorProblems.length===0 : factory.value instanceof value), constructor_attributes:[...new Set(symbol.shape.originalFactoryContext ? symbol.shape.originalFactoryContext.factory_parameters?.filter(param=>param.attribute).map(param=>param.attribute) || [] : [...(symbol.shape.originalFactory?.inherited_factory?.attributes || []),...(symbol.shape.diParams || []).filter(param=>param.attribute).map(param=>param.attribute)])], observed: observed.map(item => `${item.label}${item.optional ? '?' : ''}`),
      ...(construction ? {approved_construction: {profile_id: construction.profile_id,
        contract_sha256: construction.contract_sha256, context: factory.context,
        behavior_problems: factory.behaviorProblems, counts: factory.counts,
        ...(factory.parentComparison ? {parent_comparison:factory.parentComparison} : {}),
        ...(symbol.symbol_id===TABLE_SYMBOL ? {public_node_requests:publicNodeRequests} : {}),
        root_requests: (factory.rootRequests||[]).map(request => ({optional: request.optional, unresolved: request.unresolved}))}} : {})});
  }
  return results;
}

export function formatDi(paramsOrLabels) {
  return paramsOrLabels.join('|');
}
