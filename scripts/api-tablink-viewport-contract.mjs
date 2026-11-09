/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Finite autocomplete viewport replacement evidence; not token identity.
 */
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync,realpathSync} from 'node:fs';
import {dirname,join,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {inputHarnessClosureFingerprint} from './api-input-harness-contract.mjs';
import {compilerConstructorContract} from './api-compiler-constructor-contract.mjs';
import {receiptArchiveMatches} from './api-hint-id-artifact-successor.mjs';
import {spinnerViewportProof} from './api-spinner-viewport-contract.mjs';
import {tabHeaderSourceScopes} from './api-tab-header-context.mjs';
const require=createRequire(import.meta.url),hash=x=>createHash('sha256').update(x).digest('hex'),sha=hash,ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
function closure(program,virtual){
 return program.getSourceFiles().filter(f=>f.fileName!==virtual).map(file=>{
  const real=realpathSync(file.fileName);let dir=dirname(real);
  while(dir!==dirname(dir)&&!existsSync(join(dir,'package.json')))dir=dirname(dir);
  const packageBytes=readFileSync(join(dir,'package.json')),pkg=JSON.parse(packageBytes),path=relative(dir,real).split('\\').join('/'),bytes=readFileSync(real);
  if(!pkg.name||!pkg.version||!path||path.startsWith('../')||isAbsolute(path)||!bytes.equals(Buffer.from(file.text,'utf8')))throw Error('unbound input program source');
  return {package:pkg.name,version:pkg.version,package_sha256:sha(packageBytes),path,bytes:bytes.length,sha256:sha(bytes)};
 });
}
const profiles={'legacy-tabs/primary/MatLegacyTabLink':'1bc9958009f1da6157c43a96f01bf31bae41179b73a1942d3b190c233f47fed6','legacy-tabs/primary/_MatLegacyTabLinkBase':'7864844ad23aaba5dc377a4259b668e62d9d8f4d4b5c77bcaa5e201845f1f1aa'};
const D='1bfc9ca71821299ca40ecff4fe35faeabb18e2569a6d2e3d2fd13c9a9141b334';
// Artifact, authored source, scope and shared proof travel as one finite profile.
const versions={
 'a488b8b42440baa553650766a5c4a969458e7add843ff5d500aeb20913c74fc2':{bundle:'6da280036d123a97c111549e054ca67903c68600f1cc261424f39b356be763a1',navSource:'9205bb2a5b3573e8f21161b03baa04e4b3e868e72d70e06c5dcdf96d2439af36',common:'adbfc914d036f7f40c45dfd8ef0c1bd2efc2479e946fb58b085a08ce4107ff97',offset:0},
 '66449e62f2fe13232107cba6a7cdf744a67d941fe52987253546fbceb3bc35ca':{bundle:'ab6891ffa20dfd036d6f5ff7d81925df754bed95fc0ca3953a04fec0e3c098ac',navSource:'daf7d6f4c83292e7d3bf24eaf675b5cfc6c3fe341b779c5e801c23ef49d30f7f',common:'89cd46c3a6936097b9425d41ceb3905f2cc7e23730c71bf6ab36a93edb0a1fb5',offset:8},
 // spinnerViewportProof authenticates v8 before this exact profile is selected.
 // Its receipt retains the actual v8 archive identity; executable tabs are equal.
 'fd5b57f85aaa7b61f82f15a0dfb9ef12e65e6c80bdc47984d6917f0a517c3ce5':{bundle:'ab6891ffa20dfd036d6f5ff7d81925df754bed95fc0ca3953a04fec0e3c098ac',navSource:'daf7d6f4c83292e7d3bf24eaf675b5cfc6c3fe341b779c5e801c23ef49d30f7f',common:'024a5038754a3beb5ebad9a34cec9aa7e07b2aaf1b2aa9fad2fec7064e41e725',offset:8},
 '877c8b62e1ea9b134d838043dda436abb4ccf9515041640fdb05dc6113727b0b':{bundle:'ab6891ffa20dfd036d6f5ff7d81925df754bed95fc0ca3953a04fec0e3c098ac',navSource:'daf7d6f4c83292e7d3bf24eaf675b5cfc6c3fe341b779c5e801c23ef49d30f7f',common:'81d851bb284d0210df9e9576c022d0e7235a04b3fa9c482e7b76d298d419af41',offset:8}
};
function sourceScope(profile){const n=profile.offset;return {file:'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs',sha256:profile.bundle,owner_text_sha256:'5e9b4f6e16a70d3385259a45b6c1a587435f5e5d09dce244867e1bbfbbf81b19',helper_text_sha256:'240504b1d61cc7feee5cf56873f53f4c6f8132f4b49282c73508ca51fe7f06d4',owner_export:'MatLegacyPaginatedTabHeader',owner_local:'MatPaginatedTabHeader',selected_export:'MatLegacyTabNav',selected_local:'MatLegacyTabNav',owner_start:83493+n,owner_end:109635+n,field_start:83664+n,field_end:83689+n};}

export function tablinkViewportProof(symbol,parent,spinner,context,owned,parentType,selectedType){try{
 const ts=require('typescript');if(!Object.hasOwn(profiles,symbol?.symbol_id)||hash(JSON.stringify(symbol.shape))!==profiles[symbol.symbol_id]||parent?.symbol_id!=='legacy-tabs/primary/MatLegacyTabNav'||hash(JSON.stringify(parent.shape))!=='e877a6efd2cd0b442ed020409b0966906f8a7432abd9fd90cd375cd877c512e3'||!context?.packageRoot||!context?.referenceRoot)return null;
 const commonPath=join(context.packageRoot,'types/ngx-compat-material-legacy-legacy-progress-spinner.d.ts'),common=spinnerViewportProof(spinner,{fileName:commonPath,text:readFileSync(commonPath,'utf8')},context);if(!common)return null;const profile=versions[common.artifact_sha256];if(!profile||hash(JSON.stringify(common))!==profile.common)return null;const B=profile.bundle;
 const decl=join(context.packageRoot,'types/ngx-compat-material-legacy-legacy-tabs.d.ts'),bundlePath=join(context.packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs'),bundle=readFileSync(bundlePath,'utf8');if(hash(readFileSync(decl))!==D||hash(bundle)!==B)return null;
 for(const [path,digest] of Object.entries({'legacy-tabs/tab-nav-bar/tab-nav-bar.ts':'1f75b76b1098b3fc7933be467c76cc307a8731bca6e57c2d1660a2e14932b254','tabs/tab-nav-bar/tab-nav-bar.ts':'f027ace09827cf65cbcf53b1d969bf4964563466b1f330b7ddd4d8525934dada','legacy-tabs/public-api.ts':'f6a4dd305258afa9706c958c06f6260baec6258731f2fa9dba91667faa43b62c'}))if(hash(readFileSync(join(context.referenceRoot,path)))!==digest)return null;
 const paths={'legacy-tabs/tab-nav-bar/tab-nav-bar.ts':'89e91390739e518a2a3e9dbdd8d75ff09dfcaa94bfe4bccc73d86f1e577c206c','legacy-tabs/internal/tab-nav-bar-base.ts':profile.navSource,'legacy-tabs/internal/paginated-tab-header.ts':'2c05a1f269d5c56d9e354b81ea0baff88d77602e920911df215bb8d1641b1ac6'},map=JSON.parse(readFileSync(bundlePath+'.map'));for(const [path,digest] of Object.entries(paths)){if(hash(readFileSync(join(ROOT,'projects/ngx-material-legacy',path)))!==digest)return null;const i=map.sources.findIndex(x=>x.endsWith('/'+path));if(i<0||hash(map.sourcesContent[i])!==digest)return null;}
 if(hash(readFileSync(join(ROOT,'tests/api_tablink_viewport_provider_probe.mjs')))!=='b41ab188fdaf12930e8fe154fbcd8fb242df63404efe0c899955d51ed5febcba'||hash(readFileSync(join(ROOT,'scripts/api-tablink-viewport-provider-evidence.json')))!=='40a4b5b55764a98a4ce216e7812b95838592884b34e94f39fe9469f798023164')return null;
 const scope=tabHeaderSourceScopes(parentType,owned,bundlePath,'MatLegacyTabNav').proof;
 const expectedScope=sourceScope(profile);if(!isDeepStrictEqual(scope,expectedScope))return null;
 const parsed=ts.createSourceFile('tabs.mjs',bundle,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),exports=parsed.statements.filter(n=>ts.isExportDeclaration(n)&&!n.moduleSpecifier&&n.exportClause&&ts.isNamedExports(n.exportClause)).flatMap(n=>n.exportClause.elements),local=symbol.name==='MatLegacyTabLink'?'MatLegacyTabLink':'_MatTabLinkBase';const selected=parsed.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===local);if(exports.filter(e=>e.name.text===symbol.name&&(e.propertyName||e.name).text===local).length!==1||selected.length!==1||owned[symbol.name]!==selectedType||selected[0].getText(parsed)!==Function.prototype.toString.call(selectedType))return null;
 const compiled=compilerConstructorContract(bundle,'MatLegacyTabNav',{resolveInherited:true});if(compiled.parameters.length!==7||compiled.parameters[4].token_expression!=='@ngx-compat/material-legacy/legacy-core#_LegacyViewport'||['optional','self','skipSelf','host'].some(f=>compiled.parameters[4][f]!==false))return null;
 const model=JSON.parse(readFileSync(join(ROOT,'compatibility/rc/legacy-viewport-source-proof.json'))),entry=Object.values(model).find(x=>x&&typeof x==='object'&&typeof x.positive_fixture==='string'),original=entry?.positive_fixture.match(/declare namespace Subject0\{[\s\S]*?\}\}\n(?=declare const supplied0)/)?.[0];if(!original)return null;
 const fixture=join(dirname(decl),'__tablink_viewport_probe__.ts'),text=`import {MatLegacyTabNav} from './ngx-compat-material-legacy-legacy-tabs';import {ViewportRuler} from '@angular/cdk/scrolling';import {Platform} from '@angular/cdk/platform';import {NgZone,OnDestroy} from '@angular/core';import {Observable} from 'rxjs';${original} declare const old:Subject0.ViewportRuler,current:ViewportRuler;let args:ConstructorParameters<typeof MatLegacyTabNav>;args![4]=old;args![4]=current;`;
 const options={strict:true,skipLibCheck:false,noEmit:true,types:[],module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,target:ts.ScriptTarget.ES2022};function compile(text){const host=ts.createCompilerHost(options),get=host.getSourceFile.bind(host);host.getSourceFile=(name,...args)=>name===fixture?ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true):get(name,...args);const program=ts.createProgram([decl,fixture],options,host);return {program,diagnostics:ts.getPreEmitDiagnostics(program)};}
 const positive=compile(text);if(positive.diagnostics.length)return null;const bad=compile(text+'\nold.change("slow");');if(bad.diagnostics.length!==1||bad.diagnostics[0].code!==2345)return null;
 const sources=closure(positive.program,fixture),fingerprint=inputHarnessClosureFingerprint(sources);if(sources.length!==310||fingerprint!=='d2b49458be7423211f05d1f95ff12acf6b96891a13d589324fd63cbfb557498f'||hash(JSON.stringify(common))!==profile.common)return null;
 return {common:hash(JSON.stringify(common)),declaration_sha256:D,bundle_sha256:B,program_sources:sources.length,program_closure_sha256:fingerprint,source:scope,historical16_provider_selects_actual:false,minimum22_provider_selects_actual:false,customization:'docs-private; no stable customization guarantee'};
}catch{return null;}}
export function tablinkViewportObservationProblems(row,context){
 if(!Object.hasOwn(profiles,row?.symbol?.symbol_id))return [];const bad=['tab-link parent viewport replacement receipt incomplete'];
 if(hash(JSON.stringify(row.symbol.shape))!==profiles[row.symbol.symbol_id]||row.factory_outcome!=='returned'||row.factory_returned_owned_instance!==true||row.factory_node_kind!=='element'||!isDeepStrictEqual(row.factory_context_modules,['legacy-tabs/primary/MatLegacyTabsModule'])||row.factory_context!=='actual Angular element/template nodes and public application providers with synthetic Renderer2/server DOM and public MockPlatformLocation URL backend; native/browser/AOT/packed/floors separate')return bad;
 const parent=row.factory_parent_construction;if(parent?.symbol_id!=='legacy-tabs/primary/MatLegacyTabNav'||parent.returned_owned_instance!==true||parent.parent_node!=='actual parent Angular element'||parent.constructor_evidence?.length!==7||!isDeepStrictEqual(parent.constructor_evidence[4],{index:4,attribute:null,input_verified:true,scope_challenge:null}))return bad;
 const compiler=parent.compiler_observation;if(compiler?.parameters?.length!==7||!isDeepStrictEqual(compiler.parameters[4],{index:4,token_expression:'@ngx-compat/material-legacy/legacy-core#_LegacyViewport',attribute:null,optional:false,self:false,skipSelf:false,host:false}))return bad;
 const req=row.runtime_requests,ps=row.symbol.shape.originalFactoryContext?.factory_parameters?.filter(p=>!p.attribute),labels=row.symbol.name==='MatLegacyTabLink'?['MatLegacyTabNav','ElementRef','NgZone','Platform','mat-ripple-global-options','FocusMonitor','AnimationModuleType']:['_MatTabNavBase','ElementRef','mat-ripple-global-options','FocusMonitor','AnimationModuleType'];if(!Array.isArray(req)||!Array.isArray(ps)||req.length!==labels.length||ps.length!==labels.length)return bad;
 for(let i=0;i<req.length;i++){const r=req[i],p=ps[i];if(r.expected_ident!==p.ident||r.expected_spec!==p.spec||r.observed_label!==labels[i]||r.identity_matched!==true||r.unresolved!==false||r.observation_evidence!=='actual compiler metadata token identity and captured constructor input'||['optional','self','skipSelf','host'].some(f=>r[f]!==Boolean(p[f])||r['expected_'+f]!==Boolean(p[f])))return bad;}
 const observedProof=parent.viewport_replacement?.proof,entry=Object.entries(versions).find(([,v])=>v.bundle===observedProof?.bundle_sha256&&v.common===observedProof?.common);if(!entry||!receiptArchiveMatches(context,entry[0]))return bad;const profile=entry[1];
 const proof={common:profile.common,declaration_sha256:D,bundle_sha256:profile.bundle,program_sources:310,program_closure_sha256:'d2b49458be7423211f05d1f95ff12acf6b96891a13d589324fd63cbfb557498f',source:sourceScope(profile),historical16_provider_selects_actual:false,minimum22_provider_selects_actual:false,customization:'docs-private; no stable customization guarantee'};
 const expected={identity_matched:false,historical:'@angular/cdk/scrolling#ViewportRuler',actual:'@ngx-compat/material-legacy/legacy-core#_LegacyViewport',historical16_provider_selects_actual:false,minimum22_provider_selects_actual:false,proof,node:{constructor_arity:7,viewport_index:4,parent_node:true,owned_input_matches_parent_provider:true,owned_metadata_token:true,stored_input_matches:true}};
 return isDeepStrictEqual(parent.viewport_replacement,expected)?[]:bad;
}
