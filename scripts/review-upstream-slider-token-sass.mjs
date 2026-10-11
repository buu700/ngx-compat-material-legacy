/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Source-only original/current slider Sass review; explicit authenticated roots are required. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {mixinArgumentCatalog,measureMixinArgument,mixinArgumentResultsMatch} from './sass-mixin-arguments.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),sass=createRequire(import.meta.url)('sass');
const hash=b=>createHash('sha256').update(b).digest('hex');
const args=process.argv.slice(2);assert.equal(args.length,6,'--original-root <node_modules> --peer-root <node_modules> --out <new.json.gz> required');
assert.deepEqual([args[0],args[2],args[4]],['--original-root','--peer-root','--out']);
const originalRoot=realpathSync(args[1]),peerRoot=realpathSync(args[3]),out=resolve(args[5]);
const line=JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main';
const originalBytes=readFileSync(join(root,'compatibility/rc/original16-sass-source-diagnostic-identity.json'));assert.equal(hash(originalBytes),'324762d77a76762518b1a1b4328a4abaf2c388597fd03b1ef4323d736441ddbe');
const originalIdentity=JSON.parse(originalBytes),knownOriginal=new Map(Object.values(originalIdentity.loaded_source_sets).flat().map(r=>[r.path,r]));
for(const [path,r]of knownOriginal){const bytes=readFileSync(join(originalRoot,path));assert.equal(hash(bytes),r.sha256);assert.equal(bytes.length,r.bytes);}
const peerCatalog=JSON.parse(readFileSync(join(root,'fixtures/sass/default-companion-contracts.json'))),peerInputs=peerCatalog.peer_inputs[line];
const knownPeer=new Map(peerInputs.sources.map(r=>[(r.root+1)+'/'+r.path,r]));
for(const r of peerInputs.sources){const base=r.root===0?join(peerRoot,'@angular/material'):r.root===1?join(peerRoot,'@angular/cdk'):null;assert.ok(base);const bytes=readFileSync(join(base,r.path));assert.equal(hash(bytes),r.sha256);assert.equal(bytes.length,r.bytes);}
for(const name of ['material','cdk'])assert.equal(JSON.parse(readFileSync(join(peerRoot,'@angular',name,'package.json'))).version,line==='main'?'22.1.7':'21.2.14');
assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'));
const modernPath='projects/ngx-material-legacy/styles/slider/_slider-theme.scss',legacyPath='projects/ngx-material-legacy/styles/legacy-slider/_slider-theme.scss';
const taggedModern=readFileSync(join(originalRoot,'@angular/material/slider/_slider-theme.scss'),'utf8'),taggedLegacy=readFileSync(join(originalRoot,'@angular/material/legacy-slider/_slider-theme.scss'),'utf8');
assert.equal(readFileSync(join(root,modernPath),'utf8'),taggedModern.replaceAll("'@material/","'../vendor/mdc/"),'ordinary historical slider source changed beyond module relocation');
assert.equal(readFileSync(join(root,legacyPath),'utf8'),taggedLegacy,'legacy slider theme differs from untouched tag');
const catalog=mixinArgumentCatalog(),selected=catalog.cases.filter(p=>/^(?:legacy-)?slider-(?:color|typography|density|theme)$/.test(p.mixin));assert.equal(selected.length,14);
const rows=[],sourceSets={};
function intern(measurement){const key=hash(JSON.stringify(measurement.sources));sourceSets[key]=measurement.sources;const {sources,...rest}=measurement;return {...rest,loaded_sources_sha256:key};}
for(const probe of selected){
 const original=measureMixinArgument(sass,join(originalRoot,'@angular/material/_index.scss'),[originalRoot],catalog,probe,[originalRoot]);
 for(const r of original.sources){const known=knownOriginal.get(r.path);assert.ok(known);assert.equal(r.sha256,known.sha256);assert.equal(r.bytes,known.bytes);}
 const actual=measureMixinArgument(sass,join(root,'projects/ngx-material-legacy/_index.scss'),[peerRoot],catalog,probe,[join(root,'projects/ngx-material-legacy'),join(peerRoot,'@angular/material'),join(peerRoot,'@angular/cdk')]);
 for(const r of actual.sources.filter(r=>r.root!==0)){const known=knownPeer.get(r.root+'/'+r.path);assert.ok(known,'unqualified peer source '+r.path);assert.equal(r.sha256,known.sha256);assert.equal(r.bytes,known.bytes);}
 assert.ok(mixinArgumentResultsMatch(original,actual),'complete slider CSS drift: '+probe.case_id);
 const wrongCss=actual.css+'\n.wrong-slider-contract { color: red; }\n';assert.equal(mixinArgumentResultsMatch(original,{...actual,css:wrongCss,css_sha256:hash(wrongCss),css_bytes:Buffer.byteLength(wrongCss)}),false);
 rows.push({case_id:probe.case_id,call:probe.call,complete_css_matches:true,wrong_nonempty_css_rejected:true,original:intern(original),actual:intern(actual)});
 console.log(JSON.stringify({line,case_id:probe.case_id,complete_css_matches:true,bytes:actual.css_bytes}));
}
const report={schema_version:1,line,worksheet:'C04 individual b13c6aa slider token rewrite ownership and C02 historical configurable output',source_only:true,node:process.version,sass:sass.info,catalog_sha256:catalog.sha256,original_identity_sha256:hash(originalBytes),original_archive_packages:originalIdentity.packages,source_sets:sourceSets,rows,source_body_proof:[{path:modernPath,sha256:hash(readFileSync(join(root,modernPath))),original_sha256:hash(taggedModern),only_change:'Four @material module sources relocated to owned vendor/mdc; namespace bindings and all function/mixin bodies unchanged'},{path:legacyPath,sha256:hash(readFileSync(join(root,legacyPath))),original_sha256:hash(taggedLegacy),only_change:'None; complete source byte identity'}],negative_controls:rows.length,production_source_changes:false,required_consumer_HTML_CSS_SCSS_changes:false,native_execution:false,packed_artifact_used:false,full_651_or_498_executed:false,g11_claim:'not-passed'};
report.producer_sha256=hash(readFileSync(fileURLToPath(import.meta.url)));
const raw=Buffer.from(JSON.stringify(report,null,2)+'\n'),gzip=gzipSync(raw,{mtime:0});writeFileSync(out,gzip,{flag:'wx'});
console.log(JSON.stringify({line,cases:rows.length,negative_controls:rows.length,out,sha256:hash(gzip),uncompressed_sha256:hash(raw)}));
