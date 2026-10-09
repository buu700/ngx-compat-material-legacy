/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** All original factory classes from unchanged sources;no packed/native/floor credit. */
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
const peerRoot=resolve(process.env.CLOSEOUT_DIAGNOSTIC_PEER_ROOT||root);
const originalRoot=resolve(arg('--reference-root')||join(peerRoot,'artifacts/local/ref-material-16.2.14/src/material'));
const surface=deriveSurface(originalRoot),selected=surface.symbols.filter(s=>s.di_id&&!s.shape.token);
assert.equal(selected.length,154,'Complete untouched16 factory class population changed');
assert.equal(new Set(selected.map(s=>s.symbol_id)).size,154);
const selectedIds=new Set(selected.map(s=>s.symbol_id));
const entries=[...new Set(selected.map(s=>s.family+(s.kind==='testing'?'/testing':'')))].sort();
const ts=require('typescript'),esbuild=require('esbuild'),load=spec=>import(pathToFileURL(require.resolve(spec)).href);
const cli=await load('@angular/compiler-cli'),sourceRoot=join(root,'projects/ngx-material-legacy');
const temp=mkdtempSync(join(tmpdir(),'api-full-factory-source-'));
try{
 const output=join(temp,'emitted'),runtime=join(temp,'runtime');mkdirSync(join(runtime,'fesm2022'),{recursive:true});
 symlinkSync(join(peerRoot,'node_modules'),join(temp,'node_modules'),'dir');
 const config=JSON.parse(readFileSync(join(sourceRoot,'tsconfig.lib.json'),'utf8'));
 const configured=ts.convertCompilerOptionsFromJson(config.compilerOptions,sourceRoot);
 if(configured.errors.length)throw Error(cli.formatDiagnostics(configured.errors));
 const options={...configured.options,rootDir:sourceRoot,outDir:output,declaration:false,declarationMap:false,
  sourceMap:false,inlineSources:false,paths:{'@ngx-compat/material-legacy/*':[join(sourceRoot,'*/public-api.ts')]},...config.angularCompilerOptions};
 const host=cli.createCompilerHost({options}),resources=new Set(),readFile=host.readFile.bind(host),readResource=host.readResource?.bind(host);
 host.readFile=file=>{if(file.startsWith(sourceRoot+'/')&&/\.(html|scss|css)$/.test(file))resources.add(file);return readFile(file);};
 if(readResource)host.readResource=file=>{resources.add(file);return readResource(file);};
 host.resolveModuleNames=(names,containing)=>names.map(spec=>ts.resolveModuleName(spec,
  spec.startsWith('.')||spec.startsWith('@ngx-compat/')?containing:join(peerRoot,'diagnostic-anchor.ts'),options,ts.sys).resolvedModule);
 const program=cli.createProgram({rootNames:entries.map(entry=>join(sourceRoot,entry,'public-api.ts')),options,host});
 const diagnostics=cli.defaultGatherDiagnostics(program);if(diagnostics.length)throw Error(cli.formatDiagnostics(diagnostics));
 assert.equal(program.emit().emitSkipped,false);
 const ownedFiles=program.getTsProgram().getSourceFiles().filter(file=>file.fileName.startsWith(sourceRoot+'/'));
 const files=ownedFiles.filter(file=>existsSync(file.fileName)),virtualFiles=ownedFiles.filter(file=>!existsSync(file.fileName));
 const checker=program.getTsProgram().getTypeChecker(),routes=[];
 const canonical=symbol=>symbol?.flags&ts.SymbolFlags.Alias?checker.getAliasedSymbol(symbol):symbol;
 const publicExports=new Map(entries.map(entry=>{
  const file=program.getTsProgram().getSourceFile(join(sourceRoot,entry,'public-api.ts'));
  return [entry,new Map(checker.getExportsOfModule(checker.getSymbolAtLocation(file)).map(s=>[s.name,canonical(s)]))];
 }));
 for(const entry of entries){
  const file=join(output,entry,'public-api.js');assert.ok(existsSync(file),'Missing original entry '+entry);
  await esbuild.build({entryPoints:[file],outfile:join(runtime,'fesm2022',`ngx-compat-material-legacy-${entry.replaceAll('/','-')}.mjs`),
   bundle:true,format:'esm',platform:'node',target:'es2022',keepNames:false,external:['@angular/*','rxjs','rxjs/*'],
   plugins:[{name:'unchanged-owned-runtime',setup(build){
    const external=target=>({path:pathToFileURL(join(runtime,'fesm2022',`ngx-compat-material-legacy-${target.replaceAll('/','-')}.mjs`)).href,external:true});
    build.onResolve({filter:/^@ngx-compat\/material-legacy\//},args=>external(args.path.slice('@ngx-compat/material-legacy/'.length)));
    // Angular's multi-entry source compiler emits some metadata imports as
    // relative paths. Preserve secondary-entry singleton identities only when
    // every consumed binding is the identical public barrel export.
    build.onResolve({filter:/^\./},args=>{
     const target=resolve(dirname(args.importer),args.path),relative=target.slice(output.length+1);
     if(!target.startsWith(output+'/'))return;
     const other=entries.filter(e=>relative===e||relative.startsWith(e+'/')).sort((a,b)=>b.length-a.length)[0];
     if(!other||other===entry)return;
     const targetFile=existsSync(target+'.js')?target+'.js':join(target,'index.js');
     const originalFile=sourceRoot+targetFile.slice(output.length).replace(/\.js$/,'.ts');
     const original=program.getTsProgram().getSourceFile(originalFile);assert.ok(original,'Missing cross-entry source '+originalFile);
     const exports=new Map(checker.getExportsOfModule(checker.getSymbolAtLocation(original)).map(s=>[s.name,canonical(s)]));
     const importer=ts.createSourceFile(args.importer,readFileSync(args.importer,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
     const declarations=importer.statements.filter(s=>ts.isImportDeclaration(s)&&s.moduleSpecifier.text===args.path);assert.equal(declarations.length,1);
     const clause=declarations[0].importClause;assert.ok(clause?.namedBindings&&!clause.name,'Unsupported cross-entry default or side-effect import');
     const bindings=clause.namedBindings,names=new Set();
     if(ts.isNamedImports(bindings))for(const b of bindings.elements)names.add(b.propertyName?.text||b.name.text);
     else{
      const visit=n=>{if(ts.isPropertyAccessExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text===bindings.name.text)names.add(n.name.text);if(ts.isElementAccessExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text===bindings.name.text)throw Error('Computed cross-entry namespace access');ts.forEachChild(n,visit);};visit(importer);
     }
     assert.ok(names.size,'Cross-entry namespace has no identifiable public uses');
     for(const name of names)assert.ok(exports.has(name)&&exports.get(name)===publicExports.get(other).get(name),'Cross-entry binding is not the same public export: '+other+'#'+name);
     routes.push({from:entry,to:other,module:relative,bindings:[...names].sort(),same_public_export_symbols:true});return external(other);
    });
   }}]});
 }
 await load('@angular/compiler');const core=await load('@angular/core');
 const symbols=surface.symbols.map(symbol=>({...symbol,di_id:selectedIds.has(symbol.symbol_id)?symbol.di_id:null}));
 const rows=(await observeRuntimeDi(runtime,symbols,[],load)).map(row=>settleDi(row,[]));
 assert.equal(rows.length,154);assert.deepEqual(rows.map(r=>r.symbol.symbol_id).sort(),[...selectedIds].sort());
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 const caps=[...new Set([...files.map(file=>file.fileName),...resources])].sort().map(file=>({path:file.slice(root.length+1),sha256:sha(readFileSync(file))}));
 const result={schema_version:1,role:'All original154 factory class source observations;not canonical packed/native/browser/floor qualification',
  node:process.version,typescript:ts.version,runtime_peer:core.VERSION.full,entries,rows,selected_symbol_ids:[...selectedIds].sort(),emitted_public_import_routes:routes,
  passed:rows.filter(row=>row.result==='pass').length,failed:rows.filter(row=>row.result!=='pass').length,
  source_files:files.length,resource_files:resources.size,source_caps:caps,virtual_typecheck_files:virtualFiles.length,
  styles:'SCSS/HTML resources read unchanged by Angular compiler;no Sass/rendered style qualification',
  product_source_or_resource_rewrites:false,actual21_execution:false,packed_execution:false,native_browser_execution:false,g02_claim:'not-passed',g11_claim:'not-passed'};
 if(arg('--out'))writeFileSync(arg('--out'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({passed:result.passed,failed:result.failed,source_files:result.source_files,resources:result.resource_files,
  failed_symbol_ids:rows.filter(row=>row.result!=='pass').map(row=>row.symbol.symbol_id)},null,2));
 if(result.failed)process.exitCode=1;
}finally{rmSync(temp,{recursive:true,force:true});}
