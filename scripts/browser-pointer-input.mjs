/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {spawn} from 'node:child_process';

export function pointerPoint(point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.y < 0) {
    throw new Error('Pointer input requires finite viewport coordinates');
  }
  return {x: point.x, y: point.y};
}

/** Sends native input to the already attached, owned target. Never DOM .click(). */
export async function cdpPointerClick(send, sessionId, point) {
  const {x, y} = pointerPoint(point);
  await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x, y, buttons: 0}, sessionId);
  await send('Input.dispatchMouseEvent', {type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1}, sessionId);
  await send('Input.dispatchMouseEvent', {type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1}, sessionId);
}

export async function bidiPointerClick(send, context, point) {
  const {x, y} = pointerPoint(point);
  await send('input.performActions', {context, actions: [{type: 'pointer', id: 'legacy-pointer',
    parameters: {pointerType: 'mouse'}, actions: [
      {type: 'pointerMove', x, y, origin: 'viewport', duration: 0},
      {type: 'pointerDown', button: 0}, {type: 'pointerUp', button: 0},
    ]}]});
}

/** GTK test input warps the mouse. Always own a separate X server, even in CI. */
export async function withPrivateXDisplay(fn, spawnServer = spawn) {
  const server = spawnServer('Xvfb', ['-displayfd', '1', '-screen', '0', '1280x900x24', '-nolisten', 'tcp'],
    {stdio: ['ignore', 'pipe', 'pipe']});
  try {
    const display = await new Promise((resolve, reject) => {
      let announced = '', errors = '';
      const timer = setTimeout(() => reject(new Error('Private Xvfb did not announce a display')), 5000);
      const stop = () => clearTimeout(timer);
      server.once('error', error => {stop(); reject(error);});
      server.once('exit', code => {stop(); reject(new Error(`Private Xvfb exited ${code}: ${errors.slice(-300)}`));});
      server.stderr.on('data', chunk => {errors += chunk;});
      server.stdout.on('data', chunk => {
        announced += chunk;
        if (!announced.includes('\n')) return;
        stop();
        const number = announced.trim();
        if (!/^\d+$/.test(number)) reject(new Error('Private Xvfb returned an invalid display'));
        else resolve(`:${number}`);
      });
    });
    return await fn(display);
  } finally {
    server.kill();
  }
}

/** The probe owns request ids; no acknowledgment is sent after failed input. */
export async function servicePointerRequest(driver, action) {
  if (!action || action.type !== 'pointer-click' || !Number.isSafeInteger(action.id) || action.id < 1) {
    throw new Error('Invalid browser pointer request');
  }
  const point = pointerPoint(action);
  if (typeof driver.pointerClick !== 'function') throw new Error('Native pointer driver unavailable');
  await driver.pointerClick(point);
  const accepted = await driver.evaluate(`window.__pointerDone(${action.id})`);
  if (accepted !== true && accepted !== 'true') throw new Error('Browser pointer request lost its owner');
}
