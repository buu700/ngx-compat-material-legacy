/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact minimum declaration/type diagnostic; no installed/runtime/packed gate credit. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {deriveSurface} from '../scripts/api-surface.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),options={};
for(let i=2;i<process.argv.length;i+=2){
 const key=process.argv[i],value=process.argv[i+1];
 assert.ok(['--minimum-root','--identities','--compiler-root','--reference-root','--peer-root','--report'].includes(key)&&value,'unknown/incomplete diagnostic option');
 assert.ok(!Object.hasOwn(options,key),'duplicate diagnostic option');options[key]=path.resolve(value);
}
for(const name of ['--minimum-root','--identities','--compiler-root','--reference-root','--peer-root','--report'])assert.ok(options[name],name+' required');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=path.join(root,'projects/ngx-material-legacy'),manifest=JSON.parse(fs.readFileSync(path.join(source,'package.json'))),line=manifest.version.startsWith('22.')?'main':manifest.version.startsWith('21.')?'21.x':null;
assert.ok(line);const plan=JSON.parse(fs.readFileSync(path.join(root,'compatibility/rc/consumer-floor-plan.json'))),compilerRoot=options['--compiler-root'],minimum=options['--minimum-root'],borrowed=options['--peer-root'];
const compilerManifest=JSON.parse(fs.readFileSync(path.join(compilerRoot,'package.json')));
assert.equal(compilerManifest.name,'typescript');assert.equal(compilerManifest.version,plan.lines[line].typescript_minimum);
const compilerSources={'5.9.2':'e5f1f6b3e82228a89873cc7b941b2465185e839c0692860f83e3e63e53f94c2b','6.0.2':'630f808ac32d968a49a392c42cc06fd72abd939aaa7edfe3302810c067934653'};
assert.equal(sha(fs.readFileSync(path.join(compilerRoot,'lib/typescript.js'))),compilerSources[compilerManifest.version],'pinned compiler source differs');
const ts=require(path.join(compilerRoot,'lib/typescript.js'));assert.equal(ts.version,compilerManifest.version);
const borrowedRequire=createRequire(path.join(borrowed,'package.json')),rxjsFile=borrowedRequire.resolve('rxjs/package.json'),rxjsBytes=fs.readFileSync(rxjsFile),rxjsManifest=JSON.parse(rxjsBytes);
assert.equal(rxjsManifest.version,plan.current_configuration.rxjs,'borrowed RxJS diagnostic dependency differs');
const identitiesBytes=fs.readFileSync(options['--identities']),identities=JSON.parse(identitiesBytes)[line].packages;
const packages=new Map(),publicLookups=new Map(),missing=new Set(),sourceCaps=new Map(),loadedMembers=new Map();
const memberIndexes=new Map(identities.map(p=>[p.package,new Map(p.sources.map(s=>[s.path,s]))]));
function authenticate(file){
 const relative=path.relative(minimum,file).replaceAll('\\','/');
 if(relative==='..'||relative.startsWith('../')||path.isAbsolute(relative))return;
 const parts=relative.split('/'),pkg=parts.slice(0,2).join('/'),member=parts.slice(2).join('/'),expected=memberIndexes.get(pkg)?.get(member),bytes=fs.readFileSync(file);
 assert.ok(expected,'unauthenticated minimum declaration member: '+relative);assert.equal(sha(bytes),expected.sha256,relative);assert.equal(bytes.length,expected.bytes,relative);
 loadedMembers.set(relative,{path:relative,sha256:sha(bytes),bytes:bytes.length});
}
const surface=deriveSurface(options['--reference-root']),entries=[...new Set(surface.symbols.map(s=>s.family+(s.kind==='testing'?'/testing':'')))].sort();
assert.equal(surface.symbols.length,449);
const config=JSON.parse(fs.readFileSync(path.join(source,'tsconfig.lib.json'))),converted=ts.convertCompilerOptionsFromJson(config.compilerOptions,source);assert.equal(converted.errors.length,0);
const compilerOptions={...converted.options,noEmit:true,paths:{'@ngx-compat/material-legacy/*':[path.join(source,'*/public-api.ts')]}};
const consumer=path.join(root,'minimum-cyph-input-diagnostic.ts');
const consumerText="import {MatLegacyInput} from './projects/ngx-material-legacy/legacy-input/input';\ndeclare const input: MatLegacyInput;\ninput.focus();\n";
// This read-only type snippet mirrors Cyph's actual ViewChild.focus() usage.
// It never replaces or compiles the consumer repository's source.
function compile(overrides=new Map()){
 const host=ts.createCompilerHost(compilerOptions),originalRead=host.readFile.bind(host),originalExists=host.fileExists.bind(host);
 host.fileExists=file=>file===consumer||originalExists(file);
 host.readFile=file=>{
  if(file===consumer)return consumerText;
  const text=originalRead(file);if(text===undefined)return text;
  if(file.startsWith(minimum+path.sep))authenticate(file);
  if(file.startsWith(source+path.sep))sourceCaps.set(path.relative(root,file).replaceAll('\\','/'),sha(Buffer.from(text)));
  return overrides.has(file)?overrides.get(file):text;
 };
 host.resolveModuleNames=(names,containing)=>names.map(spec=>{
  if(spec.startsWith('@angular/')){
   const parts=spec.split('/'),name=parts.slice(0,2).join('/'),directory=path.join(minimum,name),packageFile=path.join(directory,'package.json'),sub=parts.length===2?'.':'./'+parts.slice(2).join('/');
   if(!fs.existsSync(packageFile)){missing.add(spec);return undefined;}authenticate(packageFile);
   const pkg=JSON.parse(fs.readFileSync(packageFile));assert.equal(pkg.version,manifest.peerDependencies[name]?.slice(1),'minimum package version differs: '+name);
   packages.set(name,{version:pkg.version,path:path.relative(minimum,packageFile),sha256:sha(fs.readFileSync(packageFile))});
   const types=pkg.exports?.[sub]?.types;if(typeof types!=='string'||!fs.existsSync(path.join(directory,types))){missing.add(spec);return undefined;}
   const resolved=ts.resolveModuleName(path.join(directory,types),containing,compilerOptions,ts.sys).resolvedModule;publicLookups.set(spec,resolved?.resolvedFileName);
   return resolved?{...resolved,isExternalLibraryImport:true,resolvedUsingTsExtension:false}:undefined;
  }
  return ts.resolveModuleName(spec,spec.startsWith('.')||spec.startsWith('@ngx-compat/')?containing:path.join(borrowed,'diagnostic-anchor.ts'),compilerOptions,ts.sys).resolvedModule;
 });
 const program=ts.createProgram({rootNames:[...entries.map(e=>path.join(source,e,'public-api.ts')),consumer],options:compilerOptions,host});
 return {program,diagnostics:ts.getPreEmitDiagnostics(program)};
}
const positive=compile();assert.equal(missing.size,0,'missing public minimum dependency routes');assert.equal(packages.size,6);
assert.deepEqual([...packages.keys()].sort(),Object.keys(manifest.peerDependencies).filter(n=>n.startsWith('@angular/')).sort());
if(positive.diagnostics.length)console.error(ts.formatDiagnosticsWithColorAndContext(positive.diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:x=>x,getNewLine:()=>'\n'}));
assert.equal(positive.diagnostics.length,0,'exact minimum declaration compilation failed');
const inputFile=publicLookups.get('@angular/material/input');assert.ok(inputFile);
const inputText=fs.readFileSync(inputFile,'utf8'),parsed=ts.createSourceFile(inputFile,inputText,ts.ScriptTarget.Latest,true),input=parsed.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatInput');assert.ok(input);
const controls=[];
for(const [id,memberName,replace]of [
 ['missing-protected-placeholder-override','_getPlaceholder',text=>text.replace('_getPlaceholder','_missingPlaceholder')],
 ['private-public-parent-constructor',null,text=>'private '+text],
 ['cyph-focus-call-requires-wrong-argument','focus',()=> 'focus(required: number): void;'],
]){
 const members=input.members.filter(n=>memberName?n.name?.getText(parsed)===memberName:ts.isConstructorDeclaration(n));assert.equal(members.length,1);
 const node=members[0],changed=inputText.slice(0,node.getStart(parsed))+replace(node.getText(parsed))+inputText.slice(node.end),negative=compile(new Map([[inputFile,changed]]));
 assert.ok(negative.diagnostics.length,'minimum type mutation was not rejected: '+id);
 assert.equal(negative.diagnostics.length,1,'type control failed outside its intended boundary: '+id);
 const diagnostic=negative.diagnostics[0],expectedCode=id.startsWith('missing-')?[4113,4117]:[id.startsWith('private-')?2675:2554];
 assert.ok(expectedCode.includes(diagnostic.code),'unexpected type-control failure: '+id);
 assert.equal(diagnostic.file?.fileName,id.startsWith('cyph-')?consumer:path.join(source,'legacy-input/input.ts'));
 controls.push({id,result:'rejected',diagnostics:negative.diagnostics.map(d=>({code:d.code,file:d.file?path.relative(root,d.file.fileName):null,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')}))});
}
const report={schema_version:1,role:'Complete library/testing source and actual Cyph focus type snippet against authenticated minimum declarations/TypeScript; no runtime/Angular compiler/packed/floor gate credit',line,node:process.version,typescript:ts.version,
 compiler_package_sha256:sha(fs.readFileSync(path.join(compilerRoot,'package.json'))),compiler_source_sha256:sha(fs.readFileSync(path.join(compilerRoot,'lib/typescript.js'))),
 peer_identity_sha256:sha(identitiesBytes),packages:Object.fromEntries(packages),public_lookups:Object.fromEntries([...publicLookups].map(([k,v])=>[k,path.relative(minimum,v)])),
 loaded_declarations:[...loadedMembers.values()].sort((a,b)=>a.path.localeCompare(b.path)),source_caps:[...sourceCaps].map(([file,digest])=>({path:file,sha256:digest})).sort((a,b)=>a.path.localeCompare(b.path)),entries,
 source_files:positive.program.getSourceFiles().filter(f=>f.fileName.startsWith(source+path.sep)).length,diagnostics:0,missing_public_lookups:[],controls,borrowed_rxjs:{version:rxjsManifest.version,package_json_sha256:sha(rxjsBytes)},unexecuted:['Angular compiler/runtime','packed consumer','advertised Node/RxJS minimum matrix','full Cyph build','G02/G11/G12']};
fs.writeFileSync(options['--report'],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({line,typescript:ts.version,source_files:report.source_files,public_lookups:publicLookups.size,loaded_minimum_members:loadedMembers.size,diagnostics:0,controls:controls.length}));
