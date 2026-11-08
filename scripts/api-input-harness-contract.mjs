/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Narrow declaration proof for the legacy input harness's public parent.
 */
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,realpathSync} from 'node:fs';
import {dirname,join,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const METHODS=Object.freeze({blur:['void',[]],focus:['void',[]],getId:['string',[]],getName:['string',[]],getPlaceholder:['string',[]],getType:['string',[]],getValue:['string',[]],isFocused:['boolean',[]],isReadonly:['boolean',[]],isRequired:['boolean',[]],setValue:['void',['string']]});
export const INPUT_HARNESS='legacy-input/testing/MatLegacyInputHarness';
/** Deterministic package-relative path-to-bytes identity; duplicate keys fail. */
export function inputHarnessClosureFingerprint(rows){
 const keys=rows.map(r=>[r.package,r.version,r.path].join('\0'));
 if(new Set(keys).size!==keys.length)throw Error('duplicate closure package path');
 return createHash('sha256').update(rows.map(r=>JSON.stringify(r)).sort().join('\n')).digest('hex');
}
function programClosure(program){
 return program.getSourceFiles().map(file=>{
  const real=realpathSync(file.fileName);let dir=dirname(real);
  while(dir!==dirname(dir)&&!existsSync(join(dir,'package.json')))dir=dirname(dir);
  const packageBytes=readFileSync(join(dir,'package.json')),pkg=JSON.parse(packageBytes),path=relative(dir,real).split('\\').join('/');
  if(!pkg.name||!pkg.version||!path||path.startsWith('../')||isAbsolute(path))throw Error('unbound closure source');
  const bytes=readFileSync(real);
  if(!bytes.equals(Buffer.from(file.text,'utf8')))throw Error('source byte mismatch');
  return {package:pkg.name,version:pkg.version,package_sha256:createHash('sha256').update(packageBytes).digest('hex'),path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 });
}
const oldStatic='public static method with(InputHarnessFilters?):HarnessPredicate<MatInputHarness>';
const newStatic='public static method with(InputHarnessFilters?):HarnessPredicate<MatLegacyInputHarness>';
const oldMethods=Object.entries(METHODS).map(([name,[result,params]])=>`public method ${name}(${params.join(',')}):Promise<${result}>`);
function publicImport(ts,file,local,original,spec){
 return file.statements.some(s=>ts.isImportDeclaration(s)&&s.moduleSpecifier.text===spec&&s.importClause?.namedBindings&&ts.isNamedImports(s.importClause.namedBindings)&&
  s.importClause.namedBindings.elements.some(e=>e.name.text===local&&(e.propertyName||e.name).text===original));
}
/** No private imports: resolve the public Material entry with the compiler. */
export function inputHarnessProof(symbol,sourceFile,{transformSource}={}){
 try{
  if(symbol.symbol_id!==INPUT_HARNESS||!sourceFile?.fileName||!oldMethods.every(x=>symbol.shape.signatures.includes(x))||!symbol.shape.signatures.includes(oldStatic))return null;
  const ts=require('typescript'), options={strict:true,skipLibCheck:false,noEmit:true,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,target:ts.ScriptTarget.ES2022};
  const host=ts.createCompilerHost(options),original=host.getSourceFile.bind(host),name=sourceFile.fileName;
  host.getSourceFile=(file,...args)=>{
   const source=file===name?sourceFile:original(file,...args);
   if(!source||!transformSource)return source;
   const text=transformSource(file,source.text);
   return text===source.text?source:ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  };
  const program=ts.createProgram([name],options,host);
  if(ts.getPreEmitDiagnostics(program).length)return null;
  // Deliberately finite qualification of the reviewed minimum-peer images,
  // not a general TypeScript equivalence rule. New inputs must requalify.
  const candidateHash=createHash('sha256').update(sourceFile.text).digest('hex');
  const closure=programClosure(program);
  const closureHash=inputHarnessClosureFingerprint(closure);
  const root=join(dirname(fileURLToPath(import.meta.url)),'..');
  const peerPolicy=JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'),'utf8')).peerDependencies;
  const workspace=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
  const toolchain=JSON.parse(readFileSync(join(root,'toolchain-lock.json'),'utf8'));
  if(ts.version!=='6.0.3'||workspace.devDependencies?.typescript!=='6.0.3'||workspace.devDependencies?.['@angular/material']!=='22.1.7'||workspace.devDependencies?.['@angular/cdk']!=='22.1.7'
   ||process.versions.node!=='24.21.0'||toolchain.repository?.node!=='24.21.0'||peerPolicy?.['@angular/material']!=='^22.1.7'||peerPolicy?.['@angular/cdk']!=='^22.1.7'
   ||candidateHash!=='8855915bb25f75bbb525ca463fb267a7e5ed85749415d8dfb5f8a88d03430a96'
   ||closure.length!==70||closureHash!=='63959e2f4f016c60a1e13cf52a52fe53bee436f1b84ec786774faeb2ba05fbe7')return null;
  const checker=program.getTypeChecker(),file=program.getSourceFile(name);
  const publicDeclarations=symbol=>Boolean(symbol?.declarations?.length)&&symbol.declarations.every(declaration=>
   !(ts.getCombinedModifierFlags(declaration)&(ts.ModifierFlags.Private|ts.ModifierFlags.Protected))&&
   !ts.getJSDocTags(declaration).some(t=>['deprecated','docs-private','experimental'].includes(t.tagName.text)));

  const cls=file?.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyInputHarness');
  const direct=cls?.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword) ? 1 : 0;
  const named=file?.statements.flatMap(s=>ts.isExportDeclaration(s)&&s.exportClause&&ts.isNamedExports(s.exportClause)
   ? [...s.exportClause.elements].filter(e=>e.name.text==='MatLegacyInputHarness').map(e=>({local:(e.propertyName||e.name).text,external:!!s.moduleSpecifier})) : [])||[];
  if(!cls||direct+named.length!==1||named.some(e=>e.local!=='MatLegacyInputHarness'||e.external))return null;
  const heritage=cls.heritageClauses?.flatMap(h=>[...h.types])||[];
  if(heritage.length!==1||!ts.isIdentifier(heritage[0].expression))return null;
  const local=heritage[0].expression.text;
  if(!publicImport(ts,file,local,'MatInputHarness','@angular/material/input/testing')||!publicImport(ts,file,'InputHarnessFilters','InputHarnessFilters','@angular/material/input/testing')||!publicImport(ts,file,'HarnessPredicate','HarnessPredicate','@angular/cdk/testing'))return null;
  const parentImport=checker.getSymbolAtLocation(heritage[0].expression);
  if(!parentImport||(parentImport.flags&ts.SymbolFlags.Alias)===0)return null;
  const parent=checker.getAliasedSymbol(parentImport),parentType=checker.getTypeAtLocation(heritage[0]);
  if(parent!==parentType.symbol||parent.name!=='MatInputHarness'||!parent.valueDeclaration||!ts.isClassDeclaration(parent.valueDeclaration)||!publicDeclarations(parent))return null;
  // These rows are justified by inheritance from the authenticated public
  // parent. Any candidate override needs its own behavioral qualification.
  if(cls.members.some(member=>member.name&&Object.hasOwn(METHODS,member.name.getText(file))))return null;
  const instance=checker.getTypeAtLocation(cls),proofFiles=new Set([file.fileName,parent.valueDeclaration.getSourceFile().fileName]);
  const resolved=ts.resolveModuleName('@angular/material/input/testing',name,options,ts.sys).resolvedModule;
  if(!resolved)return null;
  proofFiles.add(resolved.resolvedFileName);
  const packageRoots=new Map();
  function publicNamed(spec,exportName,expected){
   const resolvedModule=ts.resolveModuleName(spec,name,options,ts.sys).resolvedModule;
   const entry=resolvedModule&&program.getSourceFile(resolvedModule.resolvedFileName);
   const moduleSymbol=entry&&checker.getSymbolAtLocation(entry);
   const exported=moduleSymbol&&checker.getExportsOfModule(moduleSymbol).find(x=>x.name===exportName);
   if(!exported||!publicDeclarations(exported))return false;
   let dir=dirname(entry.fileName);while(dir!==dirname(dir)&&!existsSync(join(dir,'package.json')))dir=dirname(dir);
   const packagePath=join(dir,'package.json'),metadata=JSON.parse(readFileSync(packagePath,'utf8'));
   const packageName=spec.startsWith('@angular/cdk/')?'@angular/cdk':'@angular/material';
   const expectedPackageHash=packageName==='@angular/cdk'
    ?'ec60a5803a214c9b9d8bcdc2de0b0c294ecdd420d680d0e95e686f7aa4d46933'
    :'5d33c35b56f9834d36a3be0ce4dc37892e689bceb1727de0cf223f10ab8f28af';
   if(metadata.name!==packageName||metadata.version!=='22.1.7'||createHash('sha256').update(readFileSync(packagePath)).digest('hex')!==expectedPackageHash||!metadata.exports?.['.'+spec.slice(packageName.length)]?.types)return false;
   proofFiles.add(packagePath);packageRoots.set(packageName,dir);
   const target=exported.flags&ts.SymbolFlags.Alias?checker.getAliasedSymbol(exported):exported;
   if(target!==expected||!publicDeclarations(target))return false;
   proofFiles.add(entry.fileName);for(const declaration of target.declarations)proofFiles.add(declaration.getSourceFile().fileName);
   return true;
  }
  function publicChain(type,contracts){
   const types=[];let current=type;
   while(current){types.push(current);const bases=current.getBaseTypes?.()||[];if(bases.length>1)return false;current=bases[0];}
   return types.length===contracts.length&&types.every((t,i)=>publicNamed(contracts[i][0],contracts[i][1],t.symbol)&&t.symbol.declarations.every(d=>!d.typeParameters?.length));
  }
  if(!publicChain(checker.getDeclaredTypeOfSymbol(parent),[
   ['@angular/material/input/testing','MatInputHarness'],
   ['@angular/material/form-field/testing/control','MatFormFieldControlHarnessBase'],
   ['@angular/material/form-field/testing/control','MatFormFieldControlHarness'],
   ['@angular/cdk/testing','ComponentHarness'],
  ]))return null;
  let packageDir=dirname(resolved.resolvedFileName);
  while(packageDir!==dirname(packageDir)&&!existsSync(join(packageDir,'package.json')))packageDir=dirname(packageDir);
  const packagePath=join(packageDir,'package.json'),packageBytes=readFileSync(packagePath),metadata=JSON.parse(packageBytes);
  if(metadata.name!=='@angular/material'||!metadata.version||!metadata.exports?.['./input/testing']?.types)return null;
  proofFiles.add(packagePath);
  for(const [method,[result,params]] of Object.entries(METHODS)) for(const owner of [parentType,instance]){
   const member=owner.getProperty(method), type=member&&checker.getTypeOfSymbolAtLocation(member,cls),calls=type&&checker.getSignaturesOfType(type,ts.SignatureKind.Call);
   if(!publicDeclarations(member)||!member.declarations.every(d=>ts.isMethodDeclaration(d)||ts.isMethodSignature(d)))return null;
   if(member?.declarations)for(const declaration of member.declarations)proofFiles.add(declaration.getSourceFile().fileName);
   if(!calls||calls.length!==1||calls[0].thisParameter||calls[0].typeParameters?.length||calls[0].parameters.length!==params.length||checker.typeToString(calls[0].getReturnType())!==`Promise<${result}>`)return null;
   if(calls[0].parameters.some((p,i)=>Boolean(p.valueDeclaration?.questionToken||p.valueDeclaration?.initializer||p.valueDeclaration?.dotDotDotToken)||checker.typeToString(checker.getTypeOfSymbolAtLocation(p,cls))!==params[i]))return null;
  }
  const ownWith=cls.members.filter(m=>ts.isMethodDeclaration(m)&&m.name?.getText(file)==='with'&&m.modifiers?.some(x=>x.kind===ts.SyntaxKind.StaticKeyword));
  if(ownWith.length!==1||ownWith[0].parameters.length!==1||!ownWith[0].parameters[0].questionToken||ownWith[0].parameters[0].type?.getText(file)!=='InputHarnessFilters'||ownWith[0].type?.getText(file)!=='HarnessPredicate<MatLegacyInputHarness>')return null;
  const filtersBinding=file.statements.flatMap(s=>ts.isImportDeclaration(s)&&s.moduleSpecifier.text==='@angular/material/input/testing'&&s.importClause?.namedBindings&&ts.isNamedImports(s.importClause.namedBindings)?[...s.importClause.namedBindings.elements]:[]).find(e=>e.name.text==='InputHarnessFilters');
  const filterAlias=filtersBinding&&checker.getSymbolAtLocation(filtersBinding.name),filterSymbol=filterAlias&&checker.getAliasedSymbol(filterAlias);
  if(!publicDeclarations(filterSymbol))return null;
  const filter=checker.getDeclaredTypeOfSymbol(filterSymbol);
  if(filter.getProperties().some(p=>!(p.flags&ts.SymbolFlags.Optional)))return null;
  for(const [prop,want] of Object.entries({selector:'string | undefined',ancestor:'string | undefined',value:'string | RegExp | undefined',placeholder:'string | RegExp | undefined'})){
   const item=filter?.getProperty(prop);if(!publicDeclarations(item)||!item.declarations.every(d=>ts.isPropertySignature(d)&&!(ts.getCombinedModifierFlags(d)&ts.ModifierFlags.Readonly)))return null;if(item?.declarations)for(const declaration of item.declarations)proofFiles.add(declaration.getSourceFile().fileName);if(!item||!(item.flags&ts.SymbolFlags.Optional)||checker.typeToString(checker.getTypeOfSymbolAtLocation(item,cls))!==want)return null;
  }
  const seen=new Set();
  function publicFilterAncestry(type){
   if(seen.has(type))return true;seen.add(type);
   if(!publicDeclarations(type.symbol))return false;
   for(const declaration of type.symbol.declarations)proofFiles.add(declaration.getSourceFile().fileName);
   return (type.getBaseTypes?.()||[]).every(publicFilterAncestry);
  }
  if(!publicFilterAncestry(filter)||!publicChain(filter,[
   ['@angular/material/input/testing','InputHarnessFilters'],
   ['@angular/material/form-field/testing/control','MatFormFieldControlHarnessFilters'],
   ['@angular/cdk/testing','BaseHarnessFilters'],
  ]))return null;
  const predicateBinding=file.statements.flatMap(s=>ts.isImportDeclaration(s)&&s.moduleSpecifier.text==='@angular/cdk/testing'&&s.importClause?.namedBindings&&ts.isNamedImports(s.importClause.namedBindings)?[...s.importClause.namedBindings.elements]:[]).find(e=>e.name.text==='HarnessPredicate');
  const predicateAlias=predicateBinding&&checker.getSymbolAtLocation(predicateBinding.name),predicate=predicateAlias&&checker.getAliasedSymbol(predicateAlias);
  if(predicate?.name!=='HarnessPredicate'||!publicDeclarations(predicate)||!predicate.valueDeclaration||!ts.isClassDeclaration(predicate.valueDeclaration)||!publicNamed('@angular/cdk/testing','HarnessPredicate',predicate))return null;
  const predicateParams=predicate.valueDeclaration.typeParameters;
  if(predicateParams?.length!==1||predicateParams[0].default||predicateParams[0].modifiers?.length||!predicateParams[0].constraint)return null;
  const constraint=checker.getTypeAtLocation(predicateParams[0].constraint);
  if(!publicNamed('@angular/cdk/testing','ComponentHarness',constraint.symbol))return null;
  proofFiles.add(predicate.valueDeclaration.getSourceFile().fileName);
  const actualStatic=checker.getTypeOfSymbolAtLocation(checker.getSymbolAtLocation(cls.name),cls),peerStatic=checker.getTypeOfSymbolAtLocation(parent,parent.valueDeclaration);
  const as=actualStatic.getProperty('with'),ps=peerStatic.getProperty('with');
  const ac=as&&checker.getSignaturesOfType(checker.getTypeOfSymbolAtLocation(as,cls),ts.SignatureKind.Call),pc=ps&&checker.getSignaturesOfType(checker.getTypeOfSymbolAtLocation(ps,cls),ts.SignatureKind.Call);
  if(ac?.length!==1||pc?.length!==1||ac[0].thisParameter||pc[0].thisParameter||ac[0].typeParameters?.length||pc[0].typeParameters?.length||ac[0].parameters.length!==1||pc[0].parameters.length!==1||!pc[0].parameters[0].valueDeclaration?.questionToken||!publicDeclarations(ps)||!ps.declarations.every(d=>ts.isMethodDeclaration(d)||ts.isMethodSignature(d))||checker.typeToString(pc[0].getReturnType())!=='HarnessPredicate<MatInputHarness>'||!checker.isTypeAssignableTo(ac[0].getReturnType(),pc[0].getReturnType()))return null;
  const actualReturn=ac[0].getReturnType(),peerReturn=pc[0].getReturnType();
  if(actualReturn.symbol!==predicate||peerReturn.symbol!==predicate||checker.getTypeArguments(actualReturn)?.[0]?.symbol!==checker.getSymbolAtLocation(cls.name)||checker.getTypeArguments(peerReturn)?.[0]?.symbol!==parent)return null;
  const ap=checker.getTypeOfSymbolAtLocation(ac[0].parameters[0],cls),pp=checker.getTypeOfSymbolAtLocation(pc[0].parameters[0],cls);
  if(!checker.isTypeAssignableTo(ap,pp)||!checker.isTypeAssignableTo(pp,ap))return null;
  const expectedImages=[
   ['@angular/cdk','package.json','ec60a5803a214c9b9d8bcdc2de0b0c294ecdd420d680d0e95e686f7aa4d46933'],
   ['@angular/cdk','types/testing.d.ts','9b9743743438ba738b572c9509e3d9ad1a73f5737b8d02df364df7467ba20999'],
   ['@angular/cdk','types/_harness-environment-chunk.d.ts','172797ca065617b3e72736fd19fcdc386a81a5b3867104ceb64c66e8594fac1d'],
   ['@angular/material','package.json','5d33c35b56f9834d36a3be0ce4dc37892e689bceb1727de0cf223f10ab8f28af'],
   ['@angular/material','types/input-testing.d.ts','ce4ab625a0b9516a5bff10113b1ae8fe0fccdbd9009385fc273c5bee91372fb5'],
   ['@angular/material','types/_input-harness-chunk.d.ts','9ab8a6b92f3fc3260c536cd30ffa8cfa09ea4d5b110d5e00d39d0433a3534df0'],
   ['@angular/material','types/form-field-testing-control.d.ts','0c8f58a435cc1613c313271ffd749ca2e157d21521e248e355e7ae6f2ab8a725'],
   ['@angular/material','types/_form-field-control-harness-chunk.d.ts','696d1aecfb8f71a055bb969ddce9432e8dbcb0b0973c7fbd10de6f5d3b00481c'],
  ];
  for(const [pkg,path,expected] of expectedImages){
   const directory=packageRoots.get(pkg);if(!directory)return null;
   const full=join(directory,path),data=program.getSourceFile(full)?.text??readFileSync(full);
   if(createHash('sha256').update(data).digest('hex')!==expected)return null;
  }
  return {role:'finite minimum-peer declaration qualification, not general type equivalence; transitive declaration paths are public-export resolution details, not private API imports',public_spec:'@angular/material/input/testing',parent:'MatInputHarness',methods:Object.keys(METHODS),historical_filters:['selector','ancestor','value','placeholder'],typescript_version:ts.version,peer_version:metadata.version,candidate_sha256:candidateHash,program_source_count:closure.length,program_closure_sha256:closureHash,program_sources:closure,peer_declaration:parent.valueDeclaration.getSourceFile().fileName, sources:[...proofFiles].sort().map(path=>({path,sha256:createHash('sha256').update(program.getSourceFile(path)?.text??readFileSync(path)).digest('hex')}))};
 }catch{return null;}
}
/** Settle only the exact 13 observed rows after the independent public proof. */
export function settleInputHarness(symbol,sourceFile,signature){
 const proof=inputHarnessProof(symbol,sourceFile);if(!proof)return signature;
 const expected=new Set([...oldMethods.map(x=>JSON.stringify([x,null])),JSON.stringify([oldStatic,null]),JSON.stringify([null,newStatic])]);
 const selected=(signature.rows||[]).filter(r=>r.status==='mismatch'&&expected.has(JSON.stringify([r.historical,r.owned])));
 if(selected.length!==expected.size||new Set(selected.map(r=>JSON.stringify([r.historical,r.owned]))).size!==expected.size)return signature;
 const blocking=new Set([...oldMethods,oldStatic,newStatic]);
 return {...signature,blocking:signature.blocking.filter(x=>!blocking.has(x)),rows:signature.rows.map(r=>selected.includes(r)?{...r,status:'intentional-legacy-difference',rationale:'Exact inherited public parent methods and historical filters checked; specialized predicate return is assignable. Runtime and identity are separately qualified.',proof}:r),input_harness_proof:proof};
}
