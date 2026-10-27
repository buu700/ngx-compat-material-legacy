/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Tagged Material16 test logic against owned Sass; no external MDC installation. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {runArchivedImportNegative} from './sass-seal.mjs';
const archivePath='compatibility/rc/21x-c04-token-test-build-originals.json.gz';
const archiveHash='fb72581a66231022c7748b229394aaba010fe5fe25a688c97e9cbb99a6eb74a0';
const manifestPath='compatibility/vendored-sass-manifest.json';
const manifestHash='bf7adbb0e69ef9a0c8ec65197a3612a81d67f5a949843c686c7be64403117458';
const baselineHash='e81e448dfbdeb02b955cd30d461d327db107b0dba1cd0602d3c67d95e9a016ab';
const baselinePath='src/material/core/tokens/tests/test-validate-tokens.scss';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const ref=(path,raw)=>({path,sha256:hash(raw),bytes:raw.length});
export function ownedMdcTokenValidationInputs({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
  const raw=read(archivePath);assert.equal(hash(raw),archiveHash);
  const original=JSON.parse(gunzipSync(raw));assert.equal(original.sha,'7ed70fe4422e4324ea450604514337fa5e0ad880');
  assert.equal(original.tagged_reference.commit,'df60e733c60e572ba538f6ad0ceff3e63e527b53');
  const member=original.tagged_reference.members.find(row=>row.path===baselinePath);assert.ok(member);
  assert.equal(hash(member.body),baselineHash);assert.equal(member.sha256,baselineHash);
  const mraw=read(manifestPath);assert.equal(hash(mraw),manifestHash);const manifest=JSON.parse(mraw);
  assert.equal(manifest.version,'15.0.0-canary.bc9ae6c9c.0');assert.equal(manifest.files.length,119);assert.equal(manifest.packages.length,36);
  const slots=[...member.body.matchAll(/@include validate-slots\(\s*\$component: '([^']+)'/g)].map(row=>row[1]);
  assert.equal(slots.length,19);assert.equal(new Set(slots).size,19);assert.equal(slots.includes('m2.mdc.slider'),false);
  assert.deepEqual(slots.slice(-2),['m2.mdc.filled-text-field','m2.mdc.outlined-text-field']);
  return {source:member.body,slots,manifest,original,inputs:[ref(archivePath,raw),ref(manifestPath,mraw)]};
}
export function compileOwnedMdcTokenValidation({root=process.cwd(),source,slots}={}){
  const sass=createRequire(join(root,'package.json'))('sass');
  const styles=realpathSync(join(root,'projects/ngx-material-legacy/styles'));
  const entry=pathToFileURL(join(styles,'core/tokens/tests/_tagged-validation.scss'));
  const debug=[],warnings=[],requested=[];
  const result=sass.compileString(source,{url:entry,loadPaths:[],
    importers:[{findFileUrl(url){
      requested.push(url);
      if(url.startsWith('@material/')){
        const suffix=url.slice('@material/'.length);assert.ok(suffix.split('/').every(part=>part&&part!=='.'&&part!=='..')&&!suffix.includes('\\'));
        return pathToFileURL(join(styles,'vendor/mdc',suffix));
      }
      return null;
    }}],logger:{debug(message){debug.push(message);},warn(message){warnings.push(message);}},
    silenceDeprecations:['legacy-js-api','import','global-builtin','color-functions','slash-div','if-function','function-units','abs-percent','strict-unary']});
  assert.deepEqual(debug,slots.map(name=>'Validating '+name+'...'),'tagged slot case roster changed');
  assert.equal(result.css,'','the token-name test must not emit consumer CSS');
  const loaded=[];
  for(const url of result.loadedUrls){
    if(url.href===entry.href)continue;
    assert.equal(url.protocol,'file:');const path=realpathSync(fileURLToPath(url)),rel=relative(styles,path);
    assert.ok(rel&&!rel.startsWith('..')&&!rel.startsWith('/'),'foreign slot-test source '+path);
    const bytes=readFileSync(path);loaded.push(ref('projects/ngx-material-legacy/styles/'+rel,bytes));
  }
  assert.ok(loaded.length>100);assert.equal(new Set(loaded.map(row=>row.path)).size,loaded.length);
  for(const member of loaded)assert.equal(hash(readFileSync(join(root,member.path))),member.sha256,'changed loaded slot source');
  return {compiler:sass.info,executed_case_ids:[...slots],debug,css_bytes:0,loaded_sources:loaded,requested_imports:requested,
    archived_names_resolved_only_to_owned_vendor:true,warning_count:warnings.length};
}
export function measureOwnedMdcTokenSlots({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
  const input=ownedMdcTokenValidationInputs({root,read}),bound=new Map(input.inputs.map(row=>[row.path,row]));
  for(const member of input.manifest.files){
    const raw=read(member.dest);assert.equal(hash(raw),member.rewritten_sha256,'changed recorded MDC source '+member.dest);
    bound.set(member.dest,ref(member.dest,raw));
  }
  const compiled=compileOwnedMdcTokenValidation({root,source:input.source,slots:input.slots});
  for(const member of compiled.loaded_sources)bound.set(member.path,member);
  const lock='reference/material-16.2.14/environment-package-lock.json',lockBytes=read(lock);
  assert.equal(hash(lockBytes),'ad2f9d62bf04758f87650cae408f805e667236f992cd6d8e481c5577c939d130');bound.set(lock,ref(lock,lockBytes));
  const library='projects/ngx-material-legacy/package.json',libraryBytes=read(library),pkg=JSON.parse(libraryBytes);
  assert.ok(pkg.version.startsWith('21.'));assert.deepEqual(Object.keys(pkg.dependencies),['tslib']);
  assert.ok(pkg.peerDependencies['@angular/material'].startsWith('^21.'));bound.set(library,ref(library,libraryBytes));
  const rootPackage='package.json',rootBytes=read(rootPackage),workspace=JSON.parse(rootBytes);
  assert.equal(workspace.packageManager,'pnpm@12.4.2');
  for(const field of ['dependencies','devDependencies','peerDependencies','optionalDependencies']){
    assert.equal(Object.keys(workspace[field]??{}).some(name=>name.startsWith('@material/')),false);
  }
  bound.set(rootPackage,ref(rootPackage,rootBytes));
  const archivedResult=runArchivedImportNegative([]);assert.equal(archivedResult.result,'pass');assert.equal(archivedResult.compiled,false);
  assert.match(archivedResult.error,/sass-seal refused archived import: @material\/button/);
  // The actual diagnostic contains a random fixture path. Preserve its exact
  // rejection category so a fresh measurement can be compared byte for byte.
  const archived={case_id:archivedResult.case_id,result:archivedResult.result,kind:archivedResult.kind,
    compiled:false,rejected:true,error_category:'sass-seal refused archived import: @material/button'};
  const seal='scripts/sass-seal.mjs',sealBytes=read(seal);bound.set(seal,ref(seal,sealBytes));
  for(const member of bound.values())assert.equal(hash(read(member.path)),member.sha256,'late owned slot source '+member.path);
  const producer='scripts/measure-owned-mdc-token-slots.mjs',producerBytes=read(producer);
  return {schema_version:1,line:'21.x',result:'pass',role:'All19 authentic Material16 token-name checks against owned sources; CSS values, native components and floors remain separate.',
    original_sha:input.original.sha,tagged_reference_commit:input.original.tagged_reference.commit,
    reference_test_sha256:baselineHash,reference_cases:19,original_changed_contracts_present:2,
    original_twenty_case_test_executed:false,reference_difference:'The untouched16.2.14 test removes the upstream slider imports/call; both added text-field calls remain identical.',
    baseline_source_changed:false,compiled,recorded_vendor_members_matched:119,recorded_vendor_packages:36,
    current_direct_library_dependencies:Object.keys(pkg.dependencies),external_MDC_dependencies_installed_by_this_measurement:false,
    external_MDC_sources_loaded:0,
    consumer_archived_import_negative:archived,input_members:[...bound.values()],producer:ref(producer,producerBytes),
    consumer_files_written:0,full_651_Sass_rendered_packed_native_floor_or_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
}
