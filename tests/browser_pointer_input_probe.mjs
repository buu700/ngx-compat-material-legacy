/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {pointerPoint, cdpPointerClick, bidiPointerClick, withPrivateXDisplay, servicePointerRequest} from '../scripts/browser-pointer-input.mjs';

const point = {x: 110.5, y: 60}, sent = [];
const send = async (...args) => {sent.push(args);};
await cdpPointerClick(send, 'owned-session', point);
assert.equal(sent.length, 3);
assert.ok(sent.every(([method, params, session]) => method === 'Input.dispatchMouseEvent' && session === 'owned-session' &&
  params.x === point.x && params.y === point.y));
assert.deepEqual(sent.map(([, p]) => [p.type, p.buttons]), [['mouseMoved', 0], ['mousePressed', 1], ['mouseReleased', 0]]);
sent.length = 0;
await bidiPointerClick(send, 'owned-context', point);
assert.equal(sent[0][0], 'input.performActions');
assert.equal(sent[0][1].context, 'owned-context');
assert.deepEqual(sent[0][1].actions[0], {type: 'pointer', id: 'legacy-pointer', parameters: {pointerType: 'mouse'},
  actions: [{type: 'pointerMove', ...point, origin: 'viewport', duration: 0}, {type: 'pointerDown', button: 0}, {type: 'pointerUp', button: 0}]});
for (const wrong of [null, {}, {x: NaN, y: 0}, {x: -1, y: 0}, {x: '10', y: 0}, {x: 1, y: Infinity}]) {
  assert.throws(() => pointerPoint(wrong), /finite viewport/);
}
let acknowledged = false, clicked = false;
const action = {id: 1, type: 'pointer-click', ...point};
const driver = {async pointerClick(p) {assert.deepEqual(p, point); clicked = true;},
  async evaluate(expression) {assert.equal(clicked, true); assert.equal(expression, 'window.__pointerDone(1)'); acknowledged = true; return true;}};
await servicePointerRequest(driver, action); assert.equal(acknowledged, true);
for (const wrong of [{...action, id: 0}, {...action, id: '1'}, {...action, type: 'click'}]) {
  await assert.rejects(() => servicePointerRequest(driver, wrong), /Invalid browser pointer/);
}
await assert.rejects(() => servicePointerRequest({evaluate: driver.evaluate}, action), /driver unavailable/);
acknowledged = false;
await assert.rejects(() => servicePointerRequest({...driver, pointerClick: async () => {throw Error('input rejected');}}, action), /input rejected/);
assert.equal(acknowledged, false, 'failed driver input must not acknowledge or call DOM click');
await assert.rejects(() => servicePointerRequest({...driver, evaluate: async () => false}, action), /lost its owner/);
await servicePointerRequest({...driver, evaluate: async () => 'true'}, action); // WebKit JSON IPC primitive.

let killed = 0, ownedDisplay;
function serverFactory(announcement, fault) {
  return (binary, args, options) => {
    assert.equal(binary, 'Xvfb');
    assert.deepEqual(args, ['-displayfd', '1', '-screen', '0', '1280x900x24', '-nolisten', 'tcp']);
    assert.equal(options.env, undefined, 'no existing shared DISPLAY is selected as the input target');
    const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
    child.kill = () => {killed++;};
    queueMicrotask(() => fault ? child.emit('error', fault) : child.stdout.emit('data', announcement));
    return child;
  };
}
await withPrivateXDisplay(async display => {ownedDisplay = display;}, serverFactory('143\n'));
assert.equal(ownedDisplay, ':143'); assert.equal(killed, 1);
await assert.rejects(() => withPrivateXDisplay(async () => {throw Error('consumer failure');}, serverFactory('144\n')), /consumer failure/);
await assert.rejects(() => withPrivateXDisplay(async () => assert.fail('must not use malformed display'), serverFactory(':0\n')), /invalid display/);
await assert.rejects(() => withPrivateXDisplay(async () => assert.fail('must not borrow shared DISPLAY'), serverFactory('', Error('ENOENT'))), /ENOENT/);
assert.equal(killed, 4);
console.log(JSON.stringify({native_executed: false, protocol: 'CDP/BiDi command payloads, driver acknowledgment failure and owned-Xvfb lifecycle'}));
