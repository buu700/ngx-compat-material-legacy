/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Fifteen existing individual cases only; never a full Sass or C04 owner run. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
assert.equal(process.versions.node,'24.21.0');
assert.equal(process.argv.length,5);
const root=resolve(process.argv[2]),line=process.argv[3],output=resolve(process.argv[4]);
const own=dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>readFileSync(join(root,p));
const snapshotPath='compatibility/rc/parallel-spinner-snack-public-bridge-before-state.json';
const snapshotRaw=read(snapshotPath),snapshot=JSON.parse(snapshotRaw).branches[line];
assert.equal(snapshot.root,root);
const oraclePath='compatibility/rc/oracles/material-16.2.14-sass-api.json',oracleRaw=read(oraclePath),oracle=JSON.parse(oracleRaw);
assert.equal(hash(oracleRaw),'76908825fdbb55fc188f0add372d371f473cd7874cbf575894247231ab854e2d');
const catalogPath='fixtures/sass/mixin-argument-contracts.json',catalogRaw=read(catalogPath),catalog=JSON.parse(catalogRaw);
const names=['progress-spinner-color','progress-spinner-theme','snack-bar-color','snack-bar-theme','snack-bar-typography'];
const defaults=names.map(name=>({case_id:'mixin-css/'+name,mixin:name,setup:oracle.standard_theme,call:`.sass-api-probe { @include m.${name}($__theme); }`,original_sha256:oracle.members.mixins[name].invocation.css_sha256}));
const argumentsCases=catalog.cases.filter(p=>names.includes(p.mixin)).map(p=>({...p,setup:catalog.setup}));
assert.equal(argumentsCases.length,10);
const sass=createRequire(join(root,'package.json'))('sass');
assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'));
const compiler=[['node_modules/sass/package.json','c6d07347951e35cf2fee0f4ffb14b9a298daba837d1f8d515d2e8cac064022a7',856],['node_modules/sass/sass.node.js','eb7a01ba57a04a0a421bdef0bf2f43558af4790b540a45501ec83900b07b0625',343],['node_modules/sass/sass.dart.js','30a2f37d9a2ee27d125681477ef5e1f3c29b446137921472bb9802f10d9e64e1',5675052]];
for(const[p,d,n]of compiler){const b=read(p);assert.equal(hash(b),d);assert.equal(b.length,n);}
const compile=program=>{const start=performance.now();const result=sass.compileString(program,{url:pathToFileURL(join(root,'compatibility/rc/parallel-spinner-snack-public-bridge-integration-virtual.scss')),loadPaths:[root,join(root,'node_modules')],style:'expanded',charset:false,silenceDeprecations:['import','if-function','global-builtin','color-functions','slash-div'],logger:{warn(){},debug(){}}});return {css:result.css,css_sha256:hash(result.css),css_bytes:Buffer.byteLength(result.css),program_sha256:hash(program),elapsed_ms:Math.round(performance.now()-start),loaded_urls:result.loadedUrls.map(u=>u.href)};};
/** Insert exactly the new declarations at their historical rule positions. */
function expectedCss(css,family){
 let count=0;
 const result=css.replace(/([^{}]+)\{([^{}]*)\}/g,(all,selector,body)=>{
  if(family==='progress-spinner'){
   assert.ok(selector.trim().endsWith('.mat-mdc-progress-spinner')||selector.trim().endsWith('.mat-mdc-progress-spinner.mat-accent')||selector.trim().endsWith('.mat-mdc-progress-spinner.mat-warn'));
   const out=body.replace(/(\n  --mdc-circular-progress-active-indicator-color: ([^;\n]+);\n)/g,(_,old,value)=>{count++;return old+`  --mat-progress-spinner-active-indicator-color: ${value};\n`;});
   assert.notEqual(out,body);return selector+'{'+out+'}';
  }
  assert.ok(selector.trim().endsWith('.mat-mdc-snack-bar-container'));
  let out=body.replace(/(\n  --mdc-snackbar-container-color: ([^;\n]+);\n  --mdc-snackbar-supporting-text-color: ([^;\n]+);\n)/g,(_,old,container,text)=>{count+=2;return old+`  --mat-snack-bar-container-color: ${container};\n  --mat-snack-bar-supporting-text-color: ${text};\n`;});
  out=out.replace(/(\n  --mdc-snackbar-supporting-text-font: ([^;\n]+);\n  --mdc-snackbar-supporting-text-line-height: ([^;\n]+);\n  --mdc-snackbar-supporting-text-size: ([^;\n]+);\n  --mdc-snackbar-supporting-text-weight: ([^;\n]+);\n)/g,(_,old,font,height,size,weight)=>{count+=4;return old+`  --mat-snack-bar-supporting-text-font: ${font};\n  --mat-snack-bar-supporting-text-line-height: ${height};\n  --mat-snack-bar-supporting-text-size: ${size};\n  --mat-snack-bar-supporting-text-weight: ${weight};\n`;});
  assert.notEqual(out,body);return selector+'{'+out+'}';
 });
 assert.ok(count>0);return {css:result,added_declarations:count};
}
const temp=mkdtempSync(join(tmpdir(),'spinner-snack-integration-cases-'));
const rows=[];try{
 const before=new Map();
 for(const ref of snapshot.before_modules){assert.equal(hash(ref.source),ref.sha256);const family=ref.path.includes('progress-spinner')?'progress-spinner':'snack-bar';const source=ref.source.replace(/@use '([^']+)'/g,(all,p)=>p.startsWith('.')?"@use '"+resolve(root,dirname(ref.path),p)+"'":all);const path=join(temp,family+'.scss');writeFileSync(path,source);before.set(family,path);}
 for(const probe of [...defaults,...argumentsCases]){
  const family=probe.mixin.startsWith('progress-spinner')?'progress-spinner':'snack-bar',dimension=probe.mixin.slice(family.length+1);
  const candidateProgram="@use 'projects/ngx-material-legacy' as m;\n"+probe.setup+'\n'+probe.call+'\n';
  const beforeCall=probe.call.replace('m.'+probe.mixin+'(','before.'+dimension+'(');
  const beforeProgram="@use 'projects/ngx-material-legacy' as m;\n@use '"+before.get(family)+"' as before;\n"+probe.setup+'\n'+beforeCall+'\n';
  const historical=compile(beforeProgram),current=compile(candidateProgram),model=expectedCss(historical.css,family);
  if(probe.original_sha256)assert.equal(historical.css_sha256,probe.original_sha256,'before output differs from untouched default oracle');
  assert.equal(current.css,model.css,'candidate differs beyond exact positioned current token additions');
  rows.push({case_id:probe.case_id,mixin:probe.mixin,variant:probe.variant??'default',call:probe.call,setup_sha256:hash(probe.setup),historical,current,added_declarations:model.added_declarations,before_equals_untouched_default_oracle:probe.original_sha256?true:null,existing_generic_exact_comparator_would_pass:false,exact_finite_bridge_model_pass:true});
 }
}finally{rmSync(temp,{recursive:true,force:true});}
const report={schema_version:1,line,role:'Existing15individualcase integration diagnostic, not canonical assertions or full651/498gate',node:process.versions.node,compiler:sass.info,compiler_inputs:compiler,input_refs:[snapshotPath,oraclePath,catalogPath].map(path=>{const raw=read(path);return {path,sha256:hash(raw),bytes:raw.length};}),source_bindings:snapshot.before_modules.map(m=>({path:m.path,before_sha256:m.sha256,current_sha256:hash(read(m.path)),current_bytes:read(m.path).length})),rows,case_count:rows.length,compile_calls:rows.length*2,all_finite_bridge_models_pass:true,goldens_or_exceptions_modified:false,full_sass_gate_or_owner_executed:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line,case_count:rows.length,compile_calls:report.compile_calls,exact_finite_bridge_model_pass:true,full_sass_or_owner_run:false}));
