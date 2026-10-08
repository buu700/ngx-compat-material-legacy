/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Focused unchanged-source constructor execution; not packed/style/native/floor qualification. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync,symlinkSync,existsSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {deriveSurface} from '../scripts/api-surface.mjs';
import {observeRuntimeDi} from '../scripts/api-di-observe.mjs';
import {settleDi} from '../scripts/api-completeness.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const arg=name=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:null;
const selected={
 'legacy-checkbox':['MatLegacyCheckbox'],
 'legacy-radio':['MatLegacyRadioButton'],
 'legacy-slide-toggle':['MatLegacySlideToggle'],
 'legacy-slider':['MatLegacySlider'],
 'legacy-chips':['MatLegacyChip'],
 'legacy-select':['MatLegacySelect'],
 'legacy-tabs':['MatLegacyTabLink','_MatLegacyTabLinkBase'],
};
const family=arg('--family');
const families=family==='legacy-controls'?['legacy-checkbox','legacy-radio','legacy-slide-toggle','legacy-slider']:[family];
if(families.some(name=>!Object.hasOwn(selected,name))){console.error('An exact supported --family is required.');process.exit(2);}
const peerRoot=resolve(process.env.CLOSEOUT_DIAGNOSTIC_PEER_ROOT||root);
const originalRoot=resolve(arg('--reference-root')||join(peerRoot,'artifacts/local/ref-material-16.2.14/src/material'));
const ts=require('typescript'),esbuild=require('esbuild'),url=spec=>pathToFileURL(require.resolve(spec)).href;
const load=spec=>import(url(spec));
const cli=await load('@angular/compiler-cli');
const sourceRoot=join(root,'projects/ngx-material-legacy');
const temp=mkdtempSync(join(tmpdir(),'api-attribute-family-'));
try{
 const output=join(temp,'emitted'),runtime=join(temp,'runtime');
 mkdirSync(join(runtime,'fesm2022'),{recursive:true});
 symlinkSync(join(peerRoot,'node_modules'),join(temp,'node_modules'),'dir');
 const config=JSON.parse(readFileSync(join(sourceRoot,'tsconfig.lib.json'),'utf8'));
 const configured=ts.convertCompilerOptionsFromJson(config.compilerOptions,sourceRoot);
 if(configured.errors.length)throw Error(cli.formatDiagnostics(configured.errors));
 const options={...configured.options,rootDir:sourceRoot,outDir:output,declaration:false,declarationMap:false,
  sourceMap:false,inlineSources:false,
  paths:{'@ngx-compat/material-legacy/*':[join(sourceRoot,'*/public-api.ts')]},...config.angularCompilerOptions};
 const host=cli.createCompilerHost({options}),resources=new Set();
 const readFile=host.readFile.bind(host);
 host.readFile=file=>{if(file.startsWith(sourceRoot+'/')&&/\.(html|scss|css)$/.test(file))resources.add(file);return readFile(file);};
 const readResource=host.readResource?.bind(host);
 if(readResource)host.readResource=file=>{resources.add(file);return readResource(file);};
 host.resolveModuleNames=(names,containing)=>names.map(spec=>ts.resolveModuleName(spec,
  spec.startsWith('.')||spec.startsWith('@ngx-compat/')?containing:join(peerRoot,'diagnostic-anchor.ts'),options,ts.sys).resolvedModule);
 const program=cli.createProgram({rootNames:families.map(name=>join(sourceRoot,name,'public-api.ts')),options,host});
 const diagnostics=cli.defaultGatherDiagnostics(program);
 if(diagnostics.length)throw Error(cli.formatDiagnostics(diagnostics));
 assert.equal(program.emit().emitSkipped,false);
 const ownedFiles=program.getTsProgram().getSourceFiles().filter(file=>file.fileName.startsWith(sourceRoot+'/'));
 const files=ownedFiles.filter(file=>existsSync(file.fileName));
 const virtualFiles=ownedFiles.filter(file=>!existsSync(file.fileName));
 const emittedFamilies=new Set(files.map(file=>file.fileName.slice(sourceRoot.length+1).split('/')[0]));
 for(const ownedFamily of emittedFamilies){
  const entry=join(output,ownedFamily,'public-api.js');if(!existsSync(entry))continue;
  await esbuild.build({entryPoints:[entry],outfile:join(runtime,'fesm2022',`ngx-compat-material-legacy-${ownedFamily}.mjs`),
   bundle:true,format:'esm',platform:'node',target:'es2022',keepNames:false,
   external:['@angular/*','rxjs','rxjs/*'],plugins:[{name:'unchanged-owned-family-runtime',setup(build){
    build.onResolve({filter:/^@ngx-compat\/material-legacy\//},args=>({
     path:pathToFileURL(join(runtime,'fesm2022',`ngx-compat-material-legacy-${args.path.split('/').at(-1)}.mjs`)).href,external:true,
    }));
   }}]});
 }
 await load('@angular/compiler');const core=await load('@angular/core');
 if(arg('--source-out'))writeFileSync(arg('--source-out'),readFileSync(join(runtime,'fesm2022',`ngx-compat-material-legacy-${family}.mjs`)));
 const surface=deriveSurface(originalRoot),ids=new Set(families.flatMap(name=>selected[name].map(symbol=>name+'/primary/'+symbol)));
 const symbols=surface.symbols.map(symbol=>({...symbol,di_id:ids.has(symbol.symbol_id)?symbol.di_id:null}));
 assert.equal(symbols.filter(symbol=>symbol.di_id).length,ids.size,'Original selection incomplete');
 const rows=(await observeRuntimeDi(runtime,symbols,[],load)).map(row=>settleDi(row,[]));
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 const caps=[...new Set([...files.map(file=>file.fileName),...resources])].sort().map(file=>({path:file.startsWith(root+'/')?file.slice(root.length+1):file,sha256:sha(readFileSync(file))}));
 const result={schema_version:1,role:'Unchanged owned source partial compilation and family constructor API observation; not canonical packed/style/native/floor qualification',
  family,families,node:process.version,typescript:ts.version,runtime_peer:core.VERSION.full,rows,
  source_files:files.length,resource_files:resources.size,source_caps:caps,virtual_typecheck_files:virtualFiles.length,
  styles:'Original SCSS resources are read unchanged by the Angular compiler. No Sass transform/rendered/style compatibility is claimed.',
  product_source_or_resource_rewrites:false,actual21_execution:false,packed_execution:false,native_browser_execution:false,g02_claim:'not-passed'};
 if(arg('--out'))writeFileSync(arg('--out'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({family,source_files:files.length,resources:resources.size,results:rows.map(row=>({symbol:row.symbol.symbol_id,result:row.result,problems:row.problems}))},null,2));
 if(rows.some(row=>row.result!=='pass'))process.exitCode=1;
}finally{rmSync(temp,{recursive:true,force:true});}
