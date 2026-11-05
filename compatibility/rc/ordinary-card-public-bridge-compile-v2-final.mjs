/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Two serial proposal batches only. No source owner, old constructor or original compiler. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,readdirSync,lstatSync,realpathSync,mkdtempSync,mkdirSync,copyFileSync,rmSync,existsSync} from 'node:fs';
import {isAbsolute,join,relative,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ordinaryCardPublicBridgeV2Css,ordinaryCardPublicBridgeV2ResultsMatch,ordinaryCardPublicBridgeV2BatchCss} from './ordinary-card-public-bridge-model-v2.mjs';
const root=process.cwd(),P='compatibility/rc/ordinary-card-public-bridge-';
const roots={'21.x':root,main:'/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy'};
const hash=value=>createHash('sha256').update(value).digest('hex');
const reference=(base,path)=>{const raw=readFileSync(join(base,path));return {path,sha256:hash(raw),bytes:raw.length};};
const read=path=>readFileSync(join(root,path)),json=path=>JSON.parse(read(path));
const order=(a,b)=>a.root-b.root||(a.path<b.path?-1:a.path>b.path?1:0);
const inputPins=[
 [P+'original-cases-v1.json','59e47c924f0f541b7b262a9ee31f6e55bc4160c1c420f683247a1703be470bbf'],
 [P+'original-batch-raw-v1.json','819b822f577913a47b052e0e396bd6c24117b51ad407e9eaaf24b4cb567184d3'],
 [P+'source-evidence-v1.json','b0c52d79790f3e404aca1e07119667687e85d7fabf76e848e5af9bd144c85453'],
 [P+'model-v1.mjs','0286969a007029a3628d8a56fb17c0ee2bbfecec735abdf5d95911ac7c709a83'],
 [P+'batch-program-v3.scss','6a722bc093232c439affd536b6a4eb16dd1deb2bd3d5bcf135c0f689cb72253a'],
 ['compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json','fd78f8c7f6e072fb7393c61aef782ccdf3a1c8d009227d08b29921ea2809e0a8'],
];
for(const[path,pin]of inputPins)assert.equal(hash(read(path)),pin);
const worksheet=json(P+'worksheet-v2.json'),packet=json(P+'original-cases-v1.json'),sourceEvidence=json(P+'source-evidence-v1.json');
const sourceIndex=json('compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json');
const proposal=read(worksheet.afterimage.path);assert.equal(hash(proposal),worksheet.afterimage.sha256);assert.equal(proposal.length,worksheet.afterimage.bytes);
const logical=read(P+'batch-program-v3.scss').toString();assert.equal(hash(logical),packet.logical_program_sha256);
const original=json(P+'original-batch-raw-v1.json');assert.equal(original.css,packet.raw_original_batch.css);
const expectedBatch=ordinaryCardPublicBridgeV2BatchCss(original.css);
const ownPaths=[...inputPins.map(([path])=>path),P+'worksheet-v2.json',P+'proposed-card-theme-v2.scss',P+'model-v2.mjs',P+'compile-v2-final.mjs'];
const ownInputs=ownPaths.map(path=>reference(root,path));
const checkOwn=()=>{for(const ref of ownInputs){assert.deepEqual(reference(root,ref.path),ref);assert.deepEqual(reference(roots.main,ref.path),ref);}};
function matches(base,ref){const raw=readFileSync(join(base,ref.path));assert.equal(hash(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes,ref.path);}
function ownedSnapshot(base){
 const rows=[];function walk(path){const file=join(base,path),stat=lstatSync(file);assert.equal(stat.isSymbolicLink(),false);
  if(stat.isDirectory()){for(const name of readdirSync(file).sort())if(name!=='node_modules')walk(path+'/'+name);}
  else if(path.endsWith('.scss')){assert.ok(stat.isFile());rows.push(reference(base,path));}}
 walk('projects/ngx-material-legacy');return rows;
}
const expectedSources={},sourceKeys={};
for(const[line,base]of Object.entries(roots)){
 const branch=sourceIndex.branches[line],selected=branch.cases.find(row=>row.case_id==='mixin-css/progress-spinner-color');assert.ok(selected);
 const rows=branch.source_sets[selected.source_set_sha256];assert.equal(hash(JSON.stringify(rows)),selected.source_set_sha256);
 sourceKeys[line]=selected.source_set_sha256;
 let changes=0;expectedSources[line]=rows.map(row=>{
  if(row.root!==0||row.path!=='styles/card/_card-theme.scss')return {...row};
  assert.equal(row.sha256,worksheet.before.sha256);assert.equal(row.bytes,worksheet.before.bytes);changes++;
  return {...row,sha256:worksheet.afterimage.sha256,bytes:worksheet.afterimage.bytes};
 }).sort(order);assert.equal(changes,1);assert.equal(rows.length,line==='21.x'?471:472);
}
function checkState(){
 checkOwn();assert.equal(process.versions.node,'24.21.0');
 for(const[line,base]of Object.entries(roots)){
  const historical=sourceEvidence.branches.find(row=>row.line===line);assert.ok(historical);
  const owned=historical.unchanged_owned409_git_refs.map(({path,sha256,bytes})=>({path,sha256,bytes}));
  assert.equal(owned.length,409);assert.deepEqual(ownedSnapshot(base).sort((a,b)=>a.path.localeCompare(b.path)),owned.slice().sort((a,b)=>a.path.localeCompare(b.path)));
  for(const ref of historical.inputs)matches(base,ref);
  for(const ref of sourceIndex.compiler_inputs)matches(base,ref);
  const minimum=line==='21.x'?'21.2.14':'22.1.7';
  for(const name of ['material','cdk']){const identity=JSON.parse(readFileSync(join(base,'node_modules/@angular',name,'package.json')));assert.equal(identity.name,'@angular/'+name);assert.equal(identity.version,minimum);}
  const publicCard=readFileSync(join(base,'node_modules/@angular/material/card/_m3-card.scss'),'utf8');
  for(const name of ['elevated-container-shape','outlined-container-shape','outlined-outline-width','elevated-container-color','elevated-container-elevation','outlined-container-color','outlined-container-elevation','outlined-outline-color'])assert.ok(publicCard.includes('card-'+name+':'));
  const consumers=readFileSync(join(base,'node_modules/@angular/material/fesm2022/card.mjs'),'utf8');
  for(const name of ['elevated-container-shape','outlined-container-shape','outlined-outline-width'])assert.ok(consumers.includes('var(--mat-card-'+name+','));
  for(const row of expectedSources[line]){
   assert.ok([0,1,2].includes(row.root));assert.ok(row.path.split('/').every(p=>p&&p!=='.'&&p!=='..'&&!p.includes('\\')));
   const path=['projects/ngx-material-legacy/','node_modules/@angular/material/','node_modules/@angular/cdk/'][row.root]+row.path;
   if(row.root===0&&row.path==='styles/card/_card-theme.scss')assert.equal(hash(proposal),row.sha256);
   else matches(base,{path,sha256:row.sha256,bytes:row.bytes});
  }
 }
}
const checks=[],check=(name,fn)=>{fn();checks.push(name);},measurement=css=>({css,css_sha256:hash(css),css_bytes:Buffer.byteLength(css)});
let baseCases=0,colorCases=0,unchangedCases=0,omissionControls=0,getters=0;
for(const row of packet.cases){
 const expected=ordinaryCardPublicBridgeV2Css({caseId:row.case_id,originalCss:row.original.css});
 const match=actual=>ordinaryCardPublicBridgeV2ResultsMatch({caseId:row.case_id,original:row.original,actual:measurement(actual)});
 check('pure exact model '+row.case_id,()=>assert.ok(match(expected)));
 check('strict raw whitespace '+row.case_id,()=>assert.equal(match(expected+'\n'),false));
 check('wrong before CSS '+row.case_id,()=>assert.throws(()=>ordinaryCardPublicBridgeV2Css({caseId:row.case_id,originalCss:row.original.css+' '})));
 if(row.dimension==='theme'){baseCases++;check('three exact theme-only base values '+row.case_id,()=>{assert.ok(expected.startsWith(row.selector+' {\n  --mat-card-elevated-container-shape: 4px;\n  --mat-card-outlined-container-shape: 4px;\n  --mat-card-outlined-outline-width: 1px;\n}\n'));assert.equal(match(expected.replace('shape: 4px','shape: 12px')),false);});}
 if(['color','theme'].includes(row.dimension))colorCases++;else{unchangedCases++;check('unchanged dimension '+row.case_id,()=>assert.equal(expected,row.original.css));}
 for(const line of expected.split('\n').filter(line=>/^  --mat-card-(?:elevated|outlined)-/.test(line))){omissionControls++;check('omit positioned token '+row.case_id+'/'+line.split(':')[0].trim(),()=>assert.equal(match(expected.replace(line+'\n','')),false));}
 check('no current-only filled alias '+row.case_id,()=>assert.equal(expected.includes('--mat-card-filled-'),false));
}
check('exact finite16 inventory',()=>{assert.equal(packet.cases.length,16);assert.equal(baseCases,5);assert.equal(colorCases,10);assert.equal(unchangedCases,6);assert.equal(omissionControls,65);});
check('whole original batch immutable',()=>assert.throws(()=>ordinaryCardPublicBridgeV2BatchCss(original.css+' ')));
check('unknown case rejected',()=>assert.throws(()=>ordinaryCardPublicBridgeV2Css({caseId:'unknown',originalCss:''})));
check('metadata getter rejected without invocation',()=>{const args={caseId:packet.cases[0].case_id};Object.defineProperty(args,'originalCss',{get(){getters++;return packet.cases[0].original.css;},enumerable:true});assert.throws(()=>ordinaryCardPublicBridgeV2Css(args));assert.equal(getters,0);});
function pieces(css){return packet.cases.map((row,index)=>{
 const begin='/*! ORDINARY-CARD-BEGIN '+index+' */',end='/*! ORDINARY-CARD-END '+index+' */';assert.equal(css.split(begin).length,2);assert.equal(css.split(end).length,2);
 const segment=css.slice(css.indexOf(begin)+begin.length,css.indexOf(end));if(row.dimension==='density'){assert.equal(segment,row.raw_segment);return '';}
 assert.ok(segment.startsWith(packet.framing.leading)&&segment.endsWith(packet.framing.trailing));return segment.slice(packet.framing.leading.length,-packet.framing.trailing.length);
});}
function loaded(urls,bases){return urls.map(url=>{
 assert.equal(url.protocol,'file:');const path=realpathSync(fileURLToPath(url));
 const index=bases.findIndex(base=>{const rel=relative(base,path);return rel!==''&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('../');});assert.ok(index>=0,'foreign proposal Sass source '+path);
 const rel=relative(bases[index],path).replaceAll('\\','/');let cursor=bases[index];for(const part of rel.split('/')){cursor=join(cursor,part);assert.equal(lstatSync(cursor).isSymbolicLink(),false);}
 const bytes=readFileSync(path);return {root:index,path:rel,sha256:hash(bytes),bytes:bytes.length};
 }).sort(order);}
const output=join(root,P+'qualification-v2.json');assert.equal(existsSync(output),false);let written=false;
const report={schema_version:2,role:'Card-only NEW proposal source-view and pure expectation; no current source/artifact acceptance',status:'in-progress',worksheet:reference(root,P+'worksheet-v2.json'),inputs:ownInputs,compiler_attempts:0,successful_compiles:0,original_reference_compiles:0,pure_checks:checks,pure_check_count:checks.length,model_scope:{cases:16,color_or_theme_cases:10,full_theme_base_cases:5,unchanged_typography_or_density_cases:6,positioned_additions_per_batch:65,omission_controls:65,getter_calls:getters},expected_batch:measurement(expectedBatch),results:[],source_index:{path:'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json',sha256:inputPins.at(-1)[1],role:'Frozen loaded source data only; no old physical constructor'},responsibility:{color:'Existing five-color proposal unchanged; resolved owned16 values',base:'Three theme-only fixed roles from owned16 untamable maps',filled:'Current-only appearance inherits current behavior; historical16 filled translation unsupported; no guessed outlined alias',typography:'Existing ten native MAT type variables retained',density:'Owned16/card current density maps empty; preserved'},source_readers_or_gates_executed:false,old_physical_constructor_executed:false,workspace_product_writes:0,current_source_owner_gate_manifest_golden_changes:0,actual_packed_native_browser_floor_or_fullowner_qualified:false,g11_claim:'not-passed'};
function save(){writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:written?'w':'wx'});written=true;}
try{
 checkState();
 for(const[line,base]of Object.entries(roots)){
  checkState();const view=mkdtempSync(join(tmpdir(),'ordinary-card-v2-'));
  try{
   const owned=sourceEvidence.branches.find(row=>row.line===line).unchanged_owned409_git_refs;
   for(const row of owned){const relativePath=row.path.slice('projects/ngx-material-legacy/'.length),path=join(view,relativePath);mkdirSync(dirname(path),{recursive:true});copyFileSync(join(base,row.path),path);}
   writeFileSync(join(view,'styles/card/_card-theme.scss'),proposal);
   const bases=[view,join(base,'node_modules/@angular/material'),join(base,'node_modules/@angular/cdk')].map(path=>realpathSync(path));
   // Exercise the exact recorder against every expected physical URL before Sass.
   assert.deepEqual(loaded(expectedSources[line].map(row=>pathToFileURL(join(bases[row.root],row.path))),bases),expectedSources[line]);
   const sass=createRequire(join(base,'package.json'))('sass');assert.equal(sass.info,packet.compiler);const warnings=[],start=performance.now();
   report.compiler_attempts++;const actual=sass.compileString(logical.replace("'__entry__'",JSON.stringify(pathToFileURL(join(view,'_index.scss')).href)),{style:'expanded',charset:false,loadPaths:[join(base,'node_modules')],silenceDeprecations:['import','if-function','global-builtin','color-functions','slash-div'],logger:{warn(message){warnings.push(message);},debug(){}}});report.successful_compiles++;
   const elapsed_ms=performance.now()-start,actualLoaded=loaded(actual.loadedUrls,bases);
   const result={line,minimum:line==='21.x'?'21.2.14':'22.1.7',compiler:sass.info,elapsed_ms,actual:measurement(actual.css),warnings,
    loaded_source_count:actualLoaded.length,loaded_source_sha256:hash(JSON.stringify(actualLoaded)),loaded_source_index_key:sourceKeys[line],
    loaded_source_index_patch:{root:0,path:'styles/card/_card-theme.scss',before:worksheet.before,after:worksheet.afterimage},
    loaded_source_index_exact_match:false,whole_raw_batch_matches:false};report.results.push(result);save();
   assert.deepEqual(actualLoaded,expectedSources[line]);result.loaded_source_index_exact_match=true;
   assert.equal(actual.css,expectedBatch);result.whole_raw_batch_matches=true;
   result.cases=pieces(actual.css).map((css,index)=>{const row=packet.cases[index];assert.ok(ordinaryCardPublicBridgeV2ResultsMatch({caseId:row.case_id,original:row.original,actual:measurement(css)}));return {case_id:row.case_id,dimension:row.dimension,sha256:hash(css),bytes:Buffer.byteLength(css),exact_raw_model:true};});
   assert.deepEqual(loaded(actual.loadedUrls,bases),actualLoaded);checkState();save();
  }finally{rmSync(view,{recursive:true,force:true});}
 }
 assert.equal(report.compiler_attempts,2);assert.equal(report.successful_compiles,2);checkState();report.status='pass';
 report.limits=['Two candidate source-view batches only, 16 retained logical cases each; no original recompile','No theme-only partial-config/repeat/inverse/ordinary aggregate compile in this bounded batch','No product application, current four-module owner/gate/report/manifest admission, packed or renderer proof','Card product requires future explicit fifth-module source authority and ordered/aggregate/C04 finite integration'];
 save();console.log(JSON.stringify({status:report.status,compiler_attempts:report.compiler_attempts,pure_check_count:report.pure_check_count,results:report.results.map(r=>({line:r.line,loaded_source_count:r.loaded_source_count,whole_raw_batch_matches:r.whole_raw_batch_matches,elapsed_ms:r.elapsed_ms}))}));
}catch(error){report.status='failed';report.error=String(error.stack??error);save();throw error;}
