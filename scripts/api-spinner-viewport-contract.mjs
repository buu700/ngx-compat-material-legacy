import {combinedTokenSignatureProof} from './api-combined-token-signatures.mjs';
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * One intentionally distinct legacy tab injection token, bound to the reviewed
 * packed declaration and runtime. New artifacts require independent review.
 */
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {qualifyApiV8Archive as qualifyOldApiV8Archive,API_V8_ARTIFACT_SHA} from './api-v8-artifact-successor.mjs';
import {qualifyApiHintIdArchive,API_HINT_ID_ARTIFACT_SHA,API_HINT_ID_FORM_BUNDLE_SHA,API_HINT_ID_FORM_MAP_SHA,API_HINT_ID_FORM_SOURCE_SHA,receiptArchiveMatches} from './api-hint-id-artifact-successor.mjs';
const qualifyApiV8Archive = archive => qualifyOldApiV8Archive(archive) || qualifyApiHintIdArchive(archive);
import {readFileSync,existsSync,realpathSync,readdirSync,lstatSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {compilerConstructorContract} from './api-compiler-constructor-contract.mjs';
import {inputHarnessClosureFingerprint} from './api-input-harness-contract.mjs';
import {dirname,join,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const ID='legacy-progress-spinner/primary/MatLegacyProgressSpinner';
const D='deed944522f4f6022e03975dc0383117e9a22556f79f46eb7b6ddd4c810a02e1';
const B='ec5a5f2a04b54a97c8a226695ec49c025619bc335c1c12e33841c4f5dda030b7';
const hash=s=>createHash('sha256').update(s).digest('hex'),sha=hash;
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
function closure(program,virtual){
 return program.getSourceFiles().filter(f=>f.fileName!==virtual).map(file=>{
  const real=realpathSync(file.fileName);let dir=dirname(real);
  while(dir!==dirname(dir)&&!existsSync(join(dir,'package.json')))dir=dirname(dir);
  const packageBytes=readFileSync(join(dir,'package.json')),pkg=JSON.parse(packageBytes),path=relative(dir,real).split('\\').join('/'),bytes=readFileSync(real);
  if(!pkg.name||!pkg.version||!path||path.startsWith('../')||isAbsolute(path)||!bytes.equals(Buffer.from(file.text,'utf8')))throw Error('unbound input program source');
  return {package:pkg.name,version:pkg.version,package_sha256:sha(packageBytes),path,bytes:bytes.length,sha256:sha(bytes)};
 });
}
function exactExtractedImage(archive,packageRoot){
 const bytes=gunzipSync(archive,{maxOutputLength:100*1024*1024}),files=new Map();let offset=0;
 const field=(header,a,b)=>header.subarray(a,b).toString('utf8').replace(/\0.*$/s,'');
 while(offset+512<=bytes.length){
  const header=bytes.subarray(offset,offset+512);offset+=512;if(header.every(x=>x===0))break;
  const name=field(header,0,100),prefix=field(header,345,500),full=prefix?prefix+'/'+name:name,raw=field(header,124,136).trim();
  if(!/^package\/[a-zA-Z0-9_@.\/-]+$/.test(full)||full.split('/').some(x=>x==='.'||x==='..'||!x)||header[156]!==48||! /^[0-7]+$/.test(raw)||files.has(full))return false;
  const size=parseInt(raw,8);if(!Number.isSafeInteger(size)||size<0||offset+size>bytes.length)return false;
  files.set(full.slice(8),bytes.subarray(offset,offset+size));offset+=Math.ceil(size/512)*512;
 }
 if(files.size!==512)return false;
 const seen=[];function walk(dir,base=''){
  for(const entry of readdirSync(dir,{withFileTypes:true})){
   const rel=base?base+'/'+entry.name:entry.name,path=join(dir,entry.name),stat=lstatSync(path);
   if(stat.isSymbolicLink())throw Error('linked extracted package image');
   if(stat.isDirectory())walk(path,rel);else if(stat.isFile())seen.push(rel);else throw Error('unexpected extracted member');
  }
 }
 walk(packageRoot);if(seen.length!==files.size)return false;
 return seen.every(path=>files.has(path)&&readFileSync(join(packageRoot,path)).equals(files.get(path)));
}
const peers={
 '@angular/core':'723ad5070ee993b7b924667668c614d6a291bc7e72c6aed20b9cd1ca0ed8bdb3',
 '@angular/common':'a9a4dfee03b92c8483aa1ac9a16a9767185d6c13e60fa713ef624bbd8b960115',
 '@angular/platform-browser':'a25cfd43df3d87d74edf0b0c4a2f5dd8ee268209adbe738d3a05321d014dd55f',
 '@angular/compiler':'006b4d6176547f6aecef034cce1b607ba4f402e61f30dde5463433e12a67e3bb',
 '@angular/material':'c857deabd2ae784dfc97974679271be3d263ef89524c485f81cbe4680367d7a7',
 '@angular/cdk':'508d804722d830826d63f4c2ed94a89ebe5a07cefe763351141c2397fa0e2843',
 'rxjs':'58c697b910a4ff10ec65a8df5c0b48c88564942b3821097ccd6d10a0df6fbf8b',
 'tslib':'e872e35b2a1745935c5ce30fb038f5c4e0d487e480dfa76da08ac6f00c7f18dc'};
function peerImage(req,name){
 const root=dirname(realpathSync(req.resolve(name+'/package.json'))),rows=[];
 function walk(dir,base=''){for(const e of readdirSync(dir,{withFileTypes:true})){const rel=base?base+'/'+e.name:e.name,path=join(dir,e.name),st=lstatSync(path);if(st.isSymbolicLink())throw Error('symlink inside peer image');if(st.isDirectory())walk(path,rel);else if(st.isFile()){const bytes=readFileSync(path);rows.push({path:rel,bytes:bytes.length,sha256:hash(bytes)});}else throw Error('unexpected peer member');}}
 walk(root);return hash(rows.map(r=>JSON.stringify(r)).sort().join('\n'));
}

const OLD='public constructor(ElementRef<HTMLElement>,Platform,any,string,MatProgressSpinnerDefaultOptions?,ChangeDetectorRef?,ViewportRuler?,NgZone?,string|null?)';
const NEW=OLD.replace('ViewportRuler','_LegacyViewport');
/** Finite artifact/source/type qualification. Identity of the old and new tokens is never asserted. */
export function spinnerViewportProof(symbol,file,context){try{
 const ts=require('typescript');
 if(symbol?.symbol_id!==ID||symbol.family!=='legacy-progress-spinner'||symbol.kind!=='primary'||hash(JSON.stringify(symbol.shape))!=='050d8d4a0bfd373fc45705e8170172241593edd6eed409add8b5662a13c2dc5f'||!file?.fileName||!context?.tarball||!context?.packageRoot||!context?.referenceRoot||process.versions.node!=='24.21.0'||ts.version!=='6.0.3')return null;
 if(hash(readFileSync(join(ROOT,'tests/api_spinner_viewport_provider_probe.mjs')))!=='1f5cbaefea0bc2081545b4826efd8708a8c65d8e05e7f30f3970b4a9674b8a10'||hash(readFileSync(join(ROOT,'scripts/api-spinner-viewport-provider-evidence.json')))!=='498fb8a25f082cf1497c93af8ef58fadbd7d6ceddf3875673f68f8f07e1075d1')return null;
 const archive=readFileSync(context.tarball);if((!['a488b8b42440baa553650766a5c4a969458e7add843ff5d500aeb20913c74fc2','66449e62f2fe13232107cba6a7cdf744a67d941fe52987253546fbceb3bc35ca'].includes(hash(archive))&&!qualifyApiV8Archive(archive))||!exactExtractedImage(archive,context.packageRoot))return null;
 const decl=join(context.packageRoot,'types/ngx-compat-material-legacy-legacy-progress-spinner.d.ts');if(realpathSync(file.fileName)!==realpathSync(decl)||hash(file.text)!==D||hash(readFileSync(decl))!==D||hash(readFileSync(join(context.packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-progress-spinner.mjs')))!==B||hash(readFileSync(join(context.packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-core.mjs')))!=='a97593a64d442640dfa1263cba8937ab2a6190bf1ebae792c4dda1a51cc9dc58')return null;
 for(const [path,digest] of Object.entries({'legacy-progress-spinner/progress-spinner.ts':'9c8297973100aba79b49950f076c9a15884cc1d245ea504cc05cc8a9182c731b','legacy-progress-spinner/public-api.ts':'1dada8f86d939587195853b24fc7b49c0bfeac709283ab59cfedda11e02dc29b'}))if(hash(readFileSync(join(context.referenceRoot,path)))!==digest)return null;
 for(const [path,digest] of Object.entries({'reference/material-16.2.14/viewport-sources/viewport-ruler.ts':'2cd3078732370fd98fad1fdf1c443acbaab5b5986fbf3cadd7ff546d51c3ed76','compatibility/rc/legacy-viewport-source-proof.json':'0d0c4fb8493c3ac8d0890c7d29a006b10af6d721ad949b456db1b8e31e54fc88','projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts':'522d8dfc0362b7ed01b6dc9155a10d7f36f67aef4152249f56db1f631ad935b0','projects/ngx-material-legacy/legacy-progress-spinner/progress-spinner.ts':'85936bc7161a1dcbbc377fbf19c3de46b09f13a32adaa3d503d7dc09204c736c'}))if(hash(readFileSync(join(ROOT,path)))!==digest)return null;
 const map=JSON.parse(readFileSync(join(context.packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-progress-spinner.mjs.map'))),idx=map.sources.findIndex(s=>s.endsWith('/legacy-progress-spinner/progress-spinner.ts'));if(idx<0||hash(map.sourcesContent[idx])!=='85936bc7161a1dcbbc377fbf19c3de46b09f13a32adaa3d503d7dc09204c736c')return null;
 const coreMap=JSON.parse(readFileSync(join(context.packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-core.mjs.map'))),coreIdx=coreMap.sources.findIndex(s=>s.endsWith('/legacy-core/internal/legacy-viewport.ts'));if(coreIdx<0||hash(coreMap.sourcesContent[coreIdx])!=='522d8dfc0362b7ed01b6dc9155a10d7f36f67aef4152249f56db1f631ad935b0')return null;
 const req=createRequire(decl);for(const [name,digest] of Object.entries(peers))if(peerImage(req,name)!==digest)return null;
 const model=JSON.parse(readFileSync(join(ROOT,'compatibility/rc/legacy-viewport-source-proof.json')));const entry=Object.values(model).find(x=>x&&typeof x==='object'&&typeof x.positive_fixture==='string');const original=entry?.positive_fixture.match(/declare namespace Subject0\{[\s\S]*?\}\}\n(?=declare const supplied0)/)?.[0];if(!original)return null;
 const fixture=join(dirname(decl),'__spinner_viewport_probe__.ts');const text=`import {MatLegacyProgressSpinner} from './ngx-compat-material-legacy-legacy-progress-spinner'; import {ViewportRuler} from '@angular/cdk/scrolling';import {Platform} from '@angular/cdk/platform';import {NgZone,OnDestroy,ElementRef,ChangeDetectorRef} from '@angular/core';import {Observable} from 'rxjs'; ${original} declare const old:Subject0.ViewportRuler,current:ViewportRuler,el:ElementRef<HTMLElement>,platform:Platform,cdr:ChangeDetectorRef,zone:NgZone;const a:ConstructorParameters<typeof MatLegacyProgressSpinner>=[el,platform,document,'',undefined,cdr,old,zone];const b:ConstructorParameters<typeof MatLegacyProgressSpinner>=[el,platform,document,'',undefined,cdr,current,zone];`;
 const options={strict:true,skipLibCheck:false,noEmit:true,types:[],module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,target:ts.ScriptTarget.ES2022};const host=ts.createCompilerHost(options),get=host.getSourceFile.bind(host);host.getSourceFile=(name,...args)=>name===fixture?ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true):get(name,...args);const program=ts.createProgram([decl,fixture],options,host);if(ts.getPreEmitDiagnostics(program).length)return null;
 const sources=closure(program,fixture),fingerprint=inputHarnessClosureFingerprint(sources);if(sources.length!==309||fingerprint!=='cce5ea0cfb917ec87bb9a750f0f428b080739af35c0d8a3884939ec0901680be')return null;
 const source=program.getSourceFile(decl);if(!source||hash(source.text)!==D)return null;
 const negativeHost=ts.createCompilerHost(options),ng=negativeHost.getSourceFile.bind(negativeHost);negativeHost.getSourceFile=(name,...args)=>name===fixture?ts.createSourceFile(name,text+'\nold.change("slow");',ts.ScriptTarget.Latest,true):ng(name,...args);const bad=ts.getPreEmitDiagnostics(ts.createProgram([decl,fixture],options,negativeHost));if(bad.length!==1||bad[0].code!==2345)return null;
 const bundle=readFileSync(join(context.packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-progress-spinner.mjs'),'utf8'),parsed=ts.createSourceFile('spinner.mjs',bundle,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(parsed.parseDiagnostics.length)return null;const classes=parsed.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyProgressSpinner'),exports=parsed.statements.filter(n=>ts.isExportDeclaration(n)&&!n.moduleSpecifier&&n.exportClause&&ts.isNamedExports(n.exportClause)).flatMap(n=>n.exportClause.elements.filter(e=>e.name.text==='MatLegacyProgressSpinner'&&(e.propertyName||e.name).text==='MatLegacyProgressSpinner'));if(classes.length!==1||exports.length!==1||classes[0].members.filter(ts.isConstructorDeclaration).length!==1||classes[0].members.find(ts.isConstructorDeclaration).parameters.length!==9)return null;
 const compiled=compilerConstructorContract(bundle,'MatLegacyProgressSpinner');if(compiled.parameters.length!==9||compiled.parameters[6].token_expression!=='@ngx-compat/material-legacy/legacy-core#_LegacyViewport'||['optional','self','skipSelf','host'].some(f=>compiled.parameters[6][f]!==false))return null;
 return {artifact_sha256:hash(archive),declaration_sha256:D,bundle_sha256:B,program_sources:sources.length,program_closure_sha256:fingerprint,identity:'distinct owned replacement',manual_type:'historical and minimum CDK arguments accepted one way',provider:'historical 16 and minimum 22 providers do not select owned token; private token has no stable customization guarantee'};
}catch{return null;}}
export function settleSpinnerViewport(symbol,file,signature,context){const proof=spinnerViewportProof(symbol,file,context)||combinedTokenSignatureProof(symbol,file,context);if(!proof)return signature;const pairs=[[OLD,null],[null,NEW]],rows=(signature.rows||[]).filter(r=>r.status==='mismatch'&&pairs.some(p=>JSON.stringify(p)===JSON.stringify([r.historical,r.owned])));if(rows.length!==2||new Set(rows.map(r=>JSON.stringify([r.historical,r.owned]))).size!==2||signature.blocking.length!==2||!signature.blocking.includes(OLD)||!signature.blocking.includes(NEW))return signature;return {...signature,blocking:[],rows:signature.rows.map(r=>rows.includes(r)?{...r,status:'intentional-legacy-difference',rationale:'Owned docs-private viewport replaces the historical docs-private token; manual arguments remain structurally accepted but DI token identity differs.',proof}:r),spinner_viewport_proof:proof};}
export function spinnerViewportObservationProblems(row,context){
 if(row?.symbol?.symbol_id!==ID)return [];
 const bad=['spinner viewport replacement receipt incomplete'];
 if(hash(JSON.stringify(row.symbol.shape))!=='050d8d4a0bfd373fc45705e8170172241593edd6eed409add8b5662a13c2dc5f'||row.factory_outcome!=='returned'||row.factory_returned_owned_instance!==true||row.factory_node_kind!=='element'||JSON.stringify(row.factory_context_modules)!==JSON.stringify(['legacy-progress-spinner/primary/MatLegacyProgressSpinnerModule'])||row.factory_context!=='actual Angular element/template nodes and public application providers with synthetic Renderer2/server DOM and public MockPlatformLocation URL backend; native/browser/AOT/packed/floors separate')return bad;
 const req=row.runtime_requests,labels=['ElementRef','Platform','DocumentToken','AnimationModuleType','mat-progress-spinner-default-options','ChangeDetectorRef','_LegacyViewport','NgZone','CSP nonce'];
 const ps=row.symbol.shape.originalFactoryContext?.factory_parameters;if(!Array.isArray(req)||req.length!==9||!Array.isArray(ps)||ps.length!==9)return bad;
 for(let i=0;i<9;i++){const r=req[i],p=ps[i];if(r.expected_ident!==p.ident||r.expected_spec!==p.spec||r.observed_label!==labels[i]||r.identity_matched!==(i!==6)||r.unresolved!==false||r.observation_evidence!=='public Injector request trace'||['optional','self','skipSelf','host'].some(f=>r[f]!==Boolean(p[f])||r['expected_'+f]!==Boolean(p[f])))return bad;}
 const artifact=req[6]?.intentional_token_difference?.proof?.artifact_sha256;if(!['a488b8b42440baa553650766a5c4a969458e7add843ff5d500aeb20913c74fc2','66449e62f2fe13232107cba6a7cdf744a67d941fe52987253546fbceb3bc35ca',API_V8_ARTIFACT_SHA,API_HINT_ID_ARTIFACT_SHA].includes(artifact)||!receiptArchiveMatches(context,artifact))return bad;
 const expectedProof={artifact_sha256:artifact,declaration_sha256:D,bundle_sha256:B,program_sources:309,program_closure_sha256:'cce5ea0cfb917ec87bb9a750f0f428b080739af35c0d8a3884939ec0901680be',identity:'distinct owned replacement',manual_type:'historical and minimum CDK arguments accepted one way',provider:'historical 16 and minimum 22 providers do not select owned token; private token has no stable customization guarantee'};
 const expected={historical:'@angular/cdk/scrolling#ViewportRuler',actual:'@ngx-compat/material-legacy/legacy-core#_LegacyViewport',historical_provider_selects_actual:false,minimum_provider_selects_actual:false,customization:'docs-private; no stable customization guarantee',proof:expectedProof,node:{constructor_calls:1,constructor_arity:9,viewport_index:6,actual_node_element:true,owned_input_matches_node_provider:true,owned_metadata_token:true}};
 if(JSON.stringify(req[6].intentional_token_difference)!==JSON.stringify(expected))return bad;
 return [];
}
