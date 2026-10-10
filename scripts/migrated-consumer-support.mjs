/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Retain actual migrated consumer inputs and outputs before disposable cleanup.
 */
import {existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {isAbsolute, join, relative} from 'node:path';
import {digest} from './migration-run-inputs.mjs';

export const MIGRATED_CONSUMER_SUPPORT = Object.freeze({
  application: 'src/main.ts', styles: 'application.scss', css: 'dist/migrated.css',
  package: 'package.json', lock: 'package-lock.json', tsconfig: 'tsconfig.json', bundle: 'dist/app.js',
});

export function retainMigratedConsumer(work, input, bundle) {
  const parent = input.request?.outputDir ?? join(input.runDir, 'evidence/migration-packaged/standalone');
  const invocation = relative(join(input.runDir, 'evidence/migration-packaged'), parent);
  if (!invocation || isAbsolute(invocation) || /[\\/]/.test(invocation) || ['.', '..'].includes(invocation)) {
    throw new Error('migrated consumer evidence leaves its invocation directory');
  }
  let cursor = input.runDir;
  for (const part of ['evidence', 'migration-packaged', invocation]) {
    cursor = join(cursor, part);
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) throw new Error('symlink migrated consumer evidence directory');
    mkdirSync(cursor, {recursive: true});
  }
  const destination = join(parent, 'upgraded-consumer');
  // An invocation owns a fresh directory; previous observations cannot be replaced.
  mkdirSync(destination);
  const support = {};
  const record = (id, bytes, extension) => {
    const path = join(destination, `${id}.${extension}`);
    writeFileSync(path, bytes, {flag: 'wx'});
    support[id] = {path: relative(input.runDir, path).split('\\').join('/'), bytes: bytes.length, sha256: digest(bytes)};
  };
  for (const [id, path] of Object.entries(MIGRATED_CONSUMER_SUPPORT)) {
    record(id, readFileSync(join(work, path)), path.split('.').at(-1));
  }
  record('bundle_inputs', Buffer.from(JSON.stringify(bundle, null, 2)+'\n'), 'json');
  return support;
}
