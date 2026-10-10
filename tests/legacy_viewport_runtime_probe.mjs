/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Owned native primitives vs untouched tagged helper; synthetic window/clock only. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), req = createRequire(import.meta.url);
const ts = req('typescript'), url = name => pathToFileURL(req.resolve(name)).href;
await import(url('@angular/compiler'));
const sourcePath = 'projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts';
const referencePath = 'reference/material-16.2.14/viewport-sources/viewport-ruler.ts';
const source = readFileSync(resolve(root, sourcePath), 'utf8'), reference = readFileSync(resolve(root, referencePath), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(reference), '2cd3078732370fd98fad1fdf1c443acbaab5b5986fbf3cadd7ff546d51c3ed76');
async function load(text, name) {
  const emitted = ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, experimentalDecorators: true}}).outputText
    .replace(/(['"])(@angular\/[^'"]+|rxjs(?:\/operators)?)\1/g,
      (_, quote, spec) => JSON.stringify(url(spec === '@angular/common' ? '@angular/core' : spec)));
  return (await import('data:text/javascript;base64,' + Buffer.from(emitted).toString('base64')))[name];
}
import {observations} from './legacy_viewport_observations.mjs';
const original = await observations(await load(reference, 'ViewportRuler'));
assert.ok(original.every(c => c.result === 'pass'), JSON.stringify(original.filter(c => c.result === 'fail')));
const candidate = await observations(await load(source, '_LegacyViewport'));
assert.deepEqual(candidate, original, 'owned results must match independently executed untouched tagged behavior');
const mutations = [];
for (const [id, altered] of [
  ['default-delay-one', source.replace('throttleTime: number = 20', 'throttleTime: number = 1')],
  ['no-orientation-listener', source.replace("target.addEventListener('orientationchange', state.listener);", '')],
  ['cache-invalidates-immediately', source.replace('this.change().subscribe(() => state.size = null)', 'this.change(0).subscribe(() => state.size = null)')],
  ['cache-exposed-to-callers', source.replace('const result = {...state.size};', 'const result = state.size;')],
  ['window-scroll-before-client-rect', source.replace('-rect.top || document.body.scrollTop || target.scrollY', 'target.scrollY || document.body.scrollTop || -rect.top')],
  ['no-listener-removal', source.replace("target.removeEventListener('resize', state.listener);", '')],
  ['no-root-completion', source.replace('state.changes.complete();', '')],
]) {
  assert.notEqual(altered, source, id + ': mutation did not apply');
  const results = await observations(await load(altered, '_LegacyViewport'));
  assert.notDeepEqual(results, original, id + ': mutation escaped');
  mutations.push({id, rejected: true, failed_cases: results.filter((c, i) => JSON.stringify(c) !== JSON.stringify(original[i])).map(c => c.id)});
}
const report = {schema_version: 1, role: 'Owned legacy viewport native primitives vs independent untouched tagged execution; source/synthetic window/clock only',
  node: process.version, compiler: ts.version, source: {path: sourcePath, sha256: sha(source)},
  untouched_reference: {path: referencePath, sha256: sha(reference)}, original, candidate, mutations,
  limits: ['Reference bytes remain untouched; only its DOCUMENT import resolves to the current public Core token for manual constructor execution.',
    'Both classes execute against the same borrowed installed RxJS/Angular22 runtime with synthetic windows/geometry/clock.',
    'Cache/event/scroll observations come from tagged code, not candidate expectations or current private ruler execution.',
    'No native Angular zoneful/zoneless/root-singleton/AOT/packed/actual21/minimum/floor qualification.']};
const argv = process.argv.slice(2), at = argv.indexOf('--report');
if (at !== -1) {assert.equal(existsSync(argv[at + 1]), false); writeFileSync(argv[at + 1], JSON.stringify(report, null, 2) + '\n');}
console.log(JSON.stringify({tagged_cases: original.length, candidate_cases: candidate.length, mutants_rejected: mutations.length,
  node: process.version, compiler: ts.version}));
