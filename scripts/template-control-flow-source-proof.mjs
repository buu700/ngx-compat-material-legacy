/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const compiler=await import(pathToFileURL(require.resolve('@angular/compiler'))),hash=b=>createHash('sha256').update(b).digest('hex');
const worksheet=JSON.parse(readFileSync(join(root,'compatibility/rc/common-module-template-control-flow-worksheet.json')));
function shape(raw,path){
 const parsed=compiler.parseTemplate(raw,path,{preserveWhitespaces:true});assert.ok(!parsed.errors?.length,parsed.errors?.map(e=>e.msg).join('; '));
 const nodes=[],conditions=[],switches=[],cases=[];
 const value=v=>(v?.source??v??'').trim().replace(/\s+/g,' ').replace(path.includes('legacy-paginator')?/pageSizeOption\.value/g:/$^/g,'pageSizeOption');
 const attrs=list=>(list||[]).map(a=>[a.name,value(a.value)]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 function visit(n,ancestors){const kind=n.constructor.name;
  if(kind==='Template')for(const a of n.templateAttrs||[]){if(a.name==='ngIf')conditions.push(value(a.value));if(a.name==='ngSwitchCase')cases.push(value(a.value));if(a.name==='ngSwitchDefault')cases.push('default');}
  if(kind==='Template'&&!n.templateAttrs?.length){const a=n.inputs.find(a=>a.name==='ngIf');if(a)conditions.push(value(a.value));}
  if(kind==='IfBlockBranch'&&n.expression)conditions.push(value(n.expression));
  if(kind==='SwitchBlock')switches.push(value(n.expression));
  if(kind==='SwitchBlockCase')cases.push(n.expression?value(n.expression):'default');
  if(kind==='Element'){
   const sw=n.inputs.find(a=>a.name==='ngSwitch');if(sw)switches.push(value(sw.value));
   if(n.name!=='ng-container'){
    nodes.push({kind,ancestors,name:n.name,attributes:attrs(n.attributes),inputs:attrs(n.inputs.filter(a=>a.name!=='ngSwitch')),
      outputs:(n.outputs||[]).map(a=>[a.name,value(a.handler)]),references:(n.references||[]).map(a=>[a.name,a.value])});
    ancestors=[...ancestors,n.name];
   }
  }
  if(kind==='Content')nodes.push({kind,ancestors,selector:n.selector});
  if(kind==='BoundText')nodes.push({kind,ancestors,value:value(n.value)});
  if(kind==='Text'&&n.value.trim())nodes.push({kind,ancestors,value:value(n.value)});
  for(const key of ['children','branches','groups','cases'])for(const child of n[key]||[])visit(child,ancestors);
 }
 parsed.nodes.forEach(n=>visit(n,[]));return {nodes,conditions:conditions.sort(),switches:switches.sort(),cases:cases.sort()};
}
export function proveTemplateControlFlow({readSource=p=>readFileSync(join(root,p),'utf8')}={}){
 const observations=[];
 for(const entry of worksheet.owned_templates){
  const before=execFileSync('git',['-c','gc.auto=0','show',worksheet.source_parent+':'+entry.path],{cwd:root,encoding:'utf8'});assert.equal(hash(before),entry.sha256);
  const candidate=readSource(entry.path);assert.doesNotMatch(candidate,/\*ng(?:If|For|Switch)|\[ng(?:If|Switch)/);
  assert.deepEqual(shape(candidate,entry.path),shape(before,entry.path),entry.path+' element/binding/control-flow contract changed');
  observations.push({path:entry.path,before_sha256:hash(before),candidate_sha256:hash(candidate)});
 }
 const product=execFileSync('git',['-c','gc.auto=0','ls-tree','-r','--name-only',worksheet.source_parent,'projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'}).trim().split('\n');
 const styles=product.filter(p=>/\.(css|scss)$/.test(p)).map(path=>{const before=execFileSync('git',['-c','gc.auto=0','show',worksheet.source_parent+':'+path],{cwd:root});const current=Buffer.from(readSource(path));assert.deepEqual(current,before,'stylesheet changed '+path);return{path,sha256:hash(current)};});
 const path='projects/ngx-material-legacy/legacy-paginator/paginator.ts',paginator=readSource(path),ast=ts.createSourceFile(path,paginator,ts.ScriptTarget.Latest,true);assert.equal(ast.parseDiagnostics.length,0);
 const before=execFileSync('git',['-c','gc.auto=0','show',worksheet.source_parent+':'+path],{cwd:root,encoding:'utf8'});
 assert.equal(paginator,before,'historical paginator constructor/source changed');
 const helperPath='projects/ngx-material-legacy/legacy-paginator/internal/page-size-options.ts';
 const helper=readSource(helperPath);assert.match(helper,/ngOnDestroy\(\): void/);assert.match(helper,/this\._differ\?\.onDestroy\(\)/);
 return{schema_version:1,line:worksheet.line,source_parent:worksheet.source_parent,observations,unchanged_styles:styles,paginator_sha256:hash(paginator),helper_sha256:hash(helper),
  scope:'Exact owned template element ancestry, static attributes, binding/event/reference/interpolation and projection selector structure, and unchanged predicates/cases; every pre-repair library stylesheet remains byte-identical. This source comparison supplements actual public-peer JIT DOM/view checks; it does not replace full owned component/AOT/packed/browser validation.',g11_claim:'not-passed'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const result=proveTemplateControlFlow();if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({templates:result.observations.length,unchanged_styles:result.unchanged_styles.length}));
}
