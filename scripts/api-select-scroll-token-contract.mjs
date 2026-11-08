/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * One intentionally distinct legacy select scroll strategy token, bound to the reviewed
 * packed declaration and runtime. New artifacts require independent review.
 */
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {qualifyApiV8Archive} from './api-v8-artifact-successor.mjs';
import {readFileSync,existsSync,realpathSync,readdirSync,lstatSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {inputHarnessClosureFingerprint} from './api-input-harness-contract.mjs';
import {dirname,join,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const ID='legacy-select/primary/MAT_LEGACY_SELECT_SCROLL_STRATEGY';
const D='8631a9313db5c51f3197ba1dc5cd0aafcca40fcee92ff277621799f3758c5015';
const B='ef9694e8e3aae5ec2170be660c71a322e2240dfd8b62a6ba66a9d89f43e61979';
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

export function selectScrollTokenProof(symbol,file,context){
 try{
  const ts=require('typescript');
  if(symbol?.symbol_id!==ID||symbol.family!=='legacy-select'||symbol.kind!=='primary'||symbol.name!=='MAT_LEGACY_SELECT_SCROLL_STRATEGY'||hash(JSON.stringify(symbol.shape))!=='e3b6b99fa399ec13430c53cd0376baca01ea5ac94aa39d94f3dfe3e7a6a9888d'||!file?.fileName||!context?.tarball||!context?.packageRoot||!context?.referenceRoot||process.versions.node!=='24.21.0'||ts.version!=='6.0.3'||hash(file.text)!==D)return null;
  if(hash(readFileSync(join(ROOT,'scripts/api-select-scroll-token-evidence.json')))!=='5220d60832bf5a336bfa14dfb6b74d090d1cef319662bf7897bc129d4533084c'||hash(readFileSync(join(ROOT,'tests/api_select_scroll_token_probe.mjs')))!=='fb25c5d64671c4cdc0b0d3e71d1dd867d98bca48f8290cf2f426b2c8610043eb')return null;
  const archive=readFileSync(context.tarball);
  const image=hash(archive),old='a488b8b42440baa553650766a5c4a969458e7add843ff5d500aeb20913c74fc2',v7='66449e62f2fe13232107cba6a7cdf744a67d941fe52987253546fbceb3bc35ca';
  if((![old,v7].includes(image)&&!qualifyApiV8Archive(archive))||!exactExtractedImage(archive,context.packageRoot)||realpathSync(file.fileName)!==realpathSync(join(context.packageRoot,'types/ngx-compat-material-legacy-legacy-select.d.ts')))return null;
  const reference={'legacy-select/public-api.ts':'f10853ac2d70d8e905e1872eefec3d2158594b81932ec92a1c7d67c16cc71064','legacy-select/select-module.ts':'1010d90c2d4bd39265fc4f29a729e9e5ab876b2944c7911eed90f373cb4faf79','legacy-select/select.ts':'f75594460cc49d590a74643ce2888990f498262d83c63d907966d5095ee0098d','select/select.ts':'ba939bcc724eab50cc71c628c3977ddd68f052bfb265a77de8793ec09562cd73'};
  for(const [path,digest] of Object.entries(reference))if(hash(readFileSync(join(context.referenceRoot,path)))!==digest)return null;
  const owned={'legacy-select/public-api.ts':'2aa2c6b377d8bcdb6fb635293e53fdf723a48c1dd107d8487c148ddd9a806889','legacy-select/select-module.ts':'2934c344b72d6cbddb0356dfcd28b452909c657349c6e9156dd9bc6c25ac81cc','legacy-select/internal/select-base.ts':'120ab123d79e58ea256211cafa50268dba3ce26524426e88b0347a8624aee68d','legacy-select/select.ts':'8fa3a142a8c70b69300896a96e56a031798ad27feb0d84db22f9fd5083408739'};
  for(const [path,digest] of Object.entries(owned))if(hash(readFileSync(join(ROOT,'projects/ngx-material-legacy',path)))!==digest)return null;
  const map=JSON.parse(readFileSync(join(context.packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-select.mjs.map')));
  for(const path of ['legacy-select/select-module.ts','legacy-select/internal/select-base.ts','legacy-select/select.ts']){const indices=map.sources.map((x,i)=>x.endsWith('/'+path)?i:-1).filter(i=>i>=0);if(indices.length!==1||hash(map.sourcesContent[indices[0]])!==owned[path])return null;}

  const bundle=join(dirname(dirname(file.fileName)),'fesm2022/ngx-compat-material-legacy-legacy-select.mjs');
  if(hash(readFileSync(bundle))!==B)return null;
  const peerRequire=createRequire(file.fileName);
  if(peerRequire('@angular/core/package.json').version!=='22.1.7'||peerRequire('@angular/material/package.json').version!=='22.1.7')return null;
  for(const [name,sha] of Object.entries(peers))if(peerImage(peerRequire,name)!==sha)return null;
  const options={strict:true,skipLibCheck:false,noEmit:true,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,target:ts.ScriptTarget.ES2022};
  const fixture=join(dirname(file.fileName),'__select_scroll_token_contract__.ts');
  const text="import {MAT_LEGACY_SELECT_SCROLL_STRATEGY as token} from './ngx-compat-material-legacy-legacy-select'; import {InjectionToken} from '@angular/core'; import {ScrollStrategy} from '@angular/cdk/overlay'; const a: InjectionToken<() => ScrollStrategy> = token; void a;";
  const host=ts.createCompilerHost(options),original=host.getSourceFile.bind(host);
  host.getSourceFile=(name,...args)=>name===fixture?ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true):original(name,...args);
  const program=ts.createProgram([file.fileName,fixture],options,host);
  if(ts.getPreEmitDiagnostics(program).length)return null;
  const sources=closure(program,fixture);if(sources.length!==322||inputHarnessClosureFingerprint(sources)!==(image===old?'953707f96efd47d6f7ec3918116add10af211a7c4278bf7489c4d08269717252':'db4bc7ab37ceb69301a8d32d628cf40be7f003143444f449211215ea75e6d761'))return null;
  const source=program.getSourceFile(file.fileName);if(!source||hash(source.text)!==D||file.text!==source.text)return null;
  const checker=program.getTypeChecker(),module=checker.getSymbolAtLocation(source);
  const exported=checker.getExportsOfModule(module).filter(s=>s.name==='MAT_LEGACY_SELECT_SCROLL_STRATEGY');
  if(exported.length!==1||!(exported[0].flags&ts.SymbolFlags.Alias))return null;
  const token=checker.getAliasedSymbol(exported[0]),decl=token.valueDeclaration;
  if(token.name!=='MAT_SELECT_SCROLL_STRATEGY'||!decl||!ts.isVariableDeclaration(decl)||!decl.type||checker.typeToString(checker.getTypeAtLocation(decl))!=='InjectionToken<() => ScrollStrategy>')return null;
  const named=source.statements.filter(ts.isImportDeclaration).flatMap(d=>d.importClause?.namedBindings&&ts.isNamedImports(d.importClause.namedBindings)?d.importClause.namedBindings.elements.map(e=>({name:e.name.text,module:d.moduleSpecifier.text})):[]);
  if(!named.some(x=>x.name==='InjectionToken'&&x.module==='@angular/core')||!named.some(x=>x.name==='ScrollStrategy'&&x.module==='@angular/cdk/overlay'))return null;
  return {tarball_sha256:hash(archive),extracted_files:512,peer_images:peers,program_sources:sources.length,program_closure_sha256:inputHarnessClosureFingerprint(sources),declaration_sha256:D,bundle_sha256:B,typescript:ts.version,scope:'exact packed select scroll token declaration and provider behavior; intentional divergence from historical shared token'};
 }catch{return null;}
}
export function settleSelectScrollToken(symbol,file,signature,context){
 const proof=selectScrollTokenProof(symbol,file,context);if(!proof)return signature;
 const expected=new Set([JSON.stringify(["token MAT_SELECT_SCROLL_STRATEGY 'mat-select-scroll-strategy'",null]),JSON.stringify([null,'const MAT_LEGACY_SELECT_SCROLL_STRATEGY:InjectionToken<()=>ScrollStrategy>'])]);
 const rows=(signature.rows||[]).filter(r=>r.status==='mismatch'&&expected.has(JSON.stringify([r.historical,r.owned])));
 if(rows.length!==2||new Set(rows.map(r=>JSON.stringify([r.historical,r.owned]))).size!==2||signature.blocking.length!==2||!signature.blocking.includes("token MAT_SELECT_SCROLL_STRATEGY 'mat-select-scroll-strategy'")||!signature.blocking.includes('const MAT_LEGACY_SELECT_SCROLL_STRATEGY:InjectionToken<()=>ScrollStrategy>'))return signature;
 return {...signature,blocking:[],rows:signature.rows.map(r=>rows.includes(r)?{...r,status:'intentional-legacy-difference',rationale:'The historical select shared the Material token. The owned select uses a distinct legacy token, verified against the exact packed provider and constructor injection.',proof}:r),select_scroll_token_proof:proof};
}
