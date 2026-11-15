/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Finite qualification of the reviewed native-disabled input repair.
 */
import {qualifyCombinedArtifactSubject} from './api-combined-d70-image.mjs';
import {createHash} from 'node:crypto';
import {qualifyApiV8Archive as qualifyOldApiV8Archive} from './api-v8-artifact-successor.mjs';
import {qualifyApiHintIdArchive,API_HINT_ID_ARTIFACT_SHA,API_HINT_ID_FORM_BUNDLE_SHA,API_HINT_ID_FORM_MAP_SHA,API_HINT_ID_FORM_SOURCE_SHA} from './api-hint-id-artifact-successor.mjs';

import {qualifyInputCombinedClosure} from './api-input-combined-closure-successor.mjs';
import {qualifyInputFirstCheckTransition,qualifyInputFirstCheckClosure,INPUT_FIRSTCHECK_SOURCE,INPUT_FIRSTCHECK_DTS,INPUT_FIRSTCHECK_CLOSURE,INPUT_FIRSTCHECK_COLLISION} from './api-input-firstcheck-f31-successor.mjs';
const qualifyApiV8Archive = archive => qualifyOldApiV8Archive(archive) || qualifyApiHintIdArchive(archive) || qualifyCombinedArtifactSubject(archive);
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {existsSync,readFileSync,realpathSync,readdirSync,lstatSync} from 'node:fs';
import {dirname,join,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inputHarnessClosureFingerprint} from './api-input-harness-contract.mjs';
const require=createRequire(import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex');
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const OLD='a488b8b42440baa553650766a5c4a969458e7add843ff5d500aeb20913c74fc2', NEW='66449e62f2fe13232107cba6a7cdf744a67d941fe52987253546fbceb3bc35ca';
const ROWS=['protected prop _legacyAriaDisabled:string|null','public method ngDoCheck():void','protected method _legacyReadonlyAttribute():string|null'];
const IMAGES={
 'types/ngx-compat-material-legacy-legacy-input.d.ts':'bb09da130738d54ec2e33a23c8323da3b5598ab4045917779681f98ceab640a7',
 'fesm2022/ngx-compat-material-legacy-legacy-input.mjs':'9d1ccb5328d4e8c430874b0547717bc57c8cc069d461e274e7a2f74f6cb573c1',
 'fesm2022/ngx-compat-material-legacy-legacy-input.mjs.map':'a909c2865fb75d36865ec0d60be37372d1329acf1376d3d109945b696151aa68',
};
const SOURCE='aaa55d58b06ef58c6dfca26053854696526e3529e7ed15ba3ef382ec323e8532';
const CLOSURES=Object.freeze({[OLD]:'20852ae05049bbe4ef6df9029ce3962bbbbd2a2ac726825ee37e3b7d78166547',[NEW]:'2647a33d15a914c6e9b3bbfddbb29cbac74892b5f053aba6dfb45840318ce914'});
function closure(program,virtual){
 return program.getSourceFiles().filter(f=>f.fileName!==virtual).map(file=>{
  const real=realpathSync(file.fileName);let dir=dirname(real);
  while(dir!==dirname(dir)&&!existsSync(join(dir,'package.json')))dir=dirname(dir);
  const packageBytes=readFileSync(join(dir,'package.json')),pkg=JSON.parse(packageBytes),path=relative(dir,real).split('\\').join('/'),bytes=readFileSync(real);
  if(!pkg.name||!pkg.version||!path||path.startsWith('../')||isAbsolute(path)||!bytes.equals(Buffer.from(file.text,'utf8')))throw Error('unbound input program source');
  return {package:pkg.name,version:pkg.version,package_sha256:sha(packageBytes),path,bytes:bytes.length,sha256:sha(bytes)};
 });
}
function publicMember(ts,symbol){return Boolean(symbol?.declarations?.length)&&symbol.declarations.every(d=>!(ts.getCombinedModifierFlags(d)&(ts.ModifierFlags.Private|ts.ModifierFlags.Protected))&&!ts.getJSDocTags(d).some(t=>['deprecated','docs-private','experimental'].includes(t.tagName.text)));}
// This is deliberately restricted to the already rehashed 512-file archive.
// Compare the entire extracted image, not only the attractive input files.
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
/** Rehash the actual archive and compare its input images to the extracted package. */
export function inputDisabledProof(symbol,sourceFile,context){
 try{
  if(symbol?.symbol_id!=='legacy-input/primary/MatLegacyInput'||symbol.family!=='legacy-input'||symbol.kind!=='primary'||symbol.name!=='MatLegacyInput'||!sourceFile?.fileName||!context?.tarball||!context?.packageRoot||!context?.referenceRoot)return null;
  const archive=readFileSync(context.tarball);
  const TAR=sha(archive),combined=qualifyCombinedArtifactSubject(archive,context.packageRoot),v8=qualifyApiV8Archive(archive);if((![OLD,NEW].includes(TAR)&&!v8)||sha(readFileSync(join(ROOT,'compatibility/rc/parent-main-native-disabled-input-repair-v1.json')))!=='837337ed99743946ccecffd57fd4453a0455694ed8235f882bf9b62e4f201d9e')return null;
  if(!exactExtractedImage(archive,context.packageRoot))return null;
  const firstcheck=combined?.profile==='combined-input-firstcheck'?qualifyInputFirstCheckTransition(context.packageRoot,combined):null;
  if(combined?.profile==='combined-input-firstcheck'&&!firstcheck)return null;
  const expectedSource=firstcheck?INPUT_FIRSTCHECK_SOURCE:SOURCE,expectedDts=firstcheck?INPUT_FIRSTCHECK_DTS:IMAGES[Object.keys(IMAGES)[0]];
  if(realpathSync(sourceFile.fileName)!==realpathSync(join(context.packageRoot,Object.keys(IMAGES)[0]))||sha(sourceFile.text)!==expectedDts)return null;
  if(sha(readFileSync(join(ROOT,'projects/ngx-material-legacy/legacy-input/input.ts')))!==expectedSource||sha(readFileSync(join(context.referenceRoot,'legacy-input/input.ts')))!=='cd42800ed6494be21256031f724f8059894be709ffa798bcf97103a7bcd90b90'||sha(readFileSync(join(context.referenceRoot,'input/input.ts')))!=='42b930c769cf58cdaf03e76f58ac7d6a2837cc63a56905ade099a9ac1646a116')return null;
  const map=JSON.parse(readFileSync(join(context.packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-input.mjs.map'),'utf8'));
  if(!map.sourcesContent?.some(s=>typeof s==='string'&&sha(s)===expectedSource))return null;
  if(sha(JSON.stringify(symbol.shape))!=='7bdd174df430876726634e53250bb1482ad7a5c0df78cd069afd520dd6a9aac5'
   ||!symbol.shape.signatures.includes('public method ngDoCheck():*')||(symbol.shape.ownSignatures||[]).some(x=>ROWS.includes(x))||symbol.shape.ownConstructor!==false)return null;
  const ts=require('typescript'),workspace=JSON.parse(readFileSync(join(ROOT,'package.json'))),policy=JSON.parse(readFileSync(join(ROOT,'projects/ngx-material-legacy/package.json'))),toolchain=JSON.parse(readFileSync(join(ROOT,'toolchain-lock.json')));
  if(process.versions.node!=='24.21.0'||toolchain.repository?.node!=='24.21.0'||ts.version!=='6.0.3'||workspace.devDependencies?.typescript!=='6.0.3'||workspace.devDependencies?.['@angular/material']!=='22.1.7'||workspace.devDependencies?.['@angular/cdk']!=='22.1.7'||policy.peerDependencies?.['@angular/material']!=='^22.1.7'||policy.peerDependencies?.['@angular/cdk']!=='^22.1.7')return null;
  const virtual=join(dirname(sourceFile.fileName),'input-api-strict-consumer.ts');
  const text=`import {MatLegacyInput} from './ngx-compat-material-legacy-legacy-input';\nimport {MatInput} from '@angular/material/input';\nclass Child extends MatLegacyInput { override ngDoCheck(): void { super.ngDoCheck(); } }\nconst takesParent = (x: MatInput): void => {}; declare const child: Child; takesParent(child); child.ngDoCheck();`;
  const options={strict:true,skipLibCheck:false,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,noImplicitOverride:true};
  const host=ts.createCompilerHost(options),get=host.getSourceFile.bind(host),exists=host.fileExists.bind(host),read=host.readFile.bind(host);
  host.fileExists=f=>f===virtual||exists(f);host.readFile=f=>f===virtual?text:read(f);host.getSourceFile=(f,v,...args)=>f===virtual?ts.createSourceFile(f,text,v,true):get(f,v,...args);
  const program=ts.createProgram([virtual],options,host);if(ts.getPreEmitDiagnostics(program).length)return null;
  const sources=closure(program,virtual),CLOSURE=firstcheck?INPUT_FIRSTCHECK_CLOSURE:combined?'8c8759feed634fa8a08f3d73b9b7f49604f74d4c412d063c9db2aeefc3ccffa5':CLOSURES[v8?NEW:TAR];if(sources.length!==312||(firstcheck?!qualifyInputFirstCheckClosure(sources):combined?!qualifyInputCombinedClosure(sources):inputHarnessClosureFingerprint(sources)!==CLOSURE))return null;
  const checker=program.getTypeChecker(),file=program.getSourceFile(sourceFile.fileName),cls=file?.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyInput');
  const base=cls?.heritageClauses?.flatMap(h=>[...h.types]);if(base?.length!==1||!ts.isIdentifier(base[0].expression))return null;
  const alias=checker.getSymbolAtLocation(base[0].expression),parent=alias&&(alias.flags&ts.SymbolFlags.Alias)&&checker.getAliasedSymbol(alias);
  const resolved=ts.resolveModuleName('@angular/material/input',sourceFile.fileName,options,ts.sys).resolvedModule,entry=resolved&&program.getSourceFile(resolved.resolvedFileName),module=entry&&checker.getSymbolAtLocation(entry),exported=module&&checker.getExportsOfModule(module).find(s=>s.name==='MatInput');
  const actual=exported&&(exported.flags&ts.SymbolFlags.Alias?checker.getAliasedSymbol(exported):exported);
  if(!parent||parent!==actual||parent.name!=='MatInput'||!publicMember(ts,parent)||!parent.valueDeclaration||!ts.isClassDeclaration(parent.valueDeclaration)||sha(readFileSync(parent.valueDeclaration.getSourceFile().fileName))!=='c8296ff40d11e880ee665e999fa73a2065e9c4e20e46b53f780af8f8d20499a1')return null;
  const type=checker.getDeclaredTypeOfSymbol(parent),method=type.getProperty('ngDoCheck'),disabled=type.getProperty('disabledInteractive');
  if(!publicMember(ts,method)||!publicMember(ts,disabled)||checker.typeToString(checker.getTypeOfSymbolAtLocation(disabled,cls))!=='boolean')return null;
  const calls=checker.getSignaturesOfType(checker.getTypeOfSymbolAtLocation(method,cls),ts.SignatureKind.Call);
  if(calls.length!==1||calls[0].parameters.length||calls[0].typeParameters?.length||checker.typeToString(calls[0].getReturnType())!=='void')return null;
  return {...(firstcheck?{firstcheck_transition:firstcheck}:{}),artifact_sha256:TAR,owned_source_sha256:expectedSource,peer:'@angular/material/input:MatInput@22.1.7',strict_skip_lib_check:false,program_sources:sources.length,program_closure_sha256:CLOSURE,historical_lifecycle:'public inherited ngDoCheck():void',collision_risk:firstcheck?INPUT_FIRSTCHECK_COLLISION:'Exact protected helper additions can break subclasses declaring incompatible private members; accepted only for these two names and types.',behavior_evidence:'compatibility/rc/parent-main-native-disabled-input-repair-v1.json',limits:'No full API, peer-range, SSR hydration, subclass or release qualification.'};
 }catch{return null;}
}
/** Settle only these three extra rows after the complete finite proof. */
export function settleInputDisabled(symbol,sourceFile,signature,context){
 const selected=(signature.rows||[]).filter(r=>r.status==='mismatch'&&r.historical===null&&ROWS.includes(r.owned));
 if(selected.length!==3||new Set(selected.map(r=>r.owned)).size!==3||!ROWS.every(s=>signature.blocking.includes(s)))return signature;
 const proof=inputDisabledProof(symbol,sourceFile,context);if(!proof)return signature;
 return {...signature,blocking:signature.blocking.filter(x=>!ROWS.includes(x)),rows:signature.rows.map(r=>selected.includes(r)?{...r,status:'intentional-legacy-difference',rationale:r.owned===ROWS[1]?'The same public zero-argument lifecycle was inherited from the authenticated historical parent; the owned override and parent call are bound to the reviewed source and artifact.':'Exact protected helper is an accepted owned addition with a demonstrated same-name subclass collision risk; AOT and native behavior evidence is bound to the reviewed source and artifact.',proof}:r),input_disabled_proof:proof};
}
