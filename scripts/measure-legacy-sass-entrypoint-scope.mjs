#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current namespaced Sass scope; no global-import, packed or full CSS claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {measureSassInspectionScope} from './measure-sass-inspection-scope.mjs';
import {enumerateModule,variableValues} from './sass-api-inventory.mjs';
import {expectedConditions} from './check-packed-exports.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const oraclePath='compatibility/rc/oracles/material-16.2.14-sass-api.json';
const oracleSha='76908825fdbb55fc188f0add372d371f473cd7874cbf575894247231ab854e2d';

export function measureLegacySassEntrypointScope({root=process.cwd()}={}){
  root=realpathSync(root);const read=path=>readFileSync(join(root,path));
  const scope=measureSassInspectionScope({root});assert.equal(scope.line,'21.x');
  const raw=read(oraclePath);assert.equal(hash(raw),oracleSha);const oracle=JSON.parse(raw);
  const sass=createRequire(join(root,'package.json'))('sass');
  assert.equal(JSON.parse(read('node_modules/sass/package.json')).version,oracle.provenance.sass_version);
  const moduleUrl='owned-legacy-entrypoint-scope',entry=join(root,'projects/ngx-material-legacy/_index.scss');
  const importers=[{findFileUrl(url){return url===moduleUrl?pathToFileURL(entry):null;}}];
  const names=enumerateModule(sass,moduleUrl,[join(root,'node_modules')],importers);
  const missing=[];
  for(const kind of ['variables','functions','mixins'])
    for(const name of Object.keys(oracle.members[kind]))if(!names[kind].includes(name))missing.push({kind,name});
  assert.deepEqual(missing,[],'historical namespaced export removed');
  const expectedValues=Object.fromEntries(Object.entries(oracle.members.variables).map(([name,row])=>[name,row.value]));
  const values=variableValues(sass,moduleUrl,[join(root,'node_modules')],Object.keys(expectedValues),importers);
  assert.deepEqual(values,expectedValues,'historical configurable/default variable value changed');
  const manifest=JSON.parse(read('projects/ngx-material-legacy/package.json'));
  const matrix=JSON.parse(read('compatibility/rc/matrices/library-exports.json'));
  const sourceSassConditions=Object.entries(manifest.exports).filter(([,value])=>value.sass)
    .map(([key,value])=>({key,target:value.sass}));
  assert.deepEqual(sourceSassConditions,[{key:'.',target:'./_index.scss'},{key:'./_index',target:'./_index.scss'}]);
  const plannedSassConditions=matrix.exports.flatMap(key=>{
    const value=expectedConditions(key);return value.sass?[{key,target:value.sass}]:[];
  });assert.deepEqual(plannedSassConditions,sourceSassConditions);
  const legacyLoads=scope.candidate.loaded_sources.filter(row=>
    row.path.endsWith('.import.scss')||row.path.endsWith('-legacy-index.scss')||row.path==='_theming.scss');
  assert.deepEqual(legacyLoads,[],'default module loaded a removed global compatibility entry');
  const rewrite=createRequire(join(root,'package.json'))('./projects/ngx-material-legacy/schematics/migrate-legacy/sass-rewrite.js').rewriteSassModuleSource;
  const cases=[];
  const inputs=[
    "@use '@angular/material' as mat;\n$x: mat.define-palette(mat.$red-palette);\n",
    "@use '@angular/material';\n$x: material.define-palette(material.$red-palette);\n",
    "@use '@angular/material' as retained with ($theme-ignore-duplication-warnings: true);\n$x: retained.define-palette(retained.$blue-palette);\n",
  ];
  for(const input of inputs){
    const result=rewrite(input);assert.equal(result.ok,true);assert.equal(result.changed,true);
    const expected=input.includes("' as ")?input.replace("'@angular/material'","'@ngx-compat/material-legacy'"):
      input.replace("'@angular/material'","'@ngx-compat/material-legacy' as material");
    assert.equal(result.content,expected);cases.push({kind:'module-source-only',before:input,after:result.content});
  }
  const negative=[];
  for(const [input,diagnostic]of [
    ["@import '@angular/material/theming';\n",'old-import'],
    ["@use '@angular/material' as *;\n",'wildcard-namespace'],
    ["@forward '@angular/material';\n",'forward-hide'],
  ]){
    const result=rewrite(input);assert.equal(result.ok,false);assert.equal(result.changed,false);
    assert.equal(result.content,input);assert.ok(result.diagnostics.some(value=>value.startsWith(diagnostic)));
    negative.push({kind:diagnostic,input,unchanged:true});
  }
  // Rehash every owned source observed by the compiler-scope owner after all
  // compilation/migration observations; no cached current bytes are admitted.
  for(const ref of scope.owned_scss_population){const current=read(ref.path);assert.equal(hash(current),ref.sha256);assert.equal(current.length,ref.bytes);}
  const inputPaths=['projects/ngx-material-legacy/_index.scss','projects/ngx-material-legacy/package.json',
    'projects/ngx-material-legacy/ng-package.json','compatibility/rc/matrices/library-exports.json',oraclePath,
    'projects/ngx-material-legacy/schematics/migrate-legacy/sass-rewrite.js',
    'scripts/measure-sass-inspection-scope.mjs','scripts/sass-api-inventory.mjs','scripts/check-packed-exports.mjs'];
  return {schema_version:1,line:scope.line,result:'pass',role:'Current default-module export/value and migration scope only; global compatibility paths and full CSS are not qualified.',
    current_compiler_scope:scope,compiler_exports:names,oracle_member_counts:oracle.counts,
    missing_historical_members:missing,historical_default_variables_matched:Object.keys(values).length,
    historical_variable_values_sha256:hash(JSON.stringify(values)),source_sass_conditions:sourceSassConditions,
    planned_sass_conditions:plannedSassConditions,removed_global_entrypoint_loads:legacyLoads,
    migration_positive:cases,migration_refusals:negative,all_owned_scss_rehashed:true,
    input_members:inputPaths.map(path=>{const raw=read(path);return {path,sha256:hash(raw),bytes:raw.length};}),
    producer:{path:'scripts/measure-legacy-sass-entrypoint-scope.mjs',sha256:hash(read('scripts/measure-legacy-sass-entrypoint-scope.mjs'))},
    packed_export_execution:false,full_651_Sass_cases_executed:false,
    actual_native_artifact_browser_floor_or_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.equal(process.argv.length,3,'one fresh output path required');
  const report=measureLegacySassEntrypointScope({root:resolve(dirname(fileURLToPath(import.meta.url)),'..')});
  writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({line:report.line,result:report.result,matched_default_variables:report.historical_default_variables_matched,
    historical_members:report.oracle_member_counts,loaded_removed_global_entries:report.removed_global_entrypoint_loads.length,
    migration_positive:report.migration_positive.length,migration_refusals:report.migration_refusals.length,full_Sass_or_native_or_audit_qualified:false}));
}
