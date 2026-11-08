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
import {qualifyApiV8Archive} from './api-v8-artifact-successor.mjs';
import {readFileSync,existsSync,realpathSync,readdirSync,lstatSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {inputHarnessClosureFingerprint} from './api-input-harness-contract.mjs';
import {dirname,join,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const ID='legacy-tabs/primary/MAT_LEGACY_TAB';
const D='1bfc9ca71821299ca40ecff4fe35faeabb18e2569a6d2e3d2fd13c9a9141b334';
const B='6da280036d123a97c111549e054ca67903c68600f1cc261424f39b356be763a1';
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

export function tabTokenProof(symbol,file,context){
 try{
  const ts=require('typescript');
  if(symbol?.symbol_id!==ID||symbol.family!=='legacy-tabs'||symbol.kind!=='primary'||symbol.name!=='MAT_LEGACY_TAB'||hash(JSON.stringify(symbol.shape))!=='975cc7c901bfe9454bdc37720b6f2364f4239b17f0a30a70974d410a75591f53'||!file?.fileName||!context?.tarball||!context?.packageRoot||!context?.referenceRoot||process.versions.node!=='24.21.0'||ts.version!=='6.0.3'||hash(file.text)!==D)return null;
  if(hash(readFileSync(join(ROOT,'scripts/api-tab-token-evidence.json')))!=='f695f63ad931a06a98608abdfa389754a01a4a8afa321a76af3a490252ae8eab'||hash(readFileSync(join(ROOT,'tests/api_tab_token_probe.mjs')))!=='ce0649440de5a58f39ba3599be4526d628e3f2087c9d709371cbfba5e16e6a78')return null;
  const archive=readFileSync(context.tarball);
  const artifact=hash(archive), oldArtifact='a488b8b42440baa553650766a5c4a969458e7add843ff5d500aeb20913c74fc2', v7Artifact='66449e62f2fe13232107cba6a7cdf744a67d941fe52987253546fbceb3bc35ca';
  if((![oldArtifact,v7Artifact].includes(artifact)&&!qualifyApiV8Archive(archive))||!exactExtractedImage(archive,context.packageRoot)||realpathSync(file.fileName)!==realpathSync(join(context.packageRoot,'types/ngx-compat-material-legacy-legacy-tabs.d.ts')))return null;
  const reference={'legacy-tabs/public-api.ts':'f6a4dd305258afa9706c958c06f6260baec6258731f2fa9dba91667faa43b62c','legacy-tabs/tab.ts':'0fc0c91e7916d16fd6fe6a82356b6c5f8890e34958483e960f784412978e0970','tabs/tab.ts':'081213228a7964df7e4d6396e1503a1ee396b6722f8cb58baaa2a51c2baae43a'};
  for(const [path,sha] of Object.entries(reference))if(hash(readFileSync(join(context.referenceRoot,path)))!==sha)return null;
  const owned={'legacy-tabs/public-api.ts':'6ed79724ae52eb970bbd081180257b7b1e31b442a1ed27bfb2bef48f78b20edd','legacy-tabs/tab.ts':'e58220c6f0e19f4f6395bd13756926d6cd140ad9c1bcc38877c011a353b61fae','legacy-tabs/internal/tab-token.ts':'8b4148fb7e16dbe43712b0de95e078c1b2aad5e60b27621141d3ff2b6682d90b'};
  for(const [path,sha] of Object.entries(owned))if(hash(readFileSync(join(ROOT,'projects/ngx-material-legacy',path)))!==sha)return null;
  const map=JSON.parse(readFileSync(join(context.packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs.map')));
  for(const path of ['legacy-tabs/tab.ts','legacy-tabs/internal/tab-token.ts']){const i=map.sources.findIndex(x=>x.endsWith('/'+path));if(i<0||hash(map.sourcesContent[i])!==owned[path])return null;}

  const bundle=join(dirname(dirname(file.fileName)),'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs');
  const bundleHash=hash(readFileSync(bundle));
  if(bundleHash!==(artifact===oldArtifact?B:'ab6891ffa20dfd036d6f5ff7d81925df754bed95fc0ca3953a04fec0e3c098ac'))return null;
  if(artifact===v7Artifact&&hash(readFileSync(join(ROOT,'scripts/api-tab-token-v7-evidence.json')))!=='269e9ac195aeb1282ad82da2011a2d1a143afa1913cda01d88173f7172e63b7a')return null;
  const peerRequire=createRequire(file.fileName);
  if(peerRequire('@angular/core/package.json').version!=='22.1.7'||peerRequire('@angular/material/package.json').version!=='22.1.7')return null;
  for(const [name,sha] of Object.entries(peers))if(peerImage(peerRequire,name)!==sha)return null;
  const options={strict:true,skipLibCheck:false,noEmit:true,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,target:ts.ScriptTarget.ES2022};
  const fixture=join(dirname(file.fileName),'__tab_token_contract__.ts');
  const text="import {MAT_LEGACY_TAB as legacy} from './ngx-compat-material-legacy-legacy-tabs'; import {MAT_TAB as modern} from '@angular/material/tabs'; import {InjectionToken} from '@angular/core'; const a: InjectionToken<any> = legacy; const b: typeof modern = legacy; const c: typeof legacy = modern; void [a,b,c];";
  const host=ts.createCompilerHost(options),original=host.getSourceFile.bind(host);
  host.getSourceFile=(name,...args)=>name===fixture?ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true):original(name,...args);
  const program=ts.createProgram([file.fileName,fixture],options,host);
  if(ts.getPreEmitDiagnostics(program).length)return null;
  const sources=closure(program,fixture); if(sources.length!==307||inputHarnessClosureFingerprint(sources)!=='f445d9c82890f13bb412f77e24605478ae6ca3e53766af0583e8a94f54a3d1f6')return null;
  const source=program.getSourceFile(file.fileName);if(!source||hash(source.text)!==D)return null;
  const checker=program.getTypeChecker(),module=checker.getSymbolAtLocation(source);
  const exported=checker.getExportsOfModule(module).filter(s=>s.name==='MAT_LEGACY_TAB');
  if(exported.length!==1||!(exported[0].flags&ts.SymbolFlags.Alias))return null;
  const token=checker.getAliasedSymbol(exported[0]),decl=token.valueDeclaration;
  if(token.name!=='MAT_TAB'||!decl||!ts.isVariableDeclaration(decl)||!decl.type||checker.typeToString(checker.getTypeAtLocation(decl))!=='InjectionToken<any>')return null;
  return {tarball_sha256:hash(archive),extracted_files:512,peer_images:peers,program_sources:sources.length,program_closure_sha256:inputHarnessClosureFingerprint(sources),declaration_sha256:D,bundle_sha256:bundleHash,typescript:ts.version,scope:'exact packed token declaration and independently executed provider identity receipt; intentional divergence from historical shared token'};
 }catch{return null;}
}
export function settleTabToken(symbol,file,signature,context){
 const proof=tabTokenProof(symbol,file,context);if(!proof)return signature;
 const expected=new Set([JSON.stringify(["token MAT_TAB 'MAT_TAB'",null]),JSON.stringify([null,'const MAT_LEGACY_TAB:InjectionToken<any>'])]);
 const rows=(signature.rows||[]).filter(r=>r.status==='mismatch'&&expected.has(JSON.stringify([r.historical,r.owned])));
 if(rows.length!==2||new Set(rows.map(r=>JSON.stringify([r.historical,r.owned]))).size!==2||signature.blocking.length!==2||!signature.blocking.includes("token MAT_TAB 'MAT_TAB'")||!signature.blocking.includes('const MAT_LEGACY_TAB:InjectionToken<any>'))return signature;
 return {...signature,blocking:[],rows:signature.rows.map(r=>rows.includes(r)?{...r,status:'intentional-legacy-difference',rationale:'The historical barrel shared the modern token. The owned tab exports and provides a deliberately distinct InjectionToken with the same description; the exact packed declaration and runtime are bound to the separately executed identity proof.',proof}:r),tab_token_proof:proof};
}
