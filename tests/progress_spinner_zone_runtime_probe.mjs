/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewProgressSpinnerZone} from '../scripts/progress-spinner-zone-use-review.mjs';
import {emitProgressBarSubject} from '../scripts/progress-bar-zone-use-review.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const review = reviewProgressSpinnerZone({root}), path = 'projects/ngx-material-legacy/' + review.file;
const source = readFileSync(join(root, path), 'utf8');
const replace = (from, to) => {assert.equal(source.split(from).length, 2, from); return source.replace(from, to);};
const mutations = {
  'server-subscription': replace('_platform.isBrowser && _platform.SAFARI', 'true'),
  'non-safari-subscription': replace('_platform.isBrowser && _platform.SAFARI', '_platform.isBrowser'),
  'wrong-throttle': replace('viewportRuler.change(150)', 'viewportRuler.change(0)'),
  'wrong-mode': replace("if (this.mode === 'indeterminate')", "if (this.mode === 'determinate')"),
  'missing-zone-entry': replace('ngZone.run(() => changeDetectorRef.markForCheck());', 'changeDetectorRef.markForCheck();'),
  'missing-mark': replace('ngZone.run(() => changeDetectorRef.markForCheck());', 'ngZone.run(() => {});'),
  'missing-teardown': replace('this._resizeSubscription.unsubscribe();', ''),
  'missing-detector-guard': replace('viewportRuler && changeDetectorRef && ngZone', 'viewportRuler && ngZone'),
  'missing-viewport-guard': replace('viewportRuler && changeDetectorRef && ngZone', 'changeDetectorRef && ngZone'),
  'missing-zone-guard': replace('viewportRuler && changeDetectorRef && ngZone', 'viewportRuler && changeDetectorRef'),
};
const sourceControls = [...Object.values(mutations), replace('ngZone?: NgZone', 'ngZone: NgZone'),
  source.replace('  NgZone,', '  NgZone as OtherZone,'), source + '\nconst extra = new NgZone({});\n'];
for (const text of sourceControls) {assert.notEqual(text, source); assert.throws(() => reviewProgressSpinnerZone({root,
  readSource: p => p === path ? text : readFileSync(join(root, p), 'utf8')}));}
const loaded = prepareMaterialPublicSubjects(root), results = [];
const workerPath = 'tests/progress_spinner_zone_runtime_subject.mjs', worker = readFileSync(join(root, workerPath), 'utf8');
try {
  for (const model of loaded.models) {
    const zoneSubject = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'progress-spinner-zone-payload.json'), JSON.stringify({...review.payload,
      mutations: Object.fromEntries(Object.entries(mutations).map(([id, text]) => [id, emitProgressBarSubject(text)]))}));
    const entry = join(model.root, 'progress-spinner-zone-runtime-subject.mjs'); writeFileSync(entry, worker);
    for (const mode of model.line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) for (const production of [false, true]) {
      const stdout = execFileSync(process.execPath, [entry, model.line, mode, String(production)], {cwd: model.root, encoding: 'utf8', timeout: 10000});
      results.push({...JSON.parse(stdout.trim().split('\n').at(-1)), zone_subject: zoneSubject, borrowed: model.borrowed});
    }
  }
  const {payload, ...sourceReview} = review;
  const report = {schema_version: 1, line: JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main',
    node: process.version, source_review: sourceReview, namespace_capsule_sha256: loaded.capsule_hash,
    sources: ['scripts/progress-spinner-zone-use-review.mjs', 'tests/progress_spinner_zone_runtime_probe.mjs', workerPath,
      'scripts/progress-bar-zone-use-review.mjs'].map(path => ({path, sha256: hash(readFileSync(join(root, path)))})),
    results, source_negative_controls: sourceControls.length, runtime_mutation_rejections: results.reduce((n, r) => n + r.mutations.length, 0),
    scope: review.scope, native_or_packed_or_full_floors_qualified: false, g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({subjects: results.length, cases: results.reduce((n, r) => n + r.cases.length, 0),
    source_negative_controls: sourceControls.length, runtime_mutation_rejections: report.runtime_mutation_rejections,
    native_style_init_or_packed_qualified: false}));
} finally {loaded.dispose();}
