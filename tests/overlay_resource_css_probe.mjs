/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Full original overlay resource CSS with one explicit non-interactive pane specificity repair. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url);
const sass = require('sass'), esbuild = require('esbuild'), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const options = {}, args = process.argv.slice(2);
assert.equal(args.length, 10);
for (let i = 0; i < args.length; i += 2) {
  assert.ok(['--original-root', '--main-root', '--maintenance-root', '--parser-root', '--report'].includes(args[i]));
  assert.ok(!options[args[i]]); options[args[i]] = resolve(args[i + 1]);
}
assert.equal(existsSync(options['--report']), false);
const parserPackage = JSON.parse(readFileSync(join(options['--parser-root'], 'package.json')));
assert.equal(parserPackage.name, 'postcss'); assert.equal(parserPackage.version, '8.5.28');
const postcss = require(join(options['--parser-root'], 'lib/postcss.js'));
const pins = {
  'legacy-tooltip/tooltip.scss': 'f688fb7465c4271e24b37b07d2cd38c4490487c2f4f5c3a4190179a0ba651f15',
  'legacy-autocomplete/autocomplete.scss': 'd7fddcdbfc3bed5a021f1aced63a7d172dfb5d97157857431ed4df65a6f8f78e',
};
const identity = JSON.parse(readFileSync(join(root, 'compatibility/rc/original16-sass-source-diagnostic-identity.json'))), known = new Map();
for (const list of Object.values(identity.loaded_source_sets)) for (const member of list) known.set(member.path, member);
for (const [key, pin] of [
  ['--original-root', 'dd7e20cc3b362ed0140de0b277b8d192720cb72c4e480337910a499a0f5bfed5'],
  ['--main-root', '534372c8fe2542a439818bf5dddc76264e3cbe1dfb0cf3188a39b8a14fa1d159'],
  ['--maintenance-root', '534372c8fe2542a439818bf5dddc76264e3cbe1dfb0cf3188a39b8a14fa1d159'],
]) assert.equal(sha(readFileSync(join(options[key], '@angular/cdk/a11y/_index.scss'))), pin);
const originalPointerSelector = '.mat-tooltip-panel-non-interactive';
const adaptedPointerSelector = '.mat-tooltip-panel.mat-tooltip-panel-non-interactive';
function pointerAdaptation(css) {
  const tree = postcss.parse(css), rules = [];
  tree.walkRules(rule => {if (rule.selector === originalPointerSelector) rules.push(rule);});
  assert.equal(rules.length, 1, 'exact original non-interactive selector missing');
  assert.equal(rules[0].nodes.length, 1);
  assert.equal(rules[0].nodes[0].type, 'decl');
  assert.equal(rules[0].nodes[0].prop, 'pointer-events');
  assert.equal(rules[0].nodes[0].value, 'none');
  assert.equal(rules[0].nodes[0].important, undefined);
  rules[0].selector = adaptedPointerSelector;
  return tree.toString();
}
function partition(css) {
  const tree = postcss.parse(css), native = [];
  tree.walkAtRules('media', rule => {if (rule.params === '(forced-colors: active)') {native.push(rule.toString()); rule.remove();}});
  return {historical: tree.toString(), native: native.join('\n')};
}
function syntax(css) {
  const result = esbuild.transformSync(css, {loader: 'css', minifyWhitespace: true, minifySyntax: false, minifyIdentifiers: false});
  assert.equal(result.warnings.length, 0); return result.code;
}
function compile(text, url, paths) {
  return sass.compileString(text, {url: pathToFileURL(url), loadPaths: paths, style: 'expanded', logger: {warn() {}, debug() {}}});
}
const models = new Map();
for (const [file, pin] of Object.entries(pins)) {
  const source = readFileSync(join(root, 'reference/material-16.2.14/component-structural-sources', file), 'utf8');
  assert.equal(sha(source), pin);
  const virtual = join(options['--original-root'], '@angular/material', file), original = compile(source, virtual, [options['--original-root']]);
  const parts = partition(original.css); assert.equal(parts.native, '');
  const loaded = original.loadedUrls.map(url => {
    const path = fileURLToPath(url);
    if (path === virtual) return {path, sha256: pin, tagged_virtual_entry: true};
    const bytes = readFileSync(url), relative = path.slice(options['--original-root'].length + 1), member = known.get(relative);
    assert.ok(member, 'unknown original member ' + relative); assert.equal(sha(bytes), member.sha256); assert.equal(bytes.length, member.bytes);
    return {path, sha256: member.sha256, bytes: member.bytes};
  });
  models.set(file, {source, virtual, original, historical: file.startsWith('legacy-tooltip/') ? pointerAdaptation(parts.historical) : parts.historical, loaded});
}
function assess(file, peer, override) {
  const model = models.get(file), path = join(root, 'projects/ngx-material-legacy', file), source = override ?? readFileSync(path, 'utf8');
  const candidate = compile(source, path, [peer]), parts = partition(candidate.css);
  assert.equal(sha(syntax(parts.historical)), sha(syntax(model.historical)), 'complete historical overlay CSS differs beyond exact pane specificity repair');
  const native = compile(model.source.replaceAll('cdk.high-contrast(active, off)', 'cdk.high-contrast(active)'), model.virtual, [peer, options['--original-root']]);
  assert.equal(sha(syntax(parts.native)), sha(syntax(partition(native.css).native)), 'complete independent native overlay CSS differs');
  return {file, candidate_source_sha256: sha(source), original_source_sha256: sha(model.source), original_css_sha256: sha(model.original.css), candidate_css_sha256: sha(candidate.css), public_native_css_sha256: sha(partition(native.css).native), full_historical_css_equal_with_exact_pointer_rule_adaptation: true, full_public_native_css_equal: true, original_loaded_urls: model.loaded, candidate_loaded_urls: candidate.loadedUrls.map(url => ({path: fileURLToPath(url), sha256: sha(readFileSync(url))}))};
}
const observations = [], mutations = [], tooltip = 'legacy-tooltip/tooltip.scss', autocomplete = 'legacy-autocomplete/autocomplete.scss';
const read = file => readFileSync(join(root, 'projects/ngx-material-legacy', file), 'utf8');
for (const key of ['--main-root', '--maintenance-root']) {
  for (const file of models.keys()) observations.push({peer: key, ...assess(file, options[key])});
  for (const [id, file, changed] of [
    ['tooltip-line-height-reset', tooltip, read(tooltip) + '\n.mat-tooltip-panel {line-height:normal;}'],
    ['tooltip-gap-change', tooltip, read(tooltip).replace('$margin: 14px;', '$margin: 10px;')],
    ['tooltip-pointer-specificity-loss', tooltip, read(tooltip).replace(adaptedPointerSelector, originalPointerSelector)],
    ['tooltip-native-addition', tooltip, read(tooltip) + '\n@media (forced-colors:active) {.mat-tooltip {height:40px;}}'],
    ['autocomplete-child-pointer-copy', autocomplete, read(autocomplete) + '\n.mat-autocomplete-panel.mat-autocomplete-hidden {pointer-events:none;}'],
    ['autocomplete-height-change', autocomplete, read(autocomplete).replace('$panel-max-height: 256px', '$panel-max-height: 300px')],
  ]) {
    assert.notEqual(changed, read(file));
    assert.throws(() => assess(file, options[key], changed), /complete historical overlay CSS differs|complete independent native overlay CSS differs/);
    mutations.push({peer: key, id, rejected: true});
  }
}
const report = {schema_version: 1, line: JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main', node: process.version, sass: sass.info, css_parser: parserPackage.version, esbuild: esbuild.version, observations, mutations, reviewed_pointer_rule: {original_selector: originalPointerSelector, candidate_selector: adaptedPointerSelector, declaration: 'pointer-events:none', scope: 'One exact non-interactive pane rule; same pane carries both classes from the historical owned tooltip base. Isolated browser tests separately prove intended click-through under either current-CDK stylesheet loading order.'}, limits: 'Whole authentic historical structural CSS including tooltip keyframes and independent native emission. Formatting whitespace only normalized. No native Angular component, OverlayRef runtime, real-user, packed-artifact, full matrix or G11 clearance.', g11_claim: 'not-passed'};
writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({line: report.line, whole_styles: observations.length, negative_controls: mutations.length}));
