#!/usr/bin/env node
/**
 * Compile the public companion bridges and the owned-only aggregate.
 * The owned-only CSS must not contain the current companion override variables
 * emitted by the bridge, and a current M3 icon theme block must be unchanged
 * when the owned aggregate is compiled beside it.
 */
import {createRequire} from 'node:module';
import {pathToFileURL, fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const sass = require('sass');
const loadPaths = [
  root,
  path.join(root, 'node_modules'),
  path.join(root, 'node_modules/.pnpm/node_modules'),
];

const theme = `
  $primary: legacy.define-palette(legacy.$indigo-palette);
  $accent: legacy.define-palette(legacy.$pink-palette, A200, A100, A400);
  $warn: legacy.define-palette(legacy.$red-palette);
  $theme: legacy.define-light-theme((
    color: (primary: $primary, accent: $accent, warn: $warn),
    typography: legacy.define-legacy-typography-config(),
    density: 0
  ));
`;

function compile(body) {
  return sass.compileString(
    `@use 'projects/ngx-material-legacy' as legacy;\n@use '@angular/material' as mat;\n${body}`,
    {
      loadPaths,
      style: 'expanded',
      url: pathToFileURL(path.join(root, 'companion-bridge-check.scss')),
      silenceDeprecations: ['if-function', 'global-builtin', 'color-functions', 'import'],
    },
  ).css;
}

const bridges = compile(`${theme}\n.bridges { @include legacy.all-current-companion-bridges($theme); }`);
const historical = compile(`${theme}\n.historical { @include legacy.all-legacy-component-themes($theme); }`);
const required = [
  '--mat-icon-color',
  '--mat-divider-color',
  '--mat-toolbar-container-background-color',
  '--mat-badge-background-color',
  '--mat-sort-arrow-color',
  '--mat-tree-container-background-color',
];
const missing = required.filter((token) => !bridges.includes(token));
if (missing.length) {
  console.error('Bridge CSS missing tokens:', missing.join(', '));
  process.exit(1);
}
const historicalMissing = required.filter((token) => !historical.includes(token));
if (historicalMissing.length) {
  console.error('Historical aggregate is missing companion override tokens:', historicalMissing.join(', '));
  process.exit(1);
}
if (!historical.includes('.mat-raised-button') && !historical.includes('.mat-button')) {
  console.error('Historical aggregate dropped legacy-owned button selectors.');
  process.exit(1);
}

const owned = compile(`${theme}\n.owned { @include legacy.all-owned-component-themes($theme); }`);
const leaked = required.filter((token) => owned.includes(token));
if (leaked.length) {
  console.error('Owned-only aggregate emitted current companion tokens:', leaked.join(', '));
  process.exit(1);
}

const m3 = `
  $m3: mat.define-theme((
    color: (
      theme-type: light,
      primary: mat.$azure-palette,
      tertiary: mat.$blue-palette
    )
  ));
`;
const currentOnly = compile(`${m3}\n.current { @include mat.icon-theme($m3); }`);
const besideOwned = compile(
  `${theme}\n${m3}\n.current { @include mat.icon-theme($m3); }\n.owned { @include legacy.all-owned-component-themes($theme); }`,
);
const currentBlock = (css) => {
  const start = css.indexOf('.current {');
  const end = css.indexOf('\n}', start);
  return css.slice(start, end + 2);
};
if (currentBlock(currentOnly) !== currentBlock(besideOwned)) {
  console.error('Owned-only aggregate changed the current M3 icon theme block.');
  process.exit(1);
}

if (!bridges.includes('.bridges') || !owned.includes('.owned')) {
  console.error('Expected selector wrappers were not emitted.');
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  bridge_bytes: bridges.length,
  owned_bytes: owned.length,
  tokens: required,
}));
