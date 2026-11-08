#!/usr/bin/env node
/** Artifact-bound tagged menu filter checks and finite-identity negatives. */
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,readFileSync,writeFileSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {deriveSurface} from './api-surface.mjs';
import {historicalMenuFilter,menuHarnessProof,menuHarnessClosureFingerprint,MENU_HARNESS} from './api-menu-harness-contract.mjs';
import {parseLegacyArgs,resolveLibraryFromRun,extractLibraryPackage,sha256File} from './resolve-run-library.mjs';
const ts=createRequire(import.meta.url)('typescript'),root=join(dirname(fileURLToPath(import.meta.url)),'..'),args=parseLegacyArgs(process.argv.slice(2));
if(args.unknown.length||Boolean(args.runPath)===Boolean(args.tarball))throw Error('exactly one of --run or --tarball is required');
const tarball=args.runPath?resolveLibraryFromRun(args.runPath).tarball:args.tarball,base=join(root,'artifacts/local/menu-harness-regressions');mkdirSync(base,{recursive:true});
const extracted=extractLibraryPackage(tarball,{parentDir:base}),scratch=mkdtempSync(join(tmpdir(),'menu-harness-reference-')),consumerDir=mkdtempSync(join(base,'consumer-'));
try{
 const archived=spawnSync('git',['archive','baseline/angular-components-16.2.x','src/material'],{cwd:root,maxBuffer:64*1024*1024});
 if(archived.status!==0||spawnSync('tar',['-x','-C',scratch],{input:archived.stdout}).status!==0)throw Error('tag archive failed');
 const ref=join(scratch,'src/material'),symbol=deriveSurface(ref).symbols.find(x=>x.symbol_id===MENU_HARNESS);
 function check(label,condition){if(!condition)throw Error(label);}
 check('historical menu filter found',symbol?.shape.historicalMenuFilter);
 const oldPath=join(ref,'menu/testing/menu-harness-filters.ts'),old=readFileSync(oldPath);writeFileSync(oldPath,Buffer.concat([old,Buffer.from('\n// altered reference')]));
 check('changed tagged filter rejected',!historicalMenuFilter(ref));writeFileSync(oldPath,old);
 const fileName=join(extracted.packageRoot,'types/ngx-compat-material-legacy-legacy-menu-testing.d.ts'),source=readFileSync(fileName,'utf8'),file=text=>ts.createSourceFile(fileName,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),good=file(source);
 const actualProof=menuHarnessProof(symbol,good);check('actual packed menu proof',actualProof);
 const altered=actualProof.program_sources.map(x=>({...x})),first=altered[0],second=altered.find(x=>x.package===first.package&&x.version===first.version&&x.path!==first.path);
 check('two same-package source paths exist',second);[first.path,second.path]=[second.path,first.path];
 check('source path swap rejected',menuHarnessClosureFingerprint(altered)!==actualProof.program_closure_sha256);
 const duplicate=actualProof.program_sources.map(x=>({...x})),peerPath=duplicate.find(x=>x.package===duplicate[0].package&&x.version===duplicate[0].version&&x.path!==duplicate[0].path);
 duplicate[0].path=peerPath.path;let duplicateRejected=false;try{menuHarnessClosureFingerprint(duplicate);}catch{duplicateRejected=true;}check('duplicate path rejected',duplicateRejected);
 check('dropped source rejected',menuHarnessClosureFingerprint(actualProof.program_sources.slice(1))!==actualProof.program_closure_sha256);
 function candidate(label,from,to){check(label+' mutation reached source',source.includes(from));check(label+' rejected',!menuHarnessProof(symbol,file(source.replace(from,to))));}
 candidate('candidate byte drift','interface LegacyMenuHarnessFilters','interface LegacyMenuHarnessFilters /* drift */');
 candidate('required field','triggerText?: string | RegExp;','triggerText: string | RegExp;');
 candidate('readonly field','triggerText?: string | RegExp;','readonly triggerText?: string | RegExp;');
 candidate('wrong return','HarnessPredicate<MatLegacyMenuHarness>','HarnessPredicate<MatLegacyMenuItemHarness>');
 candidate('export binding','export type { LegacyMenuHarnessFilters };','export type { BaseHarnessFilters as LegacyMenuHarnessFilters };');
 function peer(label,suffix,from,to){let hit=0;const proof=menuHarnessProof(symbol,good,{transformSource(path,text){if(path.endsWith(suffix)&&text.includes(from)){hit++;return text.replace(from,to);}return text;}});check(label+' mutation reached source',hit>0);check(label+' rejected',!proof);}
 peer('peer ancestor field','/_harness-environment-chunk.d.ts','ancestor?: string;','ancestor?: number;');
 peer('deprecated public predicate','/_harness-environment-chunk.d.ts','declare class HarnessPredicate<T extends ComponentHarness>','/** @deprecated */ declare class HarnessPredicate<T extends ComponentHarness>');
 peer('public base removed','/testing.d.ts','AsyncPredicate, BaseHarnessFilters,','AsyncPredicate,');
 peer('deprecated loader','/_harness-environment-chunk.d.ts','interface HarnessLoader {','/** @deprecated */ interface HarnessLoader {');
 peer('deprecated constructor','/_harness-environment-chunk.d.ts','interface ComponentHarnessConstructor<T extends ComponentHarness>','/** @deprecated */ interface ComponentHarnessConstructor<T extends ComponentHarness>');
 peer('deprecated container','/_harness-environment-chunk.d.ts','declare abstract class ContentContainerComponentHarness','/** @deprecated */ declare abstract class ContentContainerComponentHarness');
 peer('deprecated peer filter','/menu-testing.d.ts','interface MenuItemHarnessFilters extends BaseHarnessFilters {','/** @deprecated */ interface MenuItemHarnessFilters extends BaseHarnessFilters {');
 const moduleDir=join(consumerDir,'node_modules/@ngx-compat');mkdirSync(moduleDir,{recursive:true});symlinkSync(extracted.packageRoot,join(moduleDir,'material-legacy'),'dir');
 const consumer=join(consumerDir,'consumer.mts');writeFileSync(consumer,readFileSync(join(root,'testing/menu-harness-api/consumer.mts')));
 const options={strict:true,skipLibCheck:false,noEmit:true,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,target:ts.ScriptTarget.ES2022,types:[]};
 const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram([consumer],options));if(diagnostics.length)throw Error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:x=>x,getNewLine:()=>"\n"}));
 console.log(`menu harness public contract regressions passed; artifact sha256 ${sha256File(tarball)}`);
}finally{rmSync(scratch,{recursive:true,force:true});rmSync(consumerDir,{recursive:true,force:true});rmSync(extracted.extractRoot,{recursive:true,force:true});}
