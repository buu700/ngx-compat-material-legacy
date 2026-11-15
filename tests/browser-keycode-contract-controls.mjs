/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';import {browserKeycodeObservationOkay as okay,tooltipFixtureRoomOkay as roomOkay} from '../scripts/browser-keycode-contract.mjs';
const modified=Object.fromEntries(['alt','ctrl','shift','meta'].map(k=>[k,{prevented:false,open:true}]));
const base={opened:true,modified,prevented:true,closed:true,reopened:true,destroyed:true};
const tooltip={...base,keysBeforeDestroy:[65,27,27,27,27],keysAfterDestroy:[65,27,27,27,27,66]};
for(const [kind,good] of [['select',base],['tooltip',tooltip]]){
 assert.ok(okay(kind,good));for(const field of ['opened','prevented','closed','reopened','destroyed'])assert.equal(okay(kind,{...good,[field]:false}),false);
 for(const mod of Object.keys(modified))for(const field of ['prevented','open']){const bad=structuredClone(good);bad.modified[mod][field]=field==='prevented';assert.equal(okay(kind,bad),false);}
}
assert.equal(okay('tooltip',{...tooltip,keysBeforeDestroy:[65,27]}),false);assert.equal(okay('tooltip',{...tooltip,keysAfterDestroy:[65]}),false);
const cases={};for(const key of [13,32])for(const name of ['enabled','disabled','no-panel'])cases[name+'-'+key]={prevented:name==='disabled',clicks:name==='enabled'?1:0,active:name==='enabled'};
assert.ok(okay('tabs',{cases}));for(const k of Object.keys(cases))for(const field of ['prevented','active','clicks']){const bad=structuredClone(cases);bad[k][field]=field==='clicks'?3:!bad[k][field];assert.equal(okay('tabs',{cases:bad}),false);}assert.equal(okay('other',base),false);console.log('browser keycode positive and mutation controls passed');

const room={center:325,bottom:250,viewportWidth:780,viewportHeight:493};assert.ok(roomOkay(room));for(const bad of [{...room,center:25},{...room,center:650},{...room,bottom:485},{...room,center:NaN},null])assert.equal(roomOkay(bad),false);console.log('tooltip below/center room controls passed');
