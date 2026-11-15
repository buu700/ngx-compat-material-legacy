/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Finite declaration-only qualification of the reviewed v7 constructor pair.
 */
import {normalizePseudoCoreRows} from './api-pseudo-core-continuation.mjs';
import {qualifyCombinedArtifactSubject} from './api-combined-d70-image.mjs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync,realpathSync,lstatSync} from 'node:fs';
import {dirname,join,relative,isAbsolute,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {exactMenuArtifact} from './api-menu-artifact.mjs';
import {qualifyApiV8Archive as qualifyOldApiV8Archive} from './api-v8-artifact-successor.mjs';
import {qualifyApiHintIdArchive,API_HINT_ID_ARTIFACT_SHA,API_HINT_ID_FORM_BUNDLE_SHA,API_HINT_ID_FORM_MAP_SHA,API_HINT_ID_FORM_SOURCE_SHA,qualifyApiHintIdSources} from './api-hint-id-artifact-successor.mjs';
const qualifyApiV8Archive = archive => qualifyOldApiV8Archive(archive) || qualifyApiHintIdArchive(archive);
import {inputHarnessClosureFingerprint} from './api-input-harness-contract.mjs';
import {API_NODE_COMBINED_BUNDLES} from './api-node-combined-artifact-successor.mjs';
import {isDeepStrictEqual} from 'node:util';
const require=createRequire(import.meta.url),ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const hash=x=>createHash('sha256').update(x).digest('hex');
const SYMBOL='legacy-form-field/primary/MatLegacyFormField';
const OLD='public constructor(ElementRef,ChangeDetectorRef,Directionality,MatLegacyFormFieldDefaultOptions,Platform,NgZone,string)';
const NEW='public constructor(ElementRef,ChangeDetectorRef,Directionality,MatLegacyFormFieldDefaultOptions,Platform,NgZone,string,Injector?)';
const fixtureText=`import {MatLegacyFormField} from './ngx-compat-material-legacy-legacy-form-field';
import {Injector} from '@angular/core';
type A = ConstructorParameters<typeof MatLegacyFormField>;
declare const a:A[0], b:A[1], c:A[2], d:A[3], e:A[4], f:A[5], g:A[6], injector:Injector;
new MatLegacyFormField(a,b,c,d,e,f,g);
new MatLegacyFormField(a,b,c,d,e,f,g,injector);
class Derived extends MatLegacyFormField { constructor() { super(a,b,c,d,e,f,g); } }
// @ts-expect-error wrong eighth argument must be rejected
new MatLegacyFormField(a,b,c,d,e,f,g,'wrong');
void Derived;`;
/** Only the reviewed core declaration changed in the 309-source consumer. */
function combinedClosure(sources){
 const core={package:'@ngx-compat/material-legacy',version:'22.0.0-rc.0',package_sha256:'252144295470393ba5cd56ee0fc3ead5d63e84a49e15139fad7bf4d8fbe8ff93',path:'types/ngx-compat-material-legacy-legacy-core.d.ts'};
 const prior={...core,bytes:36343,sha256:'8fe7acf0ab671aa9155edc40f54b4a9ea435575565b23c01c5a95196c8b2abcf'},current={...core,bytes:36758,sha256:'40e2cd4aed9132372fc88482a6fc7eea709c1176e7e7f8527e7548d173f1861c'};
 const selected=sources.filter(x=>x.package===core.package&&x.version===core.version&&x.path===core.path);
 return sources.length===309&&selected.length===1&&isDeepStrictEqual(selected[0],current)&&inputHarnessClosureFingerprint(sources.map(x=>x===selected[0]?prior:x))==='fb4d846d3e355461e7c301e4d8013b39c8f8590a0f8375d5673bfce4d497f08c';
}
function strict(ts,file,combined=false,context){
 const options={strict:true,skipLibCheck:false,noEmit:true,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,target:ts.ScriptTarget.ES2022},fixture=join(dirname(file.fileName),'__form_constructor_contract__.ts'),host=ts.createCompilerHost(options),original=host.getSourceFile.bind(host);
 host.getSourceFile=(name,...args)=>name===fixture?ts.createSourceFile(name,fixtureText,ts.ScriptTarget.Latest,true):original(name,...args);
 const program=ts.createProgram([file.fileName,fixture],options,host);if(ts.getPreEmitDiagnostics(program).length||program.getSourceFile(file.fileName)?.text!==file.text)return null;
 const sources=program.getSourceFiles().filter(f=>f.fileName!==fixture).map(f=>{const real=realpathSync(f.fileName);let dir=dirname(real);while(dir!==dirname(dir)&&!existsSync(join(dir,'package.json')))dir=dirname(dir);const pb=readFileSync(join(dir,'package.json')),pkg=JSON.parse(pb),path=relative(dir,real).split('\\').join('/'),bytes=readFileSync(real);if(!pkg.name||!pkg.version||!path||path.startsWith('../')||isAbsolute(path)||!bytes.equals(Buffer.from(f.text,'utf8')))throw Error('unbound source');return {package:pkg.name,version:pkg.version,package_sha256:hash(pb),path,bytes:bytes.length,sha256:hash(bytes)}});
 const closure=inputHarnessClosureFingerprint(sources);return (combined?combinedClosure(combined.profile==='combined-pseudo-disabled'?normalizePseudoCoreRows(sources,context):sources):sources.length===309&&closure==='fb4d846d3e355461e7c301e4d8013b39c8f8590a0f8375d5673bfce4d497f08c')?{strict:true,skipLibCheck:false,sources:309,closure_sha256:closure,...(combined?{predecessor_closure_sha256:'fb4d846d3e355461e7c301e4d8013b39c8f8590a0f8375d5673bfce4d497f08c',changed_declarations:['types/ngx-compat-material-legacy-legacy-core.d.ts']}:{} )}:null;
}
export function settleFormConstructor(symbol,file,signature,context){
 try{
  const ts=require('typescript');if(symbol?.symbol_id!==SYMBOL||symbol.family!=='legacy-form-field'||symbol.kind!=='primary'||symbol.name!=='MatLegacyFormField'||hash(JSON.stringify(symbol.shape))!=='e205167b693101e4f7f2ed409f996aa72735202f4e5bc58e31a73151b8f64aca'||hash(JSON.stringify(signature))!=='02aa6cd890968a2101b6d7793e4ad767ee6d75ec8e3f04afd0fe9f654859e00f'||process.versions.node!=='24.21.0'||ts.version!=='6.0.3'||!file?.fileName||!context?.tarball||!context?.packageRoot||!context?.referenceRoot)return signature;
  const tar=readFileSync(context.tarball),combined=qualifyCombinedArtifactSubject(tar,context.packageRoot);if((hash(tar)!=='66449e62f2fe13232107cba6a7cdf744a67d941fe52987253546fbceb3bc35ca'&&!qualifyApiV8Archive(tar)&&!combined)||lstatSync(context.packageRoot).isSymbolicLink()||realpathSync(context.packageRoot)!==resolve(context.packageRoot)||!exactMenuArtifact(context,context.packageRoot))return signature;
  const isHint=qualifyApiHintIdArchive(tar);
  const members={'types/ngx-compat-material-legacy-legacy-form-field.d.ts':'dc344ae48c84272a89a404bc1170af22f1849086261b4a9c1da2a0f5955f0ac3','fesm2022/ngx-compat-material-legacy-legacy-form-field.mjs':(combined?API_NODE_COMBINED_BUNDLES['legacy-form-field']:isHint?API_HINT_ID_FORM_BUNDLE_SHA:'d77d13c903ecb0f982e76ad2e082a46e2bfd9c5e61b291d65a919adefb489eee'),'fesm2022/ngx-compat-material-legacy-legacy-form-field.mjs.map':(combined?'3320f38bf468f4b1506e546b773d848fdf469661f1bad141dbfc1287e80493a1':isHint?API_HINT_ID_FORM_MAP_SHA:'15417c384c5def420170a097793a1c9ec22b721dba87d6639eb1f25041010bff')};
  for(const [path,sha] of Object.entries(members))if(hash(readFileSync(join(context.packageRoot,path)))!==sha)return signature;
  const dts=join(context.packageRoot,Object.keys(members)[0]);if(realpathSync(file.fileName)!==realpathSync(dts)||hash(file.text)!==members[Object.keys(members)[0]])return signature;
  for(const [path,sha] of Object.entries({'legacy-form-field/public-api.ts':'28347cd0d8d48a1c4bc4921972361098ac52932464192b9e3d76d3349ba9ee51','legacy-form-field/form-field.ts':'c32e86f1be87568387a09abcd7e6c47e6cb33fd63ea0cff8b224e98073dd1726'}))if(hash(readFileSync(join(context.referenceRoot,path)))!==sha)return signature;
  const source=readFileSync(join(ROOT,'projects/ngx-material-legacy/legacy-form-field/form-field.ts'));const oldSource='e6204762c0899cfc038d28c7eb3918d291766b3179b6a7bf0b4630f59c6cd657';if(combined?hash(source)!=='e0fe0631a6adde57f515b82b43156d5da0ab0c2730872df5b792fc27dab14931':isHint?hash(source)!==API_HINT_ID_FORM_SOURCE_SHA:(hash(source)!==oldSource&&!qualifyApiHintIdSources()))return signature;
  const map=JSON.parse(readFileSync(join(context.packageRoot,Object.keys(members)[2]))),indexes=map.sources.flatMap((x,i)=>x.endsWith('/legacy-form-field/form-field.ts')?[i]:[]);if(indexes.length!==1||hash(map.sourcesContent[indexes[0]])!==(combined?'e0fe0631a6adde57f515b82b43156d5da0ab0c2730872df5b792fc27dab14931':isHint?API_HINT_ID_FORM_SOURCE_SHA:oldSource))return signature;
  const declaration=strict(ts,file,combined,context);if(!declaration)return signature;
  const rows=signature.rows.filter(r=>r.status==='mismatch'&&(r.historical===OLD&&r.owned===null||r.historical===null&&r.owned===NEW));if(rows.length!==2||signature.blocking.length!==2||!signature.blocking.includes(OLD)||!signature.blocking.includes(NEW))return signature;
  return {...signature,blocking:[],rows:signature.rows.filter(r=>!rows.includes(r)).concat([{status:'intentional-legacy-difference',historical:OLD,owned:NEW,rationale:'The declaration retains the reviewed optional Injector parameter; strict seven-argument and subclass consumers remain valid. The combined image separately authenticates the motion-token source change and core declaration transition.',proof:{artifact_sha256:hash(tar),declaration}}])};
 }catch{return signature;}
}
