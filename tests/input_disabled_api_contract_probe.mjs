/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Integration and negative controls for the finite input-disabled API proof.
 * INPUT_DISABLED_REFERENCE, INPUT_DISABLED_TARBALL, INPUT_DISABLED_PACKAGE and
 * INPUT_DISABLED_BASELINE_ROWS designate the reviewed tagged/extracted inputs.
 */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,cpSync,symlinkSync,readdirSync,rmSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {deriveSurface,readDts,observeDeclarations,loadDifferences,summarizeDiscrepancies} from '../scripts/api-surface.mjs';
import {inputDisabledProof,settleInputDisabled} from '../scripts/api-input-disabled-contract.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const referenceRoot=process.env.INPUT_DISABLED_REFERENCE,tarball=process.env.INPUT_DISABLED_TARBALL,packageRoot=process.env.INPUT_DISABLED_PACKAGE,baseline=process.env.INPUT_DISABLED_BASELINE_ROWS;
if(!referenceRoot||!tarball||!packageRoot||!baseline)throw Error('four reviewed input fixture environment variables required');
const context={referenceRoot,tarball,packageRoot},surface=deriveSurface(referenceRoot),symbol=surface.symbols.find(s=>s.symbol_id==='legacy-input/primary/MatLegacyInput');
const dtsName='ngx-compat-material-legacy-legacy-input.d.ts',source=readDts(packageRoot).get(dtsName),allow=JSON.parse(readFileSync(join(root,'compatibility/rc/api/export-name-allowlist.json'))),differences=loadDifferences();
const normal=observeDeclarations(surface,readDts(packageRoot),differences,allow),withProof=observeDeclarations(surface,readDts(packageRoot),differences,allow,context);
const before=summarizeDiscrepancies(normal.observations).open,after=summarizeDiscrepancies(withProof.observations).open,expected=JSON.parse(readFileSync(baseline)).open;
assert.deepEqual(before,expected);assert.equal(before.length,40);assert.equal(after.length,37);
const selected=new Set(['protected prop _legacyAriaDisabled:string|null','public method ngDoCheck():void','protected method _legacyReadonlyAttribute():string|null']);
assert.deepEqual(before.filter(r=>r.symbol_id!=='legacy-input/primary/MatLegacyInput'||!selected.has(r.owned)),after);
// Compile real current-peer subclasses with library checking enabled. These
// are accepted source-compatibility costs, not evidence of equivalence.
const subclassOptions={strict:true,skipLibCheck:false,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,noImplicitOverride:true};
for(const body of ["private _legacyAriaDisabled: number = 1;","private _legacyReadonlyAttribute(): number { return 1; }"]){
 const virtual=join(dirname(source.fileName),'input-api-subclass-collision.ts'),text=`import {MatLegacyInput} from './ngx-compat-material-legacy-legacy-input';\nclass Child extends MatLegacyInput { ${body} }`,host=ts.createCompilerHost(subclassOptions),get=host.getSourceFile.bind(host),exists=host.fileExists.bind(host),read=host.readFile.bind(host);
 host.fileExists=f=>f===virtual||exists(f);host.readFile=f=>f===virtual?text:read(f);host.getSourceFile=(f,v,...args)=>f===virtual?ts.createSourceFile(f,text,v,true):get(f,v,...args);
 const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram([virtual],subclassOptions,host));
 assert.ok(diagnostics.every(d=>d.file?.fileName===virtual));assert.deepEqual(diagnostics.map(d=>d.code).sort(),[2416,4114]);
}
const input=normal.observations.find(r=>r.symbol.symbol_id===symbol.symbol_id).signature;
assert.ok(inputDisabledProof(symbol,source,context));assert.equal(settleInputDisabled(symbol,source,input,context).blocking.length,0);
const rejected=[];function reject(name,s=source,c=context,p=input,prove=inputDisabledProof,settle=settleInputDisabled){assert.equal(prove(symbol,s,c),null,name);assert.deepEqual(settle(symbol,s,p,c).blocking,input.blocking,name);rejected.push(name);}
const forgedSymbol=structuredClone(symbol);forgedSymbol.shape.signatures=forgedSymbol.shape.signatures.filter(x=>x!=='public method ngDoCheck():*');assert.equal(inputDisabledProof(forgedSymbol,source,context),null);rejected.push('forged historical lifecycle');
reject('missing context',source,null);reject('forged verified flag',source,{verified:true});reject('missing tarball',source,{...context,tarball:null});reject('wrong reference',source,{...context,referenceRoot:packageRoot});
for(const [name,a,b] of [
 ['helper name','_legacyAriaDisabled','_legacyAriaDisabledChanged'],
 ['helper type','protected _legacyAriaDisabled: string | null','protected _legacyAriaDisabled: number | null'],
 ['helper visibility','protected _legacyAriaDisabled','public _legacyAriaDisabled'],
 ['readonly helper return','_legacyReadonlyAttribute(): string | null','_legacyReadonlyAttribute(): number | null'],
 ['lifecycle signature','ngDoCheck(): void','ngDoCheck(value: string): void']]){
 const text=source.text.replace(a,b);assert.notEqual(text,source.text);reject(name,ts.createSourceFile(source.fileName,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS));
}
const temp=mkdtempSync(join(tmpdir(),'input-disabled-api-'));
try{
 const shadow=join(temp,'frame'),scripts=join(shadow,'scripts'),project=join(shadow,'projects/ngx-material-legacy');mkdirSync(scripts,{recursive:true});mkdirSync(join(project,'legacy-input'),{recursive:true});
 for(const name of ['api-input-disabled-contract.mjs','api-input-harness-contract.mjs'])copyFileSync(join(root,'scripts',name),join(scripts,name));
 for(const name of ['node_modules','package.json','toolchain-lock.json','compatibility'])symlinkSync(join(root,name),join(shadow,name));
 symlinkSync(join(root,'projects/ngx-material-legacy/package.json'),join(project,'package.json'));
 const owned=join(project,'legacy-input/input.ts'),ownedText=readFileSync(join(root,'projects/ngx-material-legacy/legacy-input/input.ts'),'utf8');writeFileSync(owned,ownedText);
 const shadowModule=await import(pathToFileURL(join(scripts,'api-input-disabled-contract.mjs')).href);
 assert.ok(shadowModule.inputDisabledProof(symbol,source,context));
 for(const [name,a,b] of [
  ['owned helper name','_legacyAriaDisabled: string | null','_legacyAriaDisabledDifferent: string | null'],
  ['owned helper visibility','protected _legacyAriaDisabled','public _legacyAriaDisabled'],
  ['owned helper body',"? 'true' : null","? null : 'true'"],
  ['base lifecycle call','super.ngDoCheck();',''],
  ['native disabled host binding',"'[disabled]': 'disabled'","'[disabled]': 'false'"],
  ['native readonly host binding',"'[attr.readonly]': '_legacyReadonlyAttribute()'","'[attr.readonly]': 'null'"],
  ['native aria host binding',"'[attr.aria-disabled]': '_legacyAriaDisabled'","'[attr.aria-disabled]': 'null'"],
  ['native element injection','inject<ElementRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>>(ElementRef)','inject<ElementRef<HTMLInputElement>>(ElementRef)']]){
  const mutant=ownedText.replace(a,b);assert.notEqual(mutant,ownedText,name);writeFileSync(owned,mutant);reject(name,source,context,input,shadowModule.inputDisabledProof,shadowModule.settleInputDisabled);
 }
 writeFileSync(owned,ownedText);
 const wrong=join(temp,'wrong.tgz'),tarBytes=readFileSync(tarball);tarBytes[tarBytes.length-1]^=1;writeFileSync(wrong,tarBytes);reject('wrong tar bytes',source,{...context,tarball:wrong});
 const fake=join(temp,'copied-input-only');mkdirSync(join(fake,'types'),{recursive:true});copyFileSync(source.fileName,join(fake,'types',dtsName));const fakeSource=ts.createSourceFile(join(fake,'types',dtsName),source.text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);reject('copied input file is not an artifact',fakeSource,{...context,packageRoot:fake});
 const extracted=join(temp,'extracted');cpSync(packageRoot,extracted,{recursive:true});const other=join(extracted,'LICENSE');writeFileSync(other,readFileSync(other)+'\n');const extractedSource=ts.createSourceFile(join(extracted,'types',dtsName),source.text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);reject('stale extracted package',extractedSource,{...context,packageRoot:extracted});
 const historic=join(temp,'reference');mkdirSync(join(historic,'legacy-input'),{recursive:true});mkdirSync(join(historic,'input'),{recursive:true});for(const name of ['legacy-input/input.ts','input/input.ts'])copyFileSync(join(referenceRoot,name),join(historic,name));writeFileSync(join(historic,'input/input.ts'),readFileSync(join(historic,'input/input.ts'))+'\n');reject('altered tagged parent',source,{...context,referenceRoot:historic});
 // A counterfeit same-version peer, using a fresh complete package image, must
 // fail even though the artifact bytes and package metadata remain authentic.
 const peerCase=join(temp,'peer'),peerPackage=join(peerCase,'package'),modules=join(peerCase,'node_modules'),angular=join(modules,'@angular');mkdirSync(angular,{recursive:true});cpSync(packageRoot,peerPackage,{recursive:true});
 for(const name of readdirSync(join(root,'node_modules')))if(name!=='@angular')symlinkSync(join(root,'node_modules',name),join(modules,name));
 for(const name of readdirSync(join(root,'node_modules/@angular')))if(name!=='material')symlinkSync(join(root,'node_modules/@angular',name),join(angular,name));
 const material=join(angular,'material'),originalMaterial=join(root,'node_modules/@angular/material');mkdirSync(material);for(const name of readdirSync(originalMaterial))if(name!=='types')symlinkSync(join(originalMaterial,name),join(material,name));mkdirSync(join(material,'types'));for(const name of readdirSync(join(originalMaterial,'types')))if(name!=='input.d.ts')symlinkSync(join(originalMaterial,'types',name),join(material,'types',name));
 writeFileSync(join(material,'types/input.d.ts'),readFileSync(join(originalMaterial,'types/input.d.ts'))+'\n');
 const peerSource=ts.createSourceFile(join(peerPackage,'types',dtsName),source.text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);reject('counterfeit current peer image',peerSource,{...context,packageRoot:peerPackage});
 console.log(JSON.stringify({old_open:before.length,new_open:after.length,settled:[...selected],negative_controls:rejected,peer:'22.1.7',strict_skip_lib_check:false},null,2));
}finally{rmSync(temp,{recursive:true,force:true});}
