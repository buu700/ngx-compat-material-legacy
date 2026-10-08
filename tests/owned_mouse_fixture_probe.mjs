/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Standards fixture options under native Event/EventTarget; real MouseEvent browser test separate. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),req=createRequire(import.meta.url),ts=req('typescript');
const paths=['projects/ngx-material-legacy/internal/testing/owned-test-events.ts','testing/legacy-runner/shims/event-objects.ts'];
const sources=new Map(paths.map(path=>[path,readFileSync(resolve(root,path),'utf8')]));
const oldMouse=globalThis.MouseEvent,oldWindow=globalThis.window,hadMouse=Object.hasOwn(globalThis,'MouseEvent'),hadWindow=Object.hasOwn(globalThis,'window');
class MouseFixtureEvent extends Event {
  constructor(type,options){super(type,options);for(const name of ['button','buttons','detail','clientX','clientY','screenX','screenY'])
    Object.defineProperty(this,name,{value:Number(options[name]||0),configurable:true});
    for(const name of ['ctrlKey','altKey','shiftKey','metaKey'])Object.defineProperty(this,name,{value:!!options[name]});
    Object.defineProperty(this,'view',{value:options.view});
  }
}
globalThis.MouseEvent=MouseFixtureEvent;globalThis.window={fixtureWindow:true};
const expected=[[0,1],[1,4],[2,2],[3,8],[4,16]];
async function load(text){const emitted=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
  .replaceAll("'@angular/core'",JSON.stringify(pathToFileURL(req.resolve('@angular/core')).href));
  return import('data:text/javascript;base64,'+Buffer.from(emitted).toString('base64'));
}
function observe(mod){const observations=[];
  for(const [button,buttons]of expected){const event=mod.createMouseEvent('mousedown',13,17,29,31,button,{control:true,alt:true,shift:true,meta:true});
    assert.equal(event.button,button);assert.equal(event.buttons,buttons);assert.equal(event.buttons&1,button===0?1:0);
    assert.equal(event.detail,1);assert.equal(event.view,globalThis.window);
    assert.deepEqual([event.clientX,event.clientY,event.screenX,event.screenY,event.offsetX,event.offsetY],[13,17,13,17,29,31]);
    assert.deepEqual([event.bubbles,event.cancelable,event.composed,event.ctrlKey,event.altKey,event.shiftKey,event.metaKey],Array(7).fill(true));
    const target=new EventTarget();let dispatched;target.addEventListener('mousedown',value=>{dispatched=value;value.preventDefault();});
    target.dispatchEvent(event);assert.equal(dispatched,event);assert.equal(event.defaultPrevented,true);
    observations.push({button,buttons,primary:!!(event.buttons&1),detail:event.detail,coordinates_and_modifiers:true,dispatch_and_cancel:true});
  }
  return observations;
}
const receipts=[];
try{for(const [path,text]of sources){const observations=observe(await load(text)),mutants=[];
  for(const [id,replacement]of [['swapped-middle-and-right','button === 0 ? 1 : 1 << button'],['all-primary','1'],['all-released','0']]){
    const from='button === 1 ? 4 : button === 2 ? 2 : 1 << button';assert.ok(text.includes(from));
    let rejected=false;try{observe(await load(text.replace(from,replacement)));}catch{rejected=true;}
    assert.equal(rejected,true,id);mutants.push({id,rejected});
  }
  receipts.push({path,sha256:createHash('sha256').update(text).digest('hex'),observations,mutants});
}}finally{if(hadMouse)globalThis.MouseEvent=oldMouse;else delete globalThis.MouseEvent;if(hadWindow)globalThis.window=oldWindow;else delete globalThis.window;}
const result={node:process.version,compiler:ts.version,standard:'https://www.w3.org/TR/pointerevents4/#dom-mouseevent-buttons',expected_pressed_masks:expected,receipts,
  limits:['Real native Event/EventTarget flags, dispatch and cancellation; MouseEvent-specific properties are modeled from constructor options.',
    'One real-browser property test prepared in each existing historical menu spec. No native/AOT/packed/actual21 qualification.',
    'Only middle/right masks change; original historical reference constant1 remains untouched and is not relabeled standards-compliant.']};
const argv=process.argv.slice(2),at=argv.indexOf('--report');if(at>=0)writeFileSync(argv[at+1],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({helpers:receipts.length,cases:receipts.reduce((n,r)=>n+r.observations.length,0),mutants:receipts.reduce((n,r)=>n+r.mutants.length,0)}));
