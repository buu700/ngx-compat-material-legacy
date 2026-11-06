/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Runtime platform selection and identity checks; callers acquire the exact archive. */
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
export function runtimeProfile(plan, platform, arch, version) {
  const key = `${platform}-${arch}`;
  if (!['linux-x64', 'linux-arm64'].includes(key)) throw new Error('unsupported floor platform');
  const pin = plan.node_sources_by_platform?.[key]?.[version];
  if (!pin || !/^[0-9a-f]{64}$/.test(pin.sha256) || pin.url !== `https://nodejs.org/dist/v${version}/node-v${version}-${key}.tar.xz`) throw new Error('unqualified runtime pin');
  return {platform:key, pin};
}
export function verifyRuntimeArchive(bytes, pin) {
  if (bytes.length > 100 * 1024 * 1024 || createHash('sha256').update(bytes).digest('hex') !== pin.sha256) throw new Error('Node archive hash/size mismatch');
}
export function verifyRuntimeExecutable(executable, version, platform, child) {
  if (lstatSync(executable).isSymbolicLink()) throw new Error('downloaded Node executable is symlink');
  const actual = child(executable, ['--version']).stdout.trim();
  if (actual !== `v${version}`) throw new Error('downloaded Node version mismatch');
  const observed = JSON.parse(child(executable, ['-p', 'JSON.stringify({platform:process.platform,arch:process.arch})']).stdout);
  if (`${observed.platform}-${observed.arch}` !== platform) throw new Error('downloaded Node platform mismatch');
  return {executable, platform, version:actual, executable_sha256:createHash('sha256').update(readFileSync(executable)).digest('hex')};
}
