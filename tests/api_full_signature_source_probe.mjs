/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete unchanged-source declaration diagnostic; no packed/native/floor credit. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,symlinkSync,existsSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {deriveSurface,packedShape,compareSignatures} from '../scripts/api-surface.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const arg=name=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:null;
const peerRoot=resolve(process.env.CLOSEOUT_DIAGNOSTIC_PEER_ROOT||root),sourceRoot=join(root,'projects/ngx-material-legacy');
const surface=deriveSurface(resolve(arg('--reference-root')||join(peerRoot,'artifacts/local/ref-material-16.2.14/src/material')));
assert.equal(surface.symbols.length,449);assert.equal(new Set(surface.symbols.map(s=>s.symbol_id)).size,449);
const entries=[...new Set(surface.symbols.map(s=>s.family+(s.kind==='testing'?'/testing':'')))].sort();
const temp=mkdtempSync(join(tmpdir(),'api-full-signature-source-'));
try{
 symlinkSync(join(peerRoot,'node_modules'),join(temp,'node_modules'),'dir');
 const config=JSON.parse(readFileSync(join(sourceRoot,'tsconfig.lib.json'),'utf8')),configured=ts.convertCompilerOptionsFromJson(config.compilerOptions,sourceRoot);
 assert.equal(configured.errors.length,0);
 const output=join(temp,'emitted'),options={...configured.options,rootDir:sourceRoot,outDir:output,declaration:true,emitDeclarationOnly:true,declarationMap:false,sourceMap:false,inlineSources:false,
  paths:{'@ngx-compat/material-legacy/*':[join(sourceRoot,'*/public-api.ts')]}};
 const host=ts.createCompilerHost(options);
 host.resolveModuleNames=(names,containing)=>names.map(spec=>ts.resolveModuleName(spec,spec.startsWith('.')||spec.startsWith('@ngx-compat/')?containing:join(peerRoot,'diagnostic-anchor.ts'),options,ts.sys).resolvedModule);
 const program=ts.createProgram({rootNames:entries.map(entry=>join(sourceRoot,entry,'public-api.ts')),options,host}),diagnostics=ts.getPreEmitDiagnostics(program);
 if(diagnostics.length)throw Error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:x=>x,getNewLine:()=>'\n'}));
 assert.equal(program.emit().emitSkipped,false);
 const cache=new Map(),sources=new Set();
 function parsed(file){if(!cache.has(file)){const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);cache.set(file,source);}sources.add(file);return cache.get(file);}
 function nextFile(file,spec){const base=resolve(dirname(file),spec);return [base+'.d.ts',join(base,'index.d.ts'),base.replace(/\.js$/,'.d.ts')].find(existsSync);}
 function findShape(file,wanted,seen=new Set()){
  const key=file+'#'+wanted;if(seen.has(key))return null;seen.add(key);
  const source=parsed(file),direct=source.statements.some(n=>n.name?.text===wanted||ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(source)===wanted));
  if(direct)return packedShape(source,wanted);
  for(const n of source.statements)if(ts.isExportDeclaration(n)){
   if(n.exportClause&&ts.isNamedExports(n.exportClause)){
    const item=n.exportClause.elements.find(e=>e.name.text===wanted);if(!item)continue;
    if(n.moduleSpecifier?.text.startsWith('.')){const next=nextFile(file,n.moduleSpecifier.text);return next?findShape(next,item.propertyName?.text||item.name.text,seen):null;}
    return packedShape(source,wanted);
   }
   if(n.moduleSpecifier?.text.startsWith('.')){const next=nextFile(file,n.moduleSpecifier.text),shape=next&&findShape(next,wanted,seen);if(shape)return shape;}
  }
  return null;
 }
 const differences=JSON.parse(readFileSync(join(root,'compatibility/rc/api/signature-differences.json'),'utf8')).differences;
 const rows=surface.symbols.map(symbol=>{
  const declaration=findShape(join(output,symbol.family,symbol.kind==='testing'?'testing/public-api.d.ts':'public-api.d.ts'),symbol.name);
  const observation=compareSignatures(symbol,declaration,differences);
  return {symbol_id:symbol.symbol_id,original_shape:symbol.shape,owned_shape:declaration,...observation};
 });
 const caps=program.getSourceFiles().filter(s=>s.fileName.startsWith(sourceRoot+'/')).map(s=>({path:s.fileName.slice(root.length+1),sha256:createHash('sha256').update(readFileSync(s.fileName)).digest('hex')}));
 const failed=rows.filter(r=>r.blocking.length),result={schema_version:1,role:'Complete unchanged-source emitted TypeScript declaration diagnostic; not Angular template, packed, browser or minimum qualification',node:process.version,typescript:ts.version,entries,source_caps:caps,rows,selected:rows.length,passed:rows.length-failed.length,failed:failed.length,actual21_execution:false,packed_execution:false,native_browser_execution:false,g02_claim:false,g11_claim:false};
 if(arg('--out'))writeFileSync(arg('--out'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({selected:result.selected,passed:result.passed,failed:result.failed,failed_symbols:failed.map(r=>({symbol_id:r.symbol_id,blocking:r.blocking}))},null,2));process.exitCode=failed.length?1:0;
}finally{rmSync(temp,{recursive:true,force:true});}
