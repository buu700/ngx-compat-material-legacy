/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 * Copyright (c) 2026 Ryan Lester.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {lstatSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {npmToolingOptions} from '../scripts/npm-tooling-options.mjs';

const work = mkdtempSync(join(tmpdir(), 'ngx-npm-profile-test-'));
try {
  const inheritedConfig = join(work, 'host.npmrc');
  writeFileSync(inheritedConfig, '//registry.npmjs.org/:_authToken=fixture-token\nregistry=https://host.invalid/\n');
  writeFileSync(join(work, 'package.json'), '{"name":"npm-profile-fixture","version":"1.0.0"}\n');
  const projectConfig = 'registry=https://project.invalid/\ncache=./shared\nworkspaces=true\nignore-scripts=false\nprefer-offline=true\nlegacy-peer-deps=true\n';
  writeFileSync(join(work, '.npmrc'), projectConfig);
  const baseEnv = Object.freeze({...process.env, NODE_OPTIONS: '',
    NPM_CONFIG_USERCONFIG: inheritedConfig, npm_config_globalconfig: inheritedConfig,
    NPM_CONFIG_CACHE: join(work, 'host-shared-cache'), NPM_CONFIG_REGISTRY: 'https://host.invalid/',
    npm_config_offline: 'true', NPM_CONFIG_LEGACY_PEER_DEPS: 'false',
    NPM_TOKEN: 'fixture-token', NODE_AUTH_TOKEN: 'fixture-token', npm_package_name: 'host-package'});
  const argv = Object.freeze(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock']);
  const input = Object.freeze({cwd: work, encoding: 'utf8', timeout: 12345, env: baseEnv});
  const actual = npmToolingOptions(input, argv);
  assert.equal(actual.cwd, work);
  assert.equal(actual.timeout, 12345);
  assert.equal(actual.encoding, 'utf8');
  assert.equal(actual.env.PATH, baseEnv.PATH);
  assert.equal(actual.env.NPM_CONFIG_USERCONFIG, undefined);
  assert.equal(actual.env.NPM_TOKEN, undefined);
  assert.equal(actual.env.NODE_AUTH_TOKEN, undefined);
  assert.equal(actual.env.npm_package_name, undefined);
  assert.equal(baseEnv.NPM_CONFIG_USERCONFIG, inheritedConfig);
  assert.equal(actual.env.npm_config_registry, 'https://registry.npmjs.org/');
  assert.equal(actual.env.npm_config_workspaces, 'false');
  assert.equal(actual.env.npm_config_ignore_scripts, 'true');
  assert.equal(actual.env.npm_config_prefer_online, 'true');
  assert.equal(actual.env.npm_config_prefer_offline, 'false');
  assert.equal(actual.env.npm_config_offline, 'false');
  assert.equal(readFileSync(actual.env.npm_config_userconfig, 'utf8'), '');
  assert.equal(readFileSync(actual.env.npm_config_globalconfig, 'utf8'), '');
  assert.equal(lstatSync(actual.env.npm_config_cache).mode & 0o777, 0o700);
  const reused = npmToolingOptions({cwd: work, env: baseEnv}, ['ci', '--ignore-scripts']);
  assert.equal(reused.env.npm_config_cache, actual.env.npm_config_cache);
  assert.notEqual(actual.env.npm_config_cache, baseEnv.NPM_CONFIG_CACHE);
  const bad = [[], ['query', '.untrusted'], ['sbom'], ['publish'], ['stage'],
    ['install', '--userconfig', inheritedConfig], ['install', '--cache', './shared'],
    ['install', '--prefer-offline'], ['install', '--ignore-scripts=false'],
    ['install', '-g'], ['install', '--workspace', '{a,b}'], ['install', '--no-ignore-scripts'],
    ['install', '--ignore-scripts', '--ignore-scripts'], ['install', 'unreviewed-package'],
    ['pack', 'remote-package', '--pack-destination', work], ['pack', './package'],
    ['--version', '--registry', 'https://host.invalid/']];
  for (const args of bad) assert.throws(() => npmToolingOptions(input, args), undefined, JSON.stringify(args));
  assert.throws(() => npmToolingOptions({cwd: '.'}, ['install']));
  assert.equal(readFileSync(join(work, '.npmrc'), 'utf8'), projectConfig);

  let configuration;
  if (process.env.NGX_NPM_PROFILE_CLI) {
    const version = spawnSync(process.execPath, [process.env.NGX_NPM_PROFILE_CLI, '--version'], {...actual, timeout: 30000});
    assert.equal(version.status, 0, version.stderr);
    assert.equal(version.stdout.trim(), '11.19.0');
    const probe = spawnSync(process.execPath, [process.env.NGX_NPM_PROFILE_CLI, 'config', 'list', '--json'], {...actual, timeout: 30000});
    assert.equal(probe.status, 0, probe.stderr);
    const parsed = JSON.parse(probe.stdout);
    assert.equal(parsed.registry, 'https://registry.npmjs.org/');
    assert.equal(parsed.cache, actual.env.npm_config_cache);
    assert.equal(parsed.userconfig, actual.env.npm_config_userconfig);
    assert.equal(parsed.globalconfig, actual.env.npm_config_globalconfig);
    assert.equal(parsed.workspaces, false);
    assert.equal(parsed['ignore-scripts'], true);
    assert.equal(parsed['prefer-online'], true);
    assert.equal(parsed['prefer-offline'], false);
    assert.equal(parsed.offline, false);
    assert.equal(parsed['legacy-peer-deps'], true);
    assert.equal(probe.stdout.includes('fixture-token'), false);
    configuration = {npm: version.stdout.trim(),registry: parsed.registry, workspaces: parsed.workspaces,
      ignore_scripts: parsed['ignore-scripts'], prefer_online: parsed['prefer-online'],
      prefer_offline: parsed['prefer-offline'], offline: parsed.offline,
      legacy_peer_deps: parsed['legacy-peer-deps']};
  }
  console.log(JSON.stringify({result: 'pass',node: process.version, cache: actual.env.npm_config_cache,
    rejected_commands: bad.length, original_options_preserved: true,
    host_config_tokens_removed: true, project_config_unchanged: true,
    actual_npm_configuration: configuration ?? null}));
} finally {
  rmSync(work, {recursive: true, force: true});
}
