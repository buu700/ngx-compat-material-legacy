/** Two ordinary Sass source integration proofs, with no component execution. */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,lstatSync,realpathSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {currentSpinnerSnackBridgeSourceSubject} from './parallel-spinner-snack-public-bridge-integration-source-subject.mjs';
assert.equal(process.versions.node,'24.21.0');
const root=resolve(process.argv[2]),line=process.argv[3],output=resolve(process.argv[4]);
assert.ok(output.startsWith(join(root,'compatibility/rc/parent-checkbox-button-current-token-proof-')));
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(join(root,p)),inputs=new Map();
const member=p=>{const raw=read(p),ref={path:p,sha256:hash(raw),bytes:raw.length};inputs.set(p,ref);return raw;};
const source=currentSpinnerSnackBridgeSourceSubject({root,read});assert.equal(source.line,line);
const catalog=JSON.parse(member('fixtures/sass/mixin-argument-contracts.json'));
const peerRoot=realpathSync(join(root,'node_modules/@angular/material'));
assert.equal(JSON.parse(member('node_modules/@angular/material/package.json')).version,line==='21.x'?'21.2.14':'22.1.7');
const runtime=new Map(),consumers=new Map();
for(const file of readdirSync(join(peerRoot,'fesm2022')).sort()){
 if(!file.endsWith('.mjs')||/test/i.test(file))continue;
 const relative='node_modules/@angular/material/fesm2022/'+file;assert.equal(lstatSync(join(peerRoot,'fesm2022',file)).isSymbolicLink(),false);
 const text=member(relative).toString();runtime.set(relative,text);
 for(const match of text.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)){
  const refs=consumers.get(match[1])??[];refs.push({path:relative,offset:match.index,snippet:text.slice(Math.max(0,match.index-75),match.index+150)});consumers.set(match[1],refs);
 }
}
const publicIndex=member('node_modules/@angular/material/_index.scss').toString();
const sass=createRequire(join(root,'package.json'))('sass');assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'));
const rows=[];
for(const family of ['checkbox','button']){
 const old=family==='checkbox'?'--mdc-checkbox-selected-icon-color':'--mdc-text-button-label-text-color';
 const current=family==='checkbox'?'--mat-checkbox-selected-icon-color':'--mat-button-text-label-text-color';
 const publicPath=`node_modules/@angular/material/${family}/_${family}-theme.scss`,publicSource=member(publicPath).toString();
 const forward=new RegExp("@forward ['\"]\\./"+family+'/'+family+"-theme['\"] as "+family+"-\\* show[^;]*\\b"+family+'-overrides\\b[^;]*;');
 assert.ok(forward.test(publicIndex));assert.ok(/@mixin overrides\(\$tokens(?:\s*:\s*\(\))?\)/.test(publicSource),'public override definition missing');
 const probe=catalog.cases.find(row=>row.case_id===`mixin-argument/${family}-theme/custom-full-theme`);assert.ok(probe);
 const logical="@use '__entry__' as m;\n"+catalog.setup+'\n'+probe.call+'\n';
 const program=logical.replace("'__entry__'","'projects/ngx-material-legacy'");
 const result=sass.compileString(program,{url:pathToFileURL(join(root,'compatibility/rc/parent-checkbox-button-current-token-proof-virtual.scss')),loadPaths:[root,join(root,'node_modules')],style:'expanded',charset:false,silenceDeprecations:['import','if-function','global-builtin','color-functions','slash-div'],logger:{warn(){},debug(){}}});
 const declarations=[...result.css.matchAll(/(--[a-zA-Z0-9_-]+): ([^;\n]+);/g)].map(match=>({property:match[1],value:match[2]}));
 const historical=declarations.filter(row=>row.property===old);assert.ok(historical.length>0);
 assert.equal(declarations.some(row=>row.property===current),false);assert.equal(consumers.has(old),false);assert.ok(consumers.get(current)?.length>0);
 rows.push({family,case_id:probe.case_id,call:probe.call,logical_program_sha256:hash(logical),compiler:sass.info,css:result.css,css_sha256:hash(result.css),css_bytes:Buffer.byteLength(result.css),loaded_urls:result.loadedUrls.map(url=>url.href),historical_property:old,historical_declarations:historical,current_property:current,current_property_emitted:false,old_property_consumers_in_non_testing_Material_FESM:0,current_consumers:consumers.get(current),stable_public_override_export:family+'-overrides',public_override_definition:publicPath,source_integration_gap_confirmed:true,rendered_failure_demonstrated:false});
}
source.assertCurrent();for(const ref of inputs.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}
writeFileSync(output,JSON.stringify({schema_version:1,line,node:process.version,scope:'Ordinary checkbox/button token-name integration; no old ordinary DOM/CSS or rendered/browser claim.',source_guard_inputs:source.bound,input_refs:[...inputs.values()],runtime_modules_scanned:runtime.size,rows,compile_calls:rows.length,owned_legacy_sources_edited:false,consumer_HTML_CSS_SCSS_changes_required:false,implementation_performed:false,actual_packed_native_rendered_floor_or_audit_qualified:false,g11_claim:'not-passed'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line,cases:rows.length,source_integration_gaps:rows.length,compiles:rows.length,rendered:false}));
