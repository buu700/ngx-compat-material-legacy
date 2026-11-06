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
function declarations(cssText, selector) {
 const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 const blocks = [...cssText.matchAll(new RegExp(`(?:^|\\n)${escaped} \\{([^{}]*)\\}`, 'g'))];
 assert.ok(blocks.length, `${selector} missing`);
 const values = new Map();
 for (const [,body] of blocks) for (const [,key,value] of body.matchAll(/(--mat-stepper-[\w-]+):\s*([^;]+);/g)) values.set(key,value.trim());
 return values;
}
const colors = ['header-hover-state-layer-color','header-focus-state-layer-color','header-error-state-label-text-color','header-error-state-icon-foreground-color'];
for (const name of ['light','dark','custom-light','custom-dark']) {
 const expected = declarations(golden.toString(), `.${name}`);
 for (const selector of [`.${name}`, `.color-${name}`, `.bridge-${name}`]) {
  const actual = declarations(css, selector);
  for (const token of colors) {
   const key = `--mat-stepper-${token}`;
   assert.ok(expected.has(key), `historical ${name} ${token} missing`);
   assert.equal(actual.get(key), expected.get(key), `${selector} ${token}`);
  }
  // Material 16's header has square state layers (observed before the public
  // shape tokens existed); newer peers must be explicitly reset to zero.
  for (const state of ['hover','focus']) {
   const observed = shape.cases[name][state];
   assert.equal(observed, '0px', `historical ${name} ${state} shape`);
   assert.equal(actual.get(`--mat-stepper-header-${state}-state-layer-shape`), '0', `${selector} ${state} shape`);
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
