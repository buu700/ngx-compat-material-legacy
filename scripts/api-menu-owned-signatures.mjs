/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Finite owned menu declaration proof, bound to reviewed tagged and packed images.
 */
import {qualifyCombinedArtifactSubject} from './api-combined-d70-image.mjs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync,existsSync} from 'node:fs';
import {dirname,join,relative,isAbsolute,resolve} from 'node:path';
import {menuHarnessClosureFingerprint} from './api-menu-harness-contract.mjs';
import {exactMenuArtifact} from './api-menu-artifact.mjs';

import {qualifyMenuCombinedClosure} from './api-menu-combined-signature-successor.mjs';
const req=createRequire(import.meta.url), hash=b=>createHash('sha256').update(b).digest('hex');
const shapes={MAT_LEGACY_MENU_PANEL:'77d92fd00fb9a61a62310681d60a71f9ce7de6a40582e350943d98ed746a8f37',MatLegacyMenuPanel:'3bc100b697506f99f090575f7ebd6a2d4d642f92c0df3461760a8667ad4107be',MatLegacyMenuItem:'11b1e50dfdb99bbd00cc61a067f9d0b262edd43fec64452bdfc04defedd0056a'};
const cases={MAT_LEGACY_MENU_PANEL:[["token MAT_MENU_PANEL 'MAT_MENU_PANEL'",null],[null,'const MAT_LEGACY_MENU_PANEL:InjectionToken<MatMenuPanel<any>>']],MatLegacyMenuPanel:[['public prop lazyContent:MatMenuContent?',null],[null,'public prop lazyContent:MatLegacyMenuContent?']],MatLegacyMenuItem:[[null,'public prop disableRipple:boolean'],[null,'public prop disabled:boolean']]};
function closure(program){return program.getSourceFiles().map(file=>{const real=realpathSync(file.fileName);let dir=dirname(real);while(dir!==dirname(dir)&&!existsSync(join(dir,'package.json')))dir=dirname(dir);const meta=readFileSync(join(dir,'package.json')),pkg=JSON.parse(meta),path=relative(dir,real).split('\\').join('/'),bytes=readFileSync(real);if(!pkg.name||!pkg.version||!path||path==='..'||path.startsWith('../')||isAbsolute(path)||!bytes.equals(Buffer.from(file.text)))throw Error('unbound declaration closure');return {package:pkg.name,version:pkg.version,package_sha256:hash(meta),path,bytes:bytes.length,sha256:hash(bytes)};});}
function menuStrictConsumer(ts,file,options,expected){
 const virtual=join(dirname(file.fileName),'menu-owned-signature-consumer.ts');
 const text=`import {MAT_LEGACY_MENU_PANEL,MatLegacyMenuPanel,MatLegacyMenuContent,MatLegacyMenuItem} from './ngx-compat-material-legacy-legacy-menu';
import {ElementRef,InjectionToken} from '@angular/core';
declare const node: ElementRef<HTMLElement>; declare const panel: MatLegacyMenuPanel;
const item = new MatLegacyMenuItem(node); item.disabled = true; item.disableRipple = false;
const disabled: boolean = item.disabled; const ripple: boolean = item.disableRipple;
const content: MatLegacyMenuContent | undefined = panel.lazyContent;
const token: InjectionToken<MatLegacyMenuPanel<any>> = MAT_LEGACY_MENU_PANEL;
type Equal<A,B> = (<T>()=>T extends A ? 1 : 2) extends (<T>()=>T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
type Disabled = Assert<Equal<MatLegacyMenuItem['disabled'],boolean>>;
type Ripple = Assert<Equal<MatLegacyMenuItem['disableRipple'],boolean>>;
type Lazy = Assert<Equal<MatLegacyMenuPanel['lazyContent'],MatLegacyMenuContent | undefined>>;
type Token = Assert<Equal<typeof MAT_LEGACY_MENU_PANEL,InjectionToken<MatLegacyMenuPanel<any>>>>;
void [disabled,ripple,content,token];`;
 const host=ts.createCompilerHost(options),old=host.getSourceFile.bind(host),exists=host.fileExists.bind(host),read=host.readFile.bind(host);
 host.fileExists=n=>n===virtual||exists(n);host.readFile=n=>n===virtual?text:read(n);host.getSourceFile=(n,v,...args)=>n===virtual?ts.createSourceFile(n,text,v,true):old(n,v,...args);
 const program=ts.createProgram([virtual],options,host);if(ts.getPreEmitDiagnostics(program).length)return false;
 const sources=closure({getSourceFiles:()=>program.getSourceFiles().filter(f=>f.fileName!==virtual)});
 return qualifyMenuCombinedClosure(sources)&&menuHarnessClosureFingerprint(sources)===menuHarnessClosureFingerprint(expected);
}
export function menuOwnedDeclarationProof(symbol,file,context,{transformSource}={}){
 try{
  if(!context?.referenceRoot||!exactMenuArtifact(context,context.packageRoot)||realpathSync(file.fileName)!==realpathSync(resolve(context.packageRoot,'types/ngx-compat-material-legacy-legacy-menu.d.ts'))||!readFileSync(file.fileName).equals(Buffer.from(file.text,'utf8')))return null;
  for(const [path,expected] of [['menu/menu-panel.ts','48ae888c7a12b733a45989cf0195bd42298203da9768e5354c31759004883b43'],['menu/menu-item.ts','cc176409b67585676aa97714145e5fad042a8ca7626c63a87527c5ed83372bd8'],['legacy-menu/menu-item.ts','70e16e9862f6b5c68ef4a32717c784017ab59c32cf4e7f3d2489d20985d5951c']])if(hash(readFileSync(join(context.referenceRoot,path)))!==expected)return null;
  const id=symbol?.name;if(symbol.symbol_id!=='legacy-menu/primary/'+id||!shapes[id]||hash(JSON.stringify(symbol.shape))!==shapes[id]||hash(file.text)!=='b4a2b1f9ee08d6efb047d2a8a1622c9d112d66de44ba693dd8cf3862c291c88a')return null;
  const ts=req('typescript');if(ts.version!=='6.0.3'||process.versions.node!=='24.21.0')return null;
  const options={strict:true,skipLibCheck:false,noEmit:true,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,target:ts.ScriptTarget.ES2022,types:[]},host=ts.createCompilerHost(options),old=host.getSourceFile.bind(host);
  host.getSourceFile=(name,...args)=>{const source=name===file.fileName?file:old(name,...args);if(!source||!transformSource)return source;const text=transformSource(name,source.text);return text===source.text?source:ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true);};
  const program=ts.createProgram([file.fileName],options,host);if(ts.getPreEmitDiagnostics(program).length)return null;
  const sources=closure(program),digest=menuHarnessClosureFingerprint(sources),combined=qualifyCombinedArtifactSubject(readFileSync(context.tarball),context.packageRoot);if(sources.length!==312||(combined?!qualifyMenuCombinedClosure(sources):digest!=='d1b38ebece42f6e11e89723071fac699f3ce268105134b26cf43709652522b68'))return null;
  if(combined&&!menuStrictConsumer(ts,file,options,sources))return null;
  const checker=program.getTypeChecker(),actual=program.getSourceFile(file.fileName),one=(pred)=>{const found=actual.statements.filter(pred);if(found.length!==1)throw Error('ambiguous declaration');return found[0];};
  const panel=one(n=>ts.isInterfaceDeclaration(n)&&n.name.text==='MatMenuPanel'),content=one(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyMenuContent'),base=one(n=>ts.isClassDeclaration(n)&&n.name?.text==='_LegacyMenuItemBase'),item=one(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyMenuItem');
  const lazy=panel.members.filter(n=>ts.isPropertySignature(n)&&n.name.getText(actual)==='lazyContent');if(lazy.length!==1||!lazy[0].questionToken||!ts.isTypeReferenceNode(lazy[0].type)||checker.getSymbolAtLocation(lazy[0].type.typeName)!==checker.getSymbolAtLocation(content.name))return null;
  const heritage=item.heritageClauses?.flatMap(x=>[...x.types]);if(heritage?.length!==1||checker.getSymbolAtLocation(heritage[0].expression)!==checker.getSymbolAtLocation(base.name))return null;
  const tokens=actual.statements.filter(ts.isVariableStatement).flatMap(n=>[...n.declarationList.declarations]).filter(n=>n.name.getText(actual)==='MAT_MENU_PANEL');if(tokens.length!==1||!ts.isTypeReferenceNode(tokens[0].type)||tokens[0].type.typeName.getText(actual)!=='InjectionToken'||tokens[0].type.typeArguments?.length!==1||checker.getSymbolAtLocation(tokens[0].type.typeArguments[0].typeName)!==checker.getSymbolAtLocation(panel.name))return null;
  const aliases=actual.statements.filter(ts.isExportDeclaration).flatMap(n=>n.exportClause&&ts.isNamedExports(n.exportClause)?[...n.exportClause.elements]:[]);for(const [exported,local]of [['MAT_LEGACY_MENU_PANEL','MAT_MENU_PANEL'],['MatLegacyMenuPanel','MatMenuPanel'],['MatLegacyMenuItem','MatLegacyMenuItem']]){const rows=aliases.filter(e=>e.name.text===exported&&(e.propertyName||e.name).text===local);if(rows.length!==1||checker.getAliasedSymbol(checker.getSymbolAtLocation(rows[0].name))!==checker.getSymbolAtLocation(local==='MAT_MENU_PANEL'?tokens[0].name:local==='MatMenuPanel'?panel.name:item.name))return null;}
  const proof={role:'exact tagged shape and packed declaration with strict minimum-peer program and AST symbol bindings',candidate_sha256:hash(file.text),program_closure_sha256:digest,program_source_count:sources.length,typescript:ts.version,peer:'22.1.7'};return proof;
 }catch{return null;}
}
export function settleOwnedMenuSignatures(symbol,file,signature,context){
 const wanted=cases[symbol?.name];if(!wanted)return signature;
 const proof=menuOwnedDeclarationProof(symbol,file,context);if(!proof)return signature;
 const keys=new Set(wanted.map(JSON.stringify)),selected=(signature.rows||[]).filter(r=>r.status==='mismatch'&&keys.has(JSON.stringify([r.historical,r.owned])));if(selected.length!==2||new Set(selected.map(r=>JSON.stringify([r.historical,r.owned]))).size!==2)return signature;
 if(symbol.name==='MatLegacyMenuItem'&&!['public prop disabled:boolean','public prop disableRipple:boolean'].every(s=>symbol.shape.signatures.includes(s)))return signature;
 const rationale=symbol.name==='MAT_LEGACY_MENU_PANEL'?'The separately owned legacy panel token replaces the historical public Material token; runtime object identity remains separately checked.':symbol.name==='MatLegacyMenuPanel'?'The legacy panel uses owned legacy content in place of the historical Material content type.':'Historical boolean members remain public on the approved owned item implementation; these members came from its historical mixin ancestry.';
 const replacements=symbol.name==='MatLegacyMenuItem'?selected.map(r=>({...r,historical:r.owned,status:'intentional-legacy-difference',rationale,proof})):[{status:'intentional-legacy-difference',historical:wanted[0][0],owned:wanted[1][1],rationale,proof}];
 return {...signature,blocking:signature.blocking.filter(s=>!wanted.some(pair=>pair.includes(s))),rows:[...signature.rows.filter(r=>!selected.includes(r)),...replacements]};
}
