#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Four independent original reviews share a finite historical Sass measurement. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,relative,resolve,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {compileInvocation,enumerateModule,invocationPlan,standardThemeSource,SILENCE} from './sass-api-inventory.mjs';

const sourceRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const archivePath='compatibility/rc/21x-c04-modern-control-base-originals.json.gz';
const archiveHash='d9460655c30d17096c08123b394dfbb3f886b460fcda8819ab7005ef226fa782';
const oraclePath='compatibility/rc/oracles/material-16.2.14-sass-api.json';
const oracleHash='76908825fdbb55fc188f0add372d371f473cd7874cbf575894247231ab854e2d';
const shaIds=['68096ec9d34aae793a7b3037c39e6ae7d1700933','c572dc4bf4d48448699288aeac2be14db0186a86',
  '65c97170d2b3d239fda25bd049ec417e0098fe12','7c16cc8b659133167f1b875dcfe77ca806bfe876'];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const ref=(path,raw)=>({path,sha256:hash(raw),bytes:raw.length});
const archiveRaw=readFileSync(join(sourceRoot,archivePath));assert.equal(hash(archiveRaw),archiveHash);
const original=JSON.parse(gunzipSync(archiveRaw)),worksheet=JSON.parse(original.worksheet_at_capture);
assert.deepEqual(original.reviews.map(row=>row.sha),shaIds);
assert.deepEqual(worksheet.selected_sha_ids,shaIds);
export const retentionSubjects=Object.freeze(worksheet.subjects.map(row=>Object.freeze({...row})));
const tagged=new Map(original.tagged_reference.members.map(row=>[row.path,row]));
assert.equal(original.tagged_reference.commit,'df60e733c60e572ba538f6ad0ceff3e63e527b53');
const stylePath=path=>'projects/ngx-material-legacy/styles/'+path.slice('src/material/'.length);
const resourcePath=path=>'projects/ngx-material-legacy/'+path.slice('src/material/'.length);

export function inspectLegacyThemeRetention({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
  const bound=new Map(),member=path=>{const raw=read(path);bound.set(path,ref(path,raw));return raw;};
  const entryPath='projects/ngx-material-legacy/_index.scss',entry=member(entryPath).toString(),subjects=[];
  for(const subject of retentionSubjects){
    const paths={modern:stylePath(subject.modern_theme),legacy:stylePath(subject.legacy_theme),
      structural:resourcePath(subject.legacy_structural)};
    const modern=member(paths.modern).toString(),legacy=member(paths.legacy).toString();
    assert.equal(modern,tagged.get(subject.modern_theme).body.replaceAll("'@material/","'../vendor/mdc/"));
    assert.equal(legacy,tagged.get(subject.legacy_theme).body,'legacy theme differs from untouched tag');
    assert.equal(/@mixin\s+base\s*\(/.test(modern+legacy),false);
    assert.equal(entry.includes(subject.modern_prefix+'-base'),false);
    const structural=member(paths.structural).toString();
    let expected=tagged.get(subject.legacy_structural).body
      .replace("@use '@angular/cdk';","@use '../styles/core/style/component-high-contrast' as cdk;")
      .replaceAll("@use '../core/","@use '../styles/core/")
      .replaceAll("@use '../datepicker/","@use '../styles/datepicker/")
      .replaceAll("@use '../divider/","@use '../styles/divider/");
    if(['slider','snack-bar'].includes(subject.family))expected=expected.replaceAll('cdk.high-contrast(active, off)','cdk.high-contrast(active)');
    assert.ok(structural.startsWith(expected),'unreviewed historical structural delta: '+subject.family);
    const suffix=structural.slice(expected.length);
    if(subject.family!=='snack-bar')assert.equal(suffix,'');
    else {assert.equal(hash(suffix),'f521efad643bcd201a7637b0baaec9d99a64b4e25da7f4ed25a0ad0998ed0902');assert.equal(Buffer.byteLength(suffix),674);}
    // The existing engine-free snack motion suffix is recorded separately, never called tag equality.
    const stem=subject.legacy_structural.split('/').at(-1).replace(/\.scss$/,'');
    const directory=dirname(paths.structural),runtime=member(join(directory,stem+'.ts')).toString();
    assert.ok(runtime.includes("styleUrls: ['"+stem+".scss']"));
    assert.ok(runtime.includes("templateUrl: '"+stem+".html'"));
    const template=member(join(directory,stem+'.html')).toString();
    assert.equal(/mat-mdc-|\bmdc-/.test(template),false);
    assert.equal(/get-unthemable-tokens\(\)/.test(structural),false);
    subjects.push({...subject,paths,legacy_theme_exact_tagged_bytes:true,modern_theme_exact_after_MDC_relocation:true,
      structural_tagged_body_after_finite_owned_imports_and_high_contrast_call_transport:true,
      existing_non_tagged_motion_suffix:subject.family==='snack-bar'?{sha256:hash(suffix),bytes:Buffer.byteLength(suffix),
        role:'Existing owned engine-free motion; not requalified by this source review'}:null});
  }
  member('projects/ngx-material-legacy/styles/core/style/_component-high-contrast.scss');
  const oracleRaw=member(oraclePath);assert.equal(hash(oracleRaw),oracleHash);
  const manifest=JSON.parse(member('projects/ngx-material-legacy/package.json'));
  const line=manifest.version.startsWith('21.')?'21.x':'main';
  const peer=JSON.parse(member('node_modules/@angular/material/package.json'));
  assert.equal(peer.version,line==='21.x'?'21.2.14':'22.1.7');
  assert.equal(manifest.peerDependencies['@angular/material'],'^'+peer.version);
  const assertCurrent=()=>{
    assert.equal(hash(readFileSync(join(sourceRoot,archivePath))),archiveHash);
    for(const value of bound.values()){const raw=read(value.path);assert.equal(hash(raw),value.sha256,'late source change '+value.path);assert.equal(raw.length,value.bytes);}
  };
  assertCurrent();return {line,peer_version:peer.version,subjects,oracle:JSON.parse(oracleRaw),entryPath,bound:[...bound.values()],assertCurrent};
}

export function compileRetainedLegacyColor({root=process.cwd(),family,body}={}){
  const subject=retentionSubjects.find(row=>row.family===family);assert.ok(subject);
  const sass=createRequire(join(root,'package.json'))('sass');
  const theme=standardThemeSource().replaceAll('m.define-typography-config()','contract_typography.define-typography-config()')
    .replaceAll('m.define-','contract_model.define-').replaceAll('m.$','contract_palette.$');
  const prefix="@use '../core/theming/theming' as contract_model;\n@use '../core/theming/palette' as contract_palette;\n@use '../core/typography/typography' as contract_typography;\n";
  const program=prefix+body+'\n'+theme+'\n.sass-api-probe { @include color($__theme); }\n';
  const compiled=sass.compileString(program,{url:pathToFileURL(join(root,stylePath(subject.legacy_theme))),
    style:'expanded',silenceDeprecations:SILENCE,logger:{warn(){},debug(){}}});
  return {program_sha256:hash(program),css_sha256:hash(compiled.css),css_bytes:Buffer.byteLength(compiled.css)};
}

export function measureLegacyThemeRetention({root=process.cwd()}={}){
  root=realpathSync(root);const read=path=>readFileSync(join(root,path));
  const scope=inspectLegacyThemeRetention({root,read}),sass=createRequire(join(root,'package.json'))('sass');
  assert.equal(JSON.parse(read('node_modules/sass/package.json')).version,'1.104.1');
  const moduleUrl='owned-legacy-retention-contract',importers=[{findFileUrl(url){return url===moduleUrl?pathToFileURL(join(root,scope.entryPath)):null;}}];
  const names=enumerateModule(sass,moduleUrl,[join(root,'node_modules')],importers),cases=[],direct=[],loaded=new Map();
  const allowed=[{root:realpathSync(join(root,'projects/ngx-material-legacy')),prefix:'projects/ngx-material-legacy/'},
    ...['material','cdk'].map(name=>({root:realpathSync(join(root,'node_modules/@angular',name)),prefix:'node_modules/@angular/'+name+'/'}))];
  for(const subject of retentionSubjects){
    for(const suffix of ['color','theme','typography','density'])assert.ok(names.mixins.includes(subject.modern_prefix+'-'+suffix));
    assert.equal(names.mixins.includes(subject.modern_prefix+'-base'),false);
    for(const suffix of ['color','theme','typography']){
      const name=subject.legacy_prefix+'-'+suffix,entry=scope.oracle.members.mixins[name];assert.ok(names.mixins.includes(name));
      const plan=invocationPlan(name,entry,{});assert.equal(plan.invocable,true);
      const compiled=compileInvocation(sass,moduleUrl,[join(root,'node_modules')],plan.call,{importers});assert.equal(compiled.error,null);
      assert.equal(hash(compiled.css),entry.invocation.css_sha256,'historical CSS differs: '+name);
      assert.equal(Buffer.byteLength(compiled.css),entry.invocation.css_bytes);
      for(const url of compiled.loaded){
        const absolute=realpathSync(fileURLToPath(url));
        const group=allowed.find(group=>{const path=relative(group.root,absolute);return !isAbsolute(path)&&path!=='..'&&!path.startsWith('../');});
        assert.ok(group,'foreign Sass source '+absolute);
        const path=group.prefix+relative(group.root,absolute),raw=readFileSync(absolute);loaded.set(path,ref(path,raw));
      }
      const program=`@use '${moduleUrl}' as m;\n${standardThemeSource()}\n${plan.call}\n`;
      cases.push({case_id:'mixin-css/'+name,program_sha256:hash(program),css_sha256:hash(compiled.css),css_bytes:Buffer.byteLength(compiled.css),result:'pass'});
    }
    const actual=compileRetainedLegacyColor({root,family:subject.family,body:read(stylePath(subject.legacy_theme)).toString()});
    const expected=scope.oracle.members.mixins[subject.legacy_prefix+'-color'].invocation;
    assert.equal(actual.css_sha256,expected.css_sha256);assert.equal(actual.css_bytes,expected.css_bytes);
    direct.push({case_id:'direct-legacy-color/'+subject.family,...actual,result:'pass'});
  }
  for(const value of loaded.values()){const raw=read(value.path);assert.equal(hash(raw),value.sha256);assert.equal(raw.length,value.bytes);}
  scope.assertCurrent();return {schema_version:1,line:scope.line,result:'pass',peer_version:scope.peer_version,
    role:'Four separate original source decisions; finite historical Sass measurements only',compiler:sass.info,
    advertised_Material_minimum_equals_installed:true,authentic_reference:{path:archivePath,sha256:archiveHash},
    oracle:{path:oraclePath,sha256:oracleHash},subjects:scope.subjects,public_legacy_default_CSS_cases:cases,direct_original_legacy_color_cases:direct,
    retained_modern16_exports:retentionSubjects.flatMap(row=>['color','theme','typography','density'].map(suffix=>row.modern_prefix+'-'+suffix)),
    post16_base_exports_absent:retentionSubjects.map(row=>row.modern_prefix+'-base'),
    input_members:scope.bound,loaded_sources:[...loaded.values()].sort((a,b)=>a.path.localeCompare(b.path)),
    producer:ref('scripts/measure-legacy-theme-retention.mjs',readFileSync(fileURLToPath(import.meta.url))),
    actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.ok([3,4].includes(process.argv.length));const measured=measureLegacyThemeRetention({root:process.argv[3]??process.cwd()});
  writeFileSync(process.argv[2],JSON.stringify(measured,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({line:measured.line,result:measured.result,public_legacy_cases:measured.public_legacy_default_CSS_cases.length,
    direct_legacy_cases:measured.direct_original_legacy_color_cases.length,base_exports_absent:measured.post16_base_exports_absent.length}));
}
