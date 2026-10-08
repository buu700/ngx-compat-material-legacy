/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Bounded Sass source diagnostic; expectations come from untouched v16 and public peer overrides. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sass = createRequire(import.meta.url)('sass');
const options = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i], value = process.argv[i + 1];
  assert.ok(['--reference', '--reference-identities', '--peer', '--peer-identities', '--line', '--report'].includes(key) && value);
  options[key.slice(2)] = value;
}
for (const key of ['reference', 'reference-identities', 'peer', 'peer-identities', 'line']) assert.ok(options[key], key);
assert.ok(['main', '21.x'].includes(options.line));
assert.ok(sass.info.startsWith('dart-sass\t1.104.1\t'), 'pinned Sass required');
const referenceRoot = realpathSync(options.reference), peerRoot = realpathSync(options.peer);
const referenceIdentities = JSON.parse(readFileSync(options['reference-identities'])).packages;
const peerIdentities = JSON.parse(readFileSync(options['peer-identities']))[options.line];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(JSON.parse(readFileSync(resolve(referenceRoot, '@angular/material/package.json'))).version, '16.2.14');
assert.equal(JSON.parse(readFileSync(resolve(peerRoot, '@angular/material/package.json'))).version,
  options.line === 'main' ? '22.1.7' : '21.2.14');

function within(base, path) {
  const part = relative(base, path);
  return !isAbsolute(part) && part !== '..' && !part.startsWith('../');
}
function sources(result, bases, identities) {
  return result.loadedUrls.map(url => {
    assert.equal(url.protocol, 'file:');
    const path = realpathSync(fileURLToPath(url));
    const index = bases.findIndex(base => within(base, path));
    assert.ok(index >= 0, 'unexpected source: ' + path);
    const rel = relative(bases[index], path).replaceAll('\\', '/'), bytes = readFileSync(path);
    const record = {root: index, path: rel, sha256: sha(bytes), bytes: bytes.length};
    const packages = identities[index];
    if (packages) {
      const pkg = packages.find(p => rel.startsWith(p.package + '/'));
      assert.ok(pkg, 'unauthenticated package: ' + rel);
      const expected = pkg.sources.find(s => s.path === rel.slice(pkg.package.length + 1));
      assert.ok(expected, 'unauthenticated member: ' + rel);
      assert.equal(record.sha256, expected.sha256, rel);
      assert.equal(record.bytes, expected.bytes, rel);
    }
    return record;
  }).sort((a, b) => a.root - b.root || a.path.localeCompare(b.path));
}
function compile(program, loadPath, bases, identities) {
  const logs = [];
  const result = sass.compileString(program, {loadPaths: [loadPath], style: 'expanded', charset: false,
    silenceDeprecations: ['import', 'if-function', 'global-builtin', 'color-functions', 'mixed-decls', 'slash-div'],
    logger: {warn() {}, debug(message) { logs.push(message); }}});
  return {program_sha256: sha(program), css: result.css, css_sha256: sha(result.css),
    css_bytes: Buffer.byteLength(result.css), sources: sources(result, bases, identities),
    map_unchanged: logs.length ? logs.includes('true') : null,
    ink_restored: logs.length ? logs.includes('ink-restored=true') : null};
}
const scenarios = [
  {id: 'light-full', dark: false, selector: '.field-light', raw: false},
  {id: 'dark-raw', dark: true, selector: '.field-dark', raw: true},
  {id: 'light-root', dark: false, selector: null, raw: true},
  // Contrast is derived from the customized historical surface, not merely is-dark.
  {id: 'dark-with-light-surface', dark: true, selector: '.field-custom', raw: false, lightSurface: true},
];
function setup(base, scenario) {
  return `@use 'sass:map'; @use 'sass:meta';
@use '${base}/core/theming/theming' as own;
@use '${base}/core/theming/palette' as palette;
@use '${base}/form-field/form-field-theme' as field;
@use '${base.endsWith('/@angular/material') ? '@material/textfield' : base + '/vendor/mdc/textfield'}' as mdc-textfield;
$ink-before: meta.inspect(mdc-textfield.$ink-color);
$primary: own.define-palette(palette.$indigo-palette);
$accent: own.define-palette(palette.$pink-palette, A200, A100, A400);
$theme: own.define-${scenario.dark ? 'dark' : 'light'}-theme((color: (primary: $primary, accent: $accent)));
${scenario.lightSurface ? '$theme: map.set($theme, color, background, card, white);' : ''}
$before: meta.inspect($theme);
${scenario.selector ? scenario.selector + ' {' : ''}
@include field.color(${scenario.raw ? 'own.get-color-config($theme)' : '$theme'});
${scenario.selector ? '}' : ''}
@debug meta.inspect($theme) == $before;
@debug 'ink-restored=' + (meta.inspect(mdc-textfield.$ink-color) == $ink-before);
`;
}
function historicalStates(css, selector) {
  const host = selector ? selector + ' ' : '';
  const escaped = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const get = (rule, property) => {
    const match = css.match(new RegExp(escaped(host + rule) + ' \\{\\n  ' + property + ': ([^;]+);\\n\\}'));
    assert.ok(match, rule + '/' + property);
    return match[1];
  };
  return {
    ink: get('.mat-mdc-form-field-focus-overlay', 'background-color'),
    hover: get('.mat-mdc-form-field:hover .mat-mdc-form-field-focus-overlay', 'opacity'),
    focus: get('.mat-mdc-form-field.mat-focused .mat-mdc-form-field-focus-overlay', 'opacity'),
  };
}
function peerProgram(values, selector) {
  return `@use '@angular/material' as mat;\n${selector || 'html'} {
@include mat.form-field-overrides((state-layer-color: ${values.ink},
hover-state-layer-opacity: ${values.hover}, focus-state-layer-opacity: ${values.focus}));
}\n`;
}
const records = [];
for (const scenario of scenarios) {
  const original = compile(setup(referenceRoot + '/@angular/material', scenario), referenceRoot,
    [referenceRoot], [referenceIdentities]);
  const values = historicalStates(original.css, scenario.selector);
  const peer = compile(peerProgram(values, scenario.selector), peerRoot, [peerRoot], [peerIdentities]);
  const candidate = compile(setup(root + '/projects/ngx-material-legacy/styles', scenario), peerRoot,
    [root + '/projects/ngx-material-legacy', peerRoot], [null, peerIdentities]);
  assert.equal(original.map_unchanged, true);
  assert.equal(candidate.map_unchanged, true);
  assert.equal(original.ink_restored, true);
  assert.equal(candidate.ink_restored, true);
  // Nested color rules remain in one emission group. At document root Sass
  // separates the html rule with a blank line. Neither CSS body is rewritten.
  const separator = scenario.selector ? '\n' : '\n\n';
  const expected = original.css + separator + peer.css;
  if (candidate.css !== expected) {
    const at = [...candidate.css].findIndex((char, index) => expected[index] !== char);
    throw Error(scenario.id + ': whole CSS differs at ' + at + '; actual=' + JSON.stringify(candidate.css.slice(at - 25, at + 65))
      + '; expected=' + JSON.stringify(expected.slice(at - 25, at + 65)));
  }
  const changes = [
    {id: 'missing-state-tokens', css: original.css},
    {id: 'wrong-hover-value', css: expected.replace(/(--mat-form-field-hover-state-layer-opacity:) [^;]+;/, '$1 0.99;')},
    {id: 'wrong-focus-value', css: expected.replace(/(--mat-form-field-focus-state-layer-opacity:) [^;]+;/, '$1 0.99;')},
    {id: 'wrong-state-color', css: expected.replace(/(--mat-form-field-state-layer-color:) [^;]+;/, '$1 magenta;')},
    {id: 'changed-historical-hover-selector', css: expected.replace('.mat-mdc-form-field:hover', '.mat-mdc-text-field-wrapper:hover')},
    {id: 'unrelated-rule', css: expected + '\n.unrelated { color: red; }'},
  ];
  for (const change of changes) assert.notEqual(change.css, expected, change.id);
  records.push({scenario, values, separator, original, peer, candidate, whole_css_equal: true,
    rejected_css_mutations: changes.map(({id}) => id)});
}
// These contrast assertions come from the executed, authenticated untouched tag.
assert.deepEqual(records.map(r => [r.values.hover, r.values.focus]), [['0.04', '0.12'], ['0.08', '0.24'], ['0.04', '0.12'], ['0.04', '0.12']]);
const result = {line: options.line, node: process.version, sass: sass.info, records,
  limits: ['Four color-only source diagnostics against authenticated minimum-peer Sass sources.',
    'No peer installation, Angular21 runtime, browser, packed artifact, full Sass, aggregate, consumer floor or gate qualification.',
    'Historical host-hover selectors retained. Wrapper/host cascade still requires native review.',
    'Source identities are independently authenticated from archives by the caller; every compiler-loaded member is checked.']};
if (options.report) writeFileSync(options.report, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({line: options.line, cases: records.length, whole_css_equal: true,
  css_mutations_rejected: records.reduce((n, r) => n + r.rejected_css_mutations.length, 0)}));
