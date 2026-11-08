#!/usr/bin/env node
/** Focused negative controls for the public input harness declaration proof. */
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,readFileSync,writeFileSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {deriveSurface} from './api-surface.mjs';
import {parseLegacyArgs,resolveLibraryFromRun,extractLibraryPackage,sha256File} from './resolve-run-library.mjs';
import {inputHarnessProof,inputHarnessClosureFingerprint,INPUT_HARNESS} from './api-input-harness-contract.mjs';
const ts=createRequire(import.meta.url)('typescript'),root=join(dirname(fileURLToPath(import.meta.url)),'..');
const args=parseLegacyArgs(process.argv.slice(2));
if(args.unknown.length||Boolean(args.runPath)===Boolean(args.tarball))throw Error('exactly one of --run or --tarball is required');
const tarball=args.runPath?resolveLibraryFromRun(args.runPath).tarball:args.tarball;
const base=join(root,'artifacts/local/input-harness-regressions');mkdirSync(base,{recursive:true});
const extracted=extractLibraryPackage(tarball,{parentDir:base});
const scratch=mkdtempSync(join(tmpdir(),'input-harness-reference-'));
const consumerDir=mkdtempSync(join(base,'consumer-'));

try{
 const archived=spawnSync('git',['archive','baseline/angular-components-16.2.x','src/material'],{cwd:root,maxBuffer:64*1024*1024});
 if(archived.status!==0)throw Error('tag archive failed');
 if(spawnSync('tar',['-x','-C',scratch],{input:archived.stdout}).status!==0)throw Error('tag extraction failed');
 const symbol=deriveSurface(join(scratch,'src/material')).symbols.find(x=>x.symbol_id===INPUT_HARNESS);
 if(!symbol)throw Error('historical input harness absent');
 const fileName=join(extracted.packageRoot,'types/ngx-compat-material-legacy-legacy-input-testing.d.ts');
 const source=readFileSync(fileName,'utf8');
 const file=text=>ts.createSourceFile(fileName,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const good=file(source);
 function check(label,condition){if(!condition)throw Error(label);}
 const proof=inputHarnessProof(symbol,good);
 check('public parent must qualify',proof);
 const altered=proof.program_sources.map(item=>({...item}));
 const first=altered[0],second=altered.find(item=>item.package===first.package&&item.version===first.version&&item.path!==first.path);
 check('two same-package closure paths exist',second);
 [first.path,second.path]=[second.path,first.path];
 check('swapping source path bindings changes closure fingerprint',inputHarnessClosureFingerprint(altered)!==proof.program_closure_sha256);
 const duplicate=proof.program_sources.map(item=>({...item}));
 const peer=duplicate.find(item=>item.package===duplicate[0].package&&item.version===duplicate[0].version&&item.path!==duplicate[0].path);
 duplicate[0].path=peer.path;let duplicateRejected=false;try{inputHarnessClosureFingerprint(duplicate);}catch{duplicateRejected=true;}
 check('duplicate package path rejected',duplicateRejected);
 const dropped=proof.program_sources.slice(1);
 check('missing source changes closure fingerprint',inputHarnessClosureFingerprint(dropped)!==proof.program_closure_sha256);
 check('candidate byte drift rejected',!inputHarnessProof(symbol,file(source+'\n// unreviewed declaration drift')));
 function candidate(label,from,to){check(label+' mutation reached source',source.includes(from));check(label+' rejected',!inputHarnessProof(symbol,file(source.replace(from,to))));}
 candidate('wrong public import',"'@angular/material/input/testing'","'@angular/material/menu/testing'");
 candidate('wrong subclass','extends MatInputHarness','extends Object');
 candidate('wrong export binding','export { MatLegacyInputHarness };','declare class Wrong {}\nexport { Wrong as MatLegacyInputHarness };');
 candidate('wrong static return','HarnessPredicate<MatLegacyInputHarness>','HarnessPredicate<MatInputHarness>');
 candidate('wrong static parameter','options?: InputHarnessFilters','options?: number');
 candidate('candidate function property','static with(','getValue: () => Promise<string>; static with(');
 candidate('candidate method override','static with(','getValue(): Promise<string>; static with(');
 const moduleDir=join(consumerDir,'node_modules/@ngx-compat');mkdirSync(moduleDir,{recursive:true});
 symlinkSync(extracted.packageRoot,join(moduleDir,'material-legacy'),'dir');
 const consumer=join(consumerDir,'consumer.mts');writeFileSync(consumer,readFileSync(join(root,'testing/input-harness-api/consumer.mts')));
 const options={strict:true,skipLibCheck:false,noEmit:true,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,target:ts.ScriptTarget.ES2022,types:[]};
 const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram([consumer],options));
 if(diagnostics.length)throw Error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:x=>x,getNewLine:()=>"\n"}));
 function mutatePeer(label,from,to){let hit=0;const proof=inputHarnessProof(symbol,good,{transformSource(path,text){if(path.endsWith('/_input-harness-chunk.d.ts')&&text.includes(from)){hit++;return text.replace(from,to);}return text;}});check(label+' mutation reached peer',hit>0);check(label+' rejected',!proof);}
 mutatePeer('missing method','getValue(): Promise<string>;','');
 mutatePeer('changed return','getValue(): Promise<string>;','getValue(): Promise<number>;');
 mutatePeer('changed parameter','setValue(newValue: string): Promise<void>;','setValue(newValue: number): Promise<void>;');
 mutatePeer('optional parameter','setValue(newValue: string): Promise<void>;','setValue(newValue?: string): Promise<void>;');
 mutatePeer('missing filter','placeholder?: string | RegExp;','');
 mutatePeer('changed filter','placeholder?: string | RegExp;','placeholder?: number;');
 mutatePeer('generic filter','interface InputHarnessFilters extends','interface InputHarnessFilters<T = unknown> extends');
 mutatePeer('deprecated peer method','getValue(): Promise<string>;','/** @deprecated */ getValue(): Promise<string>;');
 mutatePeer('deprecated peer filter','placeholder?: string | RegExp;','/** @deprecated */ placeholder?: string | RegExp;');
 mutatePeer('protected method','getValue(): Promise<string>;','protected getValue(): Promise<string>;');
 mutatePeer('method replaced by property','getValue(): Promise<string>;','getValue: () => Promise<string>;');
 mutatePeer('readonly filter','placeholder?: string | RegExp;','readonly placeholder?: string | RegExp;');
 mutatePeer('impossible this parameter','getValue(): Promise<string>;','getValue(this: never): Promise<string>;');
 mutatePeer('new required filter','interface InputHarnessFilters extends MatFormFieldControlHarnessFilters {','interface InputHarnessFilters extends MatFormFieldControlHarnessFilters { requiredNew: string;');
 mutatePeer('generic method','getValue(): Promise<string>;','getValue<T extends never>(): Promise<string>;');
 mutatePeer('generic static method','static with(options?: InputHarnessFilters): HarnessPredicate<MatInputHarness>;','static with<T extends never>(options?: InputHarnessFilters): HarnessPredicate<MatInputHarness>;');
 let ancestorHit=0;
 const ancestorProof=inputHarnessProof(symbol,good,{transformSource(path,text){if(path.endsWith('/_harness-environment-chunk.d.ts')&&text.includes('ancestor?: string;')){ancestorHit++;return text.replace('ancestor?: string;','ancestor?: number;');}return text;}});
 check('changed ancestor filter mutation reached peer',ancestorHit>0);check('changed inherited ancestor filter rejected',!ancestorProof);
 function mutateCdk(label,from,to){let hit=0;const proof=inputHarnessProof(symbol,good,{transformSource(path,text){if(path.endsWith('/_harness-environment-chunk.d.ts')&&text.includes(from)){hit++;return text.replace(from,to);}return text;}});check(label+' mutation reached peer',hit>0);check(label+' rejected',!proof);}
 mutateCdk('deprecated public predicate','declare class HarnessPredicate<T extends ComponentHarness>','/** @deprecated */ declare class HarnessPredicate<T extends ComponentHarness>');
 mutateCdk('changed predicate constraint','declare class HarnessPredicate<T extends ComponentHarness>','declare class HarnessPredicate<T extends object>');
 mutateCdk('deprecated inherited filter type','interface BaseHarnessFilters {','/** @deprecated */ interface BaseHarnessFilters {');
 mutateCdk('deprecated base class','declare abstract class ComponentHarness {','/** @deprecated */ declare abstract class ComponentHarness {');
 function mutateSource(label,suffix,from,to){let hit=0;const proof=inputHarnessProof(symbol,good,{transformSource(path,text){if(path.endsWith(suffix)&&text.includes(from)){hit++;return text.replace(from,to);}return text;}});check(label+' mutation reached source',hit>0);check(label+' rejected',!proof);}
 mutateSource('unreviewed peer byte drift','/_form-field-control-harness-chunk.d.ts','Shared behavior for','Unreviewed behavior for');
 mutateSource('deprecated intermediate parent','/_form-field-control-harness-chunk.d.ts','declare abstract class MatFormFieldControlHarnessBase','/** @deprecated */ declare abstract class MatFormFieldControlHarnessBase');
 mutateSource('generic intermediate parent','/_form-field-control-harness-chunk.d.ts','declare abstract class MatFormFieldControlHarnessBase extends','declare abstract class MatFormFieldControlHarnessBase<T = unknown> extends');
 mutateSource('deprecated intermediate filter','/form-field-testing-control.d.ts','interface MatFormFieldControlHarnessFilters','/** @deprecated */ interface MatFormFieldControlHarnessFilters');
 mutateSource('removed public peer binding','/input-testing.d.ts','InputHarnessFilters, MatInputHarness','InputHarnessFilters');
 mutateSource('removed public predicate binding','/testing.d.ts','HarnessLoader, HarnessPredicate, HarnessQuery','HarnessLoader, HarnessQuery');
 console.log(`input harness public contract regressions passed; artifact sha256 ${sha256File(tarball)}`);
}finally{rmSync(scratch,{recursive:true,force:true});rmSync(consumerDir,{recursive:true,force:true});rmSync(extracted.extractRoot,{recursive:true,force:true});}
