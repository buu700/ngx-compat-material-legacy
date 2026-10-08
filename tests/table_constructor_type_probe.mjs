/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Strict source diagnostic with authenticated floor declarations; not floor runtime/AOT. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),req=createRequire(import.meta.url),ts=req('typescript');
const runtime=process.env.CLOSEOUT_DIAGNOSTIC_PEER_ROOT || root;
const argv=process.argv.slice(2),arg=name=>argv[argv.indexOf(name)+1];
assert.ok(argv.includes('--annotations'),'supply authenticated minimum @angular directory');
const annotations=resolve(arg('--annotations'));
const options={strict:true,noImplicitOverride:true,strictPropertyInitialization:false,noEmit:true,skipLibCheck:true,
  types:[],target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,
  experimentalDecorators:true,allowImportingTsExtensions:true};
const fixture=resolve(root,'__table_constructor_types__.ts');
const positive=`import {MatLegacyTable} from '${resolve(root,'projects/ngx-material-legacy/legacy-table/table.ts')}';
import {CdkTable} from '@angular/cdk/table';
const table=new MatLegacyTable<string>(); const publicParent:CdkTable<string>=table;
table.fixedLayout='true'; table.multiTemplateDataRows='false'; table.recycleRows=true;
table.dataSource=['row']; table.renderRows();
class ConsumerTable extends MatLegacyTable<string> {marker='consumer';}
const child=new ConsumerTable(); const legacyParent:MatLegacyTable<string>=child;`;
const negative=positive+'\nnew MatLegacyTable<string>({}, {}, {}, "table", {}, {}, {}, {}, {}, {}, {}, {});';
const sha=b=>createHash('sha256').update(b).digest('hex'),loaded=new Map();
function typesTarget(value){if(typeof value?.types==='string')return value.types;
 for(const key of ['import','default']){const found=typesTarget(value?.[key]);if(found)return found;}return null;}
function compile(text){
 const host=ts.createCompilerHost(options),original=host.getSourceFile.bind(host);
 host.getSourceFile=(p,l,...rest)=>p===fixture?ts.createSourceFile(p,text,l,true):original(p,l,...rest);
 host.resolveModuleNames=(specs,containing)=>specs.map(spec=>{
  if(spec.startsWith('@angular/')){
   const pkg=spec.split('/')[1],directory=resolve(annotations,pkg);
   const manifest=JSON.parse(readFileSync(resolve(directory,'package.json'),'utf8'));
   loaded.set('@angular/'+pkg,{package:'@angular/'+pkg,version:manifest.version,manifest_sha256:sha(readFileSync(resolve(directory,'package.json')))});
   const subpath='.'+spec.slice(('@angular/'+pkg).length),target=typesTarget(manifest.exports?.[subpath])||(subpath==='.'&&(manifest.types||manifest.typings));
   assert.ok(target,'minimum has no types export: '+spec);
   return ts.resolveModuleName(resolve(directory,target),containing,options,ts.sys).resolvedModule;
  }
  return ts.resolveModuleName(spec,containing,options,ts.sys).resolvedModule
    ||ts.resolveModuleName(spec,resolve(runtime,'__closeout_resolver__.ts'),options,ts.sys).resolvedModule;
 });
 return ts.getPreEmitDiagnostics(ts.createProgram([fixture],options,host)).map(d=>({code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ')}));
}
const good=compile(positive),bad=compile(negative);
assert.deepEqual(good,[]);assert.equal(bad.length,1,JSON.stringify(bad));assert.equal(bad[0].code,2554);assert.match(bad[0].message,/Expected 0 arguments, but got 12/);
const result={node:process.version,compiler:ts.version,annotations,loaded_packages:[...loaded.values()],positive:good,negative:bad,
  fixture:positive,options,source_sha256:sha(readFileSync(resolve(root,'projects/ngx-material-legacy/legacy-table/table.ts'))),
  limits:['Authenticated minimum peer declarations, borrowed host Node22/TypeScript6 and external dependency types.','No actual21 compiler/runtime, native/AOT/packed artifact or advertised floor execution.']};
if(argv.includes('--report'))writeFileSync(arg('--report'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({positive:good.length,expected_negative:bad.length,packages:result.loaded_packages.map(p=>p.package+'@'+p.version)}));
