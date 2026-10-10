/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete shared fixture under genuine public current Angular view creation. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tooltipAriaLifetimeFixture} from '../scripts/tooltip-aria-lifetime-fixture.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const ts = createRequire(import.meta.url)('typescript'), root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const emitted = ts.transpileModule(tooltipAriaLifetimeFixture, {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true}, reportDiagnostics: true});
assert.equal(emitted.diagnostics.length, 0);
const loaded = prepareMaterialPublicSubjects(root), results = [];
try {
  const worker = readFileSync(join(root, 'tests/tooltip_fixture_creation_subject.mjs'), 'utf8');
  for (const model of loaded.models.filter(model => model.line !== 'original')) {
    const zone = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'tooltip-fixture-creation-payload.json'), JSON.stringify({fixture: emitted.outputText}));
    const path = join(model.root, 'tooltip-fixture-creation-subject.mjs'); writeFileSync(path, worker);
    for (const mode of ['zoneful', 'zoneless']) for (const production of [false, true]) {
      const output = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=512', path, mode, String(production)],
        {cwd: model.root, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024}));
      results.push({line: model.line, mode, production, zone_subject: zone, borrowed: model.borrowed, ...output});
    }
  }
  assert.equal(results.length, 8);
  const report = {schema_version: 1, node: process.version, compiler: ts.version,
    shared_fixture_sha256: hash(tooltipAriaLifetimeFixture), worker_sha256: hash(worker),
    public_namespace_capsule_sha256: loaded.capsule_hash, results,
    scope: 'Complete shared native fixture with actual public Angular component/module/query/embedded-view/node injection and JIT template compilation. A protocol tooltip directive and renderer replace actual legacy tooltip/native DOM. Initial application tick initializes the fixture; no embedded-view detectChanges/update is used. Original16 is outside the current-native-fixture scope. No actual legacy directive, native browser, packed/AOT/consumer or Node/Rx floors.'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({subjects: 8, actual_legacy_tooltip_executed: false, native_executed: false}));
} finally {loaded.dispose();}
