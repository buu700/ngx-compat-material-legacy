#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Five separate source decisions share only authentic reference and Sass measurement. */
import assert from 'node:assert/strict';
import {spinnerSnackC04Source} from './sass-spinner-snack-c04-source.mjs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {dirname,join,relative,resolve,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {compileInvocation,enumerateModule,invocationPlan,standardThemeSource,SILENCE} from './sass-api-inventory.mjs';

const sourceRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const archivePath='compatibility/rc/21x-c04-unthemable-token-placement-originals.json.gz';
const archiveHash='997e466e46efd9983304138a21491409bf37757243e48e7d89df4afbe75ff4b4';
const oraclePath='compatibility/rc/oracles/material-16.2.14-sass-api.json';
const oracleHash='76908825fdbb55fc188f0add372d371f473cd7874cbf575894247231ab854e2d';
export const tokenPlacementFamilies=Object.freeze(['checkbox','progress-bar','tooltip','progress-spinner','card']);
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const ref=(path,raw)=>({path,sha256:hash(raw),bytes:raw.length});
const stripPublicProgressBridge=source=>{
  for(const text of [
    '// Copyright Google LLC All Rights Reserved. MIT license; see LICENSE.\n// Copyright (c) 2026 Ryan Lester.\n',
    "@use '@angular/material' as mat;\n",
    '  // Current public peers consume mat-prefixed slots for the same M2 colors.\n  @include mat.progress-bar-overrides($color-tokens);\n',
  ]){assert.equal(source.split(text).length,2);source=source.replace(text,'');}
  return source;
};

export function inspectTokenPlacementSources({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
  const c04=spinnerSnackC04Source({root,read});
  const archiveRaw=readFileSync(join(sourceRoot,archivePath));assert.equal(hash(archiveRaw),archiveHash);
  const original=JSON.parse(gunzipSync(archiveRaw));assert.equal(original.reviews.length,5);
  assert.deepEqual(original.reviews.map(row=>row.family),tokenPlacementFamilies);
  const tagged=new Map(original.tagged_reference.members.map(row=>[row.path,row]));
  assert.equal(original.tagged_reference.commit,'df60e733c60e572ba538f6ad0ceff3e63e527b53');
  const bound=new Map();
  const member=path=>{const raw=read(path);bound.set(path,ref(path,raw));return raw;};
  const entryPath='projects/ngx-material-legacy/_index.scss',entry=member(entryPath).toString();
  const families=[];
  for(const family of tokenPlacementFamilies){
    const paths={modern:`projects/ngx-material-legacy/styles/${family}/_${family}-theme.scss`,
      legacy:`projects/ngx-material-legacy/styles/legacy-${family}/_${family}-theme.scss`,
      structural:`projects/ngx-material-legacy/legacy-${family}/${family}.scss`};
    const legacy=member(paths.legacy).toString(),modern=member(paths.modern).toString();
    const originalLegacy=tagged.get(`src/material/legacy-${family}/_${family}-theme.scss`);
    const originalModern=tagged.get(`src/material/${family}/_${family}-theme.scss`);
    assert.equal(legacy,originalLegacy.body,'historical legacy theme changed: '+family);
    const expectedModern=originalModern.body.replaceAll("'@material/","'../vendor/mdc/");
    if(['progress-spinner','checkbox','card'].includes(family))c04.assertHistoricalSource(paths.modern,expectedModern);
    else assert.equal(family==='progress-bar'?stripPublicProgressBridge(modern):modern,expectedModern,'modern16 source changed beyond reviewed relocation/bridge: '+family);
    for(const source of [legacy,modern,originalLegacy.body,originalModern.body])assert.equal(/@mixin\s+base\s*\(/.test(source),false);
    assert.equal(entry.includes(family+'-base'),false);
    member(paths.structural);
    families.push({family,paths,legacy_theme_exact_tagged_bytes:true,
      modern_theme_exact_tagged_bytes_after_MDC_import_relocation:!['progress-bar','progress-spinner','checkbox','card'].includes(family),
      historical_modern_source_exact_after_MDC_relocation:['progress-spinner','checkbox','card'].includes(family),separate_current_public_bridge:['progress-spinner','checkbox','card'].includes(family),
      separate_existing_public_progress_bridge:family==='progress-bar',introduced_base_mixin:false});
  }
  const oracleRaw=member(oraclePath);assert.equal(hash(oracleRaw),oracleHash);
  const manifest=JSON.parse(member('projects/ngx-material-legacy/package.json'));
  const line=manifest.version.startsWith('21.')?'21.x':'main';
  const peer=JSON.parse(member('node_modules/@angular/material/package.json'));
  assert.equal(peer.version,line==='21.x'?'21.2.14':'22.1.7');
  assert.equal(manifest.peerDependencies['@angular/material'],'^'+peer.version);
  for(const value of c04.bound)if(!bound.has(value.path))bound.set(value.path,value);
  const assertCurrent=()=>{c04.assertCurrent();
    assert.equal(hash(readFileSync(join(sourceRoot,archivePath))),archiveHash,'late original archive change');
    for(const value of bound.values()){const raw=read(value.path);assert.equal(hash(raw),value.sha256,'late source change '+value.path);assert.equal(raw.length,value.bytes);}
  };
  assertCurrent();return {line,peer_version:peer.version,families,original,oracle:JSON.parse(oracleRaw),
    bound:[...bound.values()],assertCurrent,entryPath,current_public_bridge:structuredClone(c04.summary),archive:{path:archivePath,sha256:archiveHash}};
}

export function compileLegacyColorSource({root=process.cwd(),family,body}={}){
  assert.ok(tokenPlacementFamilies.includes(family));
  const sass=createRequire(join(root,'package.json'))('sass');
  const theme=standardThemeSource().replaceAll('m.define-typography-config()', 'contract_typography.define-typography-config()')
    .replaceAll('m.define-', 'contract_model.define-').replaceAll('m.$','contract_palette.$');
  const prefix="@use '../core/theming/theming' as contract_model;\n@use '../core/theming/palette' as contract_palette;\n@use '../core/typography/typography' as contract_typography;\n";
  const program=prefix+body+'\n'+theme+'\n.sass-api-probe { @include color($__theme); }\n';
  const result=sass.compileString(program,{url:pathToFileURL(join(root,`projects/ngx-material-legacy/styles/legacy-${family}/_${family}-theme.scss`)),
    style:'expanded',silenceDeprecations:SILENCE,logger:{warn(){},debug(){}}});
  return {program_sha256:hash(program),css_sha256:hash(result.css),css_bytes:Buffer.byteLength(result.css)};
}

export function measureTokenPlacementContracts({root=process.cwd()}={}){
  root=realpathSync(root);const read=path=>readFileSync(join(root,path));
  const scope=inspectTokenPlacementSources({root,read}),sass=createRequire(join(root,'package.json'))('sass');
  assert.equal(JSON.parse(read('node_modules/sass/package.json')).version,'1.104.1');
  const moduleUrl='owned-token-placement-contract',importers=[{findFileUrl(url){return url===moduleUrl?pathToFileURL(join(root,scope.entryPath)):null;}}];
  const names=enumerateModule(sass,moduleUrl,[join(root,'node_modules')],importers);
  const cases=[],loaded=new Map(),direct=[];
  const base=realpathSync(join(root,'projects/ngx-material-legacy'));
  const allowed=[{id:'owned',root:base,prefix:'projects/ngx-material-legacy/'},
    ...['material','cdk'].map(name=>({id:name,root:realpathSync(join(root,'node_modules/@angular',name)),prefix:'node_modules/@angular/'+name+'/'}))];
  for(const family of tokenPlacementFamilies){
    for(const suffix of ['color','theme','typography','density'])assert.ok(names.mixins.includes(family+'-'+suffix));
    assert.equal(names.mixins.includes(family+'-base'),false,'post16 base export leaked: '+family);
    for(const suffix of ['color','theme','typography']){
      const name='legacy-'+family+'-'+suffix,original=scope.oracle.members.mixins[name];assert.ok(names.mixins.includes(name));
      const plan=invocationPlan(name,original,{});assert.equal(plan.invocable,true);
      const compiled=compileInvocation(sass,moduleUrl,[join(root,'node_modules')],plan.call,{importers});assert.equal(compiled.error,null);
      assert.equal(hash(compiled.css),original.invocation.css_sha256,'historical CSS differs: '+name);
      assert.equal(Buffer.byteLength(compiled.css),original.invocation.css_bytes);
      for(const url of compiled.loaded){
        const absolute=realpathSync(fileURLToPath(url));
        const group=allowed.find(group=>{const path=relative(group.root,absolute);return !isAbsolute(path)&&path!=='..'&&!path.startsWith('../');});
        assert.ok(group,'foreign Sass source '+absolute);const path=group.prefix+relative(group.root,absolute);
        const raw=readFileSync(absolute);loaded.set(path,ref(path,raw));
      }
      const program=`@use '${moduleUrl}' as m;\n${standardThemeSource()}\n${plan.call}\n`;
      cases.push({case_id:'mixin-css/'+name,program_sha256:hash(program),css_sha256:hash(compiled.css),css_bytes:Buffer.byteLength(compiled.css),result:'pass'});
    }
    const body=read(`projects/ngx-material-legacy/styles/legacy-${family}/_${family}-theme.scss`).toString();
    const actual=compileLegacyColorSource({root,family,body}),expected=scope.oracle.members.mixins['legacy-'+family+'-color'].invocation;
    assert.equal(actual.css_sha256,expected.css_sha256);assert.equal(actual.css_bytes,expected.css_bytes);
    direct.push({case_id:'direct-legacy-color/'+family,...actual,result:'pass'});
  }
  for(const value of loaded.values()){const raw=read(value.path);assert.equal(hash(raw),value.sha256);assert.equal(raw.length,value.bytes);}
  scope.assertCurrent();return {schema_version:1,line:scope.line,role:'Five individually scoped historical Sass contracts; no rendered/native/packed/full-matrix/audit credit',
    result:'pass',peer_version:scope.peer_version,advertised_Material_minimum_equals_installed:true,compiler:sass.info,
    authentic_reference:scope.archive,current_public_bridge:scope.current_public_bridge,oracle:{path:oraclePath,sha256:oracleHash},families:scope.families,
    public_selected_mixin_names:tokenPlacementFamilies.flatMap(family=>['color','theme','typography','density'].map(suffix=>family+'-'+suffix)
      .concat(['color','theme','typography'].map(suffix=>'legacy-'+family+'-'+suffix))),
    post16_base_exports_absent:tokenPlacementFamilies.map(family=>family+'-base'),
    public_legacy_default_CSS_cases:cases,direct_original_legacy_color_cases:direct,
    loaded_sources:[...loaded.values()].sort((a,b)=>a.path.localeCompare(b.path)),input_members:scope.bound,
    producer:ref('scripts/measure-unthemable-token-contracts.mjs',readFileSync(fileURLToPath(import.meta.url))),
    actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.ok([3,4].includes(process.argv.length),'output and optional actual source root required');
  const measured=measureTokenPlacementContracts({root:process.argv[3]??process.cwd()});
  writeFileSync(process.argv[2],JSON.stringify(measured,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({line:measured.line,result:measured.result,public_legacy_cases:measured.public_legacy_default_CSS_cases.length,
    direct_legacy_cases:measured.direct_original_legacy_color_cases.length,base_exports_absent:measured.post16_base_exports_absent.length}));
}
