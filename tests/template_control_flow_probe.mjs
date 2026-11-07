/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync,spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript'),esbuild=require('esbuild');
const hash=b=>createHash('sha256').update(b).digest('hex');
const worksheet=JSON.parse(readFileSync(join(root,'compatibility/rc/common-module-template-control-flow-worksheet.json')));
const subjects=prepareMaterialPublicSubjects(root), results=[], parsers=[], sources=[], negatives=[], differContracts=[];
const worker=readFileSync(join(root,'tests/template_control_flow_subject.mjs'));
const paginator=readFileSync(join(root,'projects/ngx-material-legacy/legacy-paginator/paginator.ts'),'utf8');
const helper=readFileSync(join(root,'projects/ngx-material-legacy/legacy-paginator/internal/page-size-options.ts'),'utf8');
const helperJs=ts.transpileModule(helper,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,experimentalDecorators:true}}).outputText;
const provenance=JSON.parse(readFileSync(join(root,'reference/material-16.2.14/template-control-flow/provenance.json')));
for(const r of provenance.templates)assert.equal(hash(readFileSync(join(root,r.path))),r.sha256);
try{
 for(const model of subjects.models){
  const contracts=[];
  for(const [name,members]of [['IterableDiffers',['find']],['IterableDifferFactory',['create']],['IterableDiffer',['diff']],['IterableChanges',['forEachItem']],['IterableChangeRecord',['item','previousIndex']]]){
   const matches=[];for(const [path,text]of model.sources)if(path.startsWith('@angular/core/')&&path.endsWith('.d.ts')){
    const ast=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);for(const n of ast.statements)if((ts.isClassDeclaration(n)||ts.isInterfaceDeclaration(n))&&n.name?.text===name)matches.push({path,text,node:n});
   }
   assert.equal(matches.length,1,name);const {path,text,node}=matches[0];
   const stable=n=>assert.ok(!ts.getJSDocTags(n).some(t=>['deprecated','experimental','docs-private'].includes(t.tagName.text)),name+' unstable public contract');stable(node);
   for(const name of members){const member=node.members.find(m=>m.name?.getText()===name);assert.ok(member,name);stable(member);}
   contracts.push({name,path,sha256:hash(text),members});
  }differContracts.push({line:model.line,contracts});
  const compiler=await import(pathToFileURL(join(model.root,'node_modules/@angular/compiler/fesm2022/compiler.mjs')));
  const templates=[];
  for(const record of worksheet.owned_templates){
   const before=execFileSync('git',['-c','gc.auto=0','show',worksheet.source_parent+':'+record.path],{cwd:root,encoding:'utf8'});assert.equal(hash(before),record.sha256);
   const candidate=readFileSync(join(root,record.path),'utf8');
   for(const [variant,template] of model.line==='original'?[['before',before]]:[['before',before],['after',candidate]]){
    const parsed=compiler.parseTemplate(template,record.path);assert.ok(!parsed.errors?.length,parsed.errors?.map(e=>e.msg).join('; '));
    templates.push({family:record.path.split('/')[2],variant,template});
    if(record.path.includes('legacy-paginator'))templates.push({family:'legacy-paginator',variant:'custom/'+variant,template});
   }
   if(model.line!=='original'){
    if(record.path.includes('legacy-paginator'))templates.push({family:'legacy-paginator',variant:'negative/differ-teardown',template:candidate});
    const mutations=record.path.includes('legacy-tabs')?[['tabs-track-index',candidate.replaceAll('track tab;', 'track $index;')]]:
      record.path.includes('legacy-paginator')?[['paginator-track-index',candidate.replace('track pageSizeOption)', 'track $index)')]]:
      record.path.includes('legacy-progress-spinner')?[['circle-namespace',candidate.replace('<svg', '<div').replace('</svg>', '</div>')]]:
      record.path.includes('legacy-form-field')?[['required-marker',candidate.replace('!hideRequiredMarker && _control.required && !_control.disabled', 'false')]]:[];
    for(const [id,template]of mutations){assert.notEqual(template,candidate);templates.push({family:record.path.split('/')[2],variant:'negative/'+id,template});}
   }
   if(model.line==='main')sources.push({path:record.path,before_sha256:hash(before),candidate_sha256:hash(candidate)});
  }
  parsers.push({line:model.line,templates:templates.length});
  writeFileSync(join(model.root,'template-input.mjs'),`export const line=${JSON.stringify(model.line)};\nexport const templates=${JSON.stringify(templates)};\n`);
  writeFileSync(join(model.root,'template-options.mjs'),helperJs);
  writeFileSync(join(model.root,'template-options-no-teardown.mjs'),ts.transpileModule(helper.replace('this._differ = undefined;','').replace('this._items = [];','').replace('this.values = undefined;',''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,experimentalDecorators:true}}).outputText);
  writeFileSync(join(model.root,'template-subject.mjs'),worker);
  // Borrow the pinned host Zone.js runtime for this focused JIT template protocol only.
  const zone=require.resolve('zone.js');
  await esbuild.build({entryPoints:[join(model.root,'template-subject.mjs')],bundle:true,format:'iife',platform:'browser',outfile:join(model.root,'bundle.js'),banner:{js:readFileSync(zone,'utf8')},logLevel:'silent'});
  writeFileSync(join(model.root,'index.html'),'<probe-root></probe-root><pre id="report">pending</pre><script src="bundle.js"></script>');
  const chrome=[process.env.CHROME_BIN,'/usr/bin/chromium-browser','/snap/bin/chromium'].find(p=>p&&existsSync(p));assert.ok(chrome);
  const server=createServer((request,response)=>{const name=request.url==='/bundle.js'?'bundle.js':'index.html';response.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':'text/html');response.end(readFileSync(join(model.root,name)));});
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const address='http://127.0.0.1:'+server.address().port;
  let raw;try{raw=await new Promise((done,reject)=>{const child=spawn(chrome,['--headless','--disable-gpu','--no-first-run','--user-data-dir='+join(model.root,'chrome'),'--virtual-time-budget=2000','--dump-dom',address],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);const timer=setTimeout(()=>{child.kill();reject(new Error('Chromium timeout'));},20000);child.on('error',reject);child.on('close',code=>{clearTimeout(timer);code===0?done(stdout):reject(new Error('Chromium failed '+code+' '+stderr.slice(-1000)));});});}finally{server.close();}
  const encoded=raw.match(/<pre id="report">([\s\S]*?)<\/pre>/)?.[1];assert.ok(encoded,raw.slice(0,1200));const result=JSON.parse(encoded.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'));assert.ok(!result.error,result.error);results.push(result);
 }
 for(const candidate of results.slice(1))for(const original of results[0].results){
  const baseline=candidate.results.find(r=>r.family===original.family&&r.variant===original.variant);
  const actual=candidate.results.find(r=>r.family===original.family&&r.variant===original.variant.replace('before','after'));
  for(let i=0;i<original.states.length;i++){
   assert.deepEqual(baseline.states[i].identities,original.states[i].identities,candidate.line+' historical identity '+original.family+' '+original.states[i].name);
   assert.equal(actual.states[i].dom.length,baseline.states[i].dom.length);
   assert.ok(JSON.stringify(actual.states[i].dom)===JSON.stringify(baseline.states[i].dom)&&JSON.stringify(actual.states[i].identities)===JSON.stringify(baseline.states[i].identities),candidate.line+' '+original.family+' '+original.states[i].name+' differs');
  }
 }
 for(const candidate of results.slice(1))for(const result of candidate.results.filter(r=>r.variant.startsWith('negative/'))){
  const baseline=candidate.results.find(r=>r.family===result.family&&r.variant==='before');
  assert.ok(result.error||JSON.stringify(result.states)!==JSON.stringify(baseline.states),result.variant+' escaped');
  if(result.error)assert.match(result.error,/required marker|SVG circle namespace|owned differ state cleanup/);
  negatives.push({line:candidate.line,id:result.variant,rejected:true,reason:result.error||'actual DOM/view identity differs'});
 }
 const report={schema_version:1,line:worksheet.line,source_parent:worksheet.source_parent,sources,parsers,
   differContracts,results:results.map(r=>({line:r.line,warnings:r.warnings,families:r.results.map(f=>({...f,states:f.states?.map(s=>({name:s.name,dom_sha256:hash(JSON.stringify(s.dom)),identities:s.identities,...(s.differLifetime?{differLifetime:s.differLifetime}:{})}))}))})),negatives,public_subject_capsule_sha256:subjects.capsule_hash,producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),worker_sha256:hash(worker),paginator_sha256:hash(paginator),helper_sha256:hash(helper),
   scope:'Actual Chromium DOM and Angular JIT template control flow from authenticated Original16 and both minima, using exact owned parent/candidate templates, the actual owned view-scoped paginator directive and explicit material/CDK element/service protocols. Default/custom differ view creation and item identities match the historical directive. The private adapter releases its own references on view removal and invokes no unsupported differ callbacks. Owned-state cleanup is asserted separately and a missing-cleanup native mutant is rejected. Not full owned components, AOT, packed artifacts, native style/layout or runtime floors. No styles or consumer source edits.',g11_claim:'not-passed'};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({subjects:results.length,templates:sources.length,states:results.reduce((n,r)=>n+r.results.filter(f=>!f.variant.startsWith('negative/')).reduce((a,f)=>a+f.states.length,0),0),negative_controls:negatives.length,full_native_or_packed_qualified:false}));
}finally{subjects.dispose();}
