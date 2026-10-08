/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Execute authenticated tagged method bodies as an independent timing reference. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {fixture,load} from './dialog_initial_focus_runtime_probe.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url),ts=require('typescript');
const sha=b=>createHash('sha256').update(b).digest('hex');
const references=[];
function methods(path,hash,name,names) {
  const text=readFileSync(resolve(root,path),'utf8');assert.equal(sha(text),hash);
  const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);
  const declaration=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name);assert.ok(declaration);
  const selected=names.map(name=>{const method=declaration.members.find(n=>n.name?.getText(file)===name);
    assert.ok(method?.body);return method.getText(file).replace(/^(?:private|protected)\s+/,'');});
  references.push({path,sha256:hash,method_names:names});return selected.join('\n');
}
const referenceContainer=methods('reference/material-16.2.14/dialog-focus-sources/cdk-dialog-container.ts',
  '571d6c3017e773229880a6da96b6e5c322c462b20e2c9784c85a291a96d12545','CdkDialogContainer',
  ['_trapFocus','_forceFocus','_focusByCssSelector','_containsFocus','_focusDialogContainer']);
const readiness=methods('reference/material-16.2.14/dialog-focus-sources/focus-trap.ts',
  '8ad7f0fb6b7814ac981a51b48dd6ad39c8035b9f638d58041ea409a6fe76c8f5','FocusTrap',
  ['focusInitialElementWhenReady','_executeOnStable']);
const input=`import {take} from ${JSON.stringify(pathToFileURL(require.resolve('rxjs/operators')).href)};
const _getFocusedElementPierceShadowDom=()=>document.activeElement;
export class ReferenceContainer {${referenceContainer}}
export class ReferenceReadiness {${readiness}}`;
const js=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {ReferenceContainer,ReferenceReadiness}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const args=process.argv.slice(2),baseline=args.includes('--baseline'),override=args.indexOf('--before');
const paths=['projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.ts',
  'projects/ngx-material-legacy/legacy-dialog/internal/dialog-initial-focus.ts'];
const source=paths.map((path,index)=>readFileSync(override===-1?resolve(root,path):args[override+1+index],'utf8'));
const Base=await load(...source);
async function trace(mode,unstable,empty,original) {
  const f=fixture(Base,mode,true,{unstableZone:unstable});let trap;
  if(mode==='button')f.second.selector='button';if(empty)f.host.children=[];
  let container=f.instance;
  if(original){
    trap=f.factory.create(f.host,true);
    const ready=new ReferenceReadiness();ready._ngZone=f.zone;ready.focusInitialElement=trap.focusInitialElement.bind(trap);
    container=Object.assign(new ReferenceContainer(),{_elementRef:f.args[0],_config:f.config,
      _interactivityChecker:f.args[4],_ngZone:f.zone,_focusTrap:ready});
  }
  const result=[];
  const snapshot=at=>result.push({at,active:f.document.activeElement?.name||null,
    focus:f.log.filter(e=>e.kind==='focus').map(e=>e.name)});
  try{container._trapFocus();snapshot('returned');await Promise.resolve();snapshot('first-microtask');
    f.zone.isStable=true;f.stable.next();snapshot('zone-stable');await Promise.resolve();snapshot('next-microtask');
    return result;
  }finally{
    // Reference selector listeners have their original blur/mousedown cleanup.
    for(const[key,listener]of [...f.listeners])if(key.endsWith(':blur'))listener();
    trap?.destroy();f.destroy();
  }
}
const cases=[];
for(const[mode,unstable,empty]of[[false,true,false],['dialog',true,false],['first-heading',true,false],
  ['button',true,false],['first-tabbable',false,false],['first-tabbable',true,false],
  ['first-tabbable',false,true],['first-tabbable',true,true]]){
  const original=await trace(mode,unstable,empty,true),candidate=await trace(mode,unstable,empty,false);
  let result='pass';try{assert.deepEqual(candidate,original);}catch{result='fail';}
  cases.push({id:`${mode}/unstable-${unstable}/empty-${empty}`,result,original,candidate});
}
if(!baseline)assert.ok(cases.every(c=>c.result==='pass'),JSON.stringify(cases.filter(c=>c.result==='fail')));
const report={schema_version:1,role:'Independent tagged focus-method timing comparison;not full original/CDK/native/minimum execution',
 node:process.version,compiler:ts.version,references,
 sources:paths.map((path,index)=>({path,sha256:sha(source[index])})),
 tooling_sha256:sha(readFileSync(fileURLToPath(import.meta.url))),cases,
 limits:['The complete untouched tagged sources authenticate every extracted method body;no candidate-generated expectation is used.',
 'A finite test-only adapter executes exact original container selection/readiness bodies. Constructors,portals,animation engine and complete original primitive are not executed.',
 'Plain DOM active-element adapter and borrowed current public FocusTrap initial selection isolate timing. Shadow behavior/lifecycle regression tests have their separate source receipts.',
 'No actual21/native/SSR/AOT/packed/canonical/floor qualification.']};
const at=args.indexOf('--report');if(at!==-1){assert.equal(existsSync(args[at+1]),false);writeFileSync(args[at+1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({cases:cases.length,failed:cases.filter(c=>c.result==='fail').map(c=>c.id),node:process.version,compiler:ts.version}));
