/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real partial compiler cycle regression;source-only,no packed/native/floor credit. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const runtime=process.env.CLOSEOUT_DIAGNOSTIC_PEER_ROOT||root;
const cli=await import(pathToFileURL(require.resolve('@angular/compiler-cli')).href);
const sourceRoot=join(root,'projects/ngx-material-legacy'),fixtureFile=join(root,'tests/table_outlet_cycle_fixture.json');
const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(readFileSync(fixtureFile)),'5a3f3cb9a9be6fb88c9de742fd02ce120aae9ca7cc98cf5c2b65b3d8650a5000');
const fixture=JSON.parse(readFileSync(fixtureFile));
const expected=['internal/table-outlet.ts','public-api.ts','table-module.ts'].map(p=>'projects/ngx-material-legacy/legacy-table/'+p).sort();
assert.deepEqual(Object.keys(fixture.files).sort(),expected);
const config=JSON.parse(readFileSync(join(sourceRoot,'tsconfig.lib.json'),'utf8'));
const configured=ts.convertCompilerOptionsFromJson(config.compilerOptions,sourceRoot);assert.deepEqual(configured.errors,[]);
const temp=mkdtempSync(join(tmpdir(),'table-outlet-aot-source-'));
try{
 const options={...configured.options,rootDir:sourceRoot,outDir:temp,declaration:false,declarationMap:false,sourceMap:false,inlineSources:false,
  paths:{'@ngx-compat/material-legacy/*':[join(sourceRoot,'*/public-api.ts')]},...config.angularCompilerOptions};
 const runs=[];
 for(const [id,overrides]of [['current-separated-directives',{}],['retained-import-cycle',fixture.files]]){
  const host=cli.createCompilerHost({options}),read=host.readFile.bind(host),loaded=new Set();
  host.readFile=file=>{if(file.startsWith(sourceRoot+'/'))loaded.add(file);return overrides[file.slice(root.length+1)]??read(file);};
  host.resolveModuleNames=(names,from)=>names.map(spec=>ts.resolveModuleName(spec,
   spec.startsWith('.')||spec.startsWith('@ngx-compat/')?from:join(runtime,'diagnostic-anchor.ts'),options,ts.sys).resolvedModule);
  const program=cli.createProgram({rootNames:[join(sourceRoot,'legacy-table/public-api.ts')],options,host});
  const diagnostics=cli.defaultGatherDiagnostics(program).map(d=>({code:d.code,path:d.file?.fileName.slice(root.length+1),message:ts.flattenDiagnosticMessageText(d.messageText,'\n'),related:(d.relatedInformation||[]).map(r=>({path:r.file?.fileName.slice(root.length+1),message:ts.flattenDiagnosticMessageText(r.messageText,'\n')}))}));
  if(id==='current-separated-directives'){assert.deepEqual(diagnostics,[]);assert.equal(program.emit().emitSkipped,false);}
  else{assert.equal(diagnostics.length,1);assert.equal(diagnostics[0].code,-993003);assert.match(diagnostics[0].message,/import cycles/);assert.match(diagnostics[0].related.map(r=>r.message).join('\n'),/_LegacyTableOutlet/);assert.equal(diagnostics[0].path,'projects/ngx-material-legacy/legacy-table/table.ts');}
  runs.push({id,diagnostics,source_caps:[...loaded].filter(p=>!p.endsWith('.ngtypecheck.ts')&&read(p)!==undefined).sort().map(p=>({path:p.slice(root.length+1),sha256:sha(overrides[p.slice(root.length+1)]??read(p))}))});
 }
 const result={role:'Angular partial compiler regression on source table entry;not packed/native/floor qualification',node:process.version,typescript:ts.version,
  fixture_sha256:sha(readFileSync(fixtureFile)),source_subjects:fixture.source_commits,runs,required_consumer_css_scss_changes:false};
 const at=process.argv.indexOf('--report');if(at>=0)writeFileSync(process.argv[at+1],JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({current_diagnostics:runs[0].diagnostics.length,retained_cycle_diagnostics:runs[1].diagnostics.length}));
}finally{rmSync(temp,{recursive:true,force:true});}
