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
import {reviewAnchorZone} from '../scripts/anchor-zone-use-review.mjs';
import {emitProgressBarSubject} from '../scripts/progress-bar-zone-use-review.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const review = reviewAnchorZone({root}), path = 'projects/ngx-material-legacy/' + review.file, source = readFileSync(join(root, path), 'utf8');
const replace = (from, to) => {assert.equal(source.split(from).length, 2, from); return source.replace(from, to);};
const mutations = {
  'inside-registration': replace('this._ngZone.runOutsideAngular(', 'this._ngZone.run('),
  'missing-fallback': replace("    } else {\n      this._elementRef.nativeElement.addEventListener('click', this._haltDisabledEvents);", '    } else {'),
  'missing-listener-removal': replace("this._elementRef.nativeElement.removeEventListener('click', this._haltDisabledEvents);", ''),
  'wrong-removal-identity': replace("removeEventListener('click', this._haltDisabledEvents)", "removeEventListener('click', event => this._haltDisabledEvents(event))"),
  'missing-prevent-default': replace('event.preventDefault();', ''),
  'missing-propagation-stop': replace('event.stopImmediatePropagation();', ''),
  'inverted-disabled': replace('if (this.disabled)', 'if (!this.disabled)'),
  'missing-parent-init': replace('super.ngAfterViewInit();', ''),
  'missing-parent-destroy': replace('super.ngOnDestroy();', ''),
};
const sourceControls = [...Object.values(mutations), replace('private _ngZone?: NgZone', 'private _ngZone: NgZone'),
  source.replace('  NgZone,', '  NgZone as OtherZone,'), source + '\nconst extra = new NgZone({});\n',
  replace("from './internal/common-behaviors'", "from '@angular/material/core'")];
for (const text of sourceControls) {assert.notEqual(text, source); assert.throws(() => reviewAnchorZone({root,
  readSource: p => p === path ? text : readFileSync(join(root, p), 'utf8')}));}
const loaded = prepareMaterialPublicSubjects(root), results = [], workerPath = 'tests/anchor_zone_runtime_subject.mjs';
const worker = readFileSync(join(root, workerPath), 'utf8');
try {
  for (const model of loaded.models) {
    const zoneSubject = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'anchor-zone-payload.json'), JSON.stringify({...review.payload,
      mutations: Object.fromEntries(Object.entries(mutations).map(([id, text]) => [id, emitProgressBarSubject(text)]))}));
    const entry = join(model.root, 'anchor-zone-runtime-subject.mjs'); writeFileSync(entry, worker);
    for (const mode of model.line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) for (const production of [false, true]) {
      const stdout = execFileSync(process.execPath, [entry, model.line, mode, String(production)], {cwd: model.root, encoding: 'utf8', timeout: 10000});
      results.push({...JSON.parse(stdout.trim().split('\n').at(-1)), zone_subject: zoneSubject, borrowed: model.borrowed});
    }
  }
  const {payload, ...sourceReview} = review;
  const report = {schema_version: 1, line: JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main',
    node: process.version, source_review: sourceReview, namespace_capsule_sha256: loaded.capsule_hash,
    sources: ['scripts/anchor-zone-use-review.mjs', 'tests/anchor_zone_runtime_probe.mjs', workerPath,
      'scripts/progress-bar-zone-use-review.mjs'].map(path => ({path, sha256: hash(readFileSync(join(root, path)))})),
    results, source_negative_controls: sourceControls.length, runtime_mutation_rejections: results.reduce((n, r) => n + r.mutations.length, 0),
    scope: review.scope, native_or_packed_or_full_floors_qualified: false, g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({subjects: results.length, cases: results.reduce((n, r) => n + r.cases.length, 0),
    source_negative_controls: sourceControls.length, runtime_mutation_rejections: report.runtime_mutation_rejections,
    complete_parent_anchor_and_mixins_executed: true, native_or_packed_qualified: false}));
} finally {loaded.dispose();}
