/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Finite tagged/packed minimum-peer menu harness filter qualification.
 */
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,realpathSync} from 'node:fs';
import {dirname,join,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),root=join(dirname(fileURLToPath(import.meta.url)),'..');
const hash=x=>createHash('sha256').update(x).digest('hex');
export const MENU_HARNESS='legacy-menu/testing/MatLegacyMenuHarness';
const historic='public static method with(MenuHarnessFilters?):HarnessPredicate<MatLegacyMenuHarness>';
const candidate='public static method with(LegacyMenuHarnessFilters?):HarnessPredicate<MatLegacyMenuHarness>';
function imported(ts,file,spec,name){return file.statements.some(s=>ts.isImportDeclaration(s)&&s.moduleSpecifier.text===spec&&s.importClause?.namedBindings&&ts.isNamedImports(s.importClause.namedBindings)&&s.importClause.namedBindings.elements.some(e=>e.name.text===name&&(e.propertyName||e.name).text===name));}
/** Read exact original Material source and CDK source from the immutable tag. */
export function historicalMenuFilter(refRoot){
 try{
  const ts=require('typescript'),material=readFileSync(join(refRoot,'menu/testing/menu-harness-filters.ts'));
  const git=spawnSync('git',['show','baseline/angular-components-16.2.x:src/cdk/testing/component-harness.ts'],{cwd:root,maxBuffer:1024*1024});
  if(git.status!==0||hash(material)!=='9b799443a20417a4674fd29e7beeb005816f2ba16a90fbd0ece32e35c1f29e2f'||hash(git.stdout)!=='c768f36e3a06291f05dccbd9411b280097024883bab46aafe1ef145df3f57767')return null;
  const m=ts.createSourceFile('material.ts',material.toString(),ts.ScriptTarget.Latest,true),c=ts.createSourceFile('cdk.ts',git.stdout.toString(),ts.ScriptTarget.Latest,true);
  const mi=m.statements.find(n=>ts.isInterfaceDeclaration(n)&&n.name.text==='MenuHarnessFilters'),ci=c.statements.find(n=>ts.isInterfaceDeclaration(n)&&n.name.text==='BaseHarnessFilters');
  if(!mi||!ci||!imported(ts,m,'@angular/cdk/testing','BaseHarnessFilters')||mi.heritageClauses?.length!==1||mi.heritageClauses[0].types.length!==1||mi.heritageClauses[0].types[0].getText(m)!=='BaseHarnessFilters')return null;
  const members=(n,file)=>n.members.map(x=>ts.isPropertySignature(x)&&x.questionToken&&!x.modifiers?.length?`${x.name.getText(file)}?:${x.type?.getText(file).replace(/\s/g,'')}`:'invalid').sort();
  if(JSON.stringify(members(mi,m))!==JSON.stringify(['triggerText?:string|RegExp'])||JSON.stringify(members(ci,c))!==JSON.stringify(['ancestor?:string','selector?:string']))return null;
  return {tag:'baseline/angular-components-16.2.x',material_source_sha256:hash(material),cdk_source_sha256:hash(git.stdout),historical_fields:['selector?:string','ancestor?:string','triggerText?:string|RegExp']};
 }catch{return null;}
}
function closure(program){return program.getSourceFiles().map(file=>{
 const real=realpathSync(file.fileName);let dir=dirname(real);while(dir!==dirname(dir)&&!existsSync(join(dir,'package.json')))dir=dirname(dir);
 const meta=readFileSync(join(dir,'package.json')),pkg=JSON.parse(meta),path=relative(dir,real).split('\\').join('/'),bytes=readFileSync(real);
 if(!pkg.name||!pkg.version||!path||path==='..'||path.startsWith('../')||isAbsolute(path)||!bytes.equals(Buffer.from(file.text,'utf8')))throw Error('unbound source');
 return {package:pkg.name,version:pkg.version,package_sha256:hash(meta),path,bytes:bytes.length,sha256:hash(bytes)};
});}
export function menuHarnessClosureFingerprint(rows){const keys=rows.map(r=>[r.package,r.version,r.path].join('\0'));if(new Set(keys).size!==keys.length)throw Error('duplicate path');return hash(rows.map(x=>JSON.stringify(x)).sort().join('\n'));}
export function menuHarnessProof(symbol,file,{transformSource}={}){
 try{
  if(symbol.symbol_id!==MENU_HARNESS||!symbol.shape.historicalMenuFilter||!symbol.shape.signatures.includes(historic))return null;
  const ts=require('typescript'),policy=JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'),'utf8')).peerDependencies,workspace=JSON.parse(readFileSync(join(root,'package.json'),'utf8')),toolchain=JSON.parse(readFileSync(join(root,'toolchain-lock.json'),'utf8'));
  if(ts.version!=='6.0.3'||process.versions.node!=='24.21.0'||toolchain.repository?.node!=='24.21.0'||workspace.devDependencies?.typescript!=='6.0.3'||workspace.devDependencies?.['@angular/cdk']!=='22.1.7'||workspace.devDependencies?.['@angular/material']!=='22.1.7'||policy?.['@angular/cdk']!=='^22.1.7'||policy?.['@angular/material']!=='^22.1.7'||hash(file.text)!=='2213bf2fc21b9c8509f896b7afe4837100622380d8abf2c596feda886dee0353')return null;
  const options={strict:true,skipLibCheck:false,noEmit:true,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,target:ts.ScriptTarget.ES2022},host=ts.createCompilerHost(options),old=host.getSourceFile.bind(host),name=file.fileName;
  host.getSourceFile=(path,...args)=>{
   const source=path===name?file:old(path,...args);if(!source||!transformSource)return source;
   const text=transformSource(path,source.text);return text===source.text?source:ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  };
  const program=ts.createProgram([name],options,host);if(ts.getPreEmitDiagnostics(program).length)return null;
  const sources=closure(program),digest=menuHarnessClosureFingerprint(sources);if(sources.length!==67||digest!=='5400eff89a4c2a744d9218f272d48bb92f467b92821dedc2c63f1a39dcdcd99a')return null;
  const checker=program.getTypeChecker(),actual=program.getSourceFile(name),cls=actual.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyMenuHarness'),filter=actual.statements.find(n=>ts.isInterfaceDeclaration(n)&&n.name.text==='LegacyMenuHarnessFilters');
  if(!cls||!filter||!imported(ts,actual,'@angular/cdk/testing','BaseHarnessFilters')||!imported(ts,actual,'@angular/cdk/testing','HarnessPredicate'))return null;
  const exports=actual.statements.flatMap(s=>ts.isExportDeclaration(s)&&!s.moduleSpecifier&&s.exportClause&&ts.isNamedExports(s.exportClause)?[...s.exportClause.elements]:[]);
  if(!['MatLegacyMenuHarness','LegacyMenuHarnessFilters'].every(id=>exports.filter(e=>e.name.text===id&&(e.propertyName||e.name).text===id).length===1))return null;
  const heritage=filter.heritageClauses?.flatMap(x=>[...x.types]);if(heritage?.length!==1||heritage[0].getText(actual)!=='BaseHarnessFilters')return null;
  const publicTargets=new Map();
  for(const [spec,ids] of [
   ['@angular/cdk/testing',['BaseHarnessFilters','HarnessPredicate','ComponentHarness','ComponentHarnessConstructor','ContentContainerComponentHarness','HarnessLoader']],
   ['@angular/material/menu/testing',['MenuItemHarnessFilters']],
  ]){
   const imports=actual.statements.flatMap(s=>ts.isImportDeclaration(s)&&s.moduleSpecifier.text===spec&&s.importClause?.namedBindings&&ts.isNamedImports(s.importClause.namedBindings)?[...s.importClause.namedBindings.elements]:[]);
   const resolved=ts.resolveModuleName(spec,name,options,ts.sys).resolvedModule,entry=resolved&&program.getSourceFile(resolved.resolvedFileName),module=entry&&checker.getSymbolAtLocation(entry);
   for(const id of ids){
    const binding=imports.find(e=>e.name.text===id&&(e.propertyName||e.name).text===id),alias=binding&&checker.getSymbolAtLocation(binding.name),target=alias&&checker.getAliasedSymbol(alias),exported=module&&checker.getExportsOfModule(module).find(x=>x.name===id),publicTarget=exported&&(exported.flags&ts.SymbolFlags.Alias?checker.getAliasedSymbol(exported):exported);
    if(!target||target!==publicTarget||!target.declarations?.length||!exported.declarations?.length||[...target.declarations,...exported.declarations].some(d=>(ts.getCombinedModifierFlags(d)&(ts.ModifierFlags.Private|ts.ModifierFlags.Protected))||ts.getJSDocTags(d).some(t=>['deprecated','docs-private','experimental'].includes(t.tagName.text))))return null;
    publicTargets.set(id,target);
   }
  }
  const predicate=publicTargets.get('HarnessPredicate'),predicateDecl=predicate.valueDeclaration,params=predicateDecl?.typeParameters;
  if(!predicateDecl||!ts.isClassDeclaration(predicateDecl)||params?.length!==1||params[0].default||params[0].modifiers?.length||!params[0].constraint||checker.getTypeAtLocation(params[0].constraint).symbol!==publicTargets.get('ComponentHarness'))return null;
  const members=checker.getTypeAtLocation(filter).getProperties(),expected={selector:'string | undefined',ancestor:'string | undefined',triggerText:'string | RegExp | undefined'};
  if(members.length!==3)return null;
  for(const [key,type] of Object.entries(expected)){const field=members.find(x=>x.name===key);if(!field||!(field.flags&ts.SymbolFlags.Optional)||!field.declarations?.every(d=>ts.isPropertySignature(d)&&!(ts.getCombinedModifierFlags(d)&ts.ModifierFlags.Readonly)&&!ts.getJSDocTags(d).some(t=>['deprecated','docs-private','experimental'].includes(t.tagName.text)))||checker.typeToString(checker.getTypeOfSymbolAtLocation(field,filter))!==type)return null;}
  const withMethod=cls.members.filter(m=>ts.isMethodDeclaration(m)&&m.name?.getText(actual)==='with'&&m.modifiers?.some(x=>x.kind===ts.SyntaxKind.StaticKeyword));
  if(withMethod.length!==1||withMethod[0].typeParameters?.length||withMethod[0].parameters.length!==1||!withMethod[0].parameters[0].questionToken||withMethod[0].parameters[0].type?.getText(actual)!=='LegacyMenuHarnessFilters'||withMethod[0].type?.getText(actual)!=='HarnessPredicate<MatLegacyMenuHarness>')return null;
  const returnType=checker.getTypeAtLocation(withMethod[0].type),args=checker.getTypeArguments(returnType);
  if(returnType.symbol!==predicate||args.length!==1||args[0].symbol!==checker.getSymbolAtLocation(cls.name))return null;
  return {role:'finite tagged filter and minimum-peer public declaration proof; transitive declaration chunks are not private imports',historical:symbol.shape.historicalMenuFilter,typescript_version:ts.version,peer_version:'22.1.7',candidate_sha256:hash(file.text),program_closure_sha256:digest,program_sources:sources};
 }catch{return null;}
}
export function settleMenuHarness(symbol,file,signature){
 const proof=menuHarnessProof(symbol,file);if(!proof)return signature;
 const wanted=new Set([JSON.stringify([historic,null]),JSON.stringify([null,candidate])]),rows=(signature.rows||[]).filter(r=>r.status==='mismatch'&&wanted.has(JSON.stringify([r.historical,r.owned])));
 if(rows.length!==2||new Set(rows.map(r=>JSON.stringify([r.historical,r.owned]))).size!==2)return signature;
 return {...signature,blocking:signature.blocking.filter(x=>x!==historic&&x!==candidate),rows:signature.rows.map(r=>rows.includes(r)?{...r,status:'intentional-legacy-difference',rationale:'Tagged menu filter fields and packed minimum-peer public filter binding are qualified against exact reviewed images; runtime remains separate.',proof}:r),menu_harness_proof:proof};
}
