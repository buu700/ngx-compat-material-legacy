/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Exact three-row, artifact-bound API qualification; new images require review.
 */
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {qualifyApiV8Archive as qualifyOldApiV8Archive} from './api-v8-artifact-successor.mjs';
import {qualifyApiHintIdArchive,API_HINT_ID_ARTIFACT_SHA,API_HINT_ID_FORM_BUNDLE_SHA,API_HINT_ID_FORM_MAP_SHA,API_HINT_ID_FORM_SOURCE_SHA} from './api-hint-id-artifact-successor.mjs';
const qualifyApiV8Archive = archive => qualifyOldApiV8Archive(archive) || qualifyApiHintIdArchive(archive);
import {readFileSync,existsSync,realpathSync,readdirSync,lstatSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {inputHarnessClosureFingerprint} from './api-input-harness-contract.mjs';
import {dirname,join,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const hash=x=>createHash('sha256').update(x).digest('hex');
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

const OLD='a488b8b42440baa553650766a5c4a969458e7add843ff5d500aeb20913c74fc2', V7='66449e62f2fe13232107cba6a7cdf744a67d941fe52987253546fbceb3bc35ca';
function strictDeclaration(ts,file,p,image){
 const texts={
  'legacy-paginator':"import {MatLegacyPaginator} from './ngx-compat-material-legacy-legacy-paginator'; abstract class P extends MatLegacyPaginator { test(e: MouseEvent): void { this._handlePageSizeTargetClick(e); } } void P;",
  'legacy-tabs':"import {_MatLegacyTabBodyBase} from './ngx-compat-material-legacy-legacy-tabs'; abstract class T extends _MatLegacyTabBodyBase { test(): boolean { super.ngAfterViewInit(); return this._contentIsVisible; } } void T;"};
 const options={strict:true,skipLibCheck:false,noEmit:true,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,target:ts.ScriptTarget.ES2022},fixture=join(dirname(file.fileName),'__contract__.ts'),host=ts.createCompilerHost(options),original=host.getSourceFile.bind(host);
 host.getSourceFile=(name,...args)=>name===fixture?ts.createSourceFile(name,texts[p.family],ts.ScriptTarget.Latest,true):original(name,...args);
 const program=ts.createProgram([file.fileName,fixture],options,host);if(ts.getPreEmitDiagnostics(program).length)return null;
 const sources=program.getSourceFiles().filter(f=>f.fileName!==fixture).map(f=>{const real=realpathSync(f.fileName);let dir=dirname(real);while(dir!==dirname(dir)&&!existsSync(join(dir,'package.json')))dir=dirname(dir);const pb=readFileSync(join(dir,'package.json')),pkg=JSON.parse(pb),path=relative(dir,real).split('\\').join('/'),bytes=readFileSync(real);if(!pkg.name||!pkg.version||!path||path.startsWith('../')||isAbsolute(path)||!bytes.equals(Buffer.from(f.text,'utf8')))throw Error('unbound source');return {package:pkg.name,version:pkg.version,package_sha256:hash(pb),path,bytes:bytes.length,sha256:hash(bytes)};});
 const expected=p.family==='legacy-tabs'?'f445d9c82890f13bb412f77e24605478ae6ca3e53766af0583e8a94f54a3d1f6':image===OLD?'bf8117fe8e8685ff6733c1fabfab995ab03f3206ca37c5754b3e0fa9f7d46805':'10fa39b3929b84428138697106da94aa203bade0912e4208faaa0ef23acc51a1';
 if(sources.length!==(p.family==='legacy-tabs'?307:331)||inputHarnessClosureFingerprint(sources)!==expected||program.getSourceFile(file.fileName)?.text!==file.text)return null;
 return {sources:sources.length,closure_sha256:expected,strict:true,skipLibCheck:false};
}
const profiles={
 'legacy-paginator/primary/MatLegacyPaginator':{signature:'fb88a43b8fb8b7fb28c3e3f025bc8a05ed78fd6aee74de53033ae4b6df411712',family:'legacy-paginator',name:'MatLegacyPaginator',cls:'MatLegacyPaginator',shape:'1a345b500d21a5b20509f593b266f6769f4194a2a80892f7cd3b3171cb8ea9e0',source:'legacy-paginator/paginator.ts',sourceHash:'4f050bc5f5818f13d33c7428bdd9d7a8a36b4bf70dbb77ac12e088002bbd9540',bundle:'7a153b0a728a95853e60b0e173fd5e30d3a9abd4cb527f4842f14d671bd674cc',map:'335863bcbab446a3006b219dd094f56b2fcd608d5a1bb87cf4f12f57025b74bc',dts:'471d2a6277533e6403b8c8c08551f07f3fbfad913a912c738807af5d93cf9157',rows:['protected method _handlePageSizeTargetClick(MouseEvent):void'],members:['_handlePageSizeTargetClick']},
 'legacy-tabs/primary/_MatLegacyTabBodyBase':{signature:'f784183bfb701242280fd04bcec5a7441e70fd2b99292d575164c4215285a3c3',family:'legacy-tabs',name:'_MatLegacyTabBodyBase',cls:'_MatTabBodyBase',shape:'268d599a614ac9a97fa7b055157924f2148fb360047fb0b9c35f181cf7dd2437',source:'legacy-tabs/internal/tab-body-base.ts',sourceHash:'15d4c2d2daa1aafce8f6b263f9e2423742c3221af56954c829eea1ed693ea926',bundle:'6da280036d123a97c111549e054ca67903c68600f1cc261424f39b356be763a1',map:'f434ca89fcd496f41f3edcc97a8f27dc5186580ef3d95d79527d1fe0e08690bc',dts:'1bfc9ca71821299ca40ecff4fe35faeabb18e2569a6d2e3d2fd13c9a9141b334',rows:['public method ngAfterViewInit():void','public get _contentIsVisible():boolean'],members:['ngAfterViewInit','_contentIsVisible']}
};
const refs={'legacy-paginator/public-api.ts':'f4dccc25f34458dc1a9896867b837892744418c4bec94e201c33bd77cc552889','legacy-paginator/paginator.ts':'4383049196f4a2b078e0d48c3cabce73b1b2c031023d348311a269f9eb31603f','legacy-tabs/public-api.ts':'f6a4dd305258afa9706c958c06f6260baec6258731f2fa9dba91667faa43b62c','tabs/tab-body.ts':'b8cae68f00521586ecf1b69d3bce277c3e1eeba35997b05b91223b1ffcbdfaf7'};
const owned={'legacy-tabs/public-api.ts':'6ed79724ae52eb970bbd081180257b7b1e31b442a1ed27bfb2bef48f78b20edd','legacy-tabs/tab-body.html':'c4d86c99bfeed0a10d6451e034ade808bfb52b4240471e1aef5ccd47e3f124f1','legacy-tabs/tab-body.scss':'7fedca13e121d806da356e39836d1abb3353c62a3a54745790c9cdaa50e07d5a','legacy-paginator/public-api.ts':'de4896e1ea794f2b0a9e4928e52343b13abb3ace1525e55b7ded779a94a0ce87','legacy-paginator/paginator.html':'3fc7b35a5dd392ac0f80fdc39583f9ae7426535c89ec3cce95008ed6052ff12d','legacy-paginator/paginator.scss':'6fe0290b49b259e2b13a7ed133abd77560efd56ffb7a9bdfa8e5a062ef3b131f'};
export function paginatorTabBodyProof(symbol,file,context){
 try{
  const ts=require('typescript'),p=profiles[symbol?.symbol_id];if(!p||symbol.family!==p.family||symbol.kind!=='primary'||symbol.name!==p.name||hash(JSON.stringify(symbol.shape))!==p.shape||process.versions.node!=='24.21.0'||ts.version!=='6.0.3'||!file?.fileName||!context?.tarball||!context?.packageRoot||!context?.referenceRoot)return null;
  if(hash(readFileSync(join(ROOT,'scripts/api-paginator-tabbody-evidence.json')))!=='f674dd6a96e055c7c1b0e74b8450faa781c62a67700fbc668174fdd8590b3ebc')return null;
  const evidence=JSON.parse(readFileSync(join(ROOT,'scripts/api-paginator-tabbody-evidence.json')));for(const [name,sha] of Object.entries(evidence.artifacts)){if(!/^[a-zA-Z0-9_.-]+$/.test(name)||hash(readFileSync(join(ROOT,'compatibility/rc/paginator-tabbody-evidence-v1',name)))!==sha)return null;}
  const tar=readFileSync(context.tarball),image=hash(tar),v8=qualifyApiV8Archive(tar),v7Profile=image===V7||v8;if((![OLD,V7].includes(image)&&!v8)||!exactExtractedImage(tar,context.packageRoot))return null;
  const tabMap=v8?'ce099ab085e59d48108c8259c7f4a576d6f50f4a11e6db4ebdd78d79a4a292c4':'45bfae6e4d4c7d48035347b2a43e65ea3256338f3d95382f8432059c1e272194';
  const dts=join(context.packageRoot,`types/ngx-compat-material-legacy-${p.family}.d.ts`),bundle=join(context.packageRoot,`fesm2022/ngx-compat-material-legacy-${p.family}.mjs`),mapfile=bundle+'.map';if(realpathSync(file.fileName)!==realpathSync(dts)||hash(file.text)!==p.dts||hash(readFileSync(dts))!==p.dts||hash(readFileSync(bundle))!==(v7Profile&&p.family==='legacy-tabs'?'ab6891ffa20dfd036d6f5ff7d81925df754bed95fc0ca3953a04fec0e3c098ac':p.bundle)||hash(readFileSync(mapfile))!==(v7Profile&&p.family==='legacy-tabs'?tabMap:p.map))return null;
  for(const [path,sha] of Object.entries(refs))if(hash(readFileSync(join(context.referenceRoot,path)))!==sha)return null;
  for(const [path,sha] of Object.entries(owned))if(hash(readFileSync(join(ROOT,'projects/ngx-material-legacy',path)))!==sha)return null;
  const source=readFileSync(join(ROOT,'projects/ngx-material-legacy',p.source));if(hash(source)!==p.sourceHash)return null;
  const map=JSON.parse(readFileSync(mapfile)),indexes=map.sources.flatMap((x,i)=>x.endsWith('/'+p.source)?[i]:[]);if(indexes.length!==1||hash(map.sourcesContent[indexes[0]])!==p.sourceHash)return null;
  const sf=ts.createSourceFile(bundle,readFileSync(bundle,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),classes=sf.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===p.cls);if(sf.parseDiagnostics.length||classes.length!==1)return null;const cls=classes[0];
  if(p.members.some(name=>cls.members.filter(m=>m.name?.getText(sf)===name).length!==1))return null;
  const exports=sf.statements.flatMap(n=>ts.isExportDeclaration(n)&&!n.moduleSpecifier&&n.exportClause&&ts.isNamedExports(n.exportClause)?[...n.exportClause.elements]:[]).filter(e=>e.name.text===p.name&&(e.propertyName||e.name).text===p.cls);if(exports.length!==1)return null;
  if(p.family==='legacy-paginator'&&!cls.members.find(m=>m.name?.getText(sf)==='ɵcmp')?.getText(sf).includes('"click": "_handlePageSizeTargetClick($event)"'))return null;
  const req=createRequire(bundle);for(const [name,expected] of Object.entries(peers))if(peerImage(req,name)!==expected)return null;
  const declaration=strictDeclaration(ts,file,p,image);if(!declaration)return null;
  return {artifact_sha256:image,source_sha256:p.sourceHash,bundle_sha256:hash(readFileSync(bundle)),declaration,dts_sha256:p.dts,shape_sha256:p.shape,proof:'exact image, tagged source, minimum-peer images and direct FESM AST export',evidence_sha256:'f674dd6a96e055c7c1b0e74b8450faa781c62a67700fbc668174fdd8590b3ebc'};
 }catch{return null;}
}
export function settlePaginatorTabBody(symbol,file,signature,context){
 const p=profiles[symbol?.symbol_id];if(!p||hash(JSON.stringify(signature))!==p.signature)return signature;const rows=signature.rows||[],selected=rows.filter(r=>r.status==='mismatch'&&r.historical===null&&p.rows.includes(r.owned));
 if(selected.length!==p.rows.length||new Set(selected.map(r=>r.owned)).size!==p.rows.length||signature.blocking?.length!==p.rows.length||p.rows.some(x=>!signature.blocking.includes(x)))return signature;
 const proof=paginatorTabBodyProof(symbol,file,context);if(!proof)return signature;
 return {...signature,blocking:[],rows:rows.map(r=>selected.includes(r)?{...r,status:'intentional-legacy-difference',rationale:'Exact reviewed owned behavior adds a subclass-visible member absent in Material 16; collision and super semantics and bounded native behavior are documented in the bound evidence. Other API, peer floors and browser matrices remain separate.',proof}:r),paginator_tabbody_proof:proof};
}
