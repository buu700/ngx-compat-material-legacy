/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual original-argument constructor and owned runtime, synthetic DOM/clocks. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {load, loadConfig, make, motionOverrideToken} from './dialog_motion_runtime_probe.mjs';
import {diParamsOf, packedShape, originalFactoryContract} from '../scripts/api-surface.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url), ts = require('typescript');
const url = name => pathToFileURL(require.resolve(name)).href;
const core = await import(url('@angular/core'));
const leafPath = 'projects/ngx-material-legacy/legacy-dialog/dialog-container.ts';
const referencePath = 'reference/material-16.2.14/dialog-focus-sources/legacy-dialog-container.ts';
const raw = readFileSync(resolve(root, leafPath), 'utf8'), reference = readFileSync(resolve(root, referencePath), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(reference), 'bb8e28be315bdef6d14e0243e9520527b1995d78cf7e6ee79e53c737794d352d');
const parsed = (path, text) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
const old = parsed(referencePath, reference), current = parsed(leafPath, raw);
const node = file => file.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'MatLegacyDialogContainer');
const oldDI = diParamsOf(node(old), old), newDI = diParamsOf(node(current), current);
assert.deepEqual(newDI.map(p => [p.ident,p.imported,p.optional,p.attribute]),
  oldDI.map(p => [p.ident,p.imported,p.optional,p.attribute]));
assert.equal(newDI.length, 9);assert.equal(newDI[2].spec, '@angular/core');
assert.equal(oldDI[2].spec, '@angular/common');assert.equal(newDI[7].ident, 'ChangeDetectorRef');
assert.equal(newDI[7].optional, false);assert.equal(newDI[8].ident, 'FocusMonitor');assert.equal(newDI[8].optional, false);
const shapes = [old,current].map(file => packedShape(file, 'MatLegacyDialogContainer'));
const constructor = shape => shape.signatures.filter(s => s.includes(' constructor('));
assert.deepEqual(constructor(shapes[1]), constructor(shapes[0]));
const factory = originalFactoryContract('/original/src/material/legacy-dialog/dialog-container.ts','MatLegacyDialogContainer');
assert.ok(factory);assert.equal(factory.deps_kind,'dependencies');
const factorySource=parsed('original-factory.ts','const factory='+factory.declaration+';');
const factoryObject=factorySource.statements[0].declarationList.declarations[0].initializer;
const factoryDeps=factoryObject.properties.find(p=>p.name?.getText(factorySource)==='deps').initializer.elements
 .map(dep=>({name:dep.properties.find(p=>p.name?.getText(factorySource)==='token').initializer.getText(factorySource).split('.').at(-1),
 optional:dep.properties.some(p=>p.name?.getText(factorySource)==='optional'&&p.initializer.kind===ts.SyntaxKind.TrueKeyword)}));
assert.deepEqual(factoryDeps,oldDI.map(p=>({name:p.imported,optional:p.optional})));
const state = file => node(file).members.find(n => n.name?.getText(file) === '_state').initializer.getText(file);
assert.equal(state(current), state(old));
const Config = await loadConfig();

async function observations(Leaf) {
  const cases = [];
  async function check(id, run) {
    try {await run();cases.push({id,result:'pass'});}
    catch(error) {cases.push({id,result:'fail',error:error.message.slice(0,450)});}
  }
  await check('original-nine-arguments-outside-angular-context', async () => {
    let marks=0;const detector={markForCheck(){marks++;}};
    const f=make(Leaf,'di-disabled',{manual:true,changeDetector:detector,configFactory:()=>new Config()});
    try {
      assert.equal(f.args.length,9);assert.equal(f.args[7],detector);assert.equal(f.args[8],f.monitor);
      assert.equal(f.instance._config,f.config);assert.ok(f.config instanceof Config);
      assert.equal(f.config.ariaModal,true);assert.equal(f.config.maxWidth,'80vw');
      assert.equal(f.instance._state,'enter');assert.equal(f.instance._animationsEnabled,true);
      f.instance._startExitAnimation();assert.equal(marks,1);assert.equal([...f.c.timers.values()][0].duration,75);
      f.c.frame();f.c.timer();assert.deepEqual(f.events.map(e=>e.state),['closing','closed']);
    } finally {f.close();}
  });
  await check('supplied-ninth-monitor-receives-restoration-origin',async()=>{
    const f=make(Leaf,'enabled',{manual:true,changeDetector:{markForCheck(){}}});
    const target=f.element('restore',true);f.config.restoreFocus=target;f.instance._closeInteractionType='keyboard';
    f.document.activeElement=f.document.body;
    try {f.destroy();assert.equal(f.document.activeElement,target);
      assert.equal(f.log.find(e=>e.kind==='monitor').origin,'keyboard');assert.equal(f.instance._closeInteractionType,null);
    } finally {f.close();}
  });
  await check('omitted-ninth-monitor-retains-manual-eight-argument-form',async()=>{
    const detector={markForCheck(){}};const f=make(Leaf,'enabled',{manual:true,noMonitor:true,changeDetector:detector});
    const target=f.element('restore',true);f.config.restoreFocus=target;f.document.activeElement=f.document.body;
    try {assert.equal(f.args.length,8);assert.equal(f.args[7],detector);f.destroy();
      assert.equal(f.document.activeElement,target);assert.equal(f.log.some(e=>e.kind==='monitor'),false);
    } finally {f.close();}
  });
  await check('supplied-detector-wins-over-ambient-view-detector',async()=>{
    let marks=0;const detector={markForCheck(){marks++;}};
    const f=make(Leaf,'di-disabled',{changeDetector:detector});
    const ambient=f.injector.get(core.ChangeDetectorRef);let ambientMarks=0;ambient.markForCheck=()=>ambientMarks++;
    try {f.instance._startExitAnimation();await Promise.resolve();assert.equal(marks,1);
      assert.equal(ambientMarks,0);assert.equal(f.instance._animationsEnabled,false);
    } finally {f.close();}
  });
  for(const mode of ['enabled','di-disabled','reduced-motion']) {
    await check('angular-motion-policy-retained:'+mode,async()=>{
      const f=make(Leaf,mode,{configFactory:()=>new Config()});
      try {assert.equal(f.instance._animationsEnabled,mode==='enabled');
        f.instance._startExitAnimation();
        if(mode==='enabled'){assert.equal([...f.c.timers.values()][0].duration,75);f.c.frame();f.c.timer();}
        else {assert.equal(f.c.timers.size,0);await Promise.resolve();}
        assert.deepEqual(f.events.map(e=>e.state),['closing','closed']);
      } finally {f.close();}
    });
  }
  await check('detector-that-destroys-on-mark-cannot-schedule-or-emit-closing',async()=>{
    let f;const detector={markForCheck(){f.destroy();}};f=make(Leaf,'enabled',{changeDetector:detector});
    try {f.instance._startExitAnimation();await Promise.resolve();assert.equal(f.events.length,0);
      assert.equal(f.c.timers.size,0);assert.equal(f.c.frames.size,0);assert.equal(f.completed(),1);
    } finally {f.close();}
  });
  await check('throwing-detector-does-not-leave-prior-opening-work',async()=>{
    const f=make(Leaf,'enabled',{changeDetector:{markForCheck(){throw Error('supplied detector failed');}}});
    try {f.instance._startOpenAnimation();assert.equal(f.c.timers.size,1);
      assert.throws(()=>f.instance._startExitAnimation(),/supplied detector failed/);
      assert.equal(f.c.timers.size,0);assert.equal(f.c.frames.size,0);
    } finally {f.close();}
  });
  await check('borrowed-detector-and-services-are-never-destroyed',async()=>{
    const detector={markForCheck(){},destroy(){throw Error('borrowed detector destroyed');}};
    const f=make(Leaf,'enabled',{manual:true,changeDetector:detector});
    for(const dependency of [f.factory,f.args[4],f.args[5],f.overlay,f.monitor])
      dependency.destroy=()=>{throw Error('borrowed dependency destroyed');};
    try {f.destroy();assert.equal(f.completed(),1);f.instance.ngOnDestroy();assert.equal(f.completed(),1);}
    finally {f.close();}
  });
  await check('all-supplied-focus-arguments-retained-through-leaf',async()=>{
    const f=make(Leaf,'enabled',{manual:true,changeDetector:{markForCheck(){}},config:{autoFocus:'first-heading'}});
    try {assert.equal(f.instance._elementRef,f.args[0]);assert.equal(f.instance._focusTrapFactory,f.factory);
      assert.equal(f.instance._document,f.document);assert.equal(f.instance._ngZone,f.args[5]);
      f.instance._trapFocus();await Promise.resolve();assert.equal(f.document.activeElement,f.heading);
      assert.equal(f.listeners.size,2);
    } finally {f.close();}
  });
  await check('active-di-policy-errors-are-not-swallowed-by-manual-fallback',async()=>{
    let f;
    try {assert.throws(()=>{f=make(Leaf,'enabled',{providers:[{provide:motionOverrideToken,
      useFactory(){throw Error('active policy failed');}}]});},/active policy failed/);}
    finally {f?.close();}
  });
  await check('post-destroy-exit-never-marks-borrowed-detector',async()=>{
    let marks=0;const f=make(Leaf,'enabled',{manual:true,changeDetector:{markForCheck(){marks++;}}});
    try {f.destroy();f.instance._startExitAnimation();assert.equal(marks,0);assert.equal(f.events.length,0);}
    finally {f.close();}
  });
  return cases;
}
const cases=await observations(await load());
assert.ok(cases.every(c=>c.result==='pass'),JSON.stringify(cases.filter(c=>c.result!=='pass')));
const mutations=[];
for(const [id,from,to,rejectedBy] of [
 ['wrong-monitor-position','overlayRef, focusMonitor);','overlayRef, this._changeDetectorRef);','supplied-ninth-monitor-receives-restoration-origin'],
 ['supplied-detector-ignored','this._changeDetectorRef.markForCheck();','/* ignored original detector */','supplied-detector-wins-over-ambient-view-detector'],
 ['manual-context-fallback-removed','    return false;','    throw Error(\'manual context rejected\');','original-nine-arguments-outside-angular-context'],
 ['angular-motion-policy-bypassed','  return legacyAnimationsDisabled();','  return false;','angular-motion-policy-retained:di-disabled'],
 ['initial-state-contract-lost',"_state: 'void' | 'enter' | 'exit' = 'enter';","_state: 'void' | 'enter' | 'exit' = 'void';",'original-nine-arguments-outside-angular-context'],
]) {
 assert.ok(raw.includes(from),id);const actual=await observations(await load(raw.replace(from,to)));
 assert.equal(actual.find(c=>c.id===rejectedBy).result,'fail',id);mutations.push({id,rejected_by:rejectedBy});
}
const overbroadFallback=raw.replace('  return legacyAnimationsDisabled();',
  "  try {return legacyAnimationsDisabled();} catch {return false;}");
assert.notEqual(overbroadFallback,raw);
const policyMutation=await observations(await load(overbroadFallback));
const policyCase='active-di-policy-errors-are-not-swallowed-by-manual-fallback';
assert.equal(policyMutation.find(c=>c.id===policyCase).result,'fail');
mutations.push({id:'active-di-errors-swallowed',rejected_by:policyCase});
const sources=[leafPath,'projects/ngx-material-legacy/legacy-dialog/dialog-config.ts','tests/dialog_leaf_constructor_runtime_probe.mjs',
 'tests/dialog_motion_runtime_probe.mjs','tests/dialog_initial_focus_runtime_probe.mjs'];
const report={schema_version:1,role:'Original leaf constructor source/DI-shape/manual runtime proof;not native/AOT/packed/minimum qualification',
 node:process.version,compiler:ts.version,runtime_peer:core.VERSION.full,sources:sources.map(path=>{const b=readFileSync(resolve(root,path));return{path,sha256:sha(b),bytes:b.length};}),
 untouched_reference:{path:referencePath,sha256:sha(reference),bytes:Buffer.byteLength(reference)},
 original_constructor:constructor(shapes[0]),candidate_constructor:constructor(shapes[1]),original_di:oldDI,candidate_di:newDI,original_factory:factory,original_factory_dependencies:factoryDeps,
 cases,mutations,limits:['Actual owned leaf/base/focus/default/config and motion policy code executes under synthetic DOM,controlled clocks and borrowed service fixtures.',
 'Original complete tagged class source authenticates9 constructor args,DI flags and initial enter state;its removed animation engine is not executed or imported by the candidate.',
 'Angular motion policy uses controlled owned override tokens;actual browser reduced-motion/MediaMatcher implementation is not qualified by these tests.',
 'DI parameter/source factory shape proof is not native Angular factory/AOT execution. Minimum21/canonical/packed/browser/floor qualification remains unexecuted.']};
const args=process.argv.slice(2);
if(args.length){assert.equal(args.length,2);assert.equal(args[0],'--report');assert.equal(existsSync(args[1]),false);
 writeFileSync(args[1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({cases:cases.length,mutants_rejected:mutations.length,constructor_arguments:newDI.length,node:report.node,compiler:report.compiler,runtime_peer:report.runtime_peer}));
