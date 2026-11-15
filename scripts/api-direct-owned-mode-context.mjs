/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Exact packed direct-constructor motion successor; no historical identity alias. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {PSEUDO_CORE_BUNDLE_SHA} from './api-pseudo-core-continuation.mjs';
import {qualifyCombinedArtifactSubject} from './api-combined-d70-image.mjs';
import {originalContextDi} from './api-original-factory-contexts.mjs';
import {ownedMotionSourceScope as scope,ownedMotionHelperOrigin as origin,assertOwnedMotionRequests as check,serializeOwnedMotionRequests as serialize,ownedSelectMotionProblems} from './api-owned-motion-context.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const coreHash='4172a40fb470f20e62322fec159a4ab12559ac5d900a62ae02d02ee59f7327a9';
function contextualCoreHash(context){try{return context?.tarball&&context?.packageRoot&&qualifyCombinedArtifactSubject(readFileSync(context.tarball),context.packageRoot)?.profile==='combined-pseudo-disabled'?PSEUDO_CORE_BUNDLE_SHA:coreHash;}catch{return coreHash;}}
const helperHashes=['85d05a3f59d6ab1323a63329dbb689d7985c49151339e9308113008d890cb0c7','ce37ae5419bed0f2c1df57e17459b39da55e2a3b759efb373b2e31ce73e46996','4b206f01ce7468d370352ec69f82d07f282775b3bc303318a0b3bfb5aaade126'];
const profiles={
 'legacy-button/primary/MatLegacyAnchor':[4,2,2,'e73690e82e64f8a8c79a7a93d99bbc5704592f3fe74a564ee2275f7aca55cd51','e43aa41dbf463cdff115d1b3fbec47a676a0e5e5f33eed787d3a69a42f81b330',['53e32cd98509da81138b2b9f403863deba6d32c10c2e32e53f3e2c4a763d6a54','d7607154624e71a9607a34f6d73dfc5e237cb9d022fa7634a1973ddf97f100c4']],
 'legacy-button/primary/MatLegacyButton':[3,2,2,'1fac88acad3bda526db4ffe40a832b71bc2df936ec620794c2d715daa98297f1','e43aa41dbf463cdff115d1b3fbec47a676a0e5e5f33eed787d3a69a42f81b330',['d7607154624e71a9607a34f6d73dfc5e237cb9d022fa7634a1973ddf97f100c4']],
 'legacy-card/primary/MatLegacyCard':[1,0,0,'f22a49a4217a177ef0ce8f0d270b4b626d3b55157aee456fc7966f515f56ec0c','1809c1b3a7bb90546a220185c2d2ce11b365a0899551f2252e469d0b4e59aed8',['8d28a2aff8725f66787e9b34edf5ec738e4038abfdf64be2518511bc3dd1fbef']],
 'legacy-progress-bar/primary/MatLegacyProgressBar':[6,2,2,'567586166a1431081413d90e6b4bfdb71f2dbba14afbceb8d1377d7bdfd4198b','f5153666fcc2ee56c50817659372062a6e3483f51594e53e3d9b2719dcdf0847',['d64bacc638aabf12d33240f056cf6e9c9440a896b813b9b91a516523b984d541']],
 'legacy-progress-spinner/primary/MatLegacyProgressSpinner':[9,3,3,'050d8d4a0bfd373fc45705e8170172241593edd6eed409add8b5662a13c2dc5f','9bcab6d26f12afd8f31c7c5e9f319d149e8e5aa1445ee8d22c903057732713db',['10038cf409a2bea044bddb1d46cac9b86e4a3300f61930949d584447043485a4']],
 'legacy-tabs/primary/MatLegacyInkBar':[4,3,3,'043a73061f7f2f9e158dccc1dcb5d8c1635cedab92b8cfc0bf07993992822b1c','d272c01799c1cb542e95f819b90b71fb68e89ee4b713b136c59629e8de8f8ed4',['aa64726df787f61af9e370cf2f588bad5fabad6971e5b273fb5533e4c445210f']],
 'legacy-tabs/primary/MatLegacyTabGroup':[4,3,3,'bebecbca9a4c80afd9ee3168258c507ee9d88579914c4fbc32ded143654376ec','d272c01799c1cb542e95f819b90b71fb68e89ee4b713b136c59629e8de8f8ed4',['d1d15ec9860253c175765c39c0359c31bac806394577d5cc8c4cb969f628e2c1','764ab50c8696bd3a996af912b38d5667a40f80832cd551174473934797aa5b7e']],
 'legacy-tabs/primary/_MatLegacyTabGroupBase':[4,3,3,'c26c0fc4ad1b3b0a15745893bbed976b43226d382ddd2960cf1ecbd526aef352','d272c01799c1cb542e95f819b90b71fb68e89ee4b713b136c59629e8de8f8ed4',['764ab50c8696bd3a996af912b38d5667a40f80832cd551174473934797aa5b7e']],
 'legacy-core/primary/MatLegacyPseudoCheckbox':[1,0,0,'f154117cc177df64c01a94f21cd968bd7fbd343e863233bc2e404c4e0d51aca6',coreHash,['523fb23361a8edf4cd5f16186b87387bb027d7c5e4704050f8cf0d72da9f22c6']],
 'legacy-tooltip/primary/LegacyTooltipComponent':[3,2,2,'a8af66fae545d6f87dff9cf8ecd2e94483d766183d27be7251b87ff1633b4c32','7cb0c23b4c7effe11541fc507f4bcf64bfe9e2eda752df1b0c93c4edb2ceabbf',['64f43cbe4654feab874928c8849a6b807d6b53d5230dc6e1b19602bbe5229ad2','ea1368cd59a8228fddbb96a4b4ac67ea81940289c5b1f70cf73f00ddc1dc6dbb']],
};
for(const p of Object.values(profiles)){Object.freeze(p[5]);Object.freeze(p);}Object.freeze(profiles);
export const directOwnedModeProfile=id=>profiles[id]||null;
function imageProfile(id,context){
 const prior=profiles[id];if(!prior)return null;
 if(!['legacy-progress-bar/primary/MatLegacyProgressBar','legacy-tooltip/primary/LegacyTooltipComponent','legacy-core/primary/MatLegacyPseudoCheckbox'].includes(id)||!context?.tarball||!context?.packageRoot)return {profile:prior,subject:null};
 try{const subject=qualifyCombinedArtifactSubject(readFileSync(context.tarball),context.packageRoot);if(!['combined-d70','combined-input-firstcheck','combined-pseudo-disabled'].includes(subject?.profile))return {profile:prior,subject:null};
 if(id==='legacy-core/primary/MatLegacyPseudoCheckbox'){if(subject.profile!=='combined-pseudo-disabled')return {profile:prior,subject:null};const profile=[...prior];profile[4]=PSEUDO_CORE_BUNDLE_SHA;profile[5]=['0b93a6e34a6acd34a7ca1c7b8629549d8ed1eb52692c7ac0a83e8a642f00d061'];return {profile,subject};}
 const profile=[...prior];profile[4]=id.includes('progress-bar')?'b4a371702f8745fea9d3c7f1a1794e6eb240d6e8ab61426673771d0cbdae68ad':'4cf49b3c2774efd82ae4093e13d6ad535c5eea0a7b0e9210b405ce331bddb334';if(id.includes('progress-bar'))profile[5]=['068b8c3f09f60f1578255118201cbacee4ff6805f6373a758f5ca1c34c9bbcf3'];return {profile,subject};
 }catch{return {profile:prior,subject:null};}}
export function directOwnedModeCandidate(symbol,packageRoot,artifactContext){const image=imageProfile(symbol?.symbol_id,artifactContext),p=image?.profile;if(!p)return false;try{return hash(JSON.stringify(symbol.shape))===p[3]&&hash(readFileSync(join(packageRoot,'fesm2022',`ngx-compat-material-legacy-${symbol.family}.mjs`)))===p[4]&&(!image.subject||packageRoot===artifactContext.packageRoot);}catch{return false;}}
const flags=['optional','self','skipSelf','host'];
/** Prove historical slot, exact loaded export, compiler metadata and captured node input. */
export function directOwnedModeToken({symbol,Type,exports,owned,core,material,injector,capture,file,requests,artifactContext}){
 const image=imageProfile(symbol?.symbol_id,artifactContext),p=image?.profile;if(!p||hash(JSON.stringify(symbol.shape))!==p[3]||exports[symbol.name]!==Type||image.subject&&file!==join(artifactContext.packageRoot,'fesm2022',`ngx-compat-material-legacy-${symbol.family}.mjs`))throw Error('direct mode subject differs');
 const params=symbol.shape.originalFactoryContext?.factory_parameters,di=originalContextDi(symbol.shape),historical=params?.[p[1]],diParam=di[p[2]];
 if(params?.length!==p[0]||historical?.ident!=='ANIMATION_MODULE_TYPE'||historical.imported!=='ANIMATION_MODULE_TYPE'||historical.spec!=='@angular/platform-browser/animations'||historical.attribute||historical.optional!==true||flags.slice(1).some(f=>historical[f])||!diParam||['ident','imported','spec',...flags].some(k=>Boolean(diParam[k])!==Boolean(historical[k])||(['ident','imported','spec'].includes(k)&&diParam[k]!==historical[k])))throw Error('direct mode original constructor/DI slot differs');
 const callers=[];let current=Type;for(const expected of p[5]){const s=scope(file,current,{classConstructor:true});if(s.proof.sha256!==p[4]||s.proof.function_text_sha256!==expected)throw Error('direct mode constructor source differs');callers.push(s);current=Object.getPrototypeOf(current);}
 const metadata=Type.ctorParameters?.();const entry=metadata?.[p[1]],inject=entry?.decorators?.filter(d=>d.type===core.Inject),optional=entry?.decorators?.filter(d=>d.type===core.Optional);
 const request=requests?.[p[2]];
 if(!request||request.token!==owned.LEGACY_ANIMATION_MODE||request.unresolved||flags.some(f=>Boolean(request[f])!==(f==='optional'))||requests.some(r=>r.token===core.ANIMATION_MODULE_TYPE))throw Error('direct mode request token/options differs');
 if(metadata?.length!==p[0]||inject?.length!==1||inject[0].args?.[0]!==owned.LEGACY_ANIMATION_MODE||optional?.length!==1||entry.decorators.some(d=>[core.Self,core.SkipSelf,core.Host].includes(d.type))||owned.MATERIAL_ANIMATIONS!==material.MATERIAL_ANIMATIONS||owned.LEGACY_ANIMATION_MODE===core.ANIMATION_MODULE_TYPE||owned.LEGACY_ANIMATION_MODE===material.MATERIAL_ANIMATIONS||capture?.constructor_calls!==1||capture.inputs?.length!==p[0]||capture.inputs[p[1]]!==injector.get(owned.LEGACY_ANIMATION_MODE,null,{optional:true}))throw Error('direct mode metadata/input/token differs');
 return {callers,receipt:{...(image.subject?{artifact_sha256:image.subject.artifact_sha256}:{}),protocol:'direct-owned-token-v1',symbol_id:symbol.symbol_id,shape_sha256:p[3],bundle_sha256:p[4],constructor_hashes:[...p[5]],constructor_arity:p[0],constructor_index:p[1],di_index:p[2],owned_token_distinct:true,actual_input_matched:true,optional:true,self:false,skipSelf:false,host:false,old_token_requested:false}};
}
export function partitionDirectOwnedMode({requests,core,owned,layout,material,Type,exports,symbol,files,runFactory,injector,value,capture,artifactContext}){
 const token=directOwnedModeToken({symbol,Type,exports,owned,core,material,injector,capture,file:files.caller,requests,artifactContext}),state=scope(files.core,owned.getLegacyAnimationsState),disabled=scope(files.core,owned.legacyAnimationsDisabled),resolver=scope(files.core,owned.resolveLegacyAnimationMode);
 if([state,disabled,resolver].some((x,i)=>x.proof.sha256!==contextualCoreHash(artifactContext)||x.proof.function_text_sha256!==helperHashes[i])||requests.some(r=>r.token===core.ANIMATION_MODULE_TYPE))throw Error('direct mode helper or old token differs');
 const retained=[],classified=[];for(const r of requests)(token.callers.some(c=>origin(r,state,disabled,c,null,resolver))?classified:retained).push(r);
 const expected=[{ident:'LEGACY_ANIMATIONS_TEST_OVERRIDE',token:owned.LEGACY_ANIMATIONS_TEST_OVERRIDE,optional:true},{ident:'MATERIAL_ANIMATIONS',token:material.MATERIAL_ANIMATIONS,optional:true},{ident:'LEGACY_ANIMATION_MODE',token:owned.LEGACY_ANIMATION_MODE,optional:true},{ident:'MediaMatcher',token:layout.MediaMatcher,optional:false}];
 const control=runFactory(owned.getLegacyAnimationsState,core.Injector,core.runInInjectionContext,{injector,captureStack:true});if(control.outcome!=='returned'||!control.requests.length)throw Error('direct mode control incomplete');check(control.requests,expected.slice(0,control.requests.length));
 const mode=capture.inputs[token.receipt.constructor_index],expectedMode=mode==='NoopAnimations'||control.value!=='enabled'?'NoopAnimations':mode;
 if(classified.length!==(mode==='NoopAnimations'?0:control.requests.length))throw Error('direct mode policy read count differs');check(classified,expected.slice(0,classified.length));
 const spinner=symbol.symbol_id==='legacy-progress-spinner/primary/MatLegacyProgressSpinner';
 const actual=spinner?value._noopAnimations:value._animationMode,expectedValue=spinner?expectedMode==='NoopAnimations'&&!!capture.inputs[4]&&!capture.inputs[4]._forceAnimations:expectedMode;
 if(actual!==expectedValue)throw Error('direct mode effective state differs');
 return {requests:retained,observation:{...token.receipt,protocol:'direct-owned-motion-v1',helper_core_sha256:contextualCoreHash(artifactContext),helper_function_hashes:[...helperHashes],old_token_requested:false,ambient_state:control.value,constructor_mode:mode??null,effective_mode:expectedMode??null,spinner_noop:spinner?actual:null,spinner_force:spinner?Boolean(capture.inputs[4]?._forceAnimations):null,spinner_defaults:spinner?Boolean(capture.inputs[4]):null,helper_calls:mode==='NoopAnimations'?0:1,classified_requests:classified.length,control_requests:serialize(control.requests,expected)}};
}
export function directOwnedModeProblems(x,id,artifactContext){
 const image=imageProfile(id,artifactContext),p=image?.profile,bad=['direct owned mode evidence incomplete'];if(!p||!x||(image.subject?x.artifact_sha256!==image.subject.artifact_sha256:Object.hasOwn(x,'artifact_sha256'))||x.symbol_id!==id||!['direct-owned-token-v1','direct-owned-motion-v1'].includes(x.protocol)||x.shape_sha256!==p[3]||x.bundle_sha256!==p[4]||!isDeepStrictEqual(x.constructor_hashes,p[5])||x.constructor_arity!==p[0]||x.constructor_index!==p[1]||x.di_index!==p[2]||x.owned_token_distinct!==true||x.actual_input_matched!==true||x.optional!==true||x.old_token_requested!==false||flags.slice(1).some(f=>x[f]!==false))return bad;
 const existing=id==='legacy-core/primary/MatLegacyPseudoCheckbox'||id==='legacy-tooltip/primary/LegacyTooltipComponent';
 if(existing)return x.protocol==='direct-owned-token-v1'?[]:bad;
 if(x.protocol!=='direct-owned-motion-v1')return bad;
 const mode=x.constructor_mode,expected=mode==='NoopAnimations'||x.ambient_state!=='enabled'?'NoopAnimations':mode,names=['LEGACY_ANIMATIONS_TEST_OVERRIDE','MATERIAL_ANIMATIONS','LEGACY_ANIMATION_MODE','MediaMatcher'];
 if(x.helper_core_sha256!==contextualCoreHash(artifactContext)||!isDeepStrictEqual(x.helper_function_hashes,helperHashes)||x.old_token_requested!==false||!['enabled','di-disabled','reduced-motion'].includes(x.ambient_state)||x.effective_mode!==expected||x.helper_calls!==(mode==='NoopAnimations'?0:1)||!Array.isArray(x.control_requests)||x.control_requests.length<1||x.control_requests.length>4||x.classified_requests!==x.helper_calls*x.control_requests.length||x.control_requests.some((r,i)=>!isDeepStrictEqual(r,{ident:names[i],identity_matched:true,unresolved:false,optional:i<3,self:false,skipSelf:false,host:false})))return bad;
 if(id==='legacy-progress-spinner/primary/MatLegacyProgressSpinner'){if(typeof x.spinner_noop!=='boolean'||typeof x.spinner_force!=='boolean'||typeof x.spinner_defaults!=='boolean'||x.spinner_noop!==(expected==='NoopAnimations'&&x.spinner_defaults&&!x.spinner_force))return bad;}else if(x.spinner_noop!==null||x.spinner_force!==null||x.spinner_defaults!==null)return bad;
 return [];
}
/** Token-only successor for the two callers already covered by the motion partition. */
export function qualifiedExistingOwnedMode({motion,...args}){if(!['legacy-core/primary/MatLegacyPseudoCheckbox','legacy-tooltip/primary/LegacyTooltipComponent'].includes(args.symbol?.symbol_id))throw Error('unknown existing mode caller');const result=directOwnedModeToken(args);if(ownedSelectMotionProblems(motion,args.symbol.symbol_id).length||(args.symbol.name==='LegacyTooltipComponent'&&(motion.constructor_animation_mode?.actual_input_identical!==true||motion.constructor_animation_mode?.old_engine_token_requested!==false)))throw Error('existing mode partition incomplete');return result.receipt;}

/** Settlement checks the exact changed slot and, for existing callers, their separate motion receipt. */
export function directOwnedModeRowProblems(row,artifactContext){
 const id=row?.symbol?.symbol_id,p=profiles[id];if(!p)return [];
 const x=row.factory_direct_owned_mode_context,r=row.runtime_requests?.[p[2]];if(!x&&r?.intentional_token_difference?.actual!=='@ngx-compat/material-legacy/legacy-core#LEGACY_ANIMATION_MODE')return [];
 const difference={historical:'@angular/core#ANIMATION_MODULE_TYPE',actual:'@ngx-compat/material-legacy/legacy-core#LEGACY_ANIMATION_MODE',historical_provider_selects_actual:false,classification:'distinct owned legacy motion configuration'};
 if(directOwnedModeProblems(x,id,artifactContext).length||hash(JSON.stringify(row.symbol.shape))!==p[3]||row.factory_outcome!=='returned'||row.factory_returned_owned_instance!==true||!r||r.expected_ident!=='ANIMATION_MODULE_TYPE'||r.expected_spec!=='@angular/platform-browser/animations'||r.observed_label!=='LEGACY_ANIMATION_MODE'||r.identity_matched!==false||r.unresolved!==false||!isDeepStrictEqual(r.intentional_token_difference,difference)||flags.some(f=>r[f]!== (f==='optional')||r['expected_'+f]!== (f==='optional')))return ['direct owned mode row/slot evidence incomplete'];
 if(x.protocol==='direct-owned-token-v1'&&ownedSelectMotionProblems(row.factory_owned_motion_context,id).length)return ['existing owned mode policy evidence incomplete'];
 return [];
}
