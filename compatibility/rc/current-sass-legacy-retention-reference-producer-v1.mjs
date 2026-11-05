/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Three original16 default observations. No candidate or current source reader. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,posix,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';

const root=resolve(fileURLToPath(new URL('../..',import.meta.url))),hash=raw=>createHash('sha256').update(raw).digest('hex');
const inputs=[
 {path:'compatibility/rc/21x-c04-button-tokenization-tagged-sass-inputs.json.gz',sha256:'90a3d95d32230a9ba838be4f5e7c9067452fe8f646f5c0db289f064b92f12481',bytes:93478},
 {path:'compatibility/rc/original16-sass-source-diagnostic-identity.json',sha256:'324762d77a76762518b1a1b4328a4abaf2c388597fd03b1ef4323d736441ddbe',bytes:89908},
 {path:'compatibility/rc/oracles/material-16.2.14-sass-api.json',sha256:'76908825fdbb55fc188f0add372d371f473cd7874cbf575894247231ab854e2d'},
];
const data=inputs.map(ref=>{const raw=readFileSync(join(root,ref.path));assert.equal(hash(raw),ref.sha256);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);return JSON.parse(ref.path.endsWith('.gz')?gunzipSync(raw):raw);});
const [capsule,identity,oracle]=data,known=new Map(Object.values(identity.loaded_source_sets).flat().map(r=>[r.path,r]));
assert.equal(capsule.members.length,71);assert.equal(capsule.archives.length,17);assert.equal(capsule.all_dependency_graph_members_match_prior_original_source_identity,true);
const modules={};for(const row of capsule.members){const expected=known.get(row.path);assert.ok(expected);assert.equal(hash(row.body),row.sha256);assert.equal(Buffer.byteLength(row.body),row.bytes);assert.equal(row.sha256,expected.sha256);assert.equal(row.bytes,expected.bytes);modules['/'+row.path]=row.body;}
const harness=`@forward 'core/theming/theming' show define-palette, define-light-theme;
@forward 'core/theming/palette' show $indigo-palette, $pink-palette, $red-palette;
@forward 'core/typography/typography' show define-typography-config;
@forward 'legacy-button/button-theme' as legacy-button-* show legacy-button-color, legacy-button-typography, legacy-button-theme;
`;
modules['/@angular/material/_selected-retention-entry.scss']=harness;
const importer={canonicalize(value,context){
 if(value.startsWith('sass:'))return null;
 const path=value.startsWith('retention16:')?new URL(value).pathname:value.startsWith('@')?'/'+value:posix.normalize(posix.join(posix.dirname(context.containingUrl?.pathname??'/'),value));
 const parent=posix.dirname(path),name=posix.basename(path),choices=[path.endsWith('.scss')?path:path+'.scss',parent+'/'+(name.startsWith('_')?'':'_')+name+(name.endsWith('.scss')?'':'.scss'),path+'/_index.scss',path+'/index.scss'];
 const found=[...new Set(choices.filter(p=>Object.hasOwn(modules,p)))];if(!found.length)return null;assert.equal(found.length,1);return new URL('retention16:'+found[0]);
},load(url){assert.ok(Object.hasOwn(modules,url.pathname));return {contents:modules[url.pathname],syntax:'scss'};}};
const sass=createRequire(join(root,'package.json'))('sass');assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'));const cases=[];
for(const dimension of ['color','typography','theme']){
 const mixin='legacy-button-'+dimension,call='.sass-api-probe { @include m.'+mixin+'($__theme); }',program="@use '__entry__' as m;\n"+oracle.standard_theme+'\n'+call+'\n';
 const result=sass.compileString(program.replace("'__entry__'","'retention16:/@angular/material/selected-retention-entry'"),{style:'expanded',charset:false,importers:[importer],silenceDeprecations:['import','if-function','global-builtin','color-functions','slash-div'],logger:{warn(){},debug(){}}});
 assert.equal(hash(result.css),oracle.members.mixins[mixin].invocation.css_sha256);assert.equal(Buffer.byteLength(result.css),oracle.members.mixins[mixin].invocation.css_bytes);
 const loaded=result.loadedUrls.map(url=>{assert.equal(url.protocol,'retention16:');const body=modules[url.pathname];return {path:url.pathname,sha256:hash(body),bytes:Buffer.byteLength(body)};}).sort((a,b)=>a.path.localeCompare(b.path));
 cases.push({case_id:'mixin-css/'+mixin,call,program,program_sha256:hash(program),css:result.css,css_sha256:hash(result.css),css_bytes:Buffer.byteLength(result.css),loaded_sources:loaded});
}
const path='compatibility/rc/current-sass-legacy-retention-reference-producer-v1.mjs',body=readFileSync(join(root,path));
const report={schema_version:1,role:'Three finite untouched16 legacy-button defaults for current nested CSS comparisons',producer:{path,sha256:hash(body),bytes:body.length},inputs,reference_harness:harness,compiler:sass.info,compiler_calls:3,cases,candidate_compiled:false,current_source_or_artifact_admission:false};
writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({cases:cases.length,compiler_calls:3,original_oracle_hashes_match:true}));
