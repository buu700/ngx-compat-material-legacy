"""Preserve both browser window routes and allow window-free slider teardown."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class SliderWindowContextTests(unittest.TestCase):
    def test_actual_getter_and_listener_bind_remove_routes(self):
        code=r"""
import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createRequire}from'node:module';
const q=createRequire(import.meta.url),ts=q('typescript'),source=readFileSync('projects/ngx-material-legacy/legacy-slider/slider.ts','utf8');
const file=ts.createSourceFile('slider.ts',source,ts.ScriptTarget.Latest,true),cls=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacySlider');
const names=['_getWindow','_bindGlobalEvents','_removeGlobalEvents'];
const methods=names.map(name=>{const n=cls.members.find(m=>m.name?.text===name);assert.ok(n);return n.getText(file);}).join('\n');
const emitted=ts.transpileModule('class Methods{'+methods+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const build=(...args)=>new Function('window','activeEventOptions','isTouchEvent',emitted+';return Methods;')(...args);
for(const touch of [false,true]){
 const injected=new EventTarget(),fallback=new EventTarget(),doc=new EventTarget(),hits=[];
 const Methods=build(fallback,{passive:false},()=>touch),instance=new Methods();instance._document=doc;doc.defaultView=injected;
 instance._pointerMove=()=>hits.push('move');instance._pointerUp=()=>hits.push('up');instance._windowBlur=()=>hits.push('blur');
 assert.equal(instance._getWindow(),injected);instance._bindGlobalEvents({});
 doc.dispatchEvent(new Event(touch?'touchmove':'mousemove'));injected.dispatchEvent(new Event('blur'));fallback.dispatchEvent(new Event('blur'));
 assert.deepEqual(hits,['move','blur']);instance._removeGlobalEvents();
 doc.dispatchEvent(new Event(touch?'touchmove':'mousemove'));injected.dispatchEvent(new Event('blur'));assert.deepEqual(hits,['move','blur']);
 doc.defaultView=null;assert.equal(instance._getWindow(),fallback);
}
const body=cls.members.find(m=>m.name?.text==='_getWindow').body.getText(file).slice(1,-1);
const noWindow=new Function(body);assert.equal(noWindow.call({_document:{defaultView:null}}),undefined);
const original=new Function('return this._document.defaultView || window;');assert.throws(()=>original.call({_document:{defaultView:null}}),ReferenceError);
const Server=build(undefined,{passive:false},()=>false),server=new Server();server._document=new EventTarget();
server._pointerMove=()=>{};server._pointerUp=()=>{};server._windowBlur=()=>{};server._bindGlobalEvents({});server._removeGlobalEvents();
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-5000:])
