/** Owned radio lifecycle execution and mutations; no packed/AOT/floor qualification. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const sha=b=>createHash('sha256').update(b).digest('hex'),entry=resolve(root,'projects/ngx-material-legacy/legacy-radio/internal/radio-base.ts');
const original=readFileSync(entry,'utf8');
await import(pathToFileURL(require.resolve('@angular/compiler')).href);
const {ElementRef}=await import(pathToFileURL(require.resolve('@angular/core')).href);

async function radioClasses(source){
  const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true,useDefineForClassFields:false,noLib:true,noEmitOnError:false};
  // Program emit retains the actual module closure and erases known type exports.
  // External declaration checking is deliberately outside this behavior diagnostic.
  const host=ts.createCompilerHost(options),read=host.readFile.bind(host);host.readFile=file=>file===entry?source:read(file);
  const program=ts.createProgram([entry],options,host),emitted=new Map(),urls=new Map(),sources=[];
  assert.equal(program.getSyntacticDiagnostics().length,0);program.emit(undefined,(file,text)=>emitted.set(file,text));
  function load(file){
    if(urls.has(file))return urls.get(file);
    assert.ok(file.startsWith(resolve(root,'projects/ngx-material-legacy')+'/'),'owned source outside the library');
    let compiled=emitted.get(file.slice(0,-3)+'.js');assert.equal(typeof compiled,'string');
    const sf=ts.createSourceFile(file,compiled,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),edits=[];
    for(const node of sf.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){
      const spec=node.moduleSpecifier.text;let url;
      if(spec.startsWith('.')){
        const base=resolve(dirname(file),spec),target=[base+'.ts',resolve(base,'index.ts')].find(p=>existsSync(p));assert.ok(target,'unresolved owned module');url=load(target);
      }else url=pathToFileURL(require.resolve(spec)).href;
      edits.push([node.moduleSpecifier.getStart(sf),node.moduleSpecifier.end,JSON.stringify(url)]);
    }
    for(const [start,end,text] of edits.sort((a,b)=>b[0]-a[0]))compiled=compiled.slice(0,start)+text+compiled.slice(end);
    const raw=file===entry?Buffer.from(source):readFileSync(file);sources.push({path:file.slice(root.length+1),sha256:sha(raw),bytes:raw.length});
    const url='data:text/javascript;base64,'+Buffer.from(compiled).toString('base64');urls.set(file,url);return url;
  }
  return {classes:await import(load(entry)),sources:sources.sort((a,b)=>a.path.localeCompare(b.path))};
}

function observations({_MatRadioGroupBase:Group,_MatRadioButtonBase:Button}){
  const cases=[],check=(id,body)=>{try{body();cases.push({id,result:'pass'});}catch(error){cases.push({id,result:'fail',error:error.message.slice(0,240)});}};
  check('touch-callback-before-mark',()=>{const calls=[],g=new Group({markForCheck(){calls.push('mark');}});g.registerOnTouched(()=>calls.push('touch'));g._touch();assert.deepEqual(calls,['touch','mark']);});
  check('absent-touch-callback-does-not-mark',()=>{let marks=0;const g=new Group({markForCheck(){marks++;}});g.onTouched=null;g._touch();assert.equal(marks,0);});
  const make=()=>{
    const calls=[],host=new ElementRef({}),cdr={markForCheck(){}},monitor={stopMonitoring(el){assert.equal(el,host);calls.push('stop');}},dispatcher={notify(){},listen(){calls.push('listen');return ()=>calls.push('unregister');}};
    return {button:new Button(null,host,cdr,monitor,dispatcher),calls};
  };
  check('destroy-before-init-and-view',()=>{const {button,calls}=make();assert.equal(button._inputElement,undefined);button.ngOnDestroy();assert.deepEqual(calls,['stop']);});
  check('destroy-after-init-before-view',()=>{const {button,calls}=make();button.ngOnInit();assert.equal(button._inputElement,undefined);button.ngOnDestroy();assert.deepEqual(calls,['listen','stop','unregister']);});
  check('missing-touch-target-view-is-safe',()=>{const {button}=make();assert.equal(button._inputElement,undefined);button._onTouchTargetClick({stopPropagation(){}});assert.equal(button.checked,true);});
  check('ready-touch-target-selects-and-focuses',()=>{const {button}=make();let focused=0;button._inputElement={nativeElement:{focus(){focused++;}}};button._onTouchTargetClick({stopPropagation(){}});assert.equal(button.checked,true);assert.equal(focused,1);});
  check('disabled-touch-target-does-not-select-or-focus',()=>{const {button}=make();let focused=0;button.disabled=true;button._inputElement={nativeElement:{focus(){focused++;}}};button._onTouchTargetClick({stopPropagation(){}});assert.equal(button.checked,false);assert.equal(focused,0);});
  return cases;
}
const positive=await radioClasses(original),cases=observations(positive.classes);assert.ok(cases.every(c=>c.result==='pass'),JSON.stringify(cases));
const replacements=[
  ['dropped-touch-mark',"      this.onTouched();\n      this._changeDetector.markForCheck();","      this.onTouched();",['touch-callback-before-mark']],
  ['unsafe-touch-target','this._inputElement?.nativeElement.focus();','this._inputElement.nativeElement.focus();',['missing-touch-target-view-is-safe']],
  ['unsafe-early-destroy','ngOnDestroy() {\n    this._focusMonitor.stopMonitoring','ngOnDestroy() {\n    this._inputElement.nativeElement.removeEventListener("click", () => {});\n    this._focusMonitor.stopMonitoring',['destroy-before-init-and-view','destroy-after-init-before-view']],
  ['dropped-selection-cleanup','    this._removeUniqueSelectionListener();','    // mutation: cleanup removed',['destroy-after-init-before-view']],
];
const mutations=[];
for(const [id,before,after,expected] of replacements){
  assert.equal(original.split(before).length,2,'mutation must select exactly its own path');
  const modified=original.replace(before,after),observed=observations((await radioClasses(modified)).classes),failed=observed.filter(c=>c.result!=='pass').map(c=>c.id);assert.deepEqual(failed,expected,id);mutations.push({id,entry_sha256:sha(modified),rejected_by:failed});
}
const dependencies=Object.fromEntries(['@angular/core','@angular/compiler','@angular/cdk','@angular/material','typescript','rxjs'].map(name=>{
  const bytes=readFileSync(require.resolve(name+'/package.json'));return [name,{version:JSON.parse(bytes).version,manifest_sha256:sha(bytes)}];
}));
const report={role:'Execution of owned source classes with borrowed callback/lifecycle objects;not packed/AOT/native/floor qualification',node:process.version,compiler:ts.version,entry_sha256:sha(original),sources:positive.sources,dependencies,cases,mutations,limits:['No strict external declaration checking','No Angular template,zone or OnPush rendering claim','No minimum21/Node/RxJS-floor claim;native historical regressions remain required']};
const args=process.argv.slice(2);if(args.length){assert.equal(args.length,2);assert.equal(args[0],'--report');assert.equal(existsSync(args[1]),false,'diagnostic report must be new');writeFileSync(args[1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({cases:cases.length,passed:cases.filter(c=>c.result==='pass').length,mutations_rejected:mutations.length,source_modules:positive.sources.length,node:process.version,compiler:ts.version}));
