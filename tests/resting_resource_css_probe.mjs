/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Historical resting CSS; retained motion extensions are bound separately, not qualified here. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url), sass = require('sass'), esbuild = require('esbuild');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const options = {}, args = process.argv.slice(2);
assert.equal(args.length, 10);
for (let i = 0; i < args.length; i += 2) {
  assert.ok(['--original-root', '--main-root', '--maintenance-root', '--parser-root', '--report'].includes(args[i]));
  assert.ok(!options[args[i]]);
  options[args[i]] = resolve(args[i + 1]);
}
assert.equal(existsSync(options['--report']), false);
const parserPackage = JSON.parse(readFileSync(join(options['--parser-root'], 'package.json')));
assert.equal(parserPackage.name, 'postcss');
assert.equal(parserPackage.version, '8.5.28');
const postcss = require(join(options['--parser-root'], 'lib/postcss.js'));
const pins = {
  'legacy-button/button.scss': '7dfee0803148390d10aa6bc7d8b8f4469cd916b723159df074c33490e91570fe',
  'legacy-core/option/option.scss': '656b9f27dfb8cc4438fa769bae396b125163970faef98736c57897cdaeee40be',
  'legacy-core/option/optgroup.scss': 'c804d192b83c769286be1bc83c72bd2b10be86ba3a9b6bf2652d7662128b44cf',
  'legacy-list/list.scss': '6285d9683c1c4b00cc600b9c07b840b47d34d5480c108061711b5d77d61e2fa3',
  'legacy-form-field/form-field.scss': '4fdfb22e873a2b17f4cc58e6480e07305b618df2712b6b11ea9269152ac38c93',
  'legacy-menu/menu.scss': '44ca0598ca575bf732f875667b5ae330786b505e36fa8d39c2a06c7e0de3fee1',
};
const originals = new Map(Object.entries(pins).map(([file, pin]) => {
  const source = readFileSync(join(root, 'reference/material-16.2.14/component-structural-sources', file), 'utf8');
  assert.equal(sha(source), pin, 'untouched tagged source changed');
  return [file, source];
}));
// Exact pre-existing additions are receipts only. Do not broaden these blocks to silence a mismatch.
const retained = {
  'legacy-menu/menu.scss': {
    suffix: `\n\n@keyframes mat-legacy-menu-enter {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes mat-legacy-menu-exit {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.mat-menu-panel.mat-menu-panel-animations-enabled {
  animation: mat-legacy-menu-enter 120ms cubic-bezier(0, 0, 0.2, 1);
  will-change: transform, opacity;

  &.mat-menu-panel-exit-animation {
    animation: mat-legacy-menu-exit 100ms 25ms linear forwards;
  }

  &.mat-menu-panel-animating {
    pointer-events: none;
  }
}
`,
  },
};
const knownOriginal = new Map();
const identity = JSON.parse(readFileSync(join(root, 'compatibility/rc/original16-sass-source-diagnostic-identity.json')));
for (const list of Object.values(identity.loaded_source_sets)) for (const member of list) knownOriginal.set(member.path, member);
const additional = JSON.parse(readFileSync(join(root, 'compatibility/rc/original16-resting-sass-member-identities.json')));
assert.equal(additional.original_lock_sha256, identity.lock_sha256);
for (const member of additional.members) {
  assert.ok(!knownOriginal.has(member.path), 'additional roster duplicates a prior original member');
  knownOriginal.set(member.path, member);
}
for (const [key, pin] of [
  ['--original-root', 'dd7e20cc3b362ed0140de0b277b8d192720cb72c4e480337910a499a0f5bfed5'],
  ['--main-root', '534372c8fe2542a439818bf5dddc76264e3cbe1dfb0cf3188a39b8a14fa1d159'],
  ['--maintenance-root', '534372c8fe2542a439818bf5dddc76264e3cbe1dfb0cf3188a39b8a14fa1d159'],
]) assert.equal(sha(readFileSync(join(options[key], '@angular/cdk/a11y/_index.scss'))), pin);

function restingSource(file, source) {
  const extra = retained[file];
  if (extra) {
    assert.ok(source.endsWith(extra.suffix), 'retained motion suffix changed');
    source = source.slice(0, -extra.suffix.length);
  }
  return source;
}
function normalizeModules(source) {
  return source
    .replace(/@use '[^']*styles\/core\/style\/component-high-contrast' as cdk;/, "@use '@angular/cdk';")
    .replaceAll('/styles/core/', '/core/')
    .replaceAll('/styles/datepicker/', '/datepicker/')
    .replaceAll('/styles/divider/', '/divider/')
    .replaceAll('cdk.high-contrast(active)', 'cdk.high-contrast(active, off)');
}
function compile(source, url, paths) {
  return sass.compileString(source, {url: pathToFileURL(url), loadPaths: paths, style: 'expanded', logger: {warn() {}, debug() {}}});
}
function syntax(css) {
  const result = esbuild.transformSync(css, {loader: 'css', minifyWhitespace: true, minifySyntax: false, minifyIdentifiers: false});
  assert.equal(result.warnings.length, 0);
  return result.code;
}
function partition(css) {
  const tree = postcss.parse(css), native = [];
  tree.walkAtRules('media', rule => {
    if (rule.params === '(forced-colors: active)') {native.push(rule.toString()); rule.remove();}
  });
  return {historical: tree.toString(), native: native.join('\n')};
}
const models = new Map();
for (const [file, source] of originals) {
  const virtual = join(options['--original-root'], '@angular/material', file);
  const original = compile(source, virtual, [options['--original-root']]), parts = partition(original.css), loaded = [];
  assert.equal(parts.native, '');
  for (const url of original.loadedUrls) {
    const path = fileURLToPath(url);
    if (path === virtual) {loaded.push({path, sha256: sha(source), tagged_virtual_entry: true}); continue;}
    const bytes = readFileSync(url), relative = path.slice(options['--original-root'].length + 1), pin = knownOriginal.get(relative);
    assert.ok(pin, 'unknown original Sass member ' + relative);
    assert.equal(sha(bytes), pin.sha256);
    assert.equal(bytes.length, pin.bytes);
    loaded.push({path, sha256: pin.sha256, bytes: pin.bytes});
  }
  models.set(file, {source, virtual, original, parts, loaded});
}
function assess(file, peer, override) {
  const path = join(root, 'projects/ngx-material-legacy', file), source = override ?? readFileSync(path, 'utf8');
  const model = models.get(file), resting = restingSource(file, source);
  assert.equal(sha(normalizeModules(resting)), sha(model.source), 'resting tagged source differs beyond module relocation');
  const actual = compile(source, path, [peer]), candidate = compile(resting, path, [peer]), parts = partition(candidate.css);
  assert.equal(syntax(parts.historical), syntax(model.parts.historical), 'complete historical resting CSS differs');
  const native = compile(model.source.replaceAll('cdk.high-contrast(active, off)', 'cdk.high-contrast(active)'), model.virtual, [peer, options['--original-root']]);
  assert.equal(syntax(parts.native), syntax(partition(native.css).native), 'independent public native resting CSS differs');
  return {
    file, candidate_source_sha256: sha(source), original_source_sha256: sha(model.source),
    original_css_sha256: sha(model.original.css), full_candidate_css_sha256: sha(actual.css),
    resting_candidate_css_sha256: sha(candidate.css), public_native_css_sha256: sha(partition(native.css).native),
    full_historical_resting_css_equal: true, full_public_native_resting_css_equal: true,
    retained_extensions: retained[file] ? Object.fromEntries(Object.entries(retained[file]).map(([name, text]) => [name, {sha256: sha(text), bytes: Buffer.byteLength(text), qualified_by_this_probe: false}])) : {},
    original_loaded_urls: model.loaded,
    candidate_loaded_urls: actual.loadedUrls.map(url => ({path: fileURLToPath(url), sha256: sha(readFileSync(url))})),
  };
}
const read = file => readFileSync(join(root, 'projects/ngx-material-legacy', file), 'utf8');
const observations = [], mutations = [];
for (const key of ['--main-root', '--maintenance-root']) {
  for (const file of models.keys()) observations.push({peer: key, ...assess(file, options[key])});
  for (const [id, file, changed] of [
    ['button-icon-stacking', 'legacy-button/button.scss', read('legacy-button/button.scss') + '\n.mat-button-wrapper .mat-icon {z-index:1;position:relative;}'],
    ['button-focus-radius', 'legacy-button/button.scss', read('legacy-button/button.scss') + '\n.mat-button.mat-focus-indicator::before {border-radius:inherit;}'],
    ['option-selection-selector', 'legacy-core/option/option.scss', read('legacy-core/option/option.scss').replaceAll(':not(.mat-option-multiple)', ':not(:has(.mat-option-pseudo-checkbox))')],
    ['optgroup-color-inheritance', 'legacy-core/option/optgroup.scss', read('legacy-core/option/optgroup.scss') + '\n.mat-optgroup-label {color:inherit;}'],
    ['list-logical-alignment', 'legacy-list/list.scss', read('legacy-list/list.scss').replace('text-align: left;', 'text-align: start;')],
    ['textarea-cols-width', 'legacy-form-field/form-field.scss', read('legacy-form-field/form-field.scss').replace('width: $default-infix-width;', 'width: $default-infix-width;\n  &:has(textarea[cols]) {width:auto;}')],
    ['menu-viewport-height', 'legacy-menu/menu.scss', read('legacy-menu/menu.scss').replace('max-height: calc(100vh - #{menu-common.$item-height});', 'max-height:100vh;')],
    ['arbitrary-native-addition', 'legacy-core/option/optgroup.scss', read('legacy-core/option/optgroup.scss') + '\n@media (forced-colors:active) {.unrelated {display:none;}}'],
    ['unexpected-form-field-selector', 'legacy-form-field/form-field.scss', read('legacy-form-field/form-field.scss') + '\n.mat-form-field {width:auto;}'],
    ['reintroduced-empty-panel-hide', 'legacy-menu/menu.scss', read('legacy-menu/menu.scss').replace('&.ng-animating {\n    pointer-events: none;', '&.ng-animating {\n    pointer-events: none;\n    &:has(.mat-menu-content:empty) { display: none; }')],
    ['reintroduced-motion-empty-panel-hide', 'legacy-menu/menu.scss', read('legacy-menu/menu.scss').replace('&.mat-menu-panel-animating {\n    pointer-events: none;', '&.mat-menu-panel-animating {\n    pointer-events: none;\n    &:has(.mat-menu-content:empty) { display: none; }')],
  ]) {
    assert.notEqual(changed, read(file));
    assert.throws(() => assess(file, options[key], changed), /resting tagged source differs|retained motion suffix changed|retained empty-panel rule changed/);
    mutations.push({peer: key, id, rejected: true});
  }
}
const report = {
  schema_version: 1,
  line: JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main',
  node: process.version, sass: sass.info, css_parser: parserPackage.version, esbuild: esbuild.version,
  original_resources: [...originals].map(([file, text]) => ({file, sha256: sha(text), bytes: Buffer.byteLength(text)})),
  observations, mutations,
  scope: 'Complete tagged source after module relocation, full historical resting CSS syntax/selector/declaration order, and independently compiled public native resting CSS for six resources. Five styles have no extensions. Exact pre-existing menu motion additions are retained and bound as unqualified receipts, not accepted golden exceptions. Only CSS formatting whitespace is normalized.',
  native_browser_or_angular_or_packed_execution: false, g11_claim: 'not-passed',
};
writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({line: report.line, resting_styles: observations.length, negative_controls: mutations.length, retained_extensions_qualified: false}));
