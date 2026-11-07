/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
// Compare effective root tokens with the independently compiled tagged CSS.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root = process.cwd();
const require = createRequire(resolve(root, 'package.json'));
const sass = require('sass');
const fixture = resolve(root, 'tests/fixtures/stepper-material-16');
const bytes = name => readFileSync(resolve(fixture, name));
const sha = data => createHash('sha256').update(data).digest('hex');
const manifestBytes = bytes('source-manifest.json');
assert.equal(sha(manifestBytes), 'ed9b9c8e69c63bb134b71a25ded9d68d21f1d120cdd513ba423126864986fe74');
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.archive_sha256, 'de41309d20b1d98a7fd6d028a7de42853ea2d453a329c7a8815aaf73ea7f365b');
assert.equal(manifest.source_files.length, 163);
assert.equal(manifest.source_files.find(x => x.path === 'package/core/tokens/m2/mat/_stepper.scss').sha256, 'f61956824d3ff2aca24a3b76863108b1e154ce702be44e1fe41daa4a9b44592c');
const shapeBytes = bytes('shape-observation.json');
assert.equal(sha(shapeBytes), '9834806bacc495276bfeae3c36c6e583daff0ee35919b3f373ccd31c404ca805');
const shape = JSON.parse(shapeBytes);
const input = bytes('theme.scss');
const golden = bytes('theme.css');
assert.equal(sha(input), 'a0e62266fc1ed1b89868cc7cb6ecb40b431b626ba541ddee67428183c1202ea1');
assert.equal(sha(golden), '5e6533a929229fb49d77b7cd30b5a837bb731d5d11ae0d66915bb020a3c7d8f1');
assert.equal(manifest.scss_sha256, sha(input));
assert.equal(manifest.css_sha256, sha(golden));
const entry = pathToFileURL(resolve(root, 'projects/ngx-material-legacy/_index.scss')).href;
const source = input.toString().replace("'@angular/material'", JSON.stringify(entry)) + `
$before: $cl;
@each $name, $t in (light:$l,dark:$d,custom-light:$cl,custom-dark:$cd) {
  .color-#{$name} { @include m.stepper-color($t); }
  .bridge-#{$name} { @include m.all-current-companion-bridges($t); }
}
@if $cl != $before { @error 'consumer theme was mutated'; }
`;
const css = sass.compileString(source, {loadPaths:[resolve(root,'node_modules')], logger:{warn(){}}}).css;
function declarations(cssText, selector, first = false) {
 const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 const blocks = [...cssText.matchAll(new RegExp(`(?:^|\\n)${escaped} \\{([^{}]*)\\}`, 'g'))];
 assert.ok(blocks.length, `${selector} missing`);
 const values = new Map();
 for (const [,body] of blocks) for (const [,key,value] of body.matchAll(/(--mat-stepper-[\w-]+):\s*([^;]+);/g)) { if (!first || !values.has(key)) values.set(key,value.trim()); }
 return values;
}
const colors = ['header-hover-state-layer-color','header-focus-state-layer-color','header-error-state-label-text-color','header-error-state-icon-foreground-color'];
// The first emitted declarations retain the authenticated historical prefix;
// the current-companion bridge follows it and is compared independently below.
for (const name of ['light','dark','custom-light','custom-dark']) {
 const expected = declarations(golden.toString(), `.${name}`);
 for (const selector of [`.${name}`, `.color-${name}`]) {
  const historical = declarations(css, selector, true);
  for (const token of colors) {
   const key = `--mat-stepper-${token}`;
   assert.equal(historical.get(key), expected.get(key), `${selector} historical ${token}`);
  }
 }
}
// Full six-scenario comparison against independently compiled public peer themes.
const {runPeerOracle, SCENARIOS, themeSass, compilePeer} = await import('../scripts/companion-bridge-peer-oracle.mjs');
const oracle = runPeerOracle(root);
for (const token of [...colors, 'header-focus-state-layer-shape', 'header-hover-state-layer-shape']) {
 const row = oracle.cases.find(item => item.case_id === `--mat-stepper-${token}`);
 assert.equal(row?.result, 'pass', token);
}
for (const scenario of SCENARIOS) {
 const candidateProgram = `@use 'projects/ngx-material-legacy' as legacy;\n${themeSass('legacy', scenario, {m2Prefix: ''})}
 .direct-theme { @include legacy.stepper-theme($theme); }
 .direct-color { @include legacy.stepper-color($theme); }
 .all-bridge { @include legacy.all-current-companion-bridges($theme); }`;
 const candidateCss = sass.compileString(candidateProgram, {loadPaths:[root,resolve(root,'node_modules')], logger:{warn(){}}}).css;
 const peer = declarations(compilePeer(root, scenario), '.peer');
 for (const selector of ['.direct-theme', '.direct-color', '.all-bridge']) {
  const current = declarations(candidateCss, selector);
  for (const token of [...colors, 'header-focus-state-layer-shape', 'header-hover-state-layer-shape']) {
   const key = `--mat-stepper-${token}`;
   assert.ok(peer.has(key), `${scenario.id} peer missing ${key}`);
   assert.equal(current.get(key), peer.get(key), `${scenario.id} ${selector} current ${key}`);
  }
 }
}
// A consumer may edit the nested owned M2 config after theme construction.
// Reconstruct a fresh public peer theme from that effective config: replaying
// the edit on a peer theme would retain the peer's constructor-time cache.
const setup = input.toString().slice(0, input.toString().indexOf('.light {'))
  .replace("'@angular/material'", JSON.stringify(entry));
const postProgram = `@use '@angular/material' as peer;\n${setup}
$cl-before: $cl; $cd-before: $cd;
$peer-cl: peer.m2-define-light-theme((color: map.get($cl, color)));
$peer-cd: peer.m2-define-dark-theme((color: map.get($cd, color)));
.post-light-theme { @include m.stepper-theme($cl); }
.post-light-color { @include m.stepper-color($cl); }
.post-light-bridge { @include m.all-current-companion-bridges($cl); }
.post-light-peer { @include peer.stepper-theme($peer-cl); }
.post-dark-theme { @include m.stepper-theme($cd); }
.post-dark-color { @include m.stepper-color($cd); }
.post-dark-bridge { @include m.all-current-companion-bridges($cd); }
.post-dark-peer { @include peer.stepper-theme($peer-cd); }
@if $cl != $cl-before or $cd != $cd-before { @error 'consumer theme was mutated'; }`;
const postCss = sass.compileString(postProgram, {loadPaths:[root,resolve(root,'node_modules')], logger:{warn(){}}}).css;
for (const [variant, expectedCurrent, expectedHistorical] of [
 ['light', '#8a1234', '#1166aa'], ['dark', '#d31862', '#f4c208'],
]) {
 const peer = declarations(postCss, `.post-${variant}-peer`);
 assert.equal(peer.get('--mat-stepper-header-error-state-label-text-color'), expectedCurrent);
 for (const route of ['theme', 'color', 'bridge']) {
  const selector = `.post-${variant}-${route}`;
  const current = declarations(postCss, selector);
  for (const token of [...colors, 'header-focus-state-layer-shape', 'header-hover-state-layer-shape']) {
   const key = `--mat-stepper-${token}`;
   assert.ok(peer.has(key), `${selector} fresh peer missing ${key}`);
   assert.equal(current.get(key), peer.get(key), `${selector} ${key}`);
  }
  if (route !== 'bridge') {
   assert.equal(declarations(postCss, selector, true).get('--mat-stepper-header-error-state-label-text-color'), expectedHistorical);
  }
 }
}
const densityManifestBytes = bytes('density-source-manifest.json');
assert.equal(sha(densityManifestBytes), '3d30f23210626cc0b6e4e43d9accab9f5b06f0afd28e89afbaecf1865e83dab5');
const densityManifest = JSON.parse(densityManifestBytes);
const densityInput = bytes('density.scss');
const densityGolden = bytes('density.css');
assert.equal(sha(densityInput), '9c5c8714fb90cc29d156ebc057348686dd4cb9d4c147e30fdd103c7fb5a6b249');
assert.equal(sha(densityGolden), 'a9f570583934f3b11e81f969821cdafae6dda6582df65437b24299a6ee2666b7');
assert.equal(densityManifest.scss_sha256, sha(densityInput));
assert.equal(densityManifest.css_sha256, sha(densityGolden));
assert.equal(densityManifest.archive_sha256, manifest.archive_sha256);
const densitySource = densityInput.toString().replace("'@angular/material'", JSON.stringify(entry)) + `
@each $name, $scale in (zero:0, minus-one:-1, minus-two:-2, minus-three:-3, minus-four:-4) {
  .density-bridge-#{$name} { @include m.all-current-companion-bridges(map.merge($l,(density:$scale))); }
}
`;
const densityCss = sass.compileString(densitySource, {loadPaths:[resolve(root,'node_modules')], logger:{warn(){}}}).css;
const densityFailures = [];
for (const name of ['zero','minus-one','minus-two','minus-three','minus-four']) {
 const key = '--mat-stepper-header-height';
 const expected = declarations(densityGolden.toString(), `.density-${name}`).get(key);
 assert.ok(expected, `historical ${name} density missing`);
 for (const prefix of ['density','density-theme','density-bridge']) {
  // declarations() folds every matching selector block in source order, retaining the final emitted value.
  const actual = declarations(densityCss, `.${prefix}-${name}`).get(key);
  if (actual !== expected) densityFailures.push(`${prefix}-${name} final emitted height: expected ${expected}, got ${actual}`);
 }
}
assert.deepEqual(densityFailures, [], densityFailures.join('\n'));
console.log('Stepper M2 bridge: tagged colors and final emitted density passed');
