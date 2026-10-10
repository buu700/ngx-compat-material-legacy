/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'), require=createRequire(import.meta.url), ts=require('typescript');
const read=p=>readFileSync(join(root,p),'utf8'), hash=s=>createHash('sha256').update(s).digest('hex');
const managerPath='projects/ngx-material-legacy/legacy-core/ripple/ripple-event-manager.ts';
const helperPath='projects/ngx-material-legacy/legacy-core/internal/dom/shadow-dom.ts';
const capsulePath='compatibility/rc/ripple-event-manager-original-subjects.json';
const manager=read(managerPath),helper=read(helperPath),capsule=JSON.parse(read(capsulePath));
const originalSources=capsule.sources.map(row=>{const text=gunzipSync(Buffer.from(row.gzip_base64,'base64')).toString();
  assert.equal(hash(text),row.sha256);assert.equal(Buffer.byteLength(text),row.bytes);return text;});
const parse=s=>ts.createSourceFile('source.ts',s,ts.ScriptTarget.Latest,true);
const taggedClass=parse(originalSources[0]).statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='RippleEventManager');
const taggedTarget=parse(originalSources[1]).statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='_getEventTarget');
assert.ok(taggedClass&&taggedTarget);
const emit=s=>{const r=ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});assert.equal(r.diagnostics.length,0);return r.outputText;};
const change=(s,a,b)=>{assert.equal(s.split(a).length,2,a);return s.replace(a,b);};
const outside="ngZone.runOutsideAngular(() => {\n        document.addEventListener(type, this, {capture: true, passive: true});\n      });";
const payload={manager:emit(manager),helper:emit(helper),original:taggedTarget.getText()+'\n'+taggedClass.getText(),
 mutations:{
  reversedOrder:{manager:emit(change(manager,'targets.forEach((handlers, element) => {','Array.from(targets).reverse().forEach(([element, handlers]) => {'))},
  noFallback:{helper:emit(change(helper,'return (event.target as T | null) ?? null;','return null;'))},
  noReplayGuard:{helper:emit(change(helper,'} catch {','} catch (error) { throw error;'))},
  noRootRemove:{manager:emit(change(manager,'document.removeEventListener(type, this, true);','void type;'))},
  insideZone:{manager:emit(change(manager,outside,'document.addEventListener(type, this, {capture: true, passive: true});'))},
  activeListener:{manager:emit(change(manager,'passive: true','passive: false'))},
  wrongCaptureRemoval:{manager:emit(change(manager,'document.removeEventListener(type, this, true);','document.removeEventListener(type, this, false);'))},
  unsharedListener:{manager:emit(change(manager,'if (!this._events.has(type)) {','if (true) {'))},
 }};
const compilerPath=process.env.CLOSEOUT_TYPESCRIPT_ROOT?join(resolve(process.env.CLOSEOUT_TYPESCRIPT_ROOT),'lib/typescript.js'):require.resolve('typescript');
const compiler=require(compilerPath);if(process.env.CLOSEOUT_TYPESCRIPT_ROOT)assert.equal(compiler.version,JSON.parse(readFileSync(join(process.env.CLOSEOUT_TYPESCRIPT_ROOT,'package.json'))).version);
const loaded=prepareMaterialPublicSubjects(root),results=[],types=[];
try {
 const worker=read('tests/ripple_event_manager_runtime_subject.mjs');
 for(const model of loaded.models){
  if(model.line!=='original'){
   const file=join(model.root,'ripple-event-manager-types.ts');
   const fixture=helper+'\n'+manager.replace("import {legacyGetEventTarget} from '../internal/dom/shadow-dom';",'')+`
declare const zone: import('@angular/core').NgZone;declare const element:HTMLElement;declare const handler:EventListenerObject;
const manager=new LegacyRippleEventManager();manager.addHandler(zone,'mousedown',element,handler);manager.removeHandler('mousedown',element,handler);
// @ts-expect-error The complete genuine public NgZone declaration is required.
manager.addHandler({},'mousedown',element,handler);
// @ts-expect-error Historical handlers remain EventListenerObject, not callback functions.
manager.addHandler(zone,'mousedown',element,()=>{});
// @ts-expect-error Event target generics remain EventTarget constrained.
legacyGetEventTarget<string>(new Event('click'));
`;
   writeFileSync(file,fixture);const diagnostics=compiler.getPreEmitDiagnostics(compiler.createProgram([file],{strict:true,noEmit:true,skipLibCheck:false,types:[],
    target:compiler.ScriptTarget.ES2022,module:compiler.ModuleKind.ESNext,moduleResolution:compiler.ModuleResolutionKind.Bundler,lib:['lib.es2022.d.ts','lib.dom.d.ts']}));
   assert.deepEqual(diagnostics.map(d=>compiler.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
   types.push({line:model.line,compiler:compiler.version,compiler_source_sha256:hash(readFileSync(compilerPath)),fixture_sha256:hash(fixture),negative_checks:3,whole_owned_manager_and_helper_strict_checked:true,legacy_AOT_compiled:false});
  }
  const zoneSubject=installNgZonePublicSubject(model,root);writeFileSync(join(model.root,'ripple-event-manager-payload.json'),JSON.stringify(payload));
  const path=join(model.root,'ripple-event-manager-subject.mjs');writeFileSync(path,worker);
  for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of[false,true]){
   const output=JSON.parse(execFileSync(process.execPath,['--max-old-space-size=512',path,model.line,mode,String(production)],{cwd:model.root,encoding:'utf8',timeout:10000,maxBuffer:1024*1024}));
   results.push({line:model.line,mode,production,zone_subject:zoneSubject,borrowed:model.borrowed,...output});
  }
 }
 const report={schema_version:1,node:process.version,parser:ts.version,results,strict_types:types,
  sources:[managerPath,helperPath,'tests/ripple_event_manager_runtime_probe.mjs','tests/ripple_event_manager_runtime_subject.mjs'].map(p=>({path:p,sha256:hash(read(p))})),
  original_subject:{path:capsulePath,sha256:hash(read(capsulePath))},public_namespace_capsule_sha256:loaded.capsule_hash,
  scope:'Complete original private event-manager constructor/methods/delegate and original target helper from untouched whole tagged modules; complete owned manager and shadow helper module. Genuine public original/minimum NgZone plus current public zoneful/zoneless providers. Explicit document/listener/Node containment/path protocols; only legacyGetEventTarget is executed from the full owned shadow helper module. No actual DOM/ShadowRoot/replayed Angular event, ripple renderer, legacy node DI, CSS/native/packed/AOT/consumer or full Node/Rx floor qualification.'};
 assert.equal(results.length,10);
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({subjects:10,cases:results.reduce((n,r)=>n+r.cases.length,0),mutation_rejections:results.reduce((n,r)=>n+r.mutations.length,0),native_or_packed_qualified:false}));
}finally{loaded.dispose();}
