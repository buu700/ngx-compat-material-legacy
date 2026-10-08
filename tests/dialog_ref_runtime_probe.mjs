/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual owned ref/leaf and public CDK DialogRef; finite overlay/synthetic DOM/clock. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {load as loadLeaf, make} from './dialog_motion_runtime_probe.mjs';
import {packedShape} from '../scripts/api-surface.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url),ts=require('typescript');
const url=name=>pathToFileURL(require.resolve(name)).href;
const core=await import(url('@angular/core'));
const {DialogRef}=await import(url('@angular/cdk/dialog'));
const {MatDialogState}=await import(url('@angular/material/dialog'));
const {Subject}=await import(url('rxjs'));
const Leaf=await loadLeaf();
const args=process.argv.slice(2),baseline=args.includes('--baseline');
const sourcePath='projects/ngx-material-legacy/legacy-dialog/dialog-ref.ts';
const override=args.indexOf('--source');
const source=readFileSync(override===-1?resolve(root,sourcePath):args[override+1],'utf8');
const referencePath='reference/material-16.2.14/dialog-focus-sources/material-dialog-ref.ts';
const reference=readFileSync(resolve(root,referencePath),'utf8');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(reference),'381c4255f6329e44e015949bf14da4cb2e51985b4ae9a5e5e25716ff6c5ea336');
const peerSources=[];
for(const[version,overlaySha,dialogSha]of[
  ['21.2.14','16d7e3baa590f2ed9c355b7cc3e87882ee517716cba3a7ea6a95eb0c88231627',
   '74f639c81356a04f11e7fcc94668a17da882737a1104cba769f137a57931839c'],
  ['22.1.7','19811e7834a48d0a7358b5489487d8c025e51d0efe2f14c7881a0d91be736c8b',
   '715d0f484af26b104b4d043243a9de7cc945d0a34b3175e291ad0f56b08f2c29'],
]) {
  function method(member,expected,className,name) {
    const path=`compatibility/rc/dialog-public-container-peer-sources/cdk-${version}-${member}`;
    const bytes=readFileSync(resolve(root,path));assert.equal(sha(bytes),expected);
    const file=ts.createSourceFile(path,bytes.toString(),ts.ScriptTarget.Latest,true);
    const declaration=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===className);
    assert.ok(declaration);const method=declaration.members.find(n=>n.name?.getText(file)===name);
    assert.ok(method?.body);peerSources.push({path,sha256:expected,bytes:bytes.length});
    return method.body.getText(file);
  }
  const disposal=method('_overlay-module-chunk.mjs',overlaySha,'OverlayRef','dispose');
  const closing=method('dialog.mjs',dialogSha,'DialogRef','close');
  function ordered(body,parts) {let previous=-1;for(const part of parts){const at=body.indexOf(part);
    assert.ok(at>previous,`${version} public protocol order: ${part}`);previous=at;}}
  ordered(disposal,['if (this._disposed)','const isAttached = this.hasAttached()',
    'this._portalOutlet.dispose()','this._backdropClick.complete()','this._keydownEvents.complete()',
    'this._detachments.next()','this._detachments.complete()','this._disposed = true']);
  ordered(closing,['this.containerInstance._closeInteractionType =','this._detachSubscription.unsubscribe()',
    'this.overlayRef.dispose()','closedSubject.next(result)','closedSubject.complete()',
    'this.componentInstance = this.containerInstance = null']);
}
const shape=text=>packedShape(ts.createSourceFile(sourcePath,text,ts.ScriptTarget.Latest,true),'MatLegacyDialogRef');
const candidateShape=shape(source);
const originalShape=packedShape(ts.createSourceFile(referencePath,reference,ts.ScriptTarget.Latest,true),'MatDialogRef');
assert.deepEqual(candidateShape,originalShape);
async function load(raw=source) {
  const js=ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,
    module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText
    .replace(/(['"])(@angular\/[^'"]+|rxjs(?:\/operators)?)\1/g,(_,q,name)=>JSON.stringify(url(name)));
  return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
}

function fixture(OwnedRef,mode='enabled',options={}) {
  const f=make(Leaf,mode,options),detached=new Subject(),backdrop=new Subject(),keys=new Subject(),outside=new Subject();
  let attached=true,disposed=false;
  const calls=[],overlay={disposeCalls:0,backdropDetaches:0,
    detachments:()=>detached,backdropClick:()=>backdrop,keydownEvents:()=>keys,outsidePointerEvents:()=>outside,
    detachBackdrop(){this.backdropDetaches++;this.onDetachBackdrop?.();},
    dispose(){
      if(disposed)return;
      this.disposeCalls++;const wasAttached=attached;attached=false;
      // Public OverlayRef disposes its portal and completes input streams before detachments.next.
      f.destroy();backdrop.complete();keys.complete();outside.complete();
      if(wasAttached)detached.next();detached.complete();disposed=true;
    },
    detach(){if(!attached)return;attached=false;this.detachBackdrop();f.destroy();detached.next();},
  };
  const peer=new DialogRef(overlay,{id:'owned-ref-probe',disableClose:true,closeOnOverlayDetachments:false});
  peer.containerInstance=f.instance;
  const close=peer.close.bind(peer);peer.close=(result,options)=>{calls.push({result,options});return close(result,options);};
  const owned=new OwnedRef(peer,f.config,f.instance),component={alive:true};
  owned.componentInstance=component;
  return {...f,overlay,peer,owned,component,calls,detached,backdrop,keys,
    opening(){f.instance._startOpenAnimation();},
    settle(){while(f.c.timers.size)f.c.timer();},
    finish(){if(owned.getState()!==MatDialogState.CLOSED)owned.close();
      this.settle();f.close();},
  };
}
async function observations(module) {
  const cases=[];
  async function check(id,run){try{await run();cases.push({id,result:'pass'});}
    catch(error){cases.push({id,result:'fail',error:error.message.slice(0,600)});}}
  for(const mode of ['enabled','di-disabled']) {
    await check('canceled-opening-completes-without-opened:'+mode,async()=>{
      const f=fixture(module.MatLegacyDialogRef,mode);let opened=0,completed=0;
      f.owned.afterOpened().subscribe({next:()=>opened++,complete:()=>completed++});
      try{f.opening();f.owned.close('canceled');await Promise.resolve();f.settle();
        assert.equal(opened,0);assert.equal(completed,1);assert.equal(f.owned.getState(),MatDialogState.CLOSED);
        assert.equal(f.instance._animationStateChanged.observers.length,1);
      }finally{f.finish();}
    });
    await check('first-close-result-survives-repeat-and-beforeClosed-reentry:'+mode,async()=>{
      const f=fixture(module.MatLegacyDialogRef,mode),before=[],after=[];
      f.owned.beforeClosed().subscribe(r=>{before.push(r);f.owned.close('reentrant');});
      f.owned.afterClosed().subscribe(r=>after.push(r));
      try{f.owned.close('first');f.owned.close('repeat');await Promise.resolve();f.settle();
        assert.deepEqual(before,['first']);assert.deepEqual(after,['first']);assert.equal(f.calls.length,1);
        assert.equal(f.overlay.disposeCalls,1);assert.equal(f.c.timers.size,0);
        assert.equal(f.instance._animationStateChanged.observers.length,1);
      }finally{f.finish();}
    });
    await check('normal-close-retains-result-focus-origin-and-component-event-order:'+mode,async()=>{
      const f=fixture(module.MatLegacyDialogRef,mode),order=[];let opened=0;
      f.owned.afterOpened().subscribe(()=>opened++);
      f.owned.beforeClosed().subscribe(r=>{order.push(['before',r]);
        assert.equal(f.owned.getState(),MatDialogState.CLOSING);assert.equal(f.owned.componentInstance,f.component);});
      f.owned.afterClosed().subscribe(r=>{order.push(['after',r]);
        assert.equal(f.owned.getState(),MatDialogState.CLOSED);assert.equal(f.owned.componentInstance,f.component);});
      try{f.opening();await Promise.resolve();f.settle();assert.equal(opened,1);
        module._closeDialogVia(f.owned,'keyboard','result');await Promise.resolve();f.settle();
        assert.deepEqual(order,[['before','result'],['after','result']]);
        assert.equal(f.calls.length,1);assert.equal(f.calls[0].options.focusOrigin,'keyboard');
        assert.equal(f.owned.componentInstance,null);assert.equal(f.c.timers.size,0);
      }finally{f.finish();}
    });
  }
  await check('beforeClosed-overlay-detach-cannot-arm-a-late-fallback',async()=>{
    const f=fixture(module.MatLegacyDialogRef),before=[],after=[];
    f.owned.beforeClosed().subscribe(r=>{before.push(r);f.overlay.detach();});
    f.owned.afterClosed().subscribe(r=>after.push(r));
    try{f.owned.close('detached');assert.deepEqual(before,['detached']);assert.deepEqual(after,['detached']);
      assert.equal(f.calls.length,1);assert.equal(f.c.timers.size,0);assert.equal(f.c.frames.size,0);
    }finally{f.finish();}
  });
  await check('detachBackdrop-reentry-cannot-arm-a-late-fallback',async()=>{
    const f=fixture(module.MatLegacyDialogRef);f.overlay.onDetachBackdrop=()=>f.detached.next();
    try{f.owned.close('backdrop');assert.equal(f.owned.getState(),MatDialogState.CLOSED);
      assert.equal(f.calls.length,1);assert.equal(f.c.timers.size,0);
    }finally{f.finish();}
  });
  await check('external-detach-finishes-notifications-and-releases-container-listeners',async()=>{
    const f=fixture(module.MatLegacyDialogRef),order=[];let opened=0,completed=0;
    f.owned.afterOpened().subscribe({next:()=>opened++,complete:()=>completed++});
    f.owned.beforeClosed().subscribe(r=>order.push(['before',r]));
    f.owned.afterClosed().subscribe(r=>order.push(['after',r]));
    try{f.opening();f.overlay.detach();assert.deepEqual(order,[['before',undefined],['after',undefined]]);
      assert.equal(opened,0);assert.equal(completed,1);assert.equal(f.calls.length,1);
      assert.equal(f.instance._animationStateChanged.observers.length,1);
      assert.equal(f.c.timers.size,0);assert.equal(f.c.frames.size,0);
    }finally{f.finish();}
  });
  await check('fallback-remains-when-parent-view-is-destroyed-during-exit',async()=>{
    const f=fixture(module.MatLegacyDialogRef),results=[];
    f.owned.afterClosed().subscribe(r=>results.push(r));
    try{f.owned.close('fallback');f.destroy();assert.equal(f.c.timers.size,1);
      assert.equal([...f.c.timers.values()][0].duration,175);f.settle();
      assert.deepEqual(results,['fallback']);assert.equal(f.calls.length,1);
      assert.equal(f.instance._animationStateChanged.observers.length,1);
    }finally{f.finish();}
  });
  await check('captured-stale-fallback-cannot-close-a-finished-ref-again',async()=>{
    const f=fixture(module.MatLegacyDialogRef);
    try{f.owned.close('once');const fallback=[...f.c.timers.values()].find(t=>t.duration===175).callback;
      f.c.timer();assert.equal(f.c.timers.size,0);fallback();f.owned.close('late');assert.equal(f.calls.length,1);
      assert.equal(f.owned.componentInstance,null);
    }finally{f.finish();}
  });
  await check('input-subscriptions-do-not-handle-events-after-close',async()=>{
    const f=fixture(module.MatLegacyDialogRef);let prevented=0;
    try{f.owned.close();f.settle();
      f.instance._animationStateChanged.emit({state:'opened',totalTime:0});
      f.detached.next();f.backdrop.next({type:'click',preventDefault(){prevented++;}});
      f.keys.next({type:'keydown',keyCode:27,preventDefault(){prevented++;}});
      assert.equal(f.calls.length,1);assert.equal(prevented,0);assert.equal(f.c.timers.size,0);
    }finally{f.finish();}
  });
  await check('afterOpened-completion-observer-can-detach-before-exit-is-scheduled',async()=>{
    const f=fixture(module.MatLegacyDialogRef),results=[];
    f.owned.afterOpened().subscribe({complete:()=>f.overlay.detach()});
    f.owned.afterClosed().subscribe(r=>results.push(r));
    try{f.owned.close('completion');assert.deepEqual(results,['completion']);assert.equal(f.calls.length,1);
      assert.equal(f.c.timers.size,0);assert.equal(f.c.frames.size,0);
    }finally{f.finish();}
  });
  await check('later-interaction-cannot-replace-the-first-close-focus-origin',async()=>{
    const f=fixture(module.MatLegacyDialogRef);
    try{module._closeDialogVia(f.owned,'mouse','mouse-result');
      module._closeDialogVia(f.owned,'keyboard','key-result');f.settle();
      assert.equal(f.calls.length,1);assert.equal(f.calls[0].result,'mouse-result');
      assert.equal(f.calls[0].options.focusOrigin,'mouse');
    }finally{f.finish();}
  });
  await check('throwing-peer-close-still-releases-owned-subscriptions-and-fallback',async()=>{
    const f=fixture(module.MatLegacyDialogRef);f.peer.close=()=>{throw Error('peer close failed');};
    try{f.owned.close('failure');f.destroy();assert.equal(f.c.timers.size,1);
      assert.throws(()=>f.c.timer(),/peer close failed/);assert.equal(f.c.timers.size,0);
      assert.equal(f.owned.getState(),MatDialogState.CLOSED);assert.equal(f.owned.componentInstance,null);
      assert.equal(f.instance._animationStateChanged.observers.length,1);
    }finally{f.finish();}
  });
  await check('successful-opening-replay-and-borrowed-container-stream-remain-intact',async()=>{
    const f=fixture(module.MatLegacyDialogRef);let opened=0,completed=0;
    try{f.opening();f.settle();f.owned.afterOpened().subscribe({next:()=>opened++,complete:()=>completed++});
      assert.equal(opened,1);assert.equal(completed,1);f.owned.close();f.settle();
      assert.equal(f.instance._animationStateChanged.isStopped,false);
      assert.equal(f.events.at(-1).state,'closed');
    }finally{f.finish();}
  });
  await check('disabled-close-modified-escape-and-nonescape-keep-the-dialog-open',async()=>{
    const f=fixture(module.MatLegacyDialogRef);let prevented=0;
    const key=(keyCode,extra={})=>({type:'keydown',keyCode,...extra,preventDefault(){prevented++;}});
    try{f.owned.disableClose=true;f.keys.next(key(27));f.backdrop.next({type:'click',preventDefault(){prevented++;}});
      f.owned.disableClose=false;f.keys.next(key(27,{altKey:true}));f.keys.next(key(13));
      assert.equal(f.owned.getState(),MatDialogState.OPEN);assert.equal(prevented,0);assert.equal(f.calls.length,0);
      f.keys.next(key(27));f.settle();assert.equal(prevented,1);assert.equal(f.calls[0].options.focusOrigin,'keyboard');
    }finally{f.finish();}
  });
  await check('close-after-view-destruction-retains-a-bounded-fallback',async()=>{
    const f=fixture(module.MatLegacyDialogRef),before=[],after=[];
    f.owned.beforeClosed().subscribe(r=>before.push(r));f.owned.afterClosed().subscribe(r=>after.push(r));
    try{f.destroy();f.owned.close('destroyed');assert.equal(f.c.timers.size,1);
      assert.equal([...f.c.timers.values()][0].duration,100);f.settle();
      assert.deepEqual(before,['destroyed']);assert.deepEqual(after,['destroyed']);assert.equal(f.calls.length,1);
      assert.equal(f.instance._animationStateChanged.observers.length,1);
    }finally{f.finish();}
  });
  await check('detector-destruction-before-closing-event-still-finishes-the-ref',async()=>{
    let f;f=fixture(module.MatLegacyDialogRef,'enabled',{changeDetector:{markForCheck(){f.destroy();}}});
    const results=[];f.owned.afterClosed().subscribe(r=>results.push(r));
    try{f.owned.close('detector');assert.equal(f.c.timers.size,1);assert.equal(f.c.frames.size,0);f.settle();
      assert.deepEqual(results,['detector']);assert.equal(f.calls.length,1);
    }finally{f.finish();}
  });
  await check('throwing-detector-preserves-the-error-and-the-close-fallback',async()=>{
    const f=fixture(module.MatLegacyDialogRef,'enabled',{changeDetector:{markForCheck(){throw Error('detector failed');}}});
    const before=[],after=[];f.owned.beforeClosed().subscribe(r=>before.push(r));f.owned.afterClosed().subscribe(r=>after.push(r));
    try{assert.throws(()=>f.owned.close('detector-error'),/detector failed/);assert.equal(f.c.timers.size,1);f.settle();
      assert.deepEqual(before,['detector-error']);assert.deepEqual(after,['detector-error']);assert.equal(f.calls.length,1);
    }finally{f.finish();}
  });
  return cases;
}
const cases=await observations(await load());
const mutations=[];
if(!baseline){
  assert.ok(cases.every(c=>c.result==='pass'),JSON.stringify(cases.filter(c=>c.result!=='pass')));
  for(const[id,from,to,rejectedBy]of[
    ['repeated-close-guard-removed','    if (this._state !== MatDialogState.OPEN) {\n      return;\n    }',
     '    /* repeated close allowed */','first-close-result-survives-repeat-and-beforeClosed-reentry:enabled'],
    ['canceled-opening-never-completes','this._afterOpened.complete();','/* opening left pending */',
     'canceled-opening-completes-without-opened:enabled'],
    ['owned-subscriptions-not-released','this._subscriptions.unsubscribe();','/* subscriptions retained */',
     'external-detach-finishes-notifications-and-releases-container-listeners'],
    ['beforeClosed-reentrancy-guard-removed','this._beforeClosedEmitted = true;','/* notification flag omitted */',
     'beforeClosed-overlay-detach-cannot-arm-a-late-fallback'],
    ['fallback-not-cleared','clearTimeout(this._closeFallbackTimeout);','/* stale fallback retained */',
     'captured-stale-fallback-cannot-close-a-finished-ref-again'],
    ['fallback-phase-check-removed','  private _scheduleCloseFallback(totalTime: number): void {\n    if (this._state !== MatDialogState.CLOSING) {\n      return;\n    }',
     '  private _scheduleCloseFallback(totalTime: number): void {','detachBackdrop-reentry-cannot-arm-a-late-fallback'],
    ['finish-once-guard-removed','  private _finishDialogClose(): void {\n    if (this._state === MatDialogState.CLOSED) {\n      return;\n    }',
     '  private _finishDialogClose(): void {','captured-stale-fallback-cannot-close-a-finished-ref-again'],
    ['first-interaction-origin-guard-removed','  if (ref.getState() !== MatDialogState.OPEN) {\n    return;\n  }',
     '  /* later origin replaces first */','later-interaction-cannot-replace-the-first-close-focus-origin'],
    ['interrupted-exit-fallback-removed','if (this._state === MatDialogState.CLOSING && this._closeFallbackTimeout === null)',
     'if (false)','detector-destruction-before-closing-event-still-finishes-the-ref'],
  ]){
    assert.ok(source.includes(from),id);const actual=await observations(await load(source.replaceAll(from,to)));
    assert.equal(actual.find(c=>c.id===rejectedBy).result,'fail',id);mutations.push({id,rejected_by:rejectedBy});
  }
}
const sources=[sourcePath,'projects/ngx-material-legacy/legacy-dialog/dialog-container.ts',
  'projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.ts',
  'tests/dialog_ref_runtime_probe.mjs','tests/dialog_motion_runtime_probe.mjs','tests/dialog_initial_focus_runtime_probe.mjs'];
const report={schema_version:1,role:'Actual owned ref/leaf and real public CDK DialogRef source diagnostic;finite overlay,not native/packed/minimum qualification',
 node:process.version,compiler:ts.version,runtime_peer:core.VERSION.full,
 sources:sources.map(path=>{const bytes=path===sourcePath?Buffer.from(source):readFileSync(resolve(root,path));return{path,sha256:sha(bytes),bytes:bytes.length};}),
 source_override:override===-1?null:args[override+1],authenticated_public_peer_protocol_sources:peerSources,
 untouched_reference:{path:referencePath,sha256:sha(reference),bytes:Buffer.byteLength(reference)},original_shape:originalShape,candidate_shape:candidateShape,
 cases,mutations,limits:['Installed public CDK22.1.7 DialogRef and actual owned ref/leaf/base/focus code execute;OverlayRef is a finite fixture matching authenticated disposal ordering.',
  'DOM,rendering,services and clocks are synthetic fixtures;root Overlay/native factory/real reduced-motion/SSR/actual21/minimum/AOT/canonical/packed/floor checks are not executed.',
  'Subject observer counts are test-only lifetime observations,not product dependencies on RxJS internals.']};
const at=args.indexOf('--report');if(at!==-1){const path=args[at+1];assert.ok(path);assert.equal(existsSync(path),false);
 writeFileSync(path,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({cases:cases.length,failures:cases.filter(c=>c.result==='fail'),mutants_rejected:mutations.length,
 node:report.node,compiler:report.compiler,runtime_peer:report.runtime_peer}));
