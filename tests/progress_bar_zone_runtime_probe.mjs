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
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewProgressBarZone, emitProgressBarSubject} from '../scripts/progress-bar-zone-use-review.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const review = reviewProgressBarZone({root}), path = 'projects/ngx-material-legacy/' + review.file;
const source = readFileSync(join(root, path), 'utf8');
const replace = (from, to) => {assert.equal(source.split(from).length, 2); return source.replace(from, to);};
const mutations = {
  'inside-registration': replace('this._ngZone.runOutsideAngular(', 'this._ngZone.run('),
  'child-target': replace('e.target === element', 'e.target !== element'),
  'no-observers': replace('this.animationEnd.observers.length === 0', 'false'),
  'wrong-mode': replace("this.mode === 'determinate' || this.mode === 'buffer'", "this.mode === 'indeterminate' || this.mode === 'query'"),
  'wrong-value': replace('this.animationEnd.next({value: this.value})', 'this.animationEnd.next({value: 0})'),
  'missing-zone-entry': replace('this._ngZone.run(() => this.animationEnd.next({value: this.value}));', 'this.animationEnd.next({value: this.value});'),
  'missing-teardown': replace('this._animationEndSubscription.unsubscribe();', ''),
};
const sourceControls = [...Object.values(mutations), replace('private _ngZone: NgZone', 'private _ngZone?: NgZone'),
  source.replace('  NgZone,', '  NgZone as OtherZone,'), source + '\nconst escape = new NgZone({});\n'];
for (const text of sourceControls) {
  assert.notEqual(text, source); assert.throws(() => reviewProgressBarZone({root,
    readSource: p => p === path ? text : readFileSync(join(root, p), 'utf8')}));
}
for (const guarded of [review.owned_color, review.unchanged_template]) {
  assert.throws(() => reviewProgressBarZone({root, readSource: p =>
    p === guarded.path ? readFileSync(join(root, p), 'utf8') + '\nchanged\n' : readFileSync(join(root, p), 'utf8')}));
}
const loaded = prepareMaterialPublicSubjects(root), results = [], declarations = [];
const workerPath = 'tests/progress_bar_zone_runtime_subject.mjs', worker = readFileSync(join(root, workerPath), 'utf8');
try {
  for (const model of loaded.models) {
    const matches = [];
    for (const [path, text] of model.sources) if (path.startsWith('@angular/core/') && path.endsWith('.d.ts')) {
      const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
      for (const cls of sf.statements.filter(n => ts.isClassDeclaration(n) && n.name?.text === 'NgZone')) {
        const members = cls.members.filter(n => ['run', 'runOutsideAngular'].includes(n.name?.getText(sf)));
        assert.equal(members.length, 2);
        for (const node of [cls, ...members]) {
          assert.ok(!ts.getJSDocTags(node).some(t => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(t.tagName.text)));
          assert.ok(!node.modifiers?.some(m => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].includes(m.kind)));
        }
        matches.push({line: model.line, framework: model.packages.get('@angular/core').version,
          path, source_sha256: hash(text), members: members.map(n => n.getText(sf))});
      }
    }
    assert.equal(matches.length, 1); declarations.push(matches[0]);
    const zoneSubject = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'progress-bar-zone-payload.json'), JSON.stringify({...review.payload,
      mutations: Object.fromEntries(Object.entries(mutations).map(([id, text]) => [id, emitProgressBarSubject(text)]))}));
    const entry = join(model.root, 'progress-bar-zone-runtime-subject.mjs'); writeFileSync(entry, worker);
    for (const mode of model.line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) for (const production of [false, true]) {
      const stdout = execFileSync(process.execPath, [entry, model.line, mode, String(production)],
        {cwd: model.root, encoding: 'utf8', timeout: 10000});
      results.push({...JSON.parse(stdout.trim().split('\n').at(-1)), zone_subject: zoneSubject, borrowed: model.borrowed});
    }
  }
  const {payload, ...sourceReview} = review;
  const report = {schema_version: 1, line: JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main',
    source_review: sourceReview, node: process.version, public_namespace_capsule_sha256: loaded.capsule_hash,
    sources: ['scripts/progress-bar-zone-use-review.mjs', 'tests/progress_bar_zone_runtime_probe.mjs', workerPath]
      .map(path => ({path, sha256: hash(readFileSync(join(root, path)))})),
    declarations, results, source_negative_controls: sourceControls.length + 2, runtime_mutation_rejections: results.reduce((n, r) => n + r.mutations.length, 0),
    scope: review.scope, native_or_packed_or_full_floors_qualified: false, g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({subjects: results.length, cases: results.reduce((n, r) => n + r.cases.length, 0),
    source_negative_controls: sourceControls.length + 2, runtime_mutation_rejections: report.runtime_mutation_rejections,
    complete_manual_classes_executed: true, native_or_packed_qualified: false}));
} finally {loaded.dispose();}
