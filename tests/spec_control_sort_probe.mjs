/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual complete owned data source with the authenticated new array; no Angular view or floor claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {existsSync,readFileSync,writeFileSync,mkdtempSync,symlinkSync,rmSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tmpdir} from 'node:os';
import {delimiter,dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const parse=text=>{const file=ts.createSourceFile('sort.spec.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
const collect=(file,predicate)=>{const found=[];function visit(node){if(predicate(node))found.push(node);ts.forEachChild(node,visit);}visit(file);return found;};
const caseName='should be able to correctly sort an array of strings and numbers with left zero';
function values(text){const file=parse(text),tests=collect(file,n=>ts.isCallExpression(n)&&n.expression.getText(file)==='it'&&n.arguments[0].text===caseName);assert.equal(tests.length,1);const calls=collect(tests[0].arguments[1],n=>ts.isCallExpression(n)&&n.expression.getText(file)==='testSortWithValues');assert.equal(calls.length,1);const array=calls[0].arguments[0];assert.ok(ts.isArrayLiteralExpression(array));return array.elements.map(node=>{assert.ok(ts.isNumericLiteral(node)||ts.isStringLiteral(node));return ts.isNumericLiteral(node)?Number(node.text):node.text;});}
const packet=JSON.parse(gunzipSync(read('compatibility/rc/spec-control-test-source-subjects.json.gz'))),original=packet.subjects.find(row=>row.sha==='307ad0c8abf346232796e17ca7b05e4673ef9ac5');assert.ok(original&&original.members.length===1);const originalText=original.members[0].after.text;assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(originalText)+'\0').update(originalText).digest('hex'),'a3bb5b0129964020b6fdaab7644772930bb89668');
const testPath='projects/ngx-material-legacy/legacy-table/table-data-source.spec.ts',expected=values(originalText);assert.deepEqual(expected,['001','2',3,4,'apples','bananas','cherries','lemons','strawberries']);assert.deepEqual(values(read(testPath).toString()),expected,'candidate regression input differs from original patch');
const basePath='projects/ngx-material-legacy/legacy-table/internal/table-data-source-base.ts',facadePath='projects/ngx-material-legacy/legacy-table/table-data-source.ts',numberPath='projects/ngx-material-legacy/legacy-core/internal/coercion/number-property.ts';
const base=read(basePath).toString(),facade=read(facadePath).toString(),numeric=read(numberPath).toString(),directory=mkdtempSync(join(tmpdir(),'ngx-leading-zero-sort-'));
const emit=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
let report;
try{
 const dependencyRoot=[resolve(root,'node_modules'),...(process.env.NODE_PATH||'').split(delimiter).filter(Boolean)].find(path=>['typescript','@angular/core','@angular/cdk','rxjs'].every(name=>existsSync(join(path,name,'package.json'))));assert.ok(dependencyRoot,'prepared workspace dependencies are required');symlinkSync(dependencyRoot,join(directory,'node_modules'),'dir');await import(pathToFileURL(require.resolve('@angular/compiler')));
 const {DataSource}=await import(pathToFileURL(require.resolve('@angular/cdk/collections')));
 assert.equal(base.split("'@ngx-compat/material-legacy/legacy-core'").length,2);const adapted=base.replace("'@ngx-compat/material-legacy/legacy-core'","'./numeric.mjs'");writeFileSync(join(directory,'numeric.mjs'),emit(numeric));
 async function observe(source,suffix){
  writeFileSync(join(directory,'base-'+suffix+'.mjs'),emit(source));assert.equal(facade.split("'./internal/table-data-source-base'").length,2);writeFileSync(join(directory,'facade-'+suffix+'.mjs'),emit(facade.replace("'./internal/table-data-source-base'","'./base-"+suffix+".mjs'")));
  const {MatLegacyTableDataSource}=await import(pathToFileURL(join(directory,'facade-'+suffix+'.mjs'))),instance=new MatLegacyTableDataSource();assert.ok(instance instanceof DataSource);
  try{const rows=expected.map(prop=>({prop}));return instance.sortData(rows.slice().reverse(),{active:'prop',direction:'asc'}).map(row=>row.prop);}finally{instance.disconnect();}
 }
 const actual=await observe(adapted,'owned');assert.deepEqual(actual,expected);
 const needle='if (legacyIsNumberValue(value)) {';assert.equal(adapted.split(needle).length,2);const mutated=adapted.replace(needle,"if (value === '001') return 'zzz';\n    "+needle),wrong=await observe(mutated,'mutant');assert.notDeepEqual(wrong,expected,'leading-zero mutant unexpectedly passed');
 report={schema_version:1,line:packet.line,original_sha:original.sha,original_source_git_blob:'a3bb5b0129964020b6fdaab7644772930bb89668',candidate_case:caseName,input:expected,actual,whole_owned_class_and_facade_executed:true,genuine_public_CDK_DataSource_parent:true,sort_argument_is_property_protocol_not_Angular_MatSort_node:true,mutant:{variant:'mis-sort-leading-zero-value',rejected:true,observed:wrong},sources:[basePath,facadePath,numberPath,testPath].map(path=>({path,sha256:hash(read(path))})),producer_sha256:hash(read('tests/spec_control_sort_probe.mjs')),runtime:{node:process.version,typescript:ts.version,core:require('@angular/core/package.json').version,cdk:require('@angular/cdk/package.json').version,rxjs:require('rxjs/package.json').version,canonical_or_floor_qualified:false},temporary_directory_removed:false,actual_Angular_view_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}finally{rmSync(directory,{recursive:true,force:true});if(report)report.temporary_directory_removed=true;}
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
