/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * MIT license; see LICENSE.
 */
/** Test-only historical token identity; never installed as a product peer. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {extractPackageArchive} from './safe-package-extract.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVE_SHA = 'a499ba0fee46784441b92587e43b17ec72d9bd383f78ea14954eaa62c781bad7';
const ARCHIVE_BYTES = 2037314;
const SCROLLING_SHA = '7656a68cba9c315d54e834f26a36e4f465e1b76b65418ad3ee9dffc3ac6431d6';
const PACKAGE_SHA = 'b7794ad784818253dec6b2aeea7d0b3b5ac7fa6ac0f8d2e440bf9e581fc2bf15';
const URL = 'https://registry.npmjs.org/@angular/cdk/-/cdk-16.2.14.tgz';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function archiveBytes(path) {
  const stat = lstatSync(path);
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'historical CDK archive must be a regular file');
  assert.equal(stat.size, ARCHIVE_BYTES, 'historical CDK archive size differs');
  const bytes = readFileSync(path);
  assert.equal(hash(bytes), ARCHIVE_SHA, 'historical CDK archive digest differs');
  return bytes;
}

async function resolveArchive(explicit, fetchImpl, cache) {
  if (explicit) {
    const path = resolve(explicit);
    archiveBytes(path);
    return path;
  }
  for (const path of [join(cache, 'api-reference/cdk-16.2.14.tgz'), join(cache, 'keycode-subjects/cdk-16.2.14.tgz')]) {
    if (existsSync(path)) {
      archiveBytes(path);
      return path;
    }
  }
  const response = await fetchImpl(URL, {signal: AbortSignal.timeout(30000)});
  assert.ok(response.ok && response.body, 'historical CDK archive download failed');
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    assert.ok(bytes <= ARCHIVE_BYTES, 'historical CDK download exceeds pinned size');
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks);
  assert.equal(raw.length, ARCHIVE_BYTES, 'historical CDK download size differs');
  assert.equal(hash(raw), ARCHIVE_SHA, 'historical CDK download digest differs');
  const path = join(cache, 'api-reference/cdk-16.2.14.tgz');
  mkdirSync(dirname(path), {recursive: true});
  try {
    writeFileSync(path, raw, {flag: 'wx', mode: 0o600});
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  archiveBytes(path);
  return path;
}

/** A fresh extraction has an explicit lifetime and the workspace's current peers. */
export async function prepareHistoricalCdk16Reference({
  archivePath = process.env.REFERENCE_CDK16_TARBALL,
  parentDir = join(ROOT, 'artifacts/local/api-historical-cdk16'),
  cacheDir = join(homedir(), '.cache/ngx-compat-material-legacy-closeout'),
  fetchImpl = globalThis.fetch,
} = {}) {
  const archive = await resolveArchive(archivePath, fetchImpl, cacheDir);
  mkdirSync(parentDir, {recursive: true});
  const scratch = mkdtempSync(join(parentDir, 'reference-'));
  try {
    const packageRoot = extractPackageArchive(archive, scratch);
    assert.equal(hash(readFileSync(join(packageRoot, 'package.json'))), PACKAGE_SHA);
    assert.equal(hash(readFileSync(join(packageRoot, 'fesm2022/scrolling.mjs'))), SCROLLING_SHA);
    // Keep dependency resolution outside the authenticated package image.
    symlinkSync(join(ROOT, 'node_modules'), join(scratch, 'node_modules'), 'dir');
    return {
      historicalCdk16Root: packageRoot,
      historicalCdk16Tarball: archive,
      cleanup() { rmSync(scratch, {recursive: true, force: true}); },
    };
  } catch (error) {
    rmSync(scratch, {recursive: true, force: true});
    throw error;
  }
}
