/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Challenge actual browser predicates without starting/installing browsers. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {progressCspStyleOkay} from '../scripts/progress-csp-style-contract.mjs';
const ts = createRequire(import.meta.url)('typescript');
const root = new URL('..', import.meta.url);
const proof = JSON.parse(readFileSync(new URL('compatibility/rc/progress-color-native-checkpoints.json', root)));
// These are retained observations of prior artifacts, used only as validator inputs.
const probes = [];
function collect(value) {
  if (!value || typeof value !== 'object') return;
  if (value.modes && Object.hasOwn(value, 'negative_data_image_blocked')) probes.push(value);
  for (const child of Object.values(value)) collect(child);
}
collect(proof);
assert.equal(probes.length, 2);
for (const good of probes) assert.equal(progressCspStyleOkay(good), true);
const good = probes[0];
const mutations = [
  p => {p.modes.buffer.background_image = 'none';},
  p => {p.modes.buffer.background_image = 'url("data:image/svg+xml,defect")';},
  p => {p.modes.buffer.background_image = p.modes.buffer.background_image.replace('2px', '8px');},
  p => {p.modes.buffer.background_color = 'transparent';},
  p => {p.modes.buffer.mask_image = 'url("data:image/svg+xml,defect")';},
  p => {p.positive_violations.push({directive: 'img-src', blocked: 'data'});},
  p => {p.positive_violations = null;},
  p => {p.ie11_media_matches = true;},
  p => {p.negative_data_image_blocked = false;},
  p => {p.legacy_buffer_inline_svg = false;},
  p => {p.historical_data_uri_retained = false;},
  p => {p.compiled_css_sha256 = '';},
  p => {p.error = 'native failure';},
  p => {p.modes.unexpected = p.modes.buffer;},
];
for (const mode of ['determinate', 'buffer', 'query', 'indeterminate']) {
  mutations.push(p => {delete p.modes[mode];}, p => {p.modes[mode].present = false;});
  if (mode !== 'buffer') mutations.push(p => {p.modes[mode].dots_present = true;});
}
const badProbes = mutations.map(mutate => {const p = structuredClone(good); mutate(p); return p;});
for (const p of badProbes) assert.equal(progressCspStyleOkay(p), false);
for (const p of [null, undefined, [], {}]) assert.equal(progressCspStyleOkay(p), false);

function parse(path) {
  const text = readFileSync(new URL(path, root), 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(source.parseDiagnostics.length, 0);
  return source;
}
function declaration(source, name) {
  let found;
  function walk(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) {
      assert.equal(found, undefined); found = node.initializer;
    }
    ts.forEachChild(node, walk);
  }
  walk(source); assert.ok(found, name); return found;
}
const surface = parse('scripts/browser-surface-families.mjs');
const expression = declaration(surface, 'ok').getText(surface);
const families = {button: {present: true, disabled_class: true, focused: true}, card: {present: true},
  'progress-bar': {present: true, value_reflected: true}, 'progress-spinner': {present: true, value_reflected: true}};
const common = {progressCspStyleOkay, peerIconTtOkay: () => true, formFieldStateTokensOkay: () => true,
  legacyCoreHighContrastOkay: () => true, rippleColorBindingOkay: () => true};
function surfaceOkay(probe) {
  return runInNewContext(expression, {...common, progressCsp: probe, error: null, zoneOk: true,
    peerIconTt: {}, peerFormHover: {}, coreHighContrast: {}, rippleColorBinding: {}, families});
}
assert.equal(surfaceOkay(good), true);
for (const p of badProbes) assert.equal(surfaceOkay(p), false, 'surface producer ignores defective progress observation');
const slice = parse('scripts/run-browser-matrix-slice.mjs');
const selected = declaration(slice, 'scenarios').elements.filter(node =>
  node.properties.some(p => p.name?.getText(slice) === 'id' && /^surface-families-/.test(p.initializer.text)));
assert.equal(selected.length, 2);
for (const node of selected) {
  const predicate = node.properties.find(p => p.name?.getText(slice) === 'require').initializer;
  const requireReport = runInNewContext('(' + predicate.getText(slice) + ')', common);
  const report = {families, credited_cell_ids: Array(6).fill('fixture-only'), zoneless: true,
    bundle_has_zone: false, zone_global: 'undefined', peer_icon_tt: {}, core_high_contrast: {}, progress_csp: good};
  assert.equal(requireReport(report), true);
  for (const p of badProbes) assert.equal(requireReport({...report, progress_csp: p}), false,
    'slice accepts defective progress observation');
}
console.log(JSON.stringify({retained_validator_inputs: probes.length, rejected_defects: badProbes.length,
  actual_predicates: 3, native_execution: false, acceptance_credit: false}));
