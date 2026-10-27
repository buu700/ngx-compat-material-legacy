/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Real compiler/migration faults in disposable source fixtures; no golden edits. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,symlinkSync,rmSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {measureLegacySassEntrypointScope} from '../scripts/measure-legacy-sass-entrypoint-scope.mjs';
const root=process.cwd(),hash=raw=>createHash('sha256').update(raw).digest('hex');
const read=path=>readFileSync(join(root,path));
const baseline=JSON.parse(read('compatibility/rc/21x-c04-sass-entrypoint-compiler-scope.json'));
assert.equal(baseline.result,'pass');assert.equal(baseline.line,'21.x');
for(const ref of [...baseline.input_members,...baseline.current_compiler_scope.owned_scss_population,baseline.producer])
  assert.equal(hash(read(ref.path)),ref.sha256,'changed baseline input '+ref.path);
const parents=[];
function fixture(){
  const target=mkdtempSync(join(tmpdir(),'ngx-legacy-sass-entrypoint-'));parents.push(target);
  const files=new Set([...baseline.input_members.map(ref=>ref.path),...baseline.current_compiler_scope.owned_scss_population.map(ref=>ref.path),
    'package.json','scripts/measure-legacy-sass-entrypoint-scope.mjs',
    'reference/material-16.2.14/environment-package-lock.json']);
  for(const path of files){mkdirSync(dirname(join(target,path)),{recursive:true});writeFileSync(join(target,path),read(path));}
  symlinkSync(resolve(root,'node_modules'),join(target,'node_modules'),'dir');return target;
}
function replace(target,path,before,after){
  const file=join(target,path),text=readFileSync(file,'utf8');assert.ok(text.includes(before));
  writeFileSync(file,text.replace(before,after));
}
const rejected=[];
try{
  const positive=measureLegacySassEntrypointScope({root:fixture()});
  assert.deepEqual(positive.compiler_exports,baseline.compiler_exports);
  assert.equal(positive.historical_variable_values_sha256,baseline.historical_variable_values_sha256);
  for(const [name,corrupt]of [
    ['removed-historical-variable',target=>replace(target,'projects/ngx-material-legacy/_index.scss','$red-palette, ','')],
    ['changed-historical-variable-value',target=>replace(target,'projects/ngx-material-legacy/styles/core/theming/_palette.scss','#ffebee','#ff0000')],
    ['global-shim-added-to-default-module',target=>{
      const index=join(target,'projects/ngx-material-legacy/_index.scss');
      writeFileSync(index,readFileSync(index,'utf8')+"\n@forward './styles/entrypoint-audit.import';\n");
      writeFileSync(join(target,'projects/ngx-material-legacy/styles/_entrypoint-audit.import.scss'),'// test-only global import shim\n');
    }],
    ['unreviewed-global-sass-export',target=>{
      const file=join(target,'projects/ngx-material-legacy/package.json'),data=JSON.parse(readFileSync(file));
      data.exports['./theming']={sass:'./_index.scss'};writeFileSync(file,JSON.stringify(data));
    }],
    ['old-import-no-longer-refused',target=>replace(target,'projects/ngx-material-legacy/schematics/migrate-legacy/sass-rewrite.js',
      'if (/@import','if (false && /@import')],
    ['changed-immutable-oracle',target=>{
      const file=join(target,'compatibility/rc/oracles/material-16.2.14-sass-api.json');
      writeFileSync(file,Buffer.concat([readFileSync(file),Buffer.from(' ')]));
    }],
  ]){
    const target=fixture();corrupt(target);assert.throws(()=>measureLegacySassEntrypointScope({root:target}));rejected.push(name);
  }
  const report={schema_version:1,line:'21.x',positive_unmodified_fixture:1,rejected,
    rejection_controls:rejected.length,actual_Sass_compiler_and_migration_used:true,
    immutable_oracle_or_product_files_changed:false,all_fixture_roots_removed:true,
    actual_native_artifact_browser_full_Sass_floor_or_audit_qualified:false,g13_claim:'not-passed'};
  if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report));
}finally{for(const path of parents)rmSync(path,{recursive:true,force:true});}
