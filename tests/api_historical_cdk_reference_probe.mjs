/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * MIT license; see LICENSE.
 */
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, existsSync, readdirSync, rmSync, writeFileSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {prepareHistoricalCdk16Reference} from '../scripts/api-historical-cdk-reference.mjs';

const original = resolve(process.argv[2]);
const raw = readFileSync(original);
const scratch = mkdtempSync(join(tmpdir(), 'historical-cdk-reference-'));
let negatives = 0;
try {
  await import('@angular/compiler');
  const core = await import('@angular/core');
  const current = await import('@angular/cdk/scrolling');
  const parentDir = join(scratch, 'extract');
  const prepared = await prepareHistoricalCdk16Reference({archivePath: original, parentDir,
    fetchImpl() { throw Error('explicit archive must not fetch'); }});
  const old = await import(pathToFileURL(join(prepared.historicalCdk16Root, 'fesm2022/scrolling.mjs')).href);
  assert.notEqual(old.ViewportRuler, current.ViewportRuler);
  const historicalMarker = {}, currentMarker = {};
  const injector = core.Injector.create({providers: [
    {provide: old.ViewportRuler, useValue: historicalMarker},
    {provide: current.ViewportRuler, useValue: currentMarker},
  ]});
  try {
    assert.equal(injector.get(old.ViewportRuler), historicalMarker);
    assert.equal(injector.get(current.ViewportRuler), currentMarker);
  } finally { injector.destroy(); }
  prepared.cleanup();
  prepared.cleanup();
  assert.equal(existsSync(prepared.historicalCdk16Root), false);
  assert.deepEqual(readdirSync(parentDir), []);

  const bad = join(scratch, 'bad.tgz');
  writeFileSync(bad, Buffer.alloc(raw.length));
  await assert.rejects(prepareHistoricalCdk16Reference({archivePath: bad, parentDir})); negatives++;
  writeFileSync(bad, raw.subarray(0, raw.length - 1));
  await assert.rejects(prepareHistoricalCdk16Reference({archivePath: bad, parentDir})); negatives++;
  const linked = join(scratch, 'linked.tgz'); symlinkSync(original, linked);
  await assert.rejects(prepareHistoricalCdk16Reference({archivePath: linked, parentDir})); negatives++;

  const response = data => ({ok: true, body: (async function* () { yield data; })()});
  const downloaded = await prepareHistoricalCdk16Reference({parentDir, cacheDir: join(scratch, 'cache'),
    fetchImpl(url) { assert.equal(url, 'https://registry.npmjs.org/@angular/cdk/-/cdk-16.2.14.tgz'); return response(raw); }});
  downloaded.cleanup();
  const cached = await prepareHistoricalCdk16Reference({parentDir, cacheDir: join(scratch, 'cache'),
    fetchImpl() { throw Error('authenticated cache must not fetch'); }});
  cached.cleanup();
  for (const [id, bytes] of [['short', raw.subarray(0, raw.length - 1)], ['long', Buffer.alloc(raw.length + 1)], ['digest', Buffer.alloc(raw.length)]]) {
    const cacheDir = join(scratch, id);
    await assert.rejects(prepareHistoricalCdk16Reference({parentDir, cacheDir, fetchImpl() { return response(bytes); }}));
    assert.equal(existsSync(join(cacheDir, 'api-reference/cdk-16.2.14.tgz')), false); negatives++;
  }
  assert.deepEqual(readdirSync(parentDir), []);
  console.log(JSON.stringify({explicit_reference: 'pass', authenticated_download_and_cache: 'pass',
    distinct_actual_provider_tokens: true, cleanup: 'pass', negatives}));
} finally { rmSync(scratch, {recursive: true, force: true}); }
