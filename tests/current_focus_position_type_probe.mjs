/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareCurrentFocusPositionTypes, reviewCurrentFocusPositionTypes}
  from '../scripts/current-focus-position-type-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const hash = b => createHash('sha256').update(b).digest('hex');
const model = prepareCurrentFocusPositionTypes({root});
const report = reviewCurrentFocusPositionTypes({root, model});
assert.equal(report.cases.length, 7); assert.equal(report.sources.length, 3);
assert.equal(report.cases.filter(c => c.scope === 'erased-type-import').length, 5);
assert.equal(report.cases.filter(c => c.scope === 'public-type-alias-reexport').length, 2);
assert.equal(report.native_or_packed_execution, false); assert.equal(report.consumer_floor_execution, false);
report.mutations = [];
function reject(id, changes = {}, selected = model, pattern = /AssertionError/) {
  assert.throws(() => reviewCurrentFocusPositionTypes({root, model: selected,
    readSource: p => changes[p] ?? read(p)}), pattern, id);
  report.mutations.push({id, rejected: true});
}
const dialog = 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.ts';
const panel = 'projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts';
const api = 'projects/ngx-material-legacy/legacy-menu/public-api.ts';
reject('runtime-focus-origin', {[dialog]: read(dialog) + '\nconsole.log(FocusOrigin);\n'});
reject('shadowed-focus-origin', {[dialog]: read(dialog) + '\nfunction shadow(){type FocusOrigin=never;let value:FocusOrigin;}\n'});
reject('generic-focus-origin', {[panel]: read(panel) + '\ntype GenericOrigin=FocusOrigin<any>;\n'});
reject('runtime-menu-position', {[panel]: read(panel) + '\nconsole.log(MenuPositionX);\n'});
reject('generic-menu-position', {[panel]: read(panel) + '\ntype GenericPosition=MenuPositionX<number>;\n'});
reject('runtime-direction', {[panel]: read(panel) + '\nconsole.log(Direction);\n'});
reject('ambiguous-focus-import', {[panel]: read(panel) + "\nimport type {FocusOrigin as Other} from '@angular/cdk/a11y';\n"});
const missing = read(dialog).replace('FocusMonitor, FocusOrigin, FocusTrap,', 'FocusMonitor, FocusTrap,');
assert.notEqual(missing, read(dialog)); reject('missing-current-import', {[dialog]: missing});
const wrongRoute = read(panel).replace("from '@angular/material/menu';", "from '@angular/material/menu/testing';");
assert.notEqual(wrongRoute, read(panel)); reject('wrong-public-position-route', {[panel]: wrongRoute});
const renamed = read(api).replace('MenuPositionX as LegacyMenuPositionX', 'MenuPositionX as ModernPositionX');
assert.notEqual(renamed, read(api)); reject('historical-reexport-renamed', {[api]: renamed});
reject('public-position-alias-as-value', {[api]: read(api) + '\nconsole.log(LegacyMenuPositionX);\n'});
reject('duplicate-current-position-reexport', {[api]: read(api) + "\nexport type {MenuPositionX as Duplicate} from '@angular/material/menu';\n"});
const changedLine = structuredClone(model); changedLine.line = model.line === 'main' ? '21.x' : 'main';
reject('wrong-line-model', {}, changedLine);
const forgedBodies = structuredClone(model);
for (const a of forgedBodies.aliases) if (a.symbol === 'MenuPositionX') a.body += " | 'left'";
reject('coforged-original-and-peer-alias-bodies', {}, forgedBodies);
const stalePath = model.aliases.find(a => a.line === model.line && a.symbol === 'FocusOrigin').path;
reject('stale-peer-declaration', {[stalePath]: read(stalePath) + '\n// changed dependency\n'});
const rebound = structuredClone(model), changed = read(stalePath).replace("'program' | null", "'program' | null | 'unknown'");
assert.notEqual(changed, read(stalePath));
rebound.inputs.find(r => r.path === stalePath).sha256 = hash(changed);
reject('restamped-widened-peer-source', {[stalePath]: changed}, rebound);
const outside = 'projects/ngx-material-legacy/legacy-tooltip/public-api.ts';
reject('new-type-route-outside-reviewed-files', {[outside]: read(outside) + "\nexport type {FocusOrigin as ExtraOrigin} from '@angular/cdk/a11y';\n"});
const changedSnapshot = structuredClone(model);
changedSnapshot.current_source_snapshot.source_files[0].sha256 = '0'.repeat(64);
reject('forged-whole-source-snapshot', {}, changedSnapshot);
const shortenedSnapshot = structuredClone(model);
shortenedSnapshot.current_source_snapshot.source_files.pop();
reject('incomplete-whole-source-snapshot', {}, shortenedSnapshot);
const aliased = read(panel).replace('FocusOrigin}', 'FocusOrigin as HistoricalOrigin}')
  .replace('(origin?: FocusOrigin)', '(origin?: HistoricalOrigin)');
assert.notEqual(aliased, read(panel));
const aliasReport = reviewCurrentFocusPositionTypes({root, model, readSource: p => p === panel ? aliased : read(p)});
assert.equal(aliasReport.cases.find(c => c.file === panel.slice('projects/ngx-material-legacy/'.length) && c.symbol === 'FocusOrigin')
  .occurrences[0].local_name, 'HistoricalOrigin');
report.alias_binding_positive = 1;
report.producer_sha256 = hash(read('scripts/current-focus-position-type-review.mjs'));
report.probe_sha256 = hash(read('tests/current_focus_position_type_probe.mjs'));
const args = process.argv.slice(2);
if (args.length) {
  assert.equal(args.length, 2); assert.equal(args[0], '--report');
  writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
}
console.log(JSON.stringify({line: report.line, current_additional_uses: report.cases.length,
  source_files: report.sources.length, erased_imports: 5, historical_type_reexports: 2,
  mutants_rejected: report.mutations.length, alias_binding_positive: report.alias_binding_positive,
  native_or_packed_execution: false, consumer_floor_execution: false}));
