/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Verify historical focus declarations remain before the public peer companion output. */
import assert from 'node:assert/strict';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import * as sass from 'sass';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const library = process.argv[2] ? resolve(process.argv[2]) : join(root, 'projects/ngx-material-legacy');
const inputUrl = pathToFileURL(join(root, 'strong-focus-companion-probe.scss'));
const publicEntry = pathToFileURL(join(library, '_index.scss')).href;
const ownedPrivate = pathToFileURL(join(library, 'styles/core/focus-indicators/_private.scss')).href;
const compile = input => sass.compileString(input, {
  url: inputUrl, loadPaths: [join(root, 'node_modules')], logger: sass.Logger.silent,
}).css;
const blocks = css => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({
  selector: match[1].trim(),
  declarations: match[2].split(';').map(value => value.trim()).filter(Boolean),
}));
const cases = [
  '()',
  '(border-color: #ff1100, border-width: 5px, border-style: dashed, border-radius: 11px)',
  '(border-color: null)',
  '(border-color: false)',
  '(border-color: var(--input-color))',
  '(display: null)',
  '(display: none)',
];
for (const config of cases) {
  const common = `@use 'sass:map'; @use '${publicEntry}' as legacy; @use '${ownedPrivate}' as old; @use '@angular/material' as mat; $config: ${config}; $before: $config;`;
  const original = blocks(compile(`${common} .probe { @include old.strong-focus-indicators($config); @include old.mdc-strong-focus-indicators($config); }`));
  const companion = blocks(compile(`${common} .probe { @include mat.strong-focus-indicators(map.merge((border-color: black, display: block), $config)); }`));
  const actual = blocks(compile(`${common} .probe { @include legacy.strong-focus-indicators($config); } @if $config != $before { @error 'focus config changed'; }`));
  assert.equal(original.length, 1, `historical rule count for ${config}`);
  assert.equal(companion[0].selector, '.probe');
  assert.equal(actual[0].selector, '.probe');
  assert.deepEqual(actual[0].declarations, [...original[0].declarations, ...companion[0].declarations], `historical declarations and peer output for ${config}`);
  assert.deepEqual(actual.slice(1), companion.slice(1), `public peer companion selectors for ${config}`);
}
console.log(`strong focus companion: ${cases.length} configurations preserved and peer output matched (${library})`);
