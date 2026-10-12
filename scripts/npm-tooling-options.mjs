/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 * Copyright (c) 2026 Ryan Lester.
 */
import {lstatSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {isAbsolute, join} from 'node:path';

let context;

function privateContext() {
  if (context) return context;
  const directory = mkdtempSync(join(tmpdir(), 'ngx-private-npm-'));
  const cache = join(directory, 'cache');
  mkdirSync(cache, {mode: 0o700});
  const userconfig = join(directory, 'user.npmrc');
  const globalconfig = join(directory, 'global.npmrc');
  for (const path of [userconfig, globalconfig]) writeFileSync(path, '', {flag: 'wx', mode: 0o600});
  context = {directory, cache, userconfig, globalconfig};
  process.once('exit', () => {
    // Only this process's freshly created directory is eligible for cleanup.
    try { if (!lstatSync(directory).isSymbolicLink()) rmSync(directory, {recursive: true, force: true}); } catch {}
  });
  return context;
}

/** Options for private generated fixtures/local packs, never publication. */
export function npmToolingOptions(options, argv) {
  if (!options || !isAbsolute(options.cwd ?? '') || !lstatSync(options.cwd).isDirectory()) {
    throw new Error('private npm tooling requires an absolute existing working directory');
  }
  if (!Array.isArray(argv) || !argv.length || !['install', 'ci', 'pack', '--version', '-v'].includes(argv[0])
      || argv.some(value => typeof value !== 'string')) {
    throw new Error('unsupported private npm tooling command');
  }
  if (argv[0] === 'install' || argv[0] === 'ci') {
    const allowed = new Set(['--ignore-scripts', '--no-audit', '--no-fund', '--package-lock']);
    if (argv.slice(1).some(value => !allowed.has(value)) || new Set(argv).size !== argv.length) {
      throw new Error('unsupported private npm install options');
    }
  } else if (argv[0] === 'pack') {
    if (!(isAbsolute(argv[1] ?? '') || argv[1]?.startsWith('./'))) throw new Error('private npm pack requires a local package path');
    const tail = argv.slice(2);
    if (tail[0] === '--json') tail.shift();
    if (tail.length !== 2 || tail[0] !== '--pack-destination' || !isAbsolute(tail[1])) {
      throw new Error('private npm pack requires an explicit destination');
    }
  } else if (argv.length !== 1) {
    throw new Error('private npm version query accepts no additional arguments');
  }
  const env = {...(options.env ?? process.env)};
  for (const name of Object.keys(env)) {
    const lower = name.toLowerCase();
    if (lower.startsWith('npm_') || ['node_auth_token', 'npm_token', 'npm_auth_token'].includes(lower)) delete env[name];
  }
  const owned = privateContext();
  Object.assign(env, {
    npm_config_cache: owned.cache,
    npm_config_userconfig: owned.userconfig,
    npm_config_globalconfig: owned.globalconfig,
    npm_config_registry: 'https://registry.npmjs.org/',
    npm_config_global: 'false',
    npm_config_workspaces: 'false',
    npm_config_ignore_scripts: 'true',
    npm_config_prefer_online: 'true',
    npm_config_prefer_offline: 'false',
    npm_config_offline: 'false',
    npm_config_update_notifier: 'false',
  });
  return {...options, env};
}
