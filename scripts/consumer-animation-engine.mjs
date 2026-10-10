/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Reject an animation engine hidden by a consumer's install or harness bundle.
 */
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

export function isAnimationEnginePackage(path) {
  return /(?:^|\/)node_modules\/@angular\/animations(?:\/|$)/.test(path);
}

export function assertEngineFreeConsumer(consumer) {
  const lock = JSON.parse(readFileSync(join(consumer, 'package-lock.json'), 'utf8'));
  if (!lock.packages || typeof lock.packages !== 'object') throw new Error('Consumer lock has no package inventory');
  const lockPackages = Object.keys(lock.packages).filter(isAnimationEnginePackage).sort();
  const installedPackages = [...new Set(['node_modules/@angular/animations', ...lockPackages])]
    .filter(path => existsSync(join(consumer, path))).sort();
  if (lockPackages.length || installedPackages.length) {
    throw new Error(`Consumer installed or locked @angular/animations: ${[...new Set([...lockPackages, ...installedPackages])].join(', ')}`);
  }
  return {installed_packages: installedPackages, lock_packages: lockPackages};
}

export function assertEngineFreeHarnessInputs(inputs) {
  if (!Array.isArray(inputs) || !inputs.length) throw new Error('Consumer harness has no bundle input inventory');
  const engineInputs = inputs.filter(({path}) => isAnimationEnginePackage(path) ||
    /(?:^|\/)node_modules\/@angular\/platform-browser\/(?:animations\/|(?:fesm2022|types)\/(?:animations(?:-async)?|async)\.)/.test(path));
  if (engineInputs.length) throw new Error(`Consumer harness loaded animation engine entries: ${engineInputs.map(item => item.path).join(', ')}`);
}
